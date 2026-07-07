const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    microsoftChannelId: { type: String, trim: true, default: "" },
    teamsWebUrl: { type: String, trim: true, default: "" },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

channelSchema.index({ teamId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Channel || mongoose.model("Channel", channelSchema);
