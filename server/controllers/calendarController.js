// server/controllers/calendarController.js
const CalendarEvent = require('../models/CalendarEvent');

// List calendar events (optionally filter by projectId, date range)
exports.list = async (req, res) => {
  try {
    const { projectId, start, end } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (start) filter.date = { ...(filter.date || {}), $gte: start };
    if (end) filter.date = { ...(filter.date || {}), $lte: end };
    const events = await CalendarEvent.find(filter).lean();
    res.json({ success: true, data: events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const event = await CalendarEvent.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
