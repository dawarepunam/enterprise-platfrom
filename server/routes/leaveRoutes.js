// server/routes/leaveRoutes.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/leaveController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER", "TEAM_LEAD", "MEMBER", "HR"));

// ── Phase 10: Employee leave workflow ───────────────────────────────────────
router.post("/apply",           wrap(controller.apply));
router.get("/balance",          wrap(controller.getBalance));
router.get("/user",             wrap(controller.getUserLeaves)); // /leave/user
router.post("/:id/cancel",      wrap(controller.cancel));
router.patch("/:id/cancel",     wrap(controller.cancel));        // support both methods

// ── Phase 10: Approver actions ──────────────────────────────────────────
router.patch("/:id/pm-action",  wrap(controller.pmAction));
router.patch("/:id/hr-action",  wrap(controller.hrAction));

// ── Legacy / Admin routes ──────────────────────────────────────────────────
router.get("/export",           wrap(controller.exportLeaves));
router.get("/",                 wrap(controller.getUserLeaves)); // GET /leave → employee's own leaves
router.get("/:id",              wrap(controller.getById));
router.post("/",                wrap(controller.create));        // alias: create = apply for admin use
router.put("/:id",              wrap(controller.update));
router.patch("/:id",            wrap(controller.update));        // status PATCH from frontend
router.delete("/:id",          wrap(controller.remove));

module.exports = router;
