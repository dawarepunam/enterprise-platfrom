const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/routingController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "SALES", "MARKETING"));

router.get("/dashboard", wrap(controller.dashboard));
router.get("/leads", wrap(controller.listLeads));
router.get("/history", wrap(controller.listHistory));
router.post("/assign", wrap(controller.assign));
router.put("/update/:id", wrap(controller.update));

module.exports = router;
