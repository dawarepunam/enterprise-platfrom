const LeadAssignment = require("../models/LeadAssignment");

async function list(req, res) {
  const items = await LeadAssignment.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
}

module.exports = { list };
