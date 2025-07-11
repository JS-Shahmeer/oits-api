const express = require("express");
const cors = require("cors");
const contactRoute = require("./routes/contact");
const consultationRoute = require("./routes/consultation");
const thirdformRoute = require("./routes/thirdform");
const socialChecklistRoute = require("./routes/socialChecklist");
const socialPresenceRoute = require("./routes/socialPresence");
const newsletterRoute = require("./routes/newsletter");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); // serve uploaded files
app.use("/api/contact", contactRoute);
app.use("/api/consultation", consultationRoute);
app.use("/api/thirdform", thirdformRoute);
app.use("/api/socialChecklist", socialChecklistRoute);
app.use("/api/socialPresence", socialPresenceRoute);
app.use("/api/newsletter", newsletterRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
