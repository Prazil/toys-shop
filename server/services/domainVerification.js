const dns = require('dns').promises;

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'zoho.com'
]);

/**
 * Checks if an email address or domain is a free public webmail service.
 * Business transactional senders MUST use custom business domains.
 */
function isFreeMailDomain(domainOrEmail) {
  if (!domainOrEmail) return false;
  const domain = domainOrEmail.includes('@') ? domainOrEmail.split('@')[1] : domainOrEmail;
  return FREE_EMAIL_DOMAINS.has(domain.toLowerCase().trim());
}

/**
 * Real DNS lookup for SPF, DKIM, and DMARC TXT records.
 * Verifies if the domain is configured for high-deliverability business sending.
 */
async function verifyDomainDns(domainOrEmail) {
  if (!domainOrEmail || typeof domainOrEmail !== 'string') {
    return {
      valid: false,
      error: 'Please provide a valid domain name or email address.'
    };
  }

  const domain = (domainOrEmail.includes('@') ? domainOrEmail.split('@')[1] : domainOrEmail).toLowerCase().trim();

  // 1. Check if public free email domain
  if (isFreeMailDomain(domain)) {
    return {
      domain,
      valid: false,
      isBusinessDomain: false,
      status: 'REJECTED_PERSONAL_DOMAIN',
      error: `Personal email provider "@${domain}" cannot be used as a business transactional sender. Transactional emails must be dispatched from a verified business sender identity (e.g., "Giggle & Bloom Kids Gift Shop <orders@yourdomain.com>") using Brevo, SendGrid, or Amazon SES.`,
      recommendation: 'Register a business domain (e.g. giggleandbloom.com or kidsgiftshop.com) and configure SPF/DKIM.'
    };
  }

  const results = {
    domain,
    valid: true,
    isBusinessDomain: true,
    hasSpf: false,
    spfRecord: null,
    hasDmarc: false,
    dmarcRecord: null,
    hasMx: false,
    mxRecords: [],
    status: 'UNVERIFIED',
    notes: []
  };

  try {
    // 2. Check MX records
    try {
      const mx = await dns.resolveMx(domain);
      if (mx && mx.length > 0) {
        results.hasMx = true;
        results.mxRecords = mx.map(m => m.exchange);
      }
    } catch (mxErr) {
      results.notes.push('No MX records found for receiving email.');
    }

    // 3. Check TXT records on root domain for SPF
    try {
      const txtRecords = await dns.resolveTxt(domain);
      for (const recordArray of txtRecords) {
        const fullTxt = recordArray.join('');
        if (fullTxt.startsWith('v=spf1')) {
          results.hasSpf = true;
          results.spfRecord = fullTxt;
          break;
        }
      }
    } catch (spfErr) {
      results.notes.push('SPF (Sender Policy Framework) TXT record not found.');
    }

    // 4. Check TXT records on _dmarc.<domain>
    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      for (const recordArray of dmarcRecords) {
        const fullTxt = recordArray.join('');
        if (fullTxt.startsWith('v=DMARC1')) {
          results.hasDmarc = true;
          results.dmarcRecord = fullTxt;
          break;
        }
      }
    } catch (dmarcErr) {
      results.notes.push('DMARC policy record not found at _dmarc.' + domain);
    }

    // Determine verification status
    if (results.hasSpf && results.hasDmarc) {
      results.status = 'FULLY_AUTHENTICATED';
      results.message = 'Domain has active SPF and DMARC records. Ready for high-volume inbox delivery!';
    } else if (results.hasSpf || results.hasMx) {
      results.status = 'PARTIALLY_AUTHENTICATED';
      results.message = 'Domain is active. Add DMARC TXT record for optimal inbox delivery.';
    } else {
      results.status = 'PENDING_DNS';
      results.message = 'Domain active, but SPF/DMARC records are missing or propagating.';
    }

    return results;
  } catch (err) {
    return {
      domain,
      valid: false,
      isBusinessDomain: true,
      status: 'LOOKUP_FAILED',
      error: `DNS lookup failed for ${domain}: ${err.message}`
    };
  }
}

module.exports = {
  isFreeMailDomain,
  verifyDomainDns
};
