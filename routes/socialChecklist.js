// routes/socialChecklist.js
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

  const sql = `INSERT INTO social_checklist_submissions (email) VALUES (?)`;

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
        subject: "New Social Media Checklist Request",
        html: `
          <h3>New Social Media Checklist Request</h3>
          <p><strong>Email:</strong> ${email}</p>
        `,
      };
      await sendEmail(adminMailOptions);
      console.log(`✅ Admin notified about new social checklist request: ${email}`);

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
        subject: "Your Social Media Checklist Request",
        html: `
          <h2>Hi there,</h2>
          <p>Thank you for requesting our Social Media Checklist from <strong>Optimal IT Solutions</strong>.</p>
          <p>You will receive your checklist and further guidance shortly.</p>
          <hr />
          <p>Visit our website: <a href="https://optimal-itsolutions.com">optimal-itsolutions.com</a></p>
        `,
      };
      await sendEmail(userMailOptions);
      console.log(`✅ Confirmation email sent to checklist requester: ${email}`);

      // ✅ Log user email
      const logUserSql = `
        INSERT INTO sent_email_logs (recipient_email, subject, body)
        VALUES (?, ?, ?)
      `;
      db.query(logUserSql, [userMailOptions.to, userMailOptions.subject, userMailOptions.html], (logErr) => {
        if (logErr) console.error("Error logging user email:", logErr);
      });

      return res.status(200).json({ success: true, message: "Checklist request submitted." });
    } catch (emailErr) {
      console.error("❌ Email Error:", emailErr);
      return res.status(500).json({ error: "Email sending failed" });
    }
  });
});

module.exports = router;
