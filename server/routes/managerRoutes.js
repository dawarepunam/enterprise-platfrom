const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/managerController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "PROJECT_MANAGER"));

router.get("/dashboard", wrap(controller.dashboard));
router.get("/dashboard-summary", wrap(controller.dashboardSummary));
router.get("/attendance", wrap(controller.listAttendance));
router.get("/daily-updates", wrap(controller.listDailyUpdates));
router.get("/notifications", wrap(controller.listNotifications));
router.get("/history", wrap(controller.listHistory));
router.get("/projects", wrap(controller.listProjects));
router.get("/projects/:id", wrap(controller.getProject));
router.post("/projects/:id/members", wrap(controller.addProjectMember));
router.delete("/projects/:id/members/:userId", wrap(controller.removeProjectMember));
router.put("/projects/:id/members/replace", wrap(controller.replaceProjectMember));
router.get("/members", wrap(controller.listMembers));
router.get("/members/:memberId", wrap(controller.getMemberProfile));
router.post("/members/:memberId/move", wrap(controller.moveProjectMember));
router.post("/members/:memberId/hold", wrap(controller.holdProjectMember));
router.get("/teams", wrap(controller.listTeams));
router.post("/teams", wrap(controller.saveTeam));
router.put("/teams/:id", wrap(controller.saveTeam));
router.get("/tasks", wrap(controller.listTasks));
router.post("/tasks", wrap(controller.saveTask));
router.put("/tasks/:id", wrap(controller.saveTask));
router.delete("/tasks/:id", wrap(controller.deleteTask));
router.get("/files/:projectId", wrap(controller.listFiles));
router.delete("/files/item/:fileId", wrap(controller.deleteFile));
router.get("/meetings/:projectId", wrap(controller.listMeetings));
router.put("/meetings/:meetingId/cancel", wrap(controller.cancelMeeting));
router.get("/reports/:projectId", wrap(controller.listReports));

module.exports = router;
