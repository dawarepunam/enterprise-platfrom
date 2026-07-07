// server/controllers/ganttController.js
const GanttMilestone = require('../models/GanttMilestone');

// List all milestones (optionally filter by projectId)
exports.list = async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const milestones = await GanttMilestone.find(filter).lean();
    res.json({ success: true, data: milestones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single milestone by ID
exports.getById = async (req, res) => {
  try {
    const milestone = await GanttMilestone.findById(req.params.id).lean();
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    res.json({ success: true, data: milestone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new milestone
exports.create = async (req, res) => {
  try {
    const milestone = await GanttMilestone.create(req.body);
    res.status(201).json({ success: true, data: milestone });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update an existing milestone
exports.update = async (req, res) => {
  try {
    const milestone = await GanttMilestone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    res.json({ success: true, data: milestone });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete a milestone
exports.remove = async (req, res) => {
  try {
    const milestone = await GanttMilestone.findByIdAndDelete(req.params.id);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    res.json({ success: true, message: 'Milestone removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
