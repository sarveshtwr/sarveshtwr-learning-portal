const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });
const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 150 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 170 },
  className: { type: String, required: true, enum: ["9","10","11","12"] },
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  chapterNumber: { type: String, trim: true, maxlength: 30, default: "" },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  coverImage: { type: String, trim: true, maxlength: 1000, default: "" },
  contentHtml: { type: String, required: true }
}, { timestamps: true });
chapterSchema.index({ title: "text", subject: "text", description: "text", chapterNumber: "text" });
module.exports = { Admin: mongoose.model("Admin", adminSchema), Chapter: mongoose.model("Chapter", chapterSchema) };
