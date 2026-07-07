const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.post("/login", wrap(authController.login));
router.post("/manager-login", wrap(authController.managerLogin));
router.post("/refresh", wrap(authController.refresh));
router.post("/logout", wrap(authController.logout));
router.post("/register", wrap(authController.register));
router.post("/forgot-password", wrap(authController.forgotPassword));
router.post("/send-otp", wrap(authController.forgotPassword));
router.post("/verify-reset-otp", wrap(authController.verifyResetOtp));
router.post("/verify-otp", wrap(authController.verifyResetOtp));
router.post("/reset-password", wrap(authController.resetPassword));
router.get("/me", authMiddleware, wrap(authController.me));

module.exports = router;
