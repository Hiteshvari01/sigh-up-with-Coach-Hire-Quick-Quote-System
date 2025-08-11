const mongoose = require("mongoose");

const userDetailsSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TripQuote",
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  lowercase: true
  },
  password: {
    type: String,
    required: true,
    trim: true,
  lowercase: true
  },
  additionalInfo: {
    type: String,
    default: "",
  },
  confirmedDetails: {
    type: Boolean,
    required: true,
  },
  agreedToPrivacyPolicy: {
    type: Boolean,
    required: true,
  },
  whatsappSid:
   { type: String }

});

module.exports = mongoose.model("UserDetails", userDetailsSchema);
