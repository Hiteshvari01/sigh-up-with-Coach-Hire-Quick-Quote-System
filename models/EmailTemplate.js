const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema({
  name:{type:String,required:true},
  type: { type: String, required: true ,unique: true},   // Accepted / Rejected
  subject: { type: String, required: true },
  body: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
