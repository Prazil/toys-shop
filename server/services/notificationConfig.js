const { getDatabase } = require('../database/db');

/**
 * Normalizes and masks an email address for privacy and auditing.
 * e.g., "prazilss4@gmail.com" -> "pr***4@gmail.com"
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const visibleStart = name.slice(0, 2);
  const visibleEnd = name.slice(-1);
  return `${visibleStart}***${visibleEnd}@${domain}`;
}

/**
 * Normalizes and masks an Indian phone number.
 * e.g., "9360882288" -> "******2288"
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `******${last4}`;
  }
  return '******';
}

/**
 * Validates and normalizes an Indian 10-digit mobile number according to TRAI rules.
 * Accepts:
 *   - 10 digits: "9876543210"
 *   - +91 format: "+919876543210" or "+91 98765 43210"
 *   - 91 prefix: "919876543210"
 * Returns: { valid: boolean, raw: string, tenDigit: string, e164: string, countryCode: string, error?: string }
 */
function normalizeIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Mobile number is required.' };
  }

  // Remove spaces, hyphens, brackets, leading plus
  let cleaned = phone.trim().replace(/[\s\-\(\)\+]/g, '');

  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 12 digits starting with 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }

  // Must be 10 digits starting with 6, 7, 8, or 9
  const isValid = /^[6-9]\d{9}$/.test(cleaned);

  if (!isValid) {
    return {
      valid: false,
      raw: phone,
      error: `Invalid Indian mobile number "${phone}". Must be a valid 10-digit number starting with 6, 7, 8, or 9.`
    };
  }

  return {
    valid: true,
    tenDigit: cleaned,
    e164: `+91${cleaned}`,
    withCountryPrefix: `91${cleaned}`,
    raw: phone
  };
}

/**
 * Retrieves notification configuration from environment variables first,
 * falling back to the SQLite `settings` table.
 */
async function getNotificationConfig() {
  let dbSettings = {};
  try {
    const db = await getDatabase();
    const rows = db.query("SELECT key, value FROM settings");
    rows.forEach(r => {
      dbSettings[r.key] = r.value;
    });
  } catch (err) {
    // If db query fails during early bootstrap, ignore
  }

  // Helper: check process.env first, then dbSettings
  const getVal = (envKey, dbKey, defaultVal = '') => {
    if (process.env[envKey] && process.env[envKey].trim()) {
      return process.env[envKey].trim();
    }
    if (dbSettings[dbKey] && dbSettings[dbKey].trim()) {
      return dbSettings[dbKey].trim();
    }
    return defaultVal;
  };

  // 1. SMTP Config
  const defaultSmtpHost = 'smtp-relay.brevo.com'; // Default production transactional provider
  const smtpHost = getVal('SMTP_HOST', 'smtp_host', dbSettings.email_smtp_host || defaultSmtpHost);
  const smtpPort = parseInt(getVal('SMTP_PORT', 'smtp_port', dbSettings.email_smtp_port || '587'), 10);
  const smtpSecureVal = getVal('SMTP_SECURE', 'smtp_secure', 'false').toLowerCase();
  const smtpSecure = smtpSecureVal === 'true' || smtpSecureVal === '1' || smtpPort === 465;
  const smtpUser = getVal('SMTP_USER', 'smtp_user', dbSettings.email_smtp_user || '');
  const smtpPassword = getVal('SMTP_PASSWORD', 'smtp_password', dbSettings.email_smtp_pass || '');
  const smtpFromName = getVal('SMTP_FROM_NAME', 'smtp_from_name', dbSettings.email_from_name || 'Giggle & Bloom Kids Gift Shop');
  
  // Enforce professional business sender identity - NEVER use personal Gmail as sender!
  let rawFromEmail = getVal('SMTP_FROM_EMAIL', 'smtp_from_email', dbSettings.email_from_address || '');
  if (!rawFromEmail || rawFromEmail.toLowerCase().includes('prazilss4@gmail.com')) {
    rawFromEmail = 'orders@giggleandbloom.com';
  }
  const smtpFromEmail = rawFromEmail;

  const isSmtpConfigured = Boolean(smtpHost && smtpUser && smtpPassword);

  // 2. SMS Provider Config (Business Header, never personal phone)
  const smsProvider = getVal('SMS_PROVIDER', 'sms_provider', 'fast2sms').toLowerCase();
  const smsApiKey = getVal('SMS_API_KEY', 'sms_api_key', '');
  const smsApiSecret = getVal('SMS_API_SECRET', 'sms_api_secret', '');
  
  // Sender ID must be a business Header (6 chars e.g. KIDGFT), never a personal 10-digit phone number
  let rawSenderId = getVal('SMS_SENDER_ID', 'sms_sender_id', 'KIDGFT').trim();
  if (!rawSenderId || /^\d{10}$/.test(rawSenderId) || rawSenderId.includes('9360882288')) {
    rawSenderId = 'KIDGFT';
  }
  const smsSenderId = rawSenderId;
  const smsTemplateId = getVal('SMS_TEMPLATE_ID', 'sms_template_id', '');
  const smsBaseUrl = getVal('SMS_BASE_URL', 'sms_base_url', 'https://www.fast2sms.com/dev/bulkV2');

  const isSmsConfigured = Boolean(smsApiKey && (smsProvider !== 'twilio' || smsApiSecret));

  // 3. Google Sheets
  const sheetsWebhookUrl = getVal('GOOGLE_SHEETS_WEBHOOK_URL', 'google_sheets_webhook_url', dbSettings.google_sheets_url || '');
  const isSheetsConfigured = Boolean(sheetsWebhookUrl);

  // 4. Payment Provider
  const paymentProvider = getVal('PAYMENT_PROVIDER', 'payment_provider', 'UPI');
  const paymentKey = getVal('PAYMENT_KEY', 'payment_key', dbSettings.razorpay_key_id || '');
  const paymentSecret = getVal('PAYMENT_SECRET', 'payment_secret', dbSettings.razorpay_key_secret || '');

  // Missing environment variables audit
  const missingVars = [];
  if (!smtpHost) missingVars.push('SMTP_HOST');
  if (!smtpUser) missingVars.push('SMTP_USER');
  if (!smtpPassword) missingVars.push('SMTP_PASSWORD');
  if (!smsApiKey) missingVars.push('SMS_API_KEY');
  if (smsProvider === 'twilio' && !smsApiSecret) missingVars.push('SMS_API_SECRET');

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isLive = isSmtpConfigured && isSmsConfigured;

  return {
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      password: smtpPassword,
      fromName: smtpFromName,
      fromEmail: smtpFromEmail,
      isConfigured: isSmtpConfigured
    },
    sms: {
      provider: smsProvider,
      apiKey: smsApiKey,
      apiSecret: smsApiSecret,
      senderId: smsSenderId,
      templateId: smsTemplateId,
      baseUrl: smsBaseUrl,
      isConfigured: isSmsConfigured
    },
    googleSheets: {
      webhookUrl: sheetsWebhookUrl,
      isConfigured: isSheetsConfigured
    },
    payment: {
      provider: paymentProvider,
      key: paymentKey,
      secret: paymentSecret,
      isConfigured: Boolean(paymentKey)
    },
    diagnostics: {
      nodeEnv,
      mode: isLive ? 'LIVE' : 'UNCONFIGURED_OR_PARTIAL',
      missingVars,
      isSmtpConfigured,
      isSmsConfigured,
      isSheetsConfigured
    }
  };
}

module.exports = {
  getNotificationConfig,
  normalizeIndianPhone,
  maskEmail,
  maskPhone
};
