const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/collaborationController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.post("/", wrap(controller.createChannel));
router.get("/:teamId", wrap(controller.getChannelsByTeam));

module.exports = router;
