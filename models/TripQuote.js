const mongoose = require('mongoose');

const tripQuoteSchema = new mongoose.Schema({
  tripType: {
    type: String,
    enum: ['one-way', 'return','oneway'], // must match frontend values exactly
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  destinationLocation: {
    type: String,
    required: true
  },
  numberOfPeople: {
    type: Number,
    required: true,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Lead status
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected", "Deleted"], // 👈 Deleted bhi add kiya
    default: "Pending"
  },

  // ✨ Soft Delete flags
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('TripQuote', tripQuoteSchema);
