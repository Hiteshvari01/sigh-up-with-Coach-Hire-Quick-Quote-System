const mongoose = require("mongoose");
const dotenv = require("dotenv");
const EmailTemplate = require("./models/EmailTemplate");

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

async function createDefaultTemplates() {
  const templates = [
    {
      type: "Accepted",
      subject: "Your Trip has been Accepted ✅",
      body: `Hello {{userName}},\n\nYour trip from {{pickup}} to {{destination}} is CONFIRMED.\n\nDeparture: {{departureDate}} {{departureTime}}\nReturn: {{returnDate}} {{returnTime}}\n\nThanks for booking with us!`
    },
    {
      type: "Rejected",
      subject: "Your Trip has been Rejected ❌",
      body: `Hello {{userName}},\n\nUnfortunately your trip from {{pickup}} to {{destination}} has been REJECTED.\n\nPlease contact support for more info.`
    }
  ];

  for (let t of templates) {
    const exists = await EmailTemplate.findOne({ type: t.type });
    if (!exists) {
      await new EmailTemplate(t).save();
      console.log(`✅ Default template for ${t.type} created`);
    } else {
      console.log(`ℹ️ Template for ${t.type} already exists`);
    }
  }

  mongoose.connection.close(); // ✅ connection close kar dena jab kaam ho jaye
}

// Run seeding
connectDB().then(createDefaultTemplates);
