const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/communicationController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.get("/", wrap(controller.listLogs));
router.post("/calls/start", wrap(controller.startCall));
router.put("/calls/:id", wrap(controller.updateCall));

module.exports = router;
