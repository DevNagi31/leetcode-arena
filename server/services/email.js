const nodemailer = require('nodemailer');

// Build a transporter from SMTP env vars. If they're not configured we fall
// back to a "console" transport in non-production so local dev still works
// without an external provider.
let transporter = null;

const isConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

function getTransporter() {
  if (transporter) return transporter;

  if (isConfigured) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587/STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // No SMTP configured. In production this is a misconfiguration; elsewhere
    // we stream messages to the console so reset codes are still observable.
    if (process.env.NODE_ENV === 'production') {
      console.error('EMAIL: SMTP is not configured; emails will not be delivered.');
    }
    transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  }

  return transporter;
}

const FROM = process.env.EMAIL_FROM || 'no-reply@leetcode-arena.local';

/**
 * Send an email. Resolves on success; logs and rethrows on failure so callers
 * can decide whether to surface the error.
 */
async function sendEmail({ to, subject, text, html }) {
  const tx = getTransporter();
  const info = await tx.sendMail({ from: FROM, to, subject, text, html });

  // streamTransport returns the raw message as a buffer — print it in dev.
  if (!isConfigured && info.message) {
    console.log(`[dev email] to=${to} subject="${subject}"\n${info.message.toString()}`);
  }
  return info;
}

/**
 * Send a password reset code.
 */
async function sendPasswordResetCode(to, code) {
  const subject = 'Your LeetCode Arena password reset code';
  const text =
    `Your password reset code is: ${code}\n\n` +
    `This code expires in 15 minutes. If you didn't request a password reset, you can ignore this email.`;
  const html =
    `<p>Your password reset code is:</p>` +
    `<p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>` +
    `<p>This code expires in 15 minutes. If you didn't request a password reset, you can ignore this email.</p>`;

  return sendEmail({ to, subject, text, html });
}

/**
 * Send an email-verification code (used at signup).
 */
async function sendVerificationCode(to, code) {
  const subject = 'Verify your LeetCode Arena email';
  const text =
    `Welcome to LeetCode Arena!\n\n` +
    `Your email verification code is: ${code}\n\n` +
    `This code expires in 15 minutes. If you didn't sign up, you can ignore this email.`;
  const html =
    `<p>Welcome to LeetCode Arena!</p>` +
    `<p>Your email verification code is:</p>` +
    `<p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>` +
    `<p>This code expires in 15 minutes. If you didn't sign up, you can ignore this email.</p>`;

  return sendEmail({ to, subject, text, html });
}

module.exports = { sendEmail, sendPasswordResetCode, sendVerificationCode, isEmailConfigured: isConfigured };
