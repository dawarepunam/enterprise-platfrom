const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/settingsController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.get("/", wrap(controller.list));
router.post("/", wrap(controller.create));
router.get("/integrations", wrap(controller.getIntegrationStatus));
router.get("/smtp", wrap(controller.getSmtpSettings));
router.post("/smtp", wrap(controller.saveSmtpSettings));
router.post("/smtp/test", wrap(controller.testSmtpSettings));
router.get("/:id", wrap(controller.getById));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));

module.exports = router;
