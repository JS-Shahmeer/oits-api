const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail({ to, subject, html, attachments = [] }) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter.sendMail({
    from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = sendEmail;
