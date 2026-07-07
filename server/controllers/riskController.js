// server/controllers/riskController.js
const Risk = require('../models/Risk');

exports.list = async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = projectId ? { projectId } : {};
    const risks = await Risk.find(filter).populate('owner', 'name email').lean();
    res.json({ success: true, data: risks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const risk = await Risk.findById(req.params.id).populate('owner', 'name email').lean();
    if (!risk) return res.status(404).json({ success: false, message: 'Risk not found' });
    res.json({ success: true, data: risk });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const risk = await Risk.create(req.body);
    res.status(201).json({ success: true, data: risk });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const risk = await Risk.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!risk) return res.status(404).json({ success: false, message: 'Risk not found' });
    res.json({ success: true, data: risk });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const risk = await Risk.findByIdAndDelete(req.params.id);
    if (!risk) return res.status(404).json({ success: false, message: 'Risk not found' });
    res.json({ success: true, message: 'Risk removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
