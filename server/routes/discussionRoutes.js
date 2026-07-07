// server/routes/discussionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const discussionController = require('../controllers/discussionController');

router.use(authMiddleware);

router.get('/', discussionController.list);
router.get('/:id', discussionController.getById);
router.post('/', discussionController.create);
router.put('/:id', discussionController.update);
router.delete('/:id', discussionController.remove);
router.post('/:id/replies', discussionController.addReply);

module.exports = router;
