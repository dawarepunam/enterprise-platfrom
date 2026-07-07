function calculateAttendance(presentDays = 0, totalDays = 0) {
  if (!totalDays) return 0;
  return Math.round((presentDays / totalDays) * 100);
}

module.exports = calculateAttendance;
