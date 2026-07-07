// server/routes/attendanceRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/attendanceController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"));

// ── Phase 9: Punch system ──────────────────────────────────────────────────
router.post("/punch-in",    wrap(controller.punchIn));
router.post("/punch-out",   wrap(controller.punchOut));
router.post("/break",       wrap(controller.manageBreak));
router.post("/break/start", wrap(controller.breakStart));
router.post("/break/end",   wrap(controller.breakEnd));
router.get("/today",        wrap(controller.getTodayStatus));
router.get("/stats",        wrap(controller.getStats));   // ?year=&month= — KPI summary
router.get("/history",      wrap(controller.getHistory)); // ?days= or ?year=&month= — records list
router.get("/user/:userId", wrap(controller.getUserAttendance));
router.get("/me",           wrap(controller.getUserAttendance)); // convenience — defaults to req.user

// ── Legacy routes (kept for backward compatibility) ────────────────────────
router.post("/check-in", wrap(controller.checkIn));
router.put("/check-out", wrap(controller.checkOut));

// ── Admin routes ────────────────────────────────────────────────────────────
router.get("/export", wrap(controller.exportAttendance));
router.get("/", wrap(controller.list));
router.get("/:id", wrap(controller.getById));
router.post("/", wrap(controller.create));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));

module.exports = router;
