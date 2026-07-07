const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/subtaskController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER", "TEAM_LEAD", "MEMBER"));
router.get("/reviews/pending", wrap(controller.listPendingReviews));
router.put("/:id/approve", wrap(controller.approve));
router.put("/:id/reject", wrap(controller.reject));
router.get("/", wrap(controller.list));
router.get("/:id", wrap(controller.getById));
router.post("/", wrap(controller.create));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));

module.exports = router;
