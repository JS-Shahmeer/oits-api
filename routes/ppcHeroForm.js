// routes/ppcHeroForm.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ppcHeroForm
router.post("/", upload.single("file"), (req, res) => {
  const { fullName, email, number, country, message, privacy } = req.body;
  const file = req.file;

  if (!fullName || !email || !number || !country || !message || !privacy) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("❌ Connection Error:", connErr);
      return res.status(500).json({ error: "Database connection error" });
    }

    const query = `
      INSERT INTO ppc_hero_requests (full_name, email, number, country, message, file_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      fullName,
      email,
      number,
      country,
      message,
      file ? file.originalname : null,
    ];

    connection.query(query, values, async (err) => {
      connection.release();

      if (err) {
        console.error("❌ DB Error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }

      try {
        // 1️⃣ Email to admin
        const adminMail = {
          from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: "New PPC Hero Form Submission",
          html: `
            <h3>New PPC Hero Form Submission</h3>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Number:</strong> ${number}</p>
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>Message:</strong> ${message}</p>
          `,
          attachments: file
            ? [
                {
                  filename: file.originalname,
                  content: file.buffer,
                },
              ]
            : [],
        };
        await sendEmail(adminMail);
        console.log(
          `✅ Admin notified about PPC Hero request from ${fullName}`
        );

        // Log admin email
        const logSql = `
          INSERT INTO sent_email_logs (recipient_email, subject, body)
          VALUES (?, ?, ?)
        `;
        db.query(
          logSql,
          [adminMail.to, adminMail.subject, adminMail.html],
          (err) => {
            if (err) console.error("Error logging sent email:", err);
          }
        );

        // 2️⃣ Confirmation email to user
        const userMail = {
          from: `"Optimal IT Solutions" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Thanks for signing up!",
          html: `
            <h3> Hi <strong>${fullName}</strong></h3>
            <p>Thanks for reaching out to Optimal IT Solutions! We’re excited to bring your  vision to life. One of our team members will connect with you within 24 hours to discuss your goals and next steps.</p>
            <p>In the meantime, you can visit us at <a href="https://optimal-itsolutions.com"> www.optimal-itsolutions.com </a> or call us at <a href="tel:8887106350"> +1 888-710-6350 </a> anytime.</p>
            <p>Best,</p>
            <p><strong>Team Optimal IT Solutions</strong></p>
            `,
        };
        await sendEmail(userMail);
        console.log(`✅ Confirmation email sent to ${email}`);

        // Log user email
        db.query(
          logSql,
          [userMail.to, userMail.subject, userMail.html],
          (err) => {
            if (err) console.error("Error logging sent email:", err);
          }
        );

        return res.status(200).json({ message: "Submission successful" });
      } catch (emailErr) {
        console.error("❌ Email Error:", emailErr);
        return res.status(500).json({ error: "Email sending failed" });
      }
    });
  });
});

module.exports = router;
