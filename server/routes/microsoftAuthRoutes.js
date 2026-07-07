const express = require("express");
const controller = require("../controllers/microsoftController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.get("/login", wrap(controller.login));
router.get("/callback", wrap(controller.callback));

module.exports = router;
