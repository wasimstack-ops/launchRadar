const nodemailer = require('nodemailer');
const env = require('../../config/env');

let transporter = null;

function getTransporter() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: Number(env.smtpPort) === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    return {
      sent: false,
      reason: 'SMTP not configured',
    };
  }

  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

async function sendSubscriptionConfirmation(email) {
  const subject = 'LaunchRadar alerts subscription confirmed';
  const text = 'You are subscribed to LaunchRadar AI news alerts.';
  const html = '<p>You are subscribed to <strong>LaunchRadar</strong> AI news alerts.</p>';
  return sendEmail({ to: email, subject, text, html });
}

module.exports = {
  sendEmail,
  sendSubscriptionConfirmation,
};
