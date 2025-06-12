const express = require("express");
const router = express.Router();
const multer = require("multer");
const nodemailer = require("nodemailer");
const db = require("../db");
require("dotenv").config();

// ✅ Use memory storage for Vercel compatibility
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/contact
router.post("/", upload.single("file"), async (req, res) => {
  const { fullName, email, phone, services, comments } = req.body;
  const file = req.file;

  // Use connection pool to get a connection
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Connection Error:", connErr);
      return res.status(500).json({ error: "Database connection error" });
    }

    const query = `INSERT INTO contacts (name, email, phone, services, comments, file) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [
      fullName,
      email,
      phone,
      services,
      comments,
      file ? file.originalname : null, // store original filename
    ];

    connection.query(query, values, (err, result) => {
      connection.release(); // release connection back to pool

      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Set up nodemailer with Hostinger SMTP
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
          from: `"Contact Form" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_RECEIVER,
          subject: "New Contact Form Submission",
          html: `
            <h3>New Contact Request</h3>
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
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
        };

        transporter.sendMail(mailOptions, (emailErr, info) => {
          if (emailErr) {
            console.error("Email Error:", emailErr);
            return res.status(500).json({ error: "Email sending failed" });
          }
          return res.status(200).json({ message: "Form submitted successfully" });
        });
      });
    });
  });
});

module.exports = router;
