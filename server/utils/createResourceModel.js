const mongoose = require("mongoose");

function createResourceModel(modelName) {
  const schema = new mongoose.Schema(
    {
      title: { type: String, trim: true },
      name: { type: String, trim: true },
      status: { type: String, default: "ACTIVE" },
      description: { type: String, trim: true },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      owner: { type: String, trim: true },
      createdByRole: { type: String, trim: true },
      clientId: { type: String, trim: true, default: "" },
      projectName: { type: String, trim: true, default: "" },
      taskTitle: { type: String, trim: true, default: "" },
      employee: { type: String, trim: true, default: "" },
      userName: { type: String, trim: true, default: "" },
      amount: { type: Number, default: 0 },
      hours: { type: Number, default: 0 },
      date: { type: String, trim: true, default: "" },
      fromDate: { type: String, trim: true, default: "" },
      toDate: { type: String, trim: true, default: "" },
      reason: { type: String, trim: true, default: "" },
      category: { type: String, trim: true, default: "" },
      receipt: { type: String, trim: true, default: "" },
      purpose: { type: String, trim: true, default: "" },
      role: { type: String, trim: true, default: "" },
      productivity: { type: String, trim: true, default: "" },
      note: { type: String, trim: true, default: "" },
    },
    { timestamps: true, strict: false },
  );

  return mongoose.models[modelName] || mongoose.model(modelName, schema);
}

module.exports = createResourceModel;
