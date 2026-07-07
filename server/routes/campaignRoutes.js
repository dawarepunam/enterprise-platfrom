const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/campaignController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "MARKETING"));

router.get("/", wrap(controller.list));
router.post("/create", wrap(controller.create));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));
router.post("/email/send", wrap(controller.sendEmailCampaign));
router.post("/whatsapp/send", wrap(controller.sendWhatsAppCampaign));

module.exports = router;
