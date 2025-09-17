const express = require("express");
const cors = require("cors");
const contactRoute = require("./routes/contact");
const consultationRoute = require("./routes/consultation");
const thirdformRoute = require("./routes/thirdform");
const socialChecklistRoute = require("./routes/socialChecklist");
const socialPresenceRoute = require("./routes/socialPresence");
const newsletterRoute = require("./routes/newsletter");
const ppcHeroFormRoute = require("./routes/ppcHeroForm");
const cron = require("node-cron");
const runReportEmails = require("./jobs/reportEmails"); 
const activityRoutes = require("./routes/activity"); // 👈 FIXED: switched to require
const cookieParser = require("cookie-parser");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads")); // serve uploaded files

// Routes
app.use("/api/contact", contactRoute);
app.use("/api/consultation", consultationRoute);
app.use("/api/thirdform", thirdformRoute);
app.use("/api/socialChecklist", socialChecklistRoute);
app.use("/api/socialPresence", socialPresenceRoute);
app.use("/api/newsletter", newsletterRoute);
app.use("/api/ppcHeroForm", ppcHeroFormRoute);
app.use("/api/activity", activityRoutes); // 👈 activity logger route

// Schedule job: Every 12 hours at minute 0
cron.schedule("0 */12 * * *", () => {
  console.log("⏳ Running 12-hour email report job...");
  runReportEmails();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
