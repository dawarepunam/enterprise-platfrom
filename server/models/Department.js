const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    employeeCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Department || mongoose.model("Department", departmentSchema);
