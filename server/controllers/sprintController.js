// server/controllers/sprintController.js
const Sprint = require('../models/Sprint');

exports.list = async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const sprints = await Sprint.find(filter).populate('tasks').lean();
    res.json({ success: true, data: sprints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id).populate('tasks').lean();
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    res.json({ success: true, data: sprint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const sprint = await Sprint.create(req.body);
    res.status(201).json({ success: true, data: sprint });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    res.json({ success: true, data: sprint });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndDelete(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });
    res.json({ success: true, message: 'Sprint removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
