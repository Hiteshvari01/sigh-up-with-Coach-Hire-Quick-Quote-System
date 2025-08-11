const mongoose = require("mongoose");

const tripTimingSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TripQuote", // or the actual model name you're referencing
    required: true
  },
  departureDate: {
    type: String, // or Date if you're parsing it before saving
    required: true
  },
  departureTime: {
    type: String,
    required: true
  },
  returnDate: {
    type: String, // optional if tripType is one-way
    required: false
  },
  returnTime: {
    type: String,
    required: false
  }
});

module.exports = mongoose.model("TripTiming", tripTimingSchema);
