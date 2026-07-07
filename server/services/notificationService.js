const mongoose = require("mongoose");
const Notification = require("../models/Notification");

function normalizeUserId(userId) {
  return mongoose.isValidObjectId(userId) ? userId : null;
}

async function createNotification(payload = {}, io = null) {
  const normalizedUserId = normalizeUserId(payload.userId);
  const notificationPayload = {
    title: payload.title || payload.type || "Notification",
    message: payload.message || payload.description || "",
    type: String(payload.type || "INFO").toUpperCase(),
    module: payload.module || "",
    priority: String(payload.priority || "medium").toLowerCase(),
    userId: normalizedUserId,
    role: payload.role || "",
    read: Boolean(payload.read),
    actionUrl: payload.actionUrl || "",
    entityType: payload.entityType || "",
    entityId: payload.entityId ? String(payload.entityId) : "",
    metadata: payload.metadata || {},
  };

  const notification = await Notification.create(notificationPayload);

  if (io && normalizedUserId) {
    io.to(`user_${normalizedUserId}`).emit("notification", notification);
  }

  if (io && payload.role) {
    io.to(`role_${payload.role}`).emit("notification", notification);
  }

  return notification;
}

async function createNotifications(payloads = [], io = null) {
  const results = [];
  for (const payload of payloads) {
    results.push(await createNotification(payload, io));
  }
  return results;
}

module.exports = {
  createNotification,
  createNotifications,
};
