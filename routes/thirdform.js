const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");
require("dotenv").config();

router.post("/", async (req, res) => {
  try {
    const { fullName, email, phone, message, privacy, services } = req.body;

    // Validation
    if (!fullName || !email || !phone || !message || !privacy) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: "Please select at least one service." });
    }

    const servicesStr = services.join(", ");

    // Insert into DB
    const sql = `
      INSERT INTO third_form_submissions 
      (full_name, email, phone, message, services, privacy) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [fullName, email, phone, message, servicesStr, privacy];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ error: "Database error." });
      }

      // Send Email
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
          from: `"Service Inquiry Form" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: "New Service Inquiry",
          html: `
            <h3>New Service Inquiry Submission</h3>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Services:</strong> ${servicesStr}</p>
            <p><strong>Message:</strong> ${message}</p>
          `,
        };

        transporter.sendMail(mailOptions, (emailErr, info) => {
          if (emailErr) {
            console.error("Email Error:", emailErr);
            return res.status(500).json({ error: "Email sending failed" });
          }

          return res.status(200).json({ success: true, message: "Submission saved and email sent." });
        });
      });
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
