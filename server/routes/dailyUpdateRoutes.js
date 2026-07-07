const express = require('express');
const router  = express.Router();
const controller = require('../controllers/dailyUpdateController');
const protect = require('../middleware/authMiddleware');
const DailyUpdate = require('../models/DailyUpdate');

// All routes require auth
router.use(protect);

// GET /api/daily-updates/user — current user's own updates (with optional ?days=30 or ?date=)
router.get('/user', async (req, res) => {
  try {
    const query = {
      $or: [
        { userId: req.user._id },
        { author: req.user.name },
        { employee: req.user.name },
      ]
    };
    if (req.query.date) {
      query.date = req.query.date;
    } else if (req.query.days) {
      const since = new Date();
      since.setDate(since.getDate() - Number(req.query.days));
      query.createdAt = { $gte: since };
    }
    const docs = await DailyUpdate.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/daily-updates/stats — stats for KPI cards
router.get('/stats', async (req, res) => {
  try {
    const query = {
      $or: [
        { userId: req.user._id },
        { author: req.user.name },
        { employee: req.user.name },
      ]
    };
    const all = await DailyUpdate.find(query).sort({ createdAt: -1 }).lean();
    const total   = all.length;
    const drafts  = all.filter(u => (u.status || '').toLowerCase() === 'draft').length;
    const viewed  = all.filter(u => u.viewedByPM || u.pmViewed).length;

    // streak
    const dates = [...new Set(all.map(u => (u.date || u.createdAt || '').slice(0, 10)))].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (dates[i] === expected.toISOString().slice(0, 10)) streak++;
      else break;
    }

    res.json({ success: true, data: { total, drafts, viewed, streak } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CRUD
router.get('/',    controller.list);
router.get('/:id', controller.getById);
router.post('/',   controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
