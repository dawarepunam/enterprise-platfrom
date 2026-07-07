const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const createCrudController = require("../utils/createCrudController");

// Use generic controller for basic CRUD operations on Bookmarks
const controller = createCrudController("bookmarks");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);

// Standard CRUD endpoints for Bookmarks
router.get("/", wrap(controller.list));
router.post("/", wrap(controller.create));
router.get("/:id", wrap(controller.getById));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.remove));

module.exports = router;
