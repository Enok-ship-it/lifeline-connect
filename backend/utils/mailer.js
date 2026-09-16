// utils/mailer.js
//
// Sends real emails IF the .env file has SMTP details filled in.
// If not (e.g. during development, or before you've set up an email
// account), it just logs the email to the console instead of crashing
// or blocking the app. This means the notification FEATURE always works
// and is always demoable, even before you've configured real email.

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // not configured - caller will fall back to logging
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for port 465, false for 587/others
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

/**
 * Sends an email, or logs it to the console if email isn't configured yet.
 * Never throws - a failed notification should never break the actual
 * feature (e.g. posting a request) it's attached to.
 */
async function sendEmail({ to, subject, text }) {
  const t = getTransporter();

  if (!t) {
    console.log("\n---- [Email not configured - logging instead] ----");
    console.log(`To: ${to}\nSubject: ${subject}\n${text}`);
    console.log("---------------------------------------------------\n");
    return { sent: false, logged: true };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error("Email failed to send:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
