const express = require('express');
const { getReviews, getMetrics, submitRating, seedReviews } = require('../controllers/performanceController');

const router = express.Router();

router.route('/').get(getReviews);
router.route('/metrics').get(getMetrics);
router.route('/:id/rate').put(submitRating);
router.route('/seed').post(seedReviews);

module.exports = router;
