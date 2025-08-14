const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const sendEmail = require("../utils/sendEmail"); // ✅ reusable email function
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/contact
router.post("/", upload.single("file"), async (req, res) => {
  const { fullName, email, phone, services, comments, country } = req.body;
  const file = req.file;

  if (!fullName || !email || !phone || !services || !comments || !country) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Connection Error:", connErr);
      return res.status(500).json({ error: "Database connection error" });
    }

    const query = `
      INSERT INTO contacts (name, email, phone, country, services, comments, file)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      fullName,
      email,
      phone,
      country,
      services,
      comments,
      file ? file.originalname : null,
    ];

    connection.query(query, values, async (err, result) => {
      connection.release();

      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      try {
        // 1️⃣ Email to admin
        await sendEmail({
          to: process.env.EMAIL_RECEIVER,
          subject: "New Contact Form Submission",
          html: `
            <h3>New Contact Request</h3>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>Services:</strong> ${services}</p>
            <p><strong>Comments:</strong> ${comments}</p>
          `,
          attachments: file
            ? [
                {
                  filename: file.originalname,
                  content: file.buffer,
                },
              ]
            : [],
        });

        // 2️⃣ Confirmation email to user
        await sendEmail({
          to: email,
          subject: "We Received Your Contact Request",
          html: `
            <h2>Hi ${fullName},</h2>
            <p>Thank you for reaching out to <strong>Optimal IT Solutions</strong>.</p>
            <p>Our team will get back to you shortly.</p>
            <hr />
            <br/>
            <p>Visit our website: <a href="https://optimal-itsolutions.com">optimal-itsolutions.com</a></p>
          `,
        });

        return res.status(200).json({ message: "Form submitted successfully" });
      } catch (emailErr) {
        console.error("Email Error:", emailErr);
        return res.status(500).json({ error: "Email sending failed" });
      }
    });
  });
});

module.exports = router;
