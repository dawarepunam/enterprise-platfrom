const mongoose = require("mongoose");

const microsoftAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    microsoftUserId: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    connected: { type: Boolean, default: false },
    accessToken: { type: String, trim: true, default: "" },
    refreshToken: { type: String, trim: true, default: "" },
    scopes: [{ type: String, trim: true }],
    tokenType: { type: String, trim: true, default: "Bearer" },
    tokenExpiry: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.models.MicrosoftAccount || mongoose.model("MicrosoftAccount", microsoftAccountSchema);
