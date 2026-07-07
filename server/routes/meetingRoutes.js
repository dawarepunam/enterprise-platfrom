const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/realtimeMeetingController");
const collaborationController = require("../controllers/collaborationController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.get("/", wrap(controller.listMeetings));
router.post("/", wrap(collaborationController.createMeeting));
router.post("/start", wrap(controller.startMeeting));
router.get("/:teamId", wrap(collaborationController.getMeetingsByTeam));
router.post("/:id/join", wrap(controller.joinMeeting));
router.post("/:id/end", wrap(controller.endMeeting));

module.exports = router;
