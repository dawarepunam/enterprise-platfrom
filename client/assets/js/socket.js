let socket = null;
const socketListeners = new Map();

function getSocketBaseUrl() {
  if (typeof API_BASE_URL === "string" && API_BASE_URL.includes("/api")) {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }

  return window.location.origin;
}

function subscribeNotificationChannels(instance) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return;

  instance.emit("notification:subscribe", {
    userId: user._id,
    role: user.role,
  });
}

function connectSocket() {
  if (socket) return socket;
  if (typeof io === "undefined") return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  socket = io(getSocketBaseUrl(), {
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("Socket connected");
    subscribeNotificationChannels(socket);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("notification", (payload) => {
    if (typeof window.pushRealtimeNotification === "function") {
      window.pushRealtimeNotification(payload);
    }
  });

  return socket;
}

function onSocket(eventName, handler) {
  const instance = connectSocket();
  if (!instance) return;

  if (socketListeners.has(eventName)) {
    instance.off(eventName, socketListeners.get(eventName));
  }

  socketListeners.set(eventName, handler);
  instance.on(eventName, handler);
}

function emitSocket(eventName, payload) {
  const instance = connectSocket();
  if (!instance) return;
  instance.emit(eventName, payload);
}

function getSocket() {
  return connectSocket();
}

window.connectSocket = connectSocket;
window.onSocket = onSocket;
window.emitSocket = emitSocket;
window.getSocket = getSocket;
