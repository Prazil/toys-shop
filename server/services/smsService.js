const {
  verifyWhatsAppProvider,
  sendWhatsApp,
  sendOrderNotificationWhatsApp,
  getDirectWhatsAppUrl
} = require('./whatsappDeliveryService');

const {
  verifySmsProvider,
  sendSMS,
  sendOrderNotificationSMS,
  handleSmsDeliveryWebhook
} = require('./smsDeliveryService');

module.exports = {
  // WhatsApp primary delivery
  verifyWhatsAppProvider,
  sendWhatsApp,
  sendOrderNotificationWhatsApp,
  getDirectWhatsAppUrl,

  // Route legacy SMS calls to WhatsApp for seamless automatic transition
  sendOrderNotificationSMS: sendOrderNotificationWhatsApp,
  sendSMS: sendWhatsApp,
  verifySmsProvider: verifyWhatsAppProvider,
  handleSmsDeliveryWebhook
};
