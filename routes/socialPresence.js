const express = require("express");
const router = express.Router();
const multer = require("multer");
const nodemailer = require("nodemailer");
const db = require("../db");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/socialPresence
router.post("/", upload.single("file"), async (req, res) => {
  const { fullName, email, number, country, message, privacy } = req.body;
  const file = req.file;

  if (!fullName || !email || !number || !country || !message || !privacy) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Connection Error:", connErr);
      return res.status(500).json({ error: "Database connection error" });
    }

    const query = `
    INSERT INTO social_presence_requests (full_name, email, number, country, message, file_name)
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
    connection.query(query, values, (err, result) => {
      connection.release();

      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Database insert failed" });
      }

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
          from: `"Social Media Presence Form" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: "New Social Media Presence Request",
          html: `
            <h3>New Submission Received</h3>
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

        transporter.sendMail(mailOptions, (emailErr, info) => {
          if (emailErr) {
            console.error("Email Error:", emailErr);
            return res.status(500).json({ error: "Email sending failed" });
          }

          return res.status(200).json({ message: "Submission successful" });
        });
      });
    });
  });
});

module.exports = router;
