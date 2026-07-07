const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/realtimeChatController");
const { uploadToCloudinary } = require("../services/cloudinaryService");
const { getUploadConfig } = require("../config/multer");

const router = express.Router();
const upload = multer(getUploadConfig());

function wrap(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

router.use(authMiddleware);

// Get my rooms
router.get("/rooms/my", wrap(controller.getMyRooms));

// Get team directory
router.get("/teams", wrap(controller.getTeamDirectory));

// Get people directory for direct messages
router.get("/people", wrap(controller.getPeopleDirectory));

// Open or create a direct room with a specific user
router.post("/direct/:userId", wrap(controller.openDirectRoom));

// Get room messages
router.get("/rooms/:roomId/messages", wrap(controller.getRoomMessages));

// Send text message
router.post("/rooms/:roomId/messages", wrap(controller.sendRoomMessage));

// Mark room messages as read
router.post("/rooms/:roomId/read", wrap(controller.markRoomMessagesRead));

// Share file in room
router.post(
    "/rooms/:roomId/files",
    upload.single("file"),
    wrap(async(req, res) => {
        try {
            if (!req.file && req.body && req.body.name && req.body.url) {
                return controller.shareRoomFile(req, res);
            }

            if (!req.file) {
                return res
                    .status(400)
                    .json({ success: false, message: "No file provided" });
            }

            // Upload to Cloudinary
            const uploadResult = await uploadToCloudinary({
                dataUri: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
                name: req.file.originalname,
                size: req.file.size,
                resourceType: "auto",
            }, { folder: `enterprise-platform/chat/${req.params.roomId}` }, );

            // Call the original controller function with the uploaded file info
            const originalBody = req.body;
            req.body = {
                name: uploadResult.original_filename || req.file.originalname,
                url: uploadResult.secure_url,
                mimeType: req.file.mimetype,
                size: uploadResult.bytes || req.file.size,
                caption: originalBody.caption || originalBody.fileCaption || "",
                messageType: originalBody.messageType || "",
                fileCategory: originalBody.fileCategory || "",
                voiceDurationSeconds: Number(originalBody.voiceDurationSeconds || 0),
            };

            await controller.shareRoomFile(req, res);
        } catch (error) {
            console.error("File upload error:", error);
            res
                .status(500)
                .json({
                    success: false,
                    message: "Failed to upload file",
                    error: error.message,
                });
        }
    }),
);

module.exports = router;
