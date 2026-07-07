const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, unique: true },
    roomId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    projectName: { type: String, trim: true, default: "" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.ChatRoom || mongoose.model("ChatRoom", chatRoomSchema);
