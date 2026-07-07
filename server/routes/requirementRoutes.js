const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const controller = require("../controllers/productController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN", "PRODUCT_MANAGER"));
router.get("/", wrap(controller.getRequirements));
router.post("/create", wrap(controller.createRequirement));
router.post("/request-changes", wrap(controller.requestChanges));

module.exports = router;
