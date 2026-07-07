const { Server } = require("socket.io");
const registerChatSocket = require("../sockets/chatSocket");
const registerMeetingSocket = require("../sockets/meetingSocket");
const registerNotificationSocket = require("../sockets/notificationSocket");
const registerCallSocket = require("../sockets/callSocket");
const registerEmployeeSocket = require("../sockets/employeeSocket");

function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "PATCH"],
        },
    });

    registerChatSocket(io);
    registerMeetingSocket(io);
    registerNotificationSocket(io);
    registerCallSocket(io);
    registerEmployeeSocket(io);
    return io;
}

module.exports = initializeSocket;