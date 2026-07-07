const mongoose = require("mongoose");

const directChatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, trim: true },
    participantIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.DirectChatRoom ||
  mongoose.model("DirectChatRoom", directChatRoomSchema);
