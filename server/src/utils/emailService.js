const nodemailer = require('nodemailer');
const { EMAIL_PROVIDER_MODE, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = require('../config/env');

let transporter = null;

// Initialize transporter if in production or if SMTP config is provided
if (EMAIL_PROVIDER_MODE === 'production' || (SMTP_HOST && SMTP_USER && SMTP_PASSWORD)) {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    console.error('CRITICAL: Missing SMTP configuration for email service.');
    // Fail safely on startup in production if configured incorrectly
    if (EMAIL_PROVIDER_MODE === 'production') {
      console.error('Halting because EMAIL_PROVIDER_MODE=production without valid SMTP credentials.');
      process.exit(1);
    }
  } else {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });
  }
}

/**
 * Send an email using Nodemailer.
 * If in development mode and SMTP is not configured, logs to console (OTP safely).
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async (options) => {
  const { to, subject, html, text } = options;

  if (transporter) {
    try {
      const mailOptions = {
        from: SMTP_FROM || '"GlentroSalon" <noreply@glentrosalon.com>',
        to,
        subject,
        html,
        text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      // Log technical errors securely on backend. Never expose SMTP credentials.
      console.error(`Failed to send email to ${to}:`, error.message);
      throw new Error('Failed to send email');
    }
  } else if (EMAIL_PROVIDER_MODE === 'development') {
    // Development mode fallback: Log email content to console
    console.log('==================================================');
    console.log(`DEVELOPMENT MODE: Simulated Email Delivery to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Content (HTML):');
    console.log(html || text);
    console.log('==================================================');
    return true;
  } else {
    // Should never reach here if config validation at top works, but just in case
    console.error('Email service is not configured correctly for production.');
    throw new Error('Email service configuration error');
  }
};

module.exports = {
  sendEmail,
};
