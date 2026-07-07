const Attendance = require("../models/Attendance");

async function runAttendanceJob() {
  const today = new Date();
  const records = await Attendance.countDocuments();

  return {
    job: "attendance",
    executedAt: today,
    recordsTracked: records,
  };
}

module.exports = runAttendanceJob;
