const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/userSettingsController");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.use(authMiddleware);

router.get("/profile", wrap(controller.getProfile));
router.put("/profile", wrap(controller.updateProfile));

router.get("/2fa", wrap(controller.get2FAStatus));
router.post("/2fa", wrap(controller.toggle2FA));
router.post("/2fa/confirm", wrap(controller.confirm2FA));

router.put("/password", wrap(controller.updatePassword));

router.get("/sessions", wrap(controller.getSessions));
router.put("/preferences", wrap(controller.updatePreferences));

const multer = require("multer");
const upload = multer({ dest: 'uploads/' });
router.post("/avatar", upload.single("avatar"), wrap(controller.uploadAvatar));

module.exports = router;

router.put('/preferences', wrap(controller.updatePreferences));
