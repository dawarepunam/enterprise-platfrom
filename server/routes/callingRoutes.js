const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const callingController = require("../controllers/callingController");

const router = express.Router();

// All calling routes require authentication and CALLING or ADMIN role
router.use(authMiddleware);
router.use(roleMiddleware("CALLING", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELECALLER"));

// Dashboard Metrics
router.get("/dashboard", callingController.getDashboardMetrics);

// Lead Queue
router.get("/queue", callingController.getCallingQueue);

// Log a call (Smart logic included)
router.post("/log", callingController.logCall);

// Handover to Sales
router.post("/handover", callingController.handoverLead);

module.exports = router;
