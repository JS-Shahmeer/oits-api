// routes/thirdform.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const sendEmail = require("../utils/sendEmailGraph");
require("dotenv").config();

// POST /api/thirdform
router.post("/", (req, res) => {
  // ✅ Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://www.optimal-itsolutions.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { fullName, email, phone, country, message, privacy, services } = req.body;

    // Validation
    if (!fullName || !email || !phone || !country || !message || !privacy) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: "Please select at least one service." });
    }

    const servicesStr = services.join(", ");

    // Insert into DB
    const sql = `
      INSERT INTO third_form_submissions 
      (full_name, email, phone, country, message, services, privacy) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [fullName, email, phone, country, message, servicesStr, privacy];

    db.query(sql, values, async (err) => {
      if (err) {
        console.error("❌ DB Insert Error:", err);
        return res.status(500).json({ error: "Database error." });
      }

      try {
        // 1️⃣ Email to admin
        const adminMail = {
          from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: "New Service Inquiry",
          html: `
            <h3>New Service Inquiry Submission</h3>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>Services:</strong> ${servicesStr}</p>
            <p><strong>Message:</strong> ${message}</p>
          `,
        };
        await sendEmail(adminMail);
        console.log(`✅ Admin notified about service inquiry from ${fullName}`);

        // Log admin email
        const logSql = `
          INSERT INTO sent_email_logs (recipient_email, subject, body)
          VALUES (?, ?, ?)
        `;
        db.query(logSql, [adminMail.to, adminMail.subject, adminMail.html], (err) => {
          if (err) console.error("Error logging sent email:", err);
        });

        // 2️⃣ Confirmation email to user
        const userMail = {
          from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Thanks for signing up!",
          html: `
          <div style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; color: #333;">
            <p> Hi ${fullName}</p>
            <p>Thanks for reaching out to <strong>Optimal IT Solutions!</strong> We’re excited to bring your ${servicesStr} vision to life. One of our team members will connect with you within 24 hours to discuss your goals and next steps.</p>
            <p>In the meantime, you can visit us at <a href="https://optimal-itsolutions.com"> www.optimal-itsolutions.com </a> or call us at <a href="tel:8887106350"> +1 888-710-6350 </a> anytime.</p>
            <p>Best,</p>
            <p><strong>Team Optimal IT Solutions</strong></p>
          </div>  
            `,
        };
        await sendEmail(userMail);
        console.log(`✅ Confirmation email sent to ${email}`);

        // Log user confirmation email
        db.query(logSql, [userMail.to, userMail.subject, userMail.html], (err) => {
          if (err) console.error("Error logging sent email:", err);
        });

        return res.status(200).json({ success: true, message: "Submission saved and emails sent." });
      } catch (emailErr) {
        console.error("❌ Email Error:", emailErr);
        return res.status(500).json({ error: "Email sending failed" });
      }
    });
  } catch (err) {
    console.error("❌ Server Error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
