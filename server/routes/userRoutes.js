const express = require("express");
const controller = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.get("/activity", wrap(async (req, res) => {
  // Mocking activity since there's no generic Activity model defined yet
  res.json({ success: true, data: [
    { type: 'login', description: 'Logged into JMKC CRM', createdAt: new Date() },
    { type: 'task', description: 'Checked task board', createdAt: new Date(Date.now() - 3600000) }
  ]});
}));

router.use(roleMiddleware("ADMIN", "MANAGER", "PROJECT_MANAGER", "TEAM_LEAD", "HR", "MARKETING"));

router.get("/managers", wrap(controller.listManagers));
router.post("/managers", roleMiddleware("ADMIN"), wrap(controller.createManager));
router.get("/", wrap(controller.list));
router.get("/:id", wrap(controller.getById));
router.post("/", wrap(controller.create));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));
router.patch("/:id/status", wrap(controller.toggleStatus));

module.exports = router;
