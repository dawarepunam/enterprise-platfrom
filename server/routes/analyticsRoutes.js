const express = require("express");
const controller = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Custom endpoint for PM dashboard analytics
router.get("/pm-dashboard", controller.getPmDashboardAnalytics);
router.get("/workload", controller.getWorkloadAnalytics);
router.get("/employee/summary", controller.getEmployeeSummary);
router.get("/performance", controller.getPerformanceAnalytics);

module.exports = router;
