const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../db");
const sendEmail = require("../utils/sendEmail");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), (req, res) => {
  const { fullName, email, country, number, message, privacy } = req.body;
  const file = req.file;

  if (!fullName || !email || !country || !number || !message || !privacy) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Connection Error:", connErr);
      return res.status(500).json({ error: "Database connection error" });
    }

    const query = `
      INSERT INTO consultations (fullName, email, country, number, message, file)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      fullName,
      email,
      country,
      number,
      message,
      file ? file.originalname : null,
    ];

    connection.query(query, values, async (err) => {
      connection.release();

      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }

      // 📧 Send to Admin
      await sendEmail({
        to: process.env.EMAIL_RECEIVER,
        subject: "New Consultation Request",
        html: `
          <h3>New Consultation Submission</h3>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Country:</strong> ${country}</p>
          <p><strong>Number:</strong> ${number}</p>
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
      });

      // 📧 Confirmation to User
      await sendEmail({
        to: email,
        subject: "Consultation Confirmation",
        html: `
          <h2>Hi ${fullName},</h2>
          <p>Thank you for booking a consultation with <strong>Optimal IT Solutions</strong>.</p>
          <p>We will get back to you shortly.</p>
        `,
      });

      res.status(200).json({ message: "Consultation submitted successfully" });
    });
  });
});

module.exports = router;
