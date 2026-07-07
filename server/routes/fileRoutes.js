const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/fileController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.post("/upload", controller.uploadMiddleware, wrap(controller.upload));

router.get("/", wrap(controller.list));
router.get("/:id", wrap(controller.getById));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));

module.exports = router;
