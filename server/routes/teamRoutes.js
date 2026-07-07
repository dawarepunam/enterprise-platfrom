const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/collaborationController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);

router.get("/dashboard", wrap(controller.getWorkspaceSummary));
router.get("/", wrap(controller.listTeams));
router.post("/", wrap(controller.createTeam));
router.get("/:id", wrap(controller.getTeamById));
router.put("/:id", wrap(controller.updateTeam));
router.delete("/:id", wrap(controller.deleteTeam));
router.post("/:id/members", wrap(controller.addTeamMember));

module.exports = router;
