// routes/newsletter.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");
require("dotenv").config();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    // Basic validation
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Insert into DB
    const sql = `
      INSERT INTO newsletter_subscriptions (email)
      VALUES (?)
    `;

    db.query(sql, [email], (err, result) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ error: "Database error." });
      }

      // Setup email transport
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_PORT === "465",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      transporter.verify((smtpErr, success) => {
        if (smtpErr) {
          console.error("SMTP Error:", smtpErr);
          return res.status(500).json({ error: "SMTP connection failed" });
        }

        const mailOptions = {
          from: `"Social Media Checklist" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: "New Newsletter Subscription",
          html: `
            <h3>New Newsletter Subscription</h3>
            <p><strong>Email:</strong> ${email}</p>
          `,
        };

        transporter.sendMail(mailOptions, (emailErr, info) => {
          if (emailErr) {
            console.error("Email Error:", emailErr);
            return res.status(500).json({ error: "Email sending failed" });
          }

          return res.status(200).json({ success: true, message: "Subscription successful." });
        });
      });
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
