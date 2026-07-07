const mongoose = require("mongoose");

const breakSchema = new mongoose.Schema(
  {
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
  },
  { _id: true }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, trim: true, default: "" },
    employee: { type: String, trim: true, default: "" },
    date: { type: String, required: true, trim: true }, // YYYY-MM-DD
    punchInAt: { type: Date, default: null },
    punchOutAt: { type: Date, default: null },
    breaks: { type: [breakSchema], default: [] },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "WFH", "Holiday", "On Leave", "Weekend"],
      default: "Present",
    },
    totalHours: { type: Number, default: 0 },
    breakHours: { type: Number, default: 0 },
    effectiveHours: { type: Number, default: 0 },
    isLateArrival: { type: Boolean, default: false },
    isEarlyDeparture: { type: Boolean, default: false },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      label: { type: String, trim: true, default: "" },
    },
    selfieUrl: { type: String, trim: true, default: "" },
    deviceInfo: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    // Legacy compatibility fields
    checkIn: { type: String, trim: true, default: "" },
    checkOut: { type: String, trim: true, default: "" },
    checkInAt: { type: String, trim: true, default: "" },
    checkOutAt: { type: String, trim: true, default: "" },
    hours: { type: Number, default: 0 },
    remarks: { type: String, trim: true, default: "" },
    projectName: { type: String, trim: true, default: "" },
  },
  { timestamps: true, strict: false }
);

// Compound index for unique date per user
attendanceRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate hours before save
attendanceRecordSchema.pre("save", async function () {
  if (this.punchInAt) {
    const end = this.punchOutAt || new Date();
    const totalMs = end.getTime() - new Date(this.punchInAt).getTime();
    let breakMs = 0;
    for (const brk of this.breaks) {
      if (brk.startAt) {
        const bEnd = brk.endAt || new Date();
        breakMs += bEnd.getTime() - new Date(brk.startAt).getTime();
      }
    }
    this.totalHours = Math.round((totalMs / 3600000) * 100) / 100;
    this.breakHours = Math.round((breakMs / 3600000) * 100) / 100;
    this.effectiveHours = Math.max(0, Math.round((this.totalHours - this.breakHours) * 100) / 100);
    // Legacy compat
    this.hours = this.effectiveHours;
  }
});

module.exports =
  mongoose.models.AttendanceRecord ||
  mongoose.model("AttendanceRecord", attendanceRecordSchema);
