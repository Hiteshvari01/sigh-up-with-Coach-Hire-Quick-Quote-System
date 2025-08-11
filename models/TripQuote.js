const mongoose = require('mongoose');

const tripQuoteSchema = new mongoose.Schema({
  tripType: {
    type: String,
    enum: ['one-way', 'return'], // must match frontend values exactly
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
  }
});

module.exports = mongoose.model('TripQuote', tripQuoteSchema);
