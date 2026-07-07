const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/collaborationController");
const Message = require("../models/Message");
const Project = require("../models/Project");

const router = express.Router();

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.use(authMiddleware);
router.get("/", wrap(async (req, res) => {
  if (!req.query.projectId) {
    return res.json({ success: true, data: [] });
  }
  const project = await Project.findById(req.query.projectId).lean();
  if (!project) return res.status(404).json({ success: false, message: "Project not found." });
  const roomId = `project_${project._id}`;
  const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: messages });
}));
router.post("/", wrap(async (req, res, next) => {
  if (!req.body.projectId || req.body.teamId) {
    return controller.createMessage(req, res, next);
  }
  const project = await Project.findById(req.body.projectId).lean();
  if (!project) return res.status(404).json({ success: false, message: "Project not found." });
  const text = req.body.text || req.body.content || req.body.message || "";
  const message = await Message.create({
    roomId: `project_${project._id}`,
    projectId: project._id,
    senderId: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    messageType: req.body.messageType || "TEXT",
    text,
    readBy: [req.user._id],
    participants: [project.managerId, project.teamLeadId, ...(project.teamMemberIds || [])].filter(Boolean),
    metadata: {
      projectName: project.projectName || project.name || "",
      attachments: req.body.attachments || [],
    },
  });
  res.status(201).json({ success: true, data: message });
}));
router.get("/:channelId", wrap(controller.getMessagesByChannel));

module.exports = router;
