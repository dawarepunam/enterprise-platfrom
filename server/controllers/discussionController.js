// server/controllers/discussionController.js
const Discussion = require('../models/Discussion');

exports.list = async (req, res) => {
  try {
    const { projectId, taskId } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (taskId) filter.taskId = taskId;
    const discussions = await Discussion.find(filter)
      .populate('author', 'name email avatar')
      .populate('replies.author', 'name email avatar')
      .lean();
    res.json({ success: true, data: discussions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'name email avatar')
      .populate('replies.author', 'name email avatar')
      .lean();
    if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.json({ success: true, data: discussion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const discussion = await Discussion.create({ ...req.body, author: req.user?._id || req.body.author });
    res.status(201).json({ success: true, data: discussion });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.json({ success: true, data: discussion });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndDelete(req.params.id);
    if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
    res.json({ success: true, message: 'Discussion removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add a reply to a discussion
exports.addReply = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ success: false, message: 'Discussion not found' });
    discussion.replies.push({ author: req.user?._id || req.body.author, content: req.body.content });
    await discussion.save();
    res.status(201).json({ success: true, data: discussion });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};
