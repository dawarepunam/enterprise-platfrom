const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const enterpriseController = require("../controllers/enterpriseController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.get("/overview", authMiddleware, wrap(enterpriseController.getOverview));
router.get("/capabilities", authMiddleware, wrap(enterpriseController.getCapabilities));

module.exports = router;
