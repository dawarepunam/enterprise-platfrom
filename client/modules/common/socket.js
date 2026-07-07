// client/modules/common/socket.js
// Simple Socket.io client wrapper to receive real‑time notifications
import { showToast } from "./utils.js";

const socket = io(); // assumes socket.io script is loaded globally via CDN in index

// Subscribe to user‑specific and role‑specific channels after auth (example placeholder)
socket.emit("notification:subscribe", { userId: "{{USER_ID}}", role: "PROJECT_MANAGER" });

// Listen for generic notification events
socket.on("notification", (payload) => {
  const message = payload.message || "You have a new notification";
  showToast(message);
});

// Specific event types (optional)
socket.on("project-assigned", (data) => {
  showToast(`Project assigned: ${data.projectName}`);
});

socket.on("meeting-scheduled", (data) => {
  showToast(`Meeting scheduled at ${data.time}`);
});

socket.on("task-assigned", (data) => {
  showToast(`Task assigned: ${data.taskTitle}`);
});

export default socket;
