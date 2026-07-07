const Notification = require("../models/Notification");

async function list(req, res) {
  const filters = [];
  if (req.user?._id) {
    filters.push({ userId: req.user._id });
  }

  if (req.user?.role) {
    filters.push({ role: req.user.role });
  }

  const query = filters.length ? { $or: filters } : {};
  const documents = await Notification.find(query).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: documents });
}

async function getById(req, res) {
  const document = await Notification.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "notifications record not found" });
  }

  res.json({ success: true, data: document });
}

async function create(req, res) {
  const document = await Notification.create(req.body);
  
  // Broadcast via Socket.io
  const io = req.app.get("io");
  if (io) {
    if (document.userId) {
      io.to(document.userId.toString()).emit("notification", document);
    } else {
      io.emit("notification", document);
    }
  }
  
  res.status(201).json({ success: true, message: "notifications created", data: document });
}

async function update(req, res) {
  const document = await Notification.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "notifications record not found" });
  }

  Object.assign(document, req.body);
  await document.save();
  res.json({ success: true, message: "notifications updated", data: document });
}

async function remove(req, res) {
  const document = await Notification.findByIdAndDelete(req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: "notifications record not found" });
  }

  res.json({ success: true, message: "notifications deleted", id: req.params.id });
}

async function markAllRead(req, res) {
  const filters = [];
  if (req.user?._id) filters.push({ userId: req.user._id });
  if (req.user?.role) filters.push({ role: req.user.role });

  const query = filters.length ? { $or: filters } : {};
  await Notification.updateMany(query, { read: true });
  res.json({ success: true, message: "Notifications marked as read" });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  markAllRead,
};
