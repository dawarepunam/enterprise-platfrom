function registerMeetingSocket(io) {
  io.on("connection", (socket) => {
    socket.on("meeting:signal", (payload = {}) => {
      if (!payload.roomId) return;

      socket.to(payload.roomId).emit("meeting:signal", {
        ...payload,
        fromSocketId: socket.id,
      });
    });

    socket.on("meeting:join-room", (payload = {}) => {
      if (!payload.roomId) return;
      socket.join(payload.roomId);
      io.to(payload.roomId).emit("meeting:participant-update", {
        roomId: payload.roomId,
        participantName: payload.participantName || "Participant",
        action: "JOINED",
      });
    });

    socket.on("meeting:leave-room", (payload = {}) => {
      if (!payload.roomId) return;
      socket.leave(payload.roomId);
      io.to(payload.roomId).emit("meeting:participant-update", {
        roomId: payload.roomId,
        participantName: payload.participantName || "Participant",
        action: "LEFT",
      });
    });
  });
}

module.exports = registerMeetingSocket;
