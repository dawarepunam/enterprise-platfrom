const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/microsoftController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"));

router.get("/login", wrap(controller.login));
router.get("/callback", wrap(controller.callback));
router.get("/status", wrap(controller.getStatus));
router.get("/teams/open", wrap(controller.openTeams));
router.get("/mail/inbox", wrap(controller.getInbox));
router.get("/mail/message/:id", wrap(controller.getMessage));
router.post("/mail/send", wrap(controller.sendMail));
router.get("/calendar/events", wrap(controller.getCalendarEvents));
router.post("/calendar/create-meeting", wrap(controller.createMeeting));
router.post("/meetings", wrap(controller.createMeeting));
router.post("/onedrive/upload", controller.uploadMiddleware, wrap(controller.uploadToOneDrive));
router.get("/onedrive/files/:projectId", wrap(controller.getOneDriveFiles));
router.post("/projects/:projectId/workspace", wrap(controller.ensureProjectWorkspace));

module.exports = router;
