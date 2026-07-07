const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/departmentController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);

router.get("/setup/status", roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER", "HR"), wrap(controller.getSetupStatus));
router.get("/", roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER", "HR", "SALES", "MARKETING", "MEMBER", "CALLING", "PRODUCT_MANAGER"), wrap(controller.list));
router.get("/:id", roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER", "HR", "SALES", "MARKETING", "MEMBER", "CALLING", "PRODUCT_MANAGER"), wrap(controller.getById));
router.post("/", roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER"), wrap(controller.create));
router.put("/:id", roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER"), wrap(controller.update));
router.delete("/:id", roleMiddleware("ADMIN", "PROJECT_MANAGER", "MANAGER"), wrap(controller.remove));

module.exports = router;
