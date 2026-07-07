const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/leadController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "MARKETING", "SALES", "TEAM_LEAD", "MEMBER"));

router.get("/", wrap(controller.list));
router.get("/unassigned", wrap(controller.listUnassigned));
router.get("/imports", wrap(controller.listImports));
router.get("/assignments", wrap(controller.listAssignments));
router.get("/assigned", wrap(controller.listAssignedLeads));
router.get("/:id", wrap(controller.getById));
router.post("/create", roleMiddleware("ADMIN", "MANAGER", "MARKETING"), wrap(controller.create));
router.post(
  "/import",
  roleMiddleware("ADMIN", "MANAGER", "MARKETING"),
  controller.upload.single("file"),
  wrap(controller.importLeads),
);
router.post("/assign", roleMiddleware("ADMIN", "MANAGER", "MARKETING"), wrap(controller.assign));
router.put("/reassign/:id", roleMiddleware("ADMIN", "MANAGER", "MARKETING"), wrap(controller.reassign));
router.put("/:id", roleMiddleware("ADMIN", "MANAGER", "MARKETING"), wrap(controller.update));
router.delete("/:id", roleMiddleware("ADMIN", "MANAGER", "MARKETING"), wrap(controller.remove));

module.exports = router;
