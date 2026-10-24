const {
  verifySmtpConnection,
  sendEmail,
  sendOrderNotificationEmail,
  generateEmailHtml,
  generateEmailPlainText
} = require('./emailDeliveryService');

module.exports = {
  sendOrderNotificationEmail,
  sendEmail,
  verifySmtpConnection,
  generateEmailTemplate: generateEmailHtml,
  generateEmailHtml,
  generateEmailPlainText
};
