const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/salesDealController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "MANAGER", "SALES"));

router.get("/summary", wrap(controller.summary));
router.get("/leaderboard", wrap(controller.leaderboard));
router.get("/reports/export", wrap(controller.exportReport));
router.get("/messages", wrap(controller.listMessages));
router.post("/messages", wrap(controller.sendMessage));
router.get("/meetings", wrap(controller.listMeetings));
router.post("/meetings", wrap(controller.createMeeting));
router.post("/leads/:id/calls", wrap(controller.logCall));
router.post("/leads/:id/followups", wrap(controller.createFollowUp));
router.post("/leads/:id/proofs", wrap(controller.uploadProof));
router.post("/leads/:id/quotations", wrap(controller.createQuotation));
router.post("/quotations/:id/send", wrap(controller.sendQuotation));
router.post("/deals/:id/close", wrap(controller.closeDeal));

router.get("/", wrap(controller.list));
router.get("/:id", wrap(controller.getById));
router.post("/", wrap(controller.create));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));

module.exports = router;
