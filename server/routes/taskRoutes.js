// server/routes/taskRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const allRoles = ["ADMIN", "MANAGER", "PROJECT_MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "CALLING", "SALES", "HR"];

// All task routes require authentication
router.use(authMiddleware);

// ── Phase 7: Task List ───────────────────────────────────────────────────────
router.get("/", ctrl.list);
router.post("/", roleMiddleware("ADMIN", "MANAGER", "PROJECT_MANAGER", "TEAM_LEAD"), ctrl.create);

// ── Phase 8: Task Detail ─────────────────────────────────────────────────────
router.get("/:id", ctrl.get);
router.patch("/:id", ctrl.update);
router.delete("/:id", roleMiddleware("ADMIN", "MANAGER", "PROJECT_MANAGER"), ctrl.delete);

// ── Phase 8: Task Actions ────────────────────────────────────────────────────
router.post("/:id/start", ctrl.startTask);
router.post("/:id/pause", ctrl.pauseTask);
router.post("/:id/submit", ctrl.submitWork);

// ── Phase 8: Checklist ───────────────────────────────────────────────────────
router.patch("/:id/checklist", ctrl.updateChecklist);

// ── Phase 8: Comments ────────────────────────────────────────────────────────
router.get("/:id/comments", ctrl.getComments);
router.post("/:id/comments", ctrl.addComment);
router.patch("/:id/comments/:commentId/seen", ctrl.markCommentSeen);

// ── Phase 8: Timeline ────────────────────────────────────────────────────────
router.get("/:id/timeline", ctrl.getTimeline);

module.exports = router;
