const express = require("express"); 
const mongoose = require("mongoose");
const path = require("path");
require('dotenv').config();
const nodemailer = require('nodemailer');
const cookieParser = require("cookie-parser");

const app = express();

// Middleware & View Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser()); // ✅ Cookie parser

// MongoDB Connection 
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
connectDB();

// Models
const AdminSchema = new mongoose.Schema({
  username:{type: String},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const Admin = mongoose.model("Admin", AdminSchema);

async function createDefaultAdmin() {
  try {
    const exists = await Admin.findOne({ email: "admin@example.com" });
    if (!exists) {
      const admin = new Admin({
        username: "Admin",
        email: "admin@example.com",
        password: "admin123"
      });
      await admin.save();
      console.log("Default admin created");
    } else {
      console.log("Admin already exists");
    }
  } catch (err) {
    console.error("Error creating default admin:", err);
  }
}
createDefaultAdmin();

const TripQuote = require("./models/TripQuote");
const Stop = require("./models/Stop");
const TripTiming = require("./models/tripTiming");
const UserDetails = require("./models/UserDetails");
const EmailTemplate = require("./models/EmailTemplate");

const getDetailedTrips = async () => {
  try {
    const trips = await TripQuote.find({ isDeleted: { $ne: true } });
    return await Promise.all(trips.map(async (trip) => {
      const goingStops = await Stop.find({ tripId: trip._id, stopType: "going" });
      const returnStops = await Stop.find({ tripId: trip._id, stopType: "return" });
      const timing = await TripTiming.findOne({ tripId: trip._id });
      const user = await UserDetails.findOne({ tripId: trip._id });
      return { trip, goingStops, returnStops, timing, user };
    }));
  } catch (err) {
    console.error("Error fetching detailed trips:", err);
    throw err;
  }
};

// ✅ Cookie-based Authentication Middleware
function isAuthenticated(req, res, next) {
  const adminId = req.cookies.adminId;
  if (!adminId) return res.redirect("/"); 
  req.adminId = adminId;
  next();
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ======= Routes =======

// Login POST
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.trim() });
    if (!admin) return res.json({ success: false, message: "Email does not exist" });
    if (admin.password.trim() !== password.trim()) return res.json({ success: false, message: "Incorrect password" });

    // ✅ Set cookie for 1 day
    res.cookie("adminId", admin._id.toString(), { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }); // 1 day
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Root route
app.get("/", (req, res) => {
  if (req.cookies.adminId) {
    return res.redirect("/dashboard"); // agar cookie hai → dashboard
  }
  res.render("logInPage/index", { error: null });
});

// Auth middleware
function isAuthenticated(req, res, next) {
  const adminId = req.cookies.adminId;
  if (!adminId) return res.redirect("/"); // cookie nahi → login
  req.adminId = adminId;
  next();
}

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("adminId");
  res.redirect("/");
});

// Reset Password
app.get("/reset", (req, res) => res.render("logInPage/reset", { error: null }));
app.post("/reset", async (req, res) => {
  try {
    const email = req.body.email.trim();
    const admin = await Admin.findOne({ email });
    if (!admin) return res.render("logInPage/reset", { error: "Email does not exist!" });
    res.render("logInPage/new_pass", { email, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Update password from reset
app.post("/update-password", async (req, res) => {
  try {
    const { email, pass, conpass } = req.body;
    if (pass !== conpass) return res.render("logInPage/new_pass", { email, error: "Passwords do not match!" });
    await Admin.findOneAndUpdate({ email: email.trim() }, { password: pass.trim() });
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ======= Protected Routes =======

// Dashboard & 1stLink
app.get(["/1stLink", "/dashboard"], isAuthenticated, async (req, res) => {
  try {
    const trips = await TripQuote.find({ isDeleted: { $ne: true } });
    const detailedTrips = await Promise.all(trips.map(async (trip) => {
      const goingStops = await Stop.find({ tripId: trip._id, stopType: "going" });
      const returnStops = await Stop.find({ tripId: trip._id, stopType: "return" });
      const timing = await TripTiming.findOne({ tripId: trip._id });
      const user = await UserDetails.findOne({ tripId: trip._id });
      return { trip, goingStops, returnStops, timing, user };
    }));
    const admin = await Admin.findById(req.adminId);
    res.render("nav-item/1stLink", { detailedTrips, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// Leads Details
app.get('/leads-details', isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.adminId);
    res.render('nav-item/leads-details', { detailedTrips, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// Delete Lead (soft delete)
app.delete("/delete-lead/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLead = await TripQuote.findByIdAndUpdate(
      id,
      { isDeleted: true, status: "Deleted", deletedAt: new Date() },
      { new: true }
    );
    if (!deletedLead) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true, message: "Lead soft deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Restore Lead
app.post('/restore-lead/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = await TripQuote.findOneAndUpdate(
      { _id: leadId, isDeleted: true },
      { isDeleted: false, status: 'Pending', deletedAt: null },
      { new: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found or not deleted" });
    res.json({ success: true, message: "Lead restored successfully", lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error while restoring lead" });
  }
});

// Update Lead Status & Send Email
app.post('/update-lead-status', isAuthenticated, async (req, res) => {
  try {
    const { leadId, status } = req.body;
    if (!leadId || !status) return res.status(400).json({ success: false, message: 'Lead ID and status are required' });

    const currentLead = await TripQuote.findById(leadId);
    if (!currentLead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (currentLead.status !== 'Pending') return res.status(403).json({ success: false, message: `Status is already ${currentLead.status}` });

    const lead = await TripQuote.findByIdAndUpdate(leadId, { status: status.trim() }, { new: true });
    const user = await UserDetails.findOne({ tripId: lead._id });
    const tripTiming = await TripTiming.findOne({ tripId: lead._id });
    const goingStops = await Stop.find({ tripId: lead._id, stopType: 'going' });
    const returnStops = await Stop.find({ tripId: lead._id, stopType: 'return' });

    if (user && user.email) {
      const template = await EmailTemplate.findOne({ type: lead.status });
      if (!template) return res.status(500).json({ success: false, message: 'Email template not found!' });

      let emailBody = template.body
        .replace(/{{userName}}/g, user.fullName || "")
        .replace(/{{pickup}}/g, lead.pickupLocation || "")
        .replace(/{{destination}}/g, lead.destinationLocation || "")
        .replace(/{{tripType}}/g, lead.tripType || "")
        .replace(/{{departureDate}}/g, tripTiming?.departureDate || "-")
        .replace(/{{departureTime}}/g, tripTiming?.departureTime || "-")
        .replace(/{{returnDate}}/g, tripTiming?.returnDate || "No return")
        .replace(/{{returnTime}}/g, tripTiming?.returnTime || "-")
        .replace(/{{goingStops}}/g, goingStops.map(s => `${s.location} (${s.duration || "-"})`).join(", ") || "None")
        .replace(/{{returnStops}}/g, returnStops.map(s => `${s.location} (${s.duration || "-"})`).join(", ") || "None")
        .replace(/{{passengers}}/g, lead.numberOfPeople || "0")
        .replace(/\n/g, '<br>');

      await transporter.sendMail({
        from: `"Bus Hire Service" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: template.subject,
        html: emailBody
      });
      console.log(`📧 Email sent to ${user.email} using template: ${lead.status}`);
    }

    res.json({ success: true, message: `Status updated to ${lead.status}`, lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Transactions & 2ndLink
app.get(['/2ndLink','/transactions'], isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.adminId);
    res.render('nav-item/2ndLink',{ detailedTrips, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// Users & 3rdLink
app.get(['/3rdLink','/users'], isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const userTripCount = {};
    detailedTrips.forEach(({ user }) => { if(user?.email) userTripCount[user.email] = (userTripCount[user.email]||0)+1 });

    const uniqueUsers = [];
    detailedTrips.forEach(({ user, trip, goingStops, returnStops, timing }) => {
      if (!user?.email) return;
      let existingUser = uniqueUsers.find(u => u.email === user.email);
      const tripDetails = { trip, goingStops, returnStops, timing };
      if (existingUser) existingUser.trips.push(tripDetails);
      else uniqueUsers.push({ ...user.toObject(), trips: [tripDetails] });
    });

    const admin = await Admin.findById(req.adminId);
    res.render('nav-item/3rdLink', { uniqueUsers, userTripCount, admin, detailedTrips });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// User detail page
app.get('/user/:email', isAuthenticated, async (req, res) => {
  try {
    const userEmail = req.params.email;
    const detailedTrips = await getDetailedTrips();
    const userTrips = detailedTrips.filter(t => t.user?.email === userEmail);
    const userInfo = userTrips[0]?.user || {};
    res.render('user-detail', { user: userInfo, trips: userTrips });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 4thLink & Email Template
app.get(['/4thLink','/emailtemplate'], isAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    const templates = await EmailTemplate.find();
    res.render('nav-item/4thLink', { templates, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

// Update email template
app.post('/update-email-template', isAuthenticated, async (req, res) => {
  try {
    const { id, subject, body } = req.body;
    await EmailTemplate.findByIdAndUpdate(id, { subject, body });
    res.redirect('/4thLink');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating template");
  }
});

// Archived / Deleted Leads
app.get(['/ErchivedLead','/5thLink'], isAuthenticated, async (req, res) => {
  try {
    const deletedTrips = await TripQuote.find({ isDeleted: true });
    const detailedTrips = await Promise.all(deletedTrips.map(async (trip) => {
      const goingStops = await Stop.find({ tripId: trip._id, stopType: "going" });
      const returnStops = await Stop.find({ tripId: trip._id, stopType: "return" });
      const timing = await TripTiming.findOne({ tripId: trip._id });
      const user = await UserDetails.findOne({ tripId: trip._id });
      return { trip, goingStops, returnStops, timing, user };
    }));
    const admin = await Admin.findById(req.adminId);
    res.render("nav-item/5thLink", { detailedTrips, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Settings & 6thLink
app.get(['/6thLink','/settings'], isAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    res.render("nav-item/6thLink", { admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Update Profile
app.post('/update-profile', isAuthenticated, async (req, res) => {
  try {
    const { adminId, username, email } = req.body;
    if (!username || !email) return res.status(400).send("Name and email are required");
    await Admin.findByIdAndUpdate(adminId, { username: username.trim(), email: email.trim() });
    res.redirect('/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Update Password in settings
app.post('/update-password-settings', isAuthenticated, async (req, res) => {
  try {
    const { email, currentPassword, pass, conpass } = req.body;
    const admin = await Admin.findOne({ email: email.trim() });
    if (!admin) return res.status(400).send("Admin not found");
    if (admin.password !== currentPassword.trim()) return res.status(400).send("Current password is incorrect");
    if (pass !== conpass) return res.status(400).send("Passwords do not match");
    await Admin.findOneAndUpdate({ email: email.trim() }, { password: pass.trim() });
    res.redirect('/settings');
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Logout page view
app.get("/logout-page", isAuthenticated, (req, res) => {
  res.render("logInPage/logout", { error: null });
});

// Logout POST
app.post("/logout", (req, res) => {
  res.clearCookie("adminId");
  res.redirect("/");
});

// ======= Server =======
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
