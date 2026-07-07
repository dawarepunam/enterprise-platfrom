const mongoose = require("mongoose");

const smtpSettingSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: "custom" },
    host: { type: String, trim: true, default: "" },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    username: { type: String, trim: true, default: "" },
    password: { type: String, trim: true, default: "" },
    fromName: { type: String, trim: true, default: "" },
    fromEmail: { type: String, trim: true, default: "" },
    replyTo: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.SmtpSetting || mongoose.model("SmtpSetting", smtpSettingSchema);
