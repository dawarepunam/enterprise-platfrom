const mongoose = require("mongoose");

const projectUpdateSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    projectName: { type: String, trim: true, default: "" },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    managerName: { type: String, trim: true, default: "" },
    updateType: {
      type: String,
      enum: ["Daily Update", "Weekly Update", "Risk Alert", "Completion", "Resource Request"],
      default: "Weekly Update",
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    description: { type: String, trim: true, required: true },
    recipients: [{ type: String, trim: true }],
    attachments: [
      {
        name: { type: String, trim: true, default: "" },
        url: { type: String, trim: true, default: "" },
        size: { type: Number, default: 0 },
      },
    ],
    status: { type: String, enum: ["SENT", "READ", "ARCHIVED"], default: "SENT" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.ProjectUpdate || mongoose.model("ProjectUpdate", projectUpdateSchema);
