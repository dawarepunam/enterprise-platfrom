const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const marketingController = require("../controllers/marketingController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "MARKETING", "SALES"));

router.get("/dashboard", wrap(marketingController.getDashboardKPIs));
router.get("/leads", wrap(marketingController.getLeads));
router.post("/leads", wrap(marketingController.createLead));
router.put("/leads/:id/qualify", wrap(marketingController.qualifyLead));
router.post("/leads/assign", wrap(marketingController.assignLead));

module.exports = router;
