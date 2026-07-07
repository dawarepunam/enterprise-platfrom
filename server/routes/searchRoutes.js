const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) return res.json({ success: true, data: [] });

    const regex = new RegExp(query, 'i');

    const [projects, tasks, meetings, users] = await Promise.all([
      Project.find({ $or: [{ name: regex }, { description: regex }] }).limit(5),
      Task.find({ $or: [{ title: regex }, { name: regex }, { description: regex }] }).limit(5),
      Meeting.find({ $or: [{ title: regex }, { name: regex }, { description: regex }] }).limit(5),
      User.find({ $or: [{ name: regex }, { email: regex }] }).limit(5)
    ]);

    const results = [
      ...projects.map(p => ({ type: 'Project', id: p._id || p.id, title: p.name || p.projectName, url: `/employee/project-detail?id=${p._id || p.id}` })),
      ...tasks.map(t => ({ type: 'Task', id: t._id || t.id, title: t.title || t.name, url: `/employee/task-detail?id=${t._id || t.id}` })),
      ...meetings.map(m => ({ type: 'Meeting', id: m._id || m.id, title: m.title || m.name, url: `/employee/meetings` })),
      ...users.map(u => ({ type: 'User', id: u._id || u.id, title: u.name, url: `/employee/profile?id=${u._id || u.id}` }))
    ];

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: 'Server error during search' });
  }
});

module.exports = router;
