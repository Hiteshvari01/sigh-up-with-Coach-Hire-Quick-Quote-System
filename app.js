const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require('dotenv').config();
const nodemailer = require('nodemailer');
const session = require("express-session");   // ✅ Add session

const app = express();

// Middleware & View Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Session middleware
app.use(session({
  secret: "yourSecretKey123",   // isko .env me rakhna better hoga
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // https use kar rahe ho to true karna
}));

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

// Insert default admin only if it doesn't exist
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

const getDetailedTrips = async () => {
  try {
    const trips = await TripQuote.find({});
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

// ✅ Authentication Middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    return res.redirect("/");
  }
}

// Login Page
app.get("/", (req, res) => {
  res.render("logInPage/index", { error: null });
});

// /login route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.trim() });
    if (!admin) {
      return res.json({ success: false, message: "Email does not exist" });
    }
    if (admin.password.trim() !== password.trim()) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    // ✅ Save session
    req.session.adminId = admin._id;
    req.session.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// ✅ Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Reset Page
app.get("/reset", (req, res) => {
  res.render("logInPage/reset", { error: null });
});

// Reset email check
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

// Update password
app.post("/update-password", async (req, res) => {
  try {
    const { email, pass, conpass } = req.body;
    if (pass !== conpass) {
      return res.render("logInPage/new_pass", { email, error: "Passwords do not match!" });
    }
    await Admin.findOneAndUpdate({ email: email.trim() }, { password: pass.trim() });
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Protected Routes (dashboard and others)
app.get(["/1stLink","/dashboard"], isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render("nav-item/1stLink", { detailedTrips, admin });
  } catch (err) {
    console.error("Error loading dashboard/1stLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/leads-details', isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/leads-details', { detailedTrips, admin });
  } catch (err) {
    console.error("Error loading /leads-details:", err);
    res.status(500).send("Something went wrong");
  }
});

app.delete('/delete-lead/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await TripQuote.findByIdAndDelete(id);
    if(!deleted) return res.status(404).json({ success: false, message: "Lead not found" });
    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Twilio
const twilio = require("twilio");
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
app.post('/update-lead-status', isAuthenticated, async (req, res) => { 
  try {
    const { leadId, status } = req.body;
    if (!leadId || !status) {
      return res.status(400).json({ success: false, message: 'Lead ID and status are required' });
    }

    const lead = await TripQuote.findByIdAndUpdate(leadId,{ status },{ new: true });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const user = await UserDetails.findOne({ tripId: lead._id });
    if (user && user.phoneNumber) {
      const tripTiming = await TripTiming.findOne({ tripId: lead._id });
      const goingStops = await Stop.find({ tripId: lead._id, stopType: 'going' });
      const returnStops = await Stop.find({ tripId: lead._id, stopType: 'return' });

      const msgBody = `
Hello ${user.fullName}! 📋

🚌 Trip Type: ${lead.tripType}
📍 Pickup: ${lead.pickupLocation}
📍 Destination: ${lead.destinationLocation}
📅 Departure: ${tripTiming?.departureDate || '-'} at ${tripTiming?.departureTime || '-'}
📅 Return: ${tripTiming?.returnDate || 'No return'} at ${tripTiming?.returnTime || '-'}

🛑 Going Stops: ${goingStops.length ? goingStops.map(s => `${s.location} (${s.duration || '-'})`).join(', ') : 'None'}
🔄 Return Stops: ${returnStops.length ? returnStops.map(s => `${s.location} (${s.duration || '-'})`).join(', ') : 'None'}

👥 Passengers: ${lead.numberOfPeople}
💰 Status: ${status === "Accepted" ? "✅ CONFIRMED" : status === "Rejected" ? "❌ REJECTED" : status}
`;

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: `whatsapp:+91${user.phoneNumber}`,
        body: msgBody
      });

      console.log(`✅ WhatsApp message sent to ${user.phoneNumber}`);
    }

    res.json({ success: true, message: `Status updated to ${status}`, lead });
  } catch (err) {
    console.error("❌ Error in /update-lead-status:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Other Links with protection
app.get('/2ndLink', isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/2ndLink', { detailedTrips, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/transactions', isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/2ndLink',{ detailedTrips, admin }); 
  } catch (err) {
    console.error("Error rendering /transactions:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/3rdLink', isAuthenticated, async(req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId);  
    res.render('nav-item/3rdLink', { detailedTrips, admin }); 
  } catch (err) {
    console.error("Error rendering /3rdLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/users', isAuthenticated, async(req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/3rdLink',{ detailedTrips, admin }); 
  } catch (err) {
    console.error("Error rendering /users:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/4thLink', isAuthenticated, async(req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/4thLink',{ detailedTrips, admin }); 
  } catch (err) {
    console.error("Error rendering /4thLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/emailtemp', isAuthenticated, async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/4thLink',{ detailedTrips ,admin}); 
  } catch (err) {
    console.error("Error rendering /emailtemp:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/5thLink', isAuthenticated, async(req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/5thLink',{ detailedTrips, admin }); 
  } catch (err) {
    console.error("Error rendering /5thLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/ErchivedLead', isAuthenticated,async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    const admin = await Admin.findById(req.session.adminId); 
    res.render('nav-item/5thLink',{ detailedTrips, admin }); 
  } catch (err) {
    console.error("Error rendering /ErchivedLead:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get("/6thLink", isAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    res.render("nav-item/6thLink", { admin });  
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/settings", isAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findById(req.session.adminId);
    res.render("nav-item/6thLink", { admin });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.post('/update-profile', isAuthenticated, async (req, res) => {
  try {
    const { adminId, username, email } = req.body;
    if (!username || !email) {
      return res.status(400).send("Name and email are required");
    }
    await Admin.findByIdAndUpdate(adminId, { username: username.trim(), email: email.trim() });
    res.redirect('/settings');
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Server error");
  }
});

app.post('/update-password', isAuthenticated, async (req, res) => {
  try {
    const { email, currentPassword, pass, conpass } = req.body;
    const admin = await Admin.findOne({ email: email.trim() });
    if (!admin) return res.status(400).send("Admin not found");
    if (admin.password !== currentPassword.trim()) {
      return res.status(400).send("Current password is incorrect");
    }
    if (pass !== conpass) {
      return res.status(400).send("Passwords do not match");
    }
    await Admin.findOneAndUpdate({ email: email.trim() }, { password: pass.trim() });
    res.redirect('/settings');
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).send("Server error");
  }
});

// Logout Page
app.get("/logout-page", isAuthenticated, async (req, res) => {
  res.render("logInPage/logout", { error: null });
});

app.post("/logout", (req, res) => {
  if (req.session.adminId) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("/dashboard");
      }
      return res.redirect("/"); // ✅ Login page
    });
  } else {
    return res.redirect("/"); // agar session hi nahi hai tab bhi login page bhej do
  }
});



const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
