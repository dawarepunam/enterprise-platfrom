const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createCrudRouter(controller, options = {}) {
  const router = express.Router();
  const roles = options.roles || [];

  router.use(authMiddleware);
  if (roles.length) {
    router.use(roleMiddleware(...roles));
  }

  router.get("/", wrap(controller.list));
  router.get("/:id", wrap(controller.getById));
  router.post("/", wrap(controller.create));
  router.put("/:id", wrap(controller.update));
  router.delete("/:id", wrap(controller.remove));

  return router;
}

module.exports = createCrudRouter;
