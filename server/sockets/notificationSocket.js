function registerNotificationSocket(io) {
  io.on("connection", (socket) => {
    socket.on("notification:subscribe", (payload = {}) => {
      if (payload.userId) {
        socket.join(`user_${payload.userId}`);
      }

      if (payload.role) {
        socket.join(`role_${payload.role}`);
      }
    });
  });
}

module.exports = registerNotificationSocket;
