const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/hrController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "HR", "MANAGER"));
router.patch("/approve/:id", wrap(controller.approveLeave));
router.patch("/reject/:id", wrap(controller.rejectLeave));
router.patch("/hold/:id", wrap(controller.holdLeave));

module.exports = router;
