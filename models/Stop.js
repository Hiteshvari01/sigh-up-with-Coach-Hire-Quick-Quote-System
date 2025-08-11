const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TripQuote',  // Yeh reference TripQuote model ka hoga
    required: true
  },
  location: {
    type: String,
   
  },
  duration: {
     type: String,  // Duration in minutes (integer)
  },
  // 
  stopType: {
    type: String,
    enum: ['going', 'return'],
    default: 'going'
  }
}, { timestamps: true });

module.exports = mongoose.model('Stop', stopSchema);
