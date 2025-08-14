// routes/newsletter.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

router.post("/", (req, res) => {
  const { email } = req.body;

  // Basic validation
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const sql = `INSERT INTO newsletter_subscriptions (email) VALUES (?)`;

  db.query(sql, [email], async (err) => {
    if (err) {
      console.error("❌ DB Insert Error:", err);
      return res.status(500).json({ error: "Database error." });
    }

    try {
      // 1️⃣ Email to admin
      const adminMailOptions = {
        from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_RECEIVER,
        subject: "New Newsletter Subscription",
        html: `
          <h3>New Newsletter Subscription</h3>
          <p><strong>Email:</strong> ${email}</p>
        `,
      };
      await sendEmail(adminMailOptions);
      console.log(`✅ Admin notified about new subscription: ${email}`);

      // ✅ Log admin email
      const logAdminSql = `
        INSERT INTO sent_email_logs (recipient_email, subject, body)
        VALUES (?, ?, ?)
      `;
      db.query(logAdminSql, [adminMailOptions.to, adminMailOptions.subject, adminMailOptions.html], (logErr) => {
        if (logErr) console.error("Error logging admin email:", logErr);
      });

      // 2️⃣ Confirmation email to user
      const userMailOptions = {
        from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Newsletter Subscription Confirmed",
        html: `
          <h2>Welcome to Optimal IT Solutions Newsletter!</h2>
          <p>Hi there,</p>
          <p>Thank you for subscribing to our newsletter. You’ll now receive the latest updates, tips, and news directly to your inbox.</p>
          <p>Visit us anytime: <a href="https://optimal-itsolutions.com">optimal-itsolutions.com</a></p>
          <hr />
          <p>- The Optimal IT Solutions Team</p>
        `,
      };
      await sendEmail(userMailOptions);
      console.log(`✅ Confirmation email sent to subscriber: ${email}`);

      // ✅ Log user email
      const logUserSql = `
        INSERT INTO sent_email_logs (recipient_email, subject, body)
        VALUES (?, ?, ?)
      `;
      db.query(logUserSql, [userMailOptions.to, userMailOptions.subject, userMailOptions.html], (logErr) => {
        if (logErr) console.error("Error logging user email:", logErr);
      });

      return res.status(200).json({ success: true, message: "Subscription successful." });
    } catch (emailErr) {
      console.error("❌ Email Error:", emailErr);
      return res.status(500).json({ error: "Email sending failed" });
    }
  });
});

module.exports = router;
