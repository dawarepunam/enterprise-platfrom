// server/sockets/employeeSocket.js
// Handles all realtime events for the employee module:
// tasks, attendance, leaves, daily-updates, meetings, notifications, comments, typing indicators

function registerEmployeeSocket(io) {
  io.on("connection", (socket) => {
    // ── Room join helpers ─────────────────────────────────────────────────
    socket.on("join_user_room", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on("join_task_room", (taskId) => {
      if (taskId) {
        socket.join(`task_${taskId}`);
        socket.taskRooms = socket.taskRooms || [];
        if (!socket.taskRooms.includes(taskId)) socket.taskRooms.push(taskId);
      }
    });

    socket.on("leave_task_room", (taskId) => {
      if (taskId) {
        socket.leave(`task_${taskId}`);
      }
    });

    // ── Task comment: relay to task room ──────────────────────────────────
    socket.on("send_task_comment", ({ taskId, comment }) => {
      if (taskId && comment) {
        io.to(`task_${taskId}`).emit("task_comment", comment);
      }
    });

    // ── Task status change: broadcast to all in task room ────────────────
    socket.on("task_status_changed", ({ taskId, status, updatedBy }) => {
      if (taskId) {
        io.to(`task_${taskId}`).emit("task_status_updated", { taskId, status, updatedBy });
      }
    });

    // ── Task list refresh: broadcast to user room ────────────────────────
    socket.on("task_list_refresh", ({ userId }) => {
      if (userId) {
        io.to(`user_${userId}`).emit("task_list_refreshed");
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on("typing_start", ({ taskId, userName }) => {
      if (taskId) {
        socket.to(`task_${taskId}`).emit("typing_start", { userName, taskId });
      }
    });

    socket.on("typing_stop", ({ taskId, userName }) => {
      if (taskId) {
        socket.to(`task_${taskId}`).emit("typing_stop", { userName, taskId });
      }
    });

    // ── Message seen ─────────────────────────────────────────────────────
    socket.on("message_seen", ({ taskId, commentId, userId }) => {
      if (taskId) {
        socket.to(`task_${taskId}`).emit("message_seen", { commentId, userId });
      }
    });

    // ── Attendance ────────────────────────────────────────────────────────
    socket.on("join_attendance_room", (userId) => {
      if (userId) socket.join(`attendance_${userId}`);
    });

    socket.on("attendance_punch", ({ userId, type, time }) => {
      if (userId) {
        io.to(`attendance_${userId}`).emit("attendance_updated", { type, time });
      }
    });

    // ── Leave ────────────────────────────────────────────────────────────
    socket.on("join_leave_room", (userId) => {
      if (userId) socket.join(`leave_${userId}`);
    });

    socket.on("leave_status_changed", ({ userId, leaveId, status }) => {
      if (userId) {
        io.to(`leave_${userId}`).emit("leave_updated", { leaveId, status });
      }
    });

    // ── Daily Updates ────────────────────────────────────────────────────
    socket.on("join_daily_updates_room", (userId) => {
      if (userId) socket.join(`daily_updates_${userId}`);
    });

    socket.on("daily_update_submitted", ({ userId, update }) => {
      if (userId) {
        io.to(`daily_updates_${userId}`).emit("daily_update_new", update);
      }
    });

    // ── Meetings ─────────────────────────────────────────────────────────
    socket.on("join_meeting_room", (meetingId) => {
      if (meetingId) socket.join(`meeting_${meetingId}`);
    });

    socket.on("meeting_updated", ({ meetingId, data }) => {
      if (meetingId) {
        io.to(`meeting_${meetingId}`).emit("meeting_change", data);
      }
    });

    // ── Notifications ────────────────────────────────────────────────────
    socket.on("join_notification_room", (userId) => {
      if (userId) socket.join(`notif_${userId}`);
    });

    // Server-side code can emit to `notif_${userId}` to push notifications

    // ── Disconnect cleanup ────────────────────────────────────────────────
    socket.on("disconnect", () => {
      // Rooms auto-cleaned by socket.io
    });
  });
}

module.exports = registerEmployeeSocket;

