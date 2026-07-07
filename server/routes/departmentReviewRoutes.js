const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/departmentReviewController");

const router = express.Router();

const multer = require("multer");
const upload = multer({ dest: "server/uploads/" });

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// All routes require authentication
router.use(authMiddleware);

router.get("/dashboard-stats", wrap(controller.getDashboardStats));
router.get("/", wrap(controller.list));
router.get("/:id", wrap(controller.getById));
router.post("/", wrap(controller.create));
router.put("/:id/status", wrap(controller.updateStatus));
router.put("/:id/feasibility", wrap(controller.updateFeasibility));
router.post("/:id/clarifications", wrap(controller.addClarification));
router.put("/:id/approvals", wrap(controller.processApproval));
router.put("/:id/checklist", wrap(controller.updateChecklist));
router.post("/:id/attachments", upload.single("file"), wrap(controller.uploadAttachment));

module.exports = router;
