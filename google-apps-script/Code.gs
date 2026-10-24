/**
 * ===================================================================
 * GIGGLE & BLOOM KIDS GIFT SHOP — GOOGLE APPS SCRIPT
 * Full-Stack Order Tracking, Auto-Email & WhatsApp Dispatcher
 * ===================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click "Extensions" > "Apps Script"
 * 3. Delete any code in the editor, paste this entire file, and click Save (💾).
 * 4. Choose your WHATSAPP_PROVIDER in CONFIG below.
 * 5. Click "Deploy" > "New deployment" > type: "Web app".
 * 6. Set "Execute as: Me" and "Who has access: Anyone".
 * 7. Copy the "Web app URL" into your website Admin Settings:
 *    Admin > Settings > Google Sheets 24-Col Sync > Webhook URL.
 */

// ===================================================================
// CONFIGURATION
// ===================================================================
const CONFIG = {
  SHOP_NAME: "Giggle & Bloom Kids Gift Shop",
  SHOP_TAGLINE: "Little Gifts, Big Smiles! 🎁",
  SUPPORT_EMAIL: "hello@kidsgiftshop.com",
  CURRENCY: "₹",
  SHEET_NAME: "Orders",
  
  // Notification Toggles
  ENABLE_AUTO_EMAIL: true,    // 100% FREE via Google MailApp (up to 100 emails/day)
  ENABLE_AUTO_WHATSAPP: true, // Send customer WhatsApp message upon order updates

  // =================================================================
  // CHOOSE YOUR WHATSAPP NOTIFICATION PROVIDER:
  // Options: "TWILIO_WHATSAPP" | "CALLMEBOT" | "ULTRAMSG" | "DIRECT_WA"
  // =================================================================
  WHATSAPP_PROVIDER: "TWILIO_WHATSAPP", 

  // OPTION 1: TWILIO WHATSAPP ($15.50 Free Trial Credits)
  // Register at https://www.twilio.com/try-twilio (Free $15.50 credit)
  // Uses Twilio Sandbox: join sandbox by sending code to +14155238886 on WhatsApp
  TWILIO_ACCOUNT_SID: "YOUR_TWILIO_ACCOUNT_SID_HERE", // Starts with AC...
  TWILIO_AUTH_TOKEN: "YOUR_TWILIO_AUTH_TOKEN_HERE",
  TWILIO_WHATSAPP_FROM: "whatsapp:+14155238886",     // Twilio Sandbox or Business WhatsApp Number

  // OPTION 2: CALLMEBOT (100% FREE FOREVER & UNLIMITED)
  // 1-minute setup:
  // 1. Add +34 911 06 43 03 to your phone contacts as "CallMeBot".
  // 2. Send "I allow callmebot to send me messages" to that contact on WhatsApp.
  // 3. CallMeBot will reply with your free API key in seconds!
  CALLMEBOT_API_KEY: "YOUR_CALLMEBOT_API_KEY_HERE",

  // OPTION 3: ULTRAMSG (Scan QR to send from your own WhatsApp Number)
  // From https://ultramsg.com
  ULTRAMSG_INSTANCE_ID: "instanceXXXXX",
  ULTRAMSG_TOKEN: "YOUR_ULTRAMSG_TOKEN_HERE"
};

// 25 Standard Columns
const HEADERS = [
  "Order ID",
  "Order Date",
  "Customer Name",
  "Phone",
  "Email",
  "House Number",
  "Street",
  "Area",
  "City",
  "District",
  "State",
  "PIN Code",
  "Landmark",
  "Products",
  "Quantity",
  "Subtotal",
  "Discount",
  "Total Amount",
  "Payment ID",
  "Payment Method",
  "Payment Status",
  "Order Status",
  "Tracking Number",
  "Created At",
  "Updated At"
];

// ===================================================================
// 1. WEBHOOK RECEIVER (POST REQUESTS FROM WEBSITE)
// ===================================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Prevent concurrent write race conditions
  } catch (t) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Server busy, could not acquire lock."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }

    const sheet = getOrCreateOrdersSheet();
    const orderData = parseOrderPayload(payload);

    if (!orderData || !orderData.order_id) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing order_id or invalid payload."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Check if order already exists in Sheet (Match Column A: Order ID)
    const existingRowIndex = findOrderRowIndex(sheet, orderData.order_id);
    let actionTaken = "INSERTED";

    if (existingRowIndex > 0) {
      // Update existing row in place without duplicating
      const rowValues = buildRowArray(orderData);
      sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      actionTaken = "UPDATED";
    } else {
      // Append new row
      const rowValues = buildRowArray(orderData);
      sheet.appendRow(rowValues);
      actionTaken = "INSERTED";
    }

    // Trigger Email Notification directly from Google Apps Script (100% Free)
    let emailResult = { sent: false, skipped: true };
    if (CONFIG.ENABLE_AUTO_EMAIL && orderData.email) {
      emailResult = sendOrderEmail(orderData);
    }

    // Trigger WhatsApp Notification
    let whatsappResult = { sent: false, skipped: true };
    if (CONFIG.ENABLE_AUTO_WHATSAPP && orderData.phone) {
      whatsappResult = sendOrderWhatsApp(orderData);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      action: actionTaken,
      order_id: orderData.order_id,
      email: emailResult,
      whatsapp: whatsappResult,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      stack: err.stack
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Health check endpoint (GET)
function doGet(e) {
  const sheet = getOrCreateOrdersSheet();
  const lastRow = Math.max(0, sheet.getLastRow() - 1);
  return ContentService.createTextOutput(JSON.stringify({
    status: "healthy",
    shop: CONFIG.SHOP_NAME,
    channel: "WhatsApp & Email",
    total_orders_in_sheet: lastRow,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===================================================================
// 2. EMAIL SENDER (REAL DELIVERY VIA GOOGLE MAILAPP - 100% FREE)
// ===================================================================
function sendOrderEmail(order) {
  try {
    if (!order.email || order.email.indexOf("@") === -1) {
      return { sent: false, error: "Invalid customer email address" };
    }

    const statusTitle = getStatusTitle(order.order_status);
    const badgeColor = getStatusColor(order.order_status);
    const subject = `${statusTitle} - ${CONFIG.SHOP_NAME} (#${order.order_id})`;
    
    const htmlBody = generateHtmlEmail(order, statusTitle, badgeColor);
    const plainText = `Hello ${order.customer_name},\n\nYour order #${order.order_id} status is now: ${order.order_status}.\n\nItems: ${order.products}\nTotal Amount: ${CONFIG.CURRENCY}${order.total_amount}\n\nDelivery Destination:\n${order.customer_name}\n${order.house_number}, ${order.street}, ${order.area}, ${order.city} - ${order.pin_code}\n\nThank you for shopping with ${CONFIG.SHOP_NAME}!`;

    MailApp.sendEmail({
      to: order.email,
      subject: subject,
      body: plainText,
      htmlBody: htmlBody,
      name: CONFIG.SHOP_NAME,
      replyTo: CONFIG.SUPPORT_EMAIL
    });

    return { sent: true, recipient: order.email, status: order.order_status };
  } catch (err) {
    Logger.log("Email dispatch failed: " + err.toString());
    return { sent: false, error: err.toString() };
  }
}

// ===================================================================
// 3. WHATSAPP SENDER (DIRECT CUSTOMER WHATSAPP NOTIFICATIONS)
// ===================================================================
function sendOrderWhatsApp(order) {
  try {
    if (!order.phone) {
      return { sent: false, error: "No phone number provided" };
    }

    // Normalize Indian 10-digit phone number
    const cleanPhone = String(order.phone).replace(/\D/g, "");
    let tenDigitPhone = cleanPhone;
    if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
      tenDigitPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.length > 10 && cleanPhone.startsWith("0")) {
      tenDigitPhone = cleanPhone.substring(1);
    }

    if (!/^[6-9]\d{9}$/.test(tenDigitPhone)) {
      return { sent: false, error: "Invalid Indian mobile number: " + order.phone };
    }

    const messageText = getWhatsAppMessageText(order);
    const provider = (CONFIG.WHATSAPP_PROVIDER || "TWILIO_WHATSAPP").toUpperCase();

    // -------------------------------------------------------------
    // OPTION 1: TWILIO WHATSAPP ($15.50 FREE TRIAL CREDITS)
    // -------------------------------------------------------------
    if (provider === "TWILIO_WHATSAPP") {
      if (!CONFIG.TWILIO_ACCOUNT_SID || CONFIG.TWILIO_ACCOUNT_SID.includes("YOUR_TWILIO")) {
        return { sent: false, skipped: true, error: "TWILIO_ACCOUNT_SID not configured in Google Apps Script CONFIG." };
      }

      const twilioUrl = "https://api.twilio.com/2010-04-01/Accounts/" + CONFIG.TWILIO_ACCOUNT_SID + "/Messages.json";
      const toWhatsApp = "whatsapp:+91" + tenDigitPhone;
      let fromWhatsApp = CONFIG.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
      if (!fromWhatsApp.startsWith("whatsapp:")) fromWhatsApp = "whatsapp:" + fromWhatsApp;

      const payload = {
        "To": toWhatsApp,
        "From": fromWhatsApp,
        "Body": messageText
      };

      const authHeader = "Basic " + Utilities.base64Encode(CONFIG.TWILIO_ACCOUNT_SID + ":" + CONFIG.TWILIO_AUTH_TOKEN);
      const options = {
        method: "post",
        headers: { "Authorization": authHeader },
        payload: payload,
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(twilioUrl, options);
      const resCode = response.getResponseCode();
      const resText = response.getContentText();
      const json = JSON.parse(resText);

      if (resCode >= 200 && resCode < 300 && json.sid) {
        return { sent: true, provider: "TWILIO_WHATSAPP", recipient: toWhatsApp, sid: json.sid };
      } else {
        return { sent: false, provider: "TWILIO_WHATSAPP", error: json.message || resText, code: json.code || resCode };
      }
    }

    // -------------------------------------------------------------
    // OPTION 2: CALLMEBOT WHATSAPP (100% FREE FOREVER)
    // -------------------------------------------------------------
    if (provider === "CALLMEBOT") {
      if (!CONFIG.CALLMEBOT_API_KEY || CONFIG.CALLMEBOT_API_KEY.includes("YOUR_CALLMEBOT")) {
        return { sent: false, skipped: true, error: "CALLMEBOT_API_KEY not configured in Google Apps Script CONFIG." };
      }

      const encodedMsg = encodeURIComponent(messageText);
      const callMeBotUrl = "https://api.callmebot.com/whatsapp.php?phone=+91" + tenDigitPhone + "&text=" + encodedMsg + "&apikey=" + CONFIG.CALLMEBOT_API_KEY;

      const response = UrlFetchApp.fetch(callMeBotUrl, { muteHttpExceptions: true });
      const resCode = response.getResponseCode();
      const resText = response.getContentText();

      if (resCode >= 200 && resCode < 300) {
        return { sent: true, provider: "CALLMEBOT", recipient: "+91" + tenDigitPhone, response: resText };
      } else {
        return { sent: false, provider: "CALLMEBOT", error: resText, code: resCode };
      }
    }

    // -------------------------------------------------------------
    // OPTION 3: ULTRAMSG (SCAN QR / PERSONAL WHATSAPP)
    // -------------------------------------------------------------
    if (provider === "ULTRAMSG") {
      if (!CONFIG.ULTRAMSG_INSTANCE_ID || CONFIG.ULTRAMSG_INSTANCE_ID.includes("instanceXXXXX")) {
        return { sent: false, skipped: true, error: "ULTRAMSG_INSTANCE_ID not configured in Google Apps Script CONFIG." };
      }

      const ultraUrl = "https://api.ultramsg.com/" + CONFIG.ULTRAMSG_INSTANCE_ID + "/messages/chat";
      const payload = {
        token: CONFIG.ULTRAMSG_TOKEN,
        to: "+91" + tenDigitPhone,
        body: messageText
      };

      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(ultraUrl, options);
      const resCode = response.getResponseCode();
      const resText = response.getContentText();
      const json = JSON.parse(resText);

      if (resCode >= 200 && resCode < 300 && (json.sent === "true" || json.id)) {
        return { sent: true, provider: "ULTRAMSG", recipient: "+91" + tenDigitPhone, message_id: json.id };
      } else {
        return { sent: false, provider: "ULTRAMSG", error: json.error || resText, code: resCode };
      }
    }

    // -------------------------------------------------------------
    // OPTION 4: DIRECT_WA (1-CLICK DIRECT LINK GENERATION)
    // -------------------------------------------------------------
    const directLink = "https://wa.me/91" + tenDigitPhone + "?text=" + encodeURIComponent(messageText);
    return {
      sent: true,
      provider: "DIRECT_WA",
      recipient: "+91" + tenDigitPhone,
      chat_link: directLink,
      message: "Direct WhatsApp chat link generated successfully."
    };

  } catch (err) {
    Logger.log("WhatsApp dispatch failed: " + err.toString());
    return { sent: false, error: err.toString() };
  }
}

// ===================================================================
// 4. RICH WHATSAPP MESSAGE FORMATTER
// ===================================================================
function getWhatsAppMessageText(order) {
  const status = order.order_status || "Order Received";
  const statusEmoji = getStatusEmoji(status);
  
  let msg = `🎁 *${CONFIG.SHOP_NAME.toUpperCase()}* 🎁\n` +
    `*Order Update:* ${statusEmoji} *${status}*\n\n` +
    `Hi *${order.customer_name || 'Valued Customer'}*,\n` +
    `There is an exciting update on your gift order!\n\n` +
    `📦 *Order ID:* #${order.order_id}\n` +
    `✨ *Current Status:* ${status}\n` +
    `🛒 *Items:* ${order.products || 'Kids Gifts'}\n` +
    `🔢 *Quantity:* ${order.quantity || 1} item(s)\n` +
    `💰 *Total Amount:* ${CONFIG.CURRENCY}${order.total_amount} (${order.payment_status} via ${order.payment_method})\n\n` +
    `📍 *Delivery Address:*\n` +
    `${order.customer_name}\n` +
    `${order.house_number ? order.house_number + ', ' : ''}${order.street ? order.street + ', ' : ''}${order.area ? order.area + ', ' : ''}\n` +
    `${order.city}, ${order.state} - *${order.pin_code}*\n` +
    `📞 Phone: +91 ${order.phone}\n`;

  if (order.tracking_number) {
    msg += `\n🚚 *Tracking Number:* \`${order.tracking_number}\`\n`;
  }

  msg += `\n❤️ _Thank you for shopping with ${CONFIG.SHOP_NAME}! We prepare every gift with love._\n\n` +
    `💬 Have questions? Reply directly to this WhatsApp message or email ${CONFIG.SUPPORT_EMAIL}`;

  return msg;
}

function getStatusEmoji(status) {
  switch (status) {
    case "Payment Verified": return "🎉";
    case "Order Accepted": return "🎁";
    case "Processing": return "🧸";
    case "Packed": return "🎀";
    case "Shipped": return "🚀";
    case "Out for Delivery": return "🛵";
    case "Delivered": return "🥳";
    case "Cancelled": return "❌";
    default: return "✨";
  }
}

// ===================================================================
// 5. HTML EMAIL TEMPLATE GENERATOR
// ===================================================================
function generateHtmlEmail(order, statusTitle, badgeColor) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${statusTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF9F4; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(255, 107, 139, 0.1); border: 1px solid #FFE4E6;">
          
          <!-- Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%); padding: 35px 20px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.25); padding: 6px 16px; border-radius: 50px; color: #ffffff; font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                ✨ ${CONFIG.SHOP_NAME} ✨
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">${statusTitle}</h1>
              <p style="margin: 6px 0 0; color: #FFE4E6; font-size: 14px; font-weight: 600;">Order #${order.order_id}</p>
            </td>
          </tr>

          <!-- Status Highlight -->
          <tr>
            <td style="padding: 24px 30px 10px;">
              <div style="background-color: #F8FAFC; border-left: 5px solid ${badgeColor}; padding: 16px 20px; border-radius: 10px;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.5;">
                  Hi <strong>${order.customer_name}</strong>, there is an update on your order: <strong>${order.order_status}</strong>.
                </p>
              </div>
            </td>
          </tr>

          ${order.tracking_number ? `
          <!-- Tracking Info -->
          <tr>
            <td style="padding: 10px 30px;">
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 20px;">
                <div style="font-weight: 800; color: #166534; font-size: 14px; margin-bottom: 4px;">🚚 Courier & Tracking</div>
                <div style="font-size: 13px; color: #15803D;">Tracking Number: <code style="background: #DCFCE7; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${order.tracking_number}</code></div>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Order Summary -->
          <tr>
            <td style="padding: 15px 30px;">
              <h3 style="margin: 0 0 12px; color: #0F172A; font-size: 16px; font-weight: 800;">Order Details:</h3>
              <div style="background-color: #F8FAFC; padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; font-size: 13px; line-height: 1.6; color: #334155;">
                <div><strong>Products:</strong> ${order.products}</div>
                <div><strong>Total Quantity:</strong> ${order.quantity} item(s)</div>
                <div><strong>Subtotal:</strong> ${CONFIG.CURRENCY}${order.subtotal}</div>
                ${order.discount > 0 ? `<div><strong>Discount:</strong> -${CONFIG.CURRENCY}${order.discount}</div>` : ''}
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #CBD5E1; font-size: 16px; font-weight: 800; color: #FF6B8B;">
                  Total Amount: ${CONFIG.CURRENCY}${order.total_amount}
                </div>
                <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
                  Payment: <strong>${order.payment_status}</strong> via ${order.payment_method}
                </div>
              </div>
            </td>
          </tr>

          <!-- Delivery Address -->
          <tr>
            <td style="padding: 10px 30px 24px;">
              <div style="background-color: #F8FAFC; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0;">
                <h4 style="margin: 0 0 6px; color: #0F172A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">📍 Delivery Address</h4>
                <div style="color: #475569; font-size: 13px; line-height: 1.5;">
                  ${order.customer_name}<br>
                  ${order.house_number}, ${order.street}, ${order.area}<br>
                  ${order.city}, ${order.district}, ${order.state} - <strong>${order.pin_code}</strong><br>
                  Phone: <strong>${order.phone}</strong>
                  ${order.landmark ? `<br>Landmark: <em>${order.landmark}</em>` : ''}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FFF9F4; padding: 20px 30px; text-align: center; border-top: 1px solid #FFE4E6;">
              <p style="margin: 0 0 6px; color: #64748B; font-size: 13px;">
                Questions? Reply to this email or reach us at <a href="mailto:${CONFIG.SUPPORT_EMAIL}" style="color: #FF6B8B; text-decoration: none; font-weight: 700;">${CONFIG.SUPPORT_EMAIL}</a>
              </p>
              <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                © 2026 ${CONFIG.SHOP_NAME} • ${CONFIG.SHOP_TAGLINE}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getStatusTitle(status) {
  switch (status) {
    case "Payment Verified": return "Payment Verified & Order Confirmed! 🎉";
    case "Order Accepted": return "Order Accepted! 🎁";
    case "Processing": return "Gifts in Preparation! 🧸";
    case "Packed": return "Order Packed with Love! 🎀";
    case "Shipped": return "Your Gifts are on the Way! 🚀";
    case "Out for Delivery": return "Out for Delivery Today! 🛵";
    case "Delivered": return "Order Delivered! 🥳";
    case "Cancelled": return "Order Cancelled";
    case "Payment Failed": return "Payment Incomplete";
    default: return `Order Update: ${status}`;
  }
}

function getStatusColor(status) {
  switch (status) {
    case "Payment Verified": return "#10B981";
    case "Order Accepted": return "#8B5CF6";
    case "Processing": return "#F59E0B";
    case "Packed": return "#EC4899";
    case "Shipped": return "#3B82F6";
    case "Out for Delivery": return "#F97316";
    case "Delivered": return "#10B981";
    case "Cancelled": return "#EF4444";
    default: return "#6366F1";
  }
}

// ===================================================================
// 6. SHEET HELPERS & DATA PARSING
// ===================================================================
function getOrCreateOrdersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // Format headers if row 1 is empty
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === "") {
    setupSheetHeaders(sheet);
  }

  return sheet;
}

function setupSheetHeaders(sheet) {
  if (!sheet) sheet = getOrCreateOrdersSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Format Header Row (Pink & Coral)
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#FF6B8B");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 35);
  
  for (let i = 1; i <= HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }
}

function parseOrderPayload(payload) {
  if (!payload) return null;
  
  // If row_values array is provided directly from our website backend
  if (payload.data && Array.isArray(payload.data) && payload.data.length >= 22) {
    const d = payload.data;
    return {
      order_id: d[0] || payload.order_id,
      order_date: d[1] || "",
      customer_name: d[2] || "",
      phone: d[3] || "",
      email: d[4] || "",
      house_number: d[5] || "",
      street: d[6] || "",
      area: d[7] || "",
      city: d[8] || "",
      district: d[9] || "",
      state: d[10] || "",
      pin_code: d[11] || "",
      landmark: d[12] || "",
      products: d[13] || "",
      quantity: d[14] || 1,
      subtotal: d[15] || 0,
      discount: d[16] || 0,
      total_amount: d[17] || 0,
      payment_id: d[18] || "",
      payment_method: d[19] || "UPI",
      payment_status: d[20] || "Pending",
      order_status: d[21] || "Payment Pending",
      tracking_number: d[22] || "",
      created_at: d[23] || new Date().toISOString(),
      updated_at: d[24] || new Date().toISOString()
    };
  }

  // Key-value object format fallback
  return {
    order_id: payload.order_id || payload.order_code,
    order_date: payload.order_date || payload.created_at || new Date().toISOString(),
    customer_name: payload.customer_name || "",
    phone: payload.customer_phone || payload.phone || "",
    email: payload.customer_email || payload.email || "",
    house_number: payload.house_no || payload.house_number || "",
    street: payload.street || "",
    area: payload.area || "",
    city: payload.city || "",
    district: payload.district || "",
    state: payload.state || "",
    pin_code: payload.pincode || payload.pin_code || "",
    landmark: payload.landmark || "",
    products: payload.products || "",
    quantity: payload.quantity || 1,
    subtotal: payload.subtotal || 0,
    discount: payload.discount || 0,
    total_amount: payload.total_amount || 0,
    payment_id: payload.payment_id || "",
    payment_method: payload.payment_method || "UPI",
    payment_status: payload.payment_status || "Pending",
    order_status: payload.order_status || "Payment Pending",
    tracking_number: payload.tracking_number || "",
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: payload.updated_at || new Date().toISOString()
  };
}

function buildRowArray(order) {
  return [
    order.order_id,
    order.order_date || order.created_at,
    order.customer_name,
    order.phone,
    order.email,
    order.house_number,
    order.street,
    order.area,
    order.city,
    order.district,
    order.state,
    order.pin_code,
    order.landmark,
    order.products,
    order.quantity,
    order.subtotal,
    order.discount,
    order.total_amount,
    order.payment_id,
    order.payment_method,
    order.payment_status,
    order.order_status,
    order.tracking_number,
    order.created_at,
    order.updated_at || new Date().toISOString()
  ];
}

function findOrderRowIndex(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const orderIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < orderIds.length; i++) {
    if (String(orderIds[i][0]).trim().toUpperCase() === String(orderId).trim().toUpperCase()) {
      return i + 2; // Row numbers are 1-indexed (Row 1 is headers)
    }
  }
  return -1;
}

// ===================================================================
// 7. CUSTOM SPREADSHEET MENU (UI BUTTONS)
// ===================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🎁 Giggle & Bloom Actions")
    .addItem("✨ Format & Initialize Headers", "menuSetupHeaders")
    .addSeparator()
    .addItem("✉️ Send Email for Active Row", "menuSendEmailActiveRow")
    .addItem("💬 Send WhatsApp for Active Row", "menuSendWhatsAppActiveRow")
    .addItem("📲 Open Direct WhatsApp Chat Link", "menuOpenWhatsAppChat")
    .addItem("🚀 Send Email + WhatsApp for Active Row", "menuSendBothActiveRow")
    .addSeparator()
    .addItem("🧪 Test with Sample Order", "menuTestSampleOrder")
    .addToUi();
}

function menuSetupHeaders() {
  const sheet = getOrCreateOrdersSheet();
  setupSheetHeaders(sheet);
  SpreadsheetApp.getUi().alert("✅ Headers initialized and styled successfully!");
}

function menuSendEmailActiveRow() {
  const order = getActiveRowOrder();
  if (!order) return;
  const res = sendOrderEmail(order);
  SpreadsheetApp.getUi().alert(res.sent ? `✅ Email sent to ${order.email}` : `❌ Email failed: ${res.error}`);
}

function menuSendWhatsAppActiveRow() {
  const order = getActiveRowOrder();
  if (!order) return;
  const res = sendOrderWhatsApp(order);
  if (res.sent) {
    if (res.chat_link) {
      SpreadsheetApp.getUi().alert(`Direct WhatsApp Link:\n${res.chat_link}`);
    } else {
      SpreadsheetApp.getUi().alert(`✅ WhatsApp message sent to ${order.phone} via ${res.provider}!`);
    }
  } else {
    SpreadsheetApp.getUi().alert(`❌ WhatsApp failed: ${res.error}`);
  }
}

function menuOpenWhatsAppChat() {
  const order = getActiveRowOrder();
  if (!order) return;
  
  const cleanPhone = String(order.phone).replace(/\D/g, "");
  let tenDigitPhone = cleanPhone;
  if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) tenDigitPhone = cleanPhone.substring(2);
  if (cleanPhone.length > 10 && cleanPhone.startsWith("0")) tenDigitPhone = cleanPhone.substring(1);

  const msg = getWhatsAppMessageText(order);
  const waUrl = "https://wa.me/91" + tenDigitPhone + "?text=" + encodeURIComponent(msg);

  const html = `<div style="font-family: sans-serif; padding: 10px;">
    <h3>💬 WhatsApp Customer Contact</h3>
    <p>Customer: <strong>${order.customer_name}</strong> (${order.phone})</p>
    <p>Order: <strong>#${order.order_id}</strong> (${order.order_status})</p>
    <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
      👉 Click to Open WhatsApp Chat
    </a>
  </div>`;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "WhatsApp Customer Chat");
}

function menuSendBothActiveRow() {
  const order = getActiveRowOrder();
  if (!order) return;
  const eRes = sendOrderEmail(order);
  const wRes = sendOrderWhatsApp(order);
  SpreadsheetApp.getUi().alert(`Results for Order #${order.order_id}:\n- Email: ${eRes.sent ? '✅ Sent' : '❌ ' + eRes.error}\n- WhatsApp: ${wRes.sent ? '✅ Sent' : '❌ ' + wRes.error}`);
}

function menuTestSampleOrder() {
  const sample = {
    order_id: "GS-TEST-SAMPLE",
    order_date: new Date().toLocaleString(),
    customer_name: "Test Customer",
    phone: "9876543210",
    email: Session.getActiveUser().getEmail(),
    house_number: "No. 42",
    street: "Rainbow Boulevard",
    area: "Wonderland",
    city: "Bangalore",
    district: "Bangalore Urban",
    state: "Karnataka",
    pin_code: "560001",
    landmark: "Opposite Magic Park",
    products: "Fluffy Teddy Bear (x1); Wooden Block Castle (x1)",
    quantity: 2,
    subtotal: 1048,
    discount: 50,
    total_amount: 998,
    payment_id: "PAY-TEST-SAMPLE",
    payment_method: "UPI",
    payment_status: "Verified",
    order_status: "Shipped",
    tracking_number: "BD98234190IN",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sheet = getOrCreateOrdersSheet();
  const row = buildRowArray(sample);
  sheet.appendRow(row);

  const eRes = sendOrderEmail(sample);
  SpreadsheetApp.getUi().alert(`Sample order appended to Sheet!\nTest Email sent to: ${sample.email}\nStatus: ${eRes.sent ? '✅ Success' : '❌ Failed: ' + eRes.error}`);
}

function getActiveRowOrder() {
  const sheet = getOrCreateOrdersSheet();
  const row = sheet.getActiveCell().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert("Please select a data row (row 2 or below), not the header row.");
    return null;
  }

  const values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  return {
    order_id: values[0],
    order_date: values[1],
    customer_name: values[2],
    phone: values[3],
    email: values[4],
    house_number: values[5],
    street: values[6],
    area: values[7],
    city: values[8],
    district: values[9],
    state: values[10],
    pin_code: values[11],
    landmark: values[12],
    products: values[13],
    quantity: values[14],
    subtotal: values[15],
    discount: values[16],
    total_amount: values[17],
    payment_id: values[18],
    payment_method: values[19],
    payment_status: values[20],
    order_status: values[21],
    tracking_number: values[22],
    created_at: values[23],
    updated_at: values[24]
  };
}
