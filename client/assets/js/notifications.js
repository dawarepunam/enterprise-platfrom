const ENTERPRISE_NOTIFICATION_STATE = {
  items: [],
  initialized: false,
};

function ensureToastContainer() {
  let container = document.getElementById("toastContainer");
  if (container) return container;

  container = document.createElement("div");
  container.id = "toastContainer";
  container.style.position = "fixed";
  container.style.zIndex = "9999";
  container.style.display = "grid";
  container.style.gap = "12px";
  container.style.width = "min(480px, calc(100vw - 32px))";
  container.style.maxWidth = "480px";

  if (
    document.body.classList.contains("auth-page-shell") ||
    window.location.pathname.includes("/auth/") ||
    window.location.pathname.endsWith("login.html") ||
    window.location.pathname.endsWith("forgot-password.html") ||
    window.location.pathname.endsWith("reset-password.html")
  ) {
    container.style.top = "50%";
    container.style.left = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.alignItems = "center";
    container.style.justifyItems = "center";
  } else {
    container.style.top = "24px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
  }

  document.body.appendChild(container);
  return container;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getToastAccent(type = "info") {
  if (type === "success") return "#16a34a";
  if (type === "error") return "#dc2626";
  if (type === "warning") return "#f59e0b";
  return "#2563eb";
}

function showToast(message, type = "info", options = {}) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = "toast";
  const accent = getToastAccent(type);
  toast.style.background = "#ffffff";
  toast.style.color = "#0f172a";
  toast.style.padding = "16px 18px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 22px 54px rgba(15, 23, 42, 0.18)";
  toast.style.border = `1px solid ${accent}33`;
  toast.style.borderLeft = `6px solid ${accent}`;
  toast.style.transform = "translateY(-10px) scale(0.98)";
  toast.style.opacity = "0";
  toast.style.transition = "all 180ms ease";

  const title = options.title
    ? `<div style="font-weight:700;margin-bottom:4px;">${escapeHtml(options.title)}</div>`
    : "";
  const action = options.actionUrl
    ? `<a href="${escapeHtml(options.actionUrl)}" style="color:#93c5fd;text-decoration:none;font-weight:700;">Open</a>`
    : "";

  toast.innerHTML = `
    ${title}
    <div style="font-size:14px;line-height:1.5;">${escapeHtml(message)}</div>
    ${action ? `<div style="margin-top:10px;">${action}</div>` : ""}
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0) scale(1)";
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.transform = "translateY(-10px) scale(0.98)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 220);
  }, options.duration || 4500);
}

function formatNotificationTime(dateValue) {
  if (!dateValue) return "Just now";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
}

function renderNotificationPanel() {
  const list = document.getElementById("notificationList");
  if (!list) return;

  if (!ENTERPRISE_NOTIFICATION_STATE.items.length) {
    list.innerHTML =
      '<p style="color:#64748b;">No notifications available.</p>';
    return;
  }

  list.innerHTML = ENTERPRISE_NOTIFICATION_STATE.items
    .map(
      (item) => `
        <article style="padding:14px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <div>
              <h4 style="margin:0 0 6px;font-size:15px;color:var(--text);">${escapeHtml(item.title || "Notification")}</h4>
              <p style="margin:0;color:var(--muted);font-size:14px;line-height:1.5;">${escapeHtml(item.message || "")}</p>
            </div>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:${item.read ? "var(--muted)" : "var(--primary)"};">
              ${item.priority || item.type || "info"}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:10px;">
            <small style="color:var(--muted);">${escapeHtml(formatNotificationTime(item.createdAt))}</small>
            ${item.actionUrl ? `<a href="${escapeHtml(item.actionUrl)}" style="color:var(--primary);text-decoration:none;font-size:13px;font-weight:700;">Open</a>` : ""}
          </div>
        </article>
      `,
    )
    .join("");
}

function bindNotificationDropdown() {
  const btn = document.getElementById("notificationBtn");
  const panel = document.getElementById("notificationPanel");
  if (!btn || !panel || btn.dataset.notificationDropdownBound) return;

  btn.dataset.notificationDropdownBound = "true";
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

async function fetchNotifications() {
  if (typeof API === "undefined" || !localStorage.getItem("token")) return [];

  try {
    const result = await API.get("/notifications");
    ENTERPRISE_NOTIFICATION_STATE.items = Array.isArray(result.data)
      ? result.data
      : [];
    renderNotificationPanel();
    return ENTERPRISE_NOTIFICATION_STATE.items;
  } catch (error) {
    return [];
  }
}

function pushRealtimeNotification(notification) {
  if (!notification) return;

  ENTERPRISE_NOTIFICATION_STATE.items = [
    notification,
    ...ENTERPRISE_NOTIFICATION_STATE.items.filter(
      (item) => String(item._id) !== String(notification._id),
    ),
  ].slice(0, 100);

  renderNotificationPanel();
  showToast(
    notification.message || "New notification received",
    notification.priority === "high" ? "warning" : "info",
    {
      title: notification.title || "Notification",
      actionUrl: notification.actionUrl,
    },
  );
}

async function markAllNotificationsRead() {
  if (typeof API === "undefined" || !localStorage.getItem("token")) return;

  try {
    await API.post("/notifications/mark-all-read", {});
    ENTERPRISE_NOTIFICATION_STATE.items =
      ENTERPRISE_NOTIFICATION_STATE.items.map((item) => ({
        ...item,
        read: true,
      }));
    renderNotificationPanel();
  } catch (error) {
    console.warn("Unable to mark notifications as read", error);
  }
}

function initNotificationPanel() {
  if (ENTERPRISE_NOTIFICATION_STATE.initialized) return;
  ENTERPRISE_NOTIFICATION_STATE.initialized = true;

  document.addEventListener("DOMContentLoaded", async () => {
    bindNotificationDropdown();
    await fetchNotifications();
  });
}

initNotificationPanel();

window.showToast = showToast;
window.fetchNotifications = fetchNotifications;
window.pushRealtimeNotification = pushRealtimeNotification;
window.markAllNotificationsRead = markAllNotificationsRead;
window.bindNotificationDropdown = bindNotificationDropdown;
