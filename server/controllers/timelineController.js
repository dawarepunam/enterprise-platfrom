// server/controllers/timelineController.js
const TimelineEvent = require('../models/TimelineEvent');

// List timeline events (optionally filter by projectId)
exports.list = async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const events = await TimelineEvent.find(filter).lean();
    res.json({ success: true, data: events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single timeline event by ID
exports.getById = async (req, res) => {
  try {
    const event = await TimelineEvent.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new timeline event
exports.create = async (req, res) => {
  try {
    const event = await TimelineEvent.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update an existing timeline event
exports.update = async (req, res) => {
  try {
    const event = await TimelineEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete a timeline event
exports.remove = async (req, res) => {
  try {
    const event = await TimelineEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
