const express = require("express");
const router = express.Router();
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
const db = require("../db"); // Now using the pool
require("dotenv").config();

// Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// POST /api/contact
router.post("/", upload.single("file"), async (req, res) => {
  const { fullName, email, phone, services, comments } = req.body;
  const file = req.file ? req.file.filename : null;

  // Use connection pool to get a connection
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Connection Error:", connErr);
      return res.status(500).json({ error: "Database connection error" });
    }

    const query = `INSERT INTO contacts (name, email, phone, services, comments, file) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [fullName, email, phone, services, comments, file];

    connection.query(query, values, (err, result) => {
      connection.release(); // Important: release connection back to pool

      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Send Email using Hostinger SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_PORT === "465", // true if using port 465
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
                  filename: file,
                  path: path.join(__dirname, "..", "uploads", file),
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
