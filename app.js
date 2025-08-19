const express = require("express"); 
const mongoose = require("mongoose");
const path = require("path");
require('dotenv').config();

const app = express();

// Middleware & View Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection 
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process if DB connection fails
  }
}
connectDB();

// Models
const TripQuote = require("./models/TripQuote");
const Stop = require("./models/Stop");
const tripTiming = require("./models/tripTiming");
const UserDetails = require("./models/UserDetails");

const getDetailedTrips = async () => {
  try {
    const trips = await TripQuote.find({});
    return await Promise.all(trips.map(async (trip) => {
      const goingStops = await Stop.find({ tripId: trip._id, stopType: "going" });
      const returnStops = await Stop.find({ tripId: trip._id, stopType: "return" });
      const timing = await tripTiming.findOne({ tripId: trip._id });
      const user = await UserDetails.findOne({ tripId: trip._id });

      return { trip, goingStops, returnStops, timing, user };
    }));
  } catch (err) {
    console.error("Error fetching detailed trips:", err);
    throw err; // re-throw error to be caught in routes
  }
};

app.get("/", async (req, res) => {
  try {
    res.render("logInPage/index");
  } catch (err) {
    console.error("Error loading logInPage/index:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get(["/1stLink","/dashboard"], async (req, res) => {
  try {
    console.log("Received login:", req.body);
    const detailedTrips = await getDetailedTrips();
    res.render("nav-item/1stLink", { detailedTrips });
  } catch (err) {
    console.error("Error loading dashboard/1stLink:", err);
    res.status(500).send("Something went wrong");
  }
});

// Handle login form submission
app.post("/1stLink", async (req, res) => {
  try {
    console.log("Received login POST");
    const { email, password } = req.body;
    console.log("Email:", email, "Password:", password);

    const detailedTrips = await getDetailedTrips();
    console.log("Fetched detailed trips, count:", detailedTrips.length);

    res.render("nav-item/1stLink", { detailedTrips });
  } catch (err) {
    console.error("Full error:", err.stack || err);
    res.status(500).send("Something went wrong");
  }
});




app.get('/leads-details', async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    res.render('nav-item/leads-details', { detailedTrips });
  } catch (err) {
    console.error("Error loading /leads-details:", err);
    res.status(500).send("Something went wrong");
  }
});
// Delete trip route (using backend redirect)
app.post('/trips/:id/delete', async (req, res) => {
  const tripId = req.params.id;
  try {
    // Delete trip
    await TripQuote.findByIdAndDelete(tripId);
    // Delete related stops, timing, and user details
    await Stop.deleteMany({ tripId });
    await tripTiming.deleteOne({ tripId });
    await UserDetails.deleteOne({ tripId });

    // Redirect back to dashboard/1stLink
    res.redirect('/1stLink');
  } catch (err) {
    console.error("Error deleting trip:", err);
    res.status(500).send("Error deleting trip");
  }
});


app.post('/update-lead-status/:id', async (req, res) => {
    const leadId = req.params.id;
    const { status } = req.body;

    try {
        await Lead.findByIdAndUpdate(leadId, { status }); // status = 'Accepted' / 'Rejected'
        res.json({ success: true });
    } catch(err) {
        console.log(err);
        res.json({ success: false, error: err.message });
    }
});



app.get('/2ndLink', async (req, res) => {
  try {
    // Fetch or define your detailedTrips
    const detailedTrips = await getDetailedTrips(); // example: get all trips

    res.render('nav-item/2ndLink', { detailedTrips }); // Pass it here
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.get('/transactions', (req, res) => {
  try {
    res.render('nav-item/2ndLink'); 
  } catch (err) {
    console.error("Error rendering /transactions:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/3rdLink', (req, res) => {
  try {
    res.render('nav-item/3rdLink'); 
  } catch (err) {
    console.error("Error rendering /3rdLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/users', (req, res) => {
  try {
    res.render('nav-item/3rdLink'); 
  } catch (err) {
    console.error("Error rendering /users:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/4thLink', (req, res) => {
  try {
    res.render('nav-item/4thLink'); 
  } catch (err) {
    console.error("Error rendering /4thLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/emailtemp', (req, res) => {
  try {
    res.render('nav-item/4thLink'); 
  } catch (err) {
    console.error("Error rendering /emailtemp:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/5thLink', (req, res) => {
  try {
    res.render('nav-item/5thLink'); 
  } catch (err) {
    console.error("Error rendering /5thLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/ErchivedLead', (req, res) => {
  try {
    res.render('nav-item/5thLink'); 
  } catch (err) {
    console.error("Error rendering /ErchivedLead:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/6thLink', (req, res) => {
  try {
    res.render('nav-item/6thLink'); 
  } catch (err) {
    console.error("Error rendering /6thLink:", err);
    res.status(500).send("Something went wrong");
  }
});

app.get('/settings', (req, res) => {
  try {
    res.render('nav-item/6thLink'); 
  } catch (err) {
    console.error("Error rendering /settings:", err);
    res.status(500).send("Something went wrong");
  }
});




const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
