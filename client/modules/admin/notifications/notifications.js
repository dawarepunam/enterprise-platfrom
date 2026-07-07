let notifications = [
  {
    id: 1,
    title: "New Project Assigned",
    message: "Marketing Website Redesign has been assigned to Manager Rahul.",
    type: "Project",
    status: "Unread",
    priority: "High",
    time: "2 minutes ago",
  },
  {
    id: 2,
    title: "Task Completed",
    message: "Homepage UI Design task has been marked as completed.",
    type: "Task",
    status: "Read",
    priority: "Medium",
    time: "15 minutes ago",
  },
  {
    id: 3,
    title: "Lead Converted",
    message: "Client ABC Pvt Ltd has been converted successfully.",
    type: "Lead",
    status: "Unread",
    priority: "High",
    time: "1 hour ago",
  },
  {
    id: 4,
    title: "Quotation Approved",
    message: "Quotation #Q-2026-104 has been approved by the client.",
    type: "Approval",
    status: "Read",
    priority: "Low",
    time: "Yesterday",
  },
  {
    id: 5,
    title: "System Backup Completed",
    message: "Daily system backup completed successfully.",
    type: "System",
    status: "Unread",
    priority: "Low",
    time: "Yesterday",
  },
];

let filteredNotifications = [...notifications];

/* DOM */
const notificationList = document.getElementById("notificationList");
const totalCount = document.getElementById("totalCount");
const unreadCount = document.getElementById("unreadCount");
const highPriorityCount = document.getElementById("highPriorityCount");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const statusFilter = document.getElementById("statusFilter");

const markAllReadBtn = document.getElementById("markAllReadBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

/* Render */
function renderNotifications() {
  notificationList.innerHTML = "";

  if (filteredNotifications.length === 0) {
    notificationList.innerHTML = `
      <div class="empty-state">
        <h3>No Notifications Found</h3>
        <p>There are no notifications matching your filters.</p>
      </div>
    `;
    updateSummary();
    return;
  }

  filteredNotifications.forEach((item) => {
    const unreadClass = item.status.toLowerCase() === "unread" ? "unread" : "";
    const priorityClass = item.priority.toLowerCase();

    const card = document.createElement("div");
    card.className = `notification-card ${unreadClass} ${priorityClass}`;

    card.innerHTML = `
      <div class="notification-top">
        <h3 class="notification-title">${item.title}</h3>
        <span class="notification-time">${item.time}</span>
      </div>

      <p class="notification-message">${item.message}</p>

      <div class="notification-meta">
        <span class="badge type">${item.type}</span>
        <span class="badge status ${item.status.toLowerCase()}">
          ${item.status}
        </span>
        <span class="badge priority ${priorityClass}">
          ${item.priority}
        </span>
      </div>

      <div class="notification-actions">
        ${
          item.status === "Unread"
            ? `<button class="action-btn mark-read-btn"
                 onclick="markAsRead(${item.id})">
                 Mark as Read
               </button>`
            : ""
        }

        <button class="action-btn delete-btn"
                onclick="deleteNotification(${item.id})">
          Delete
        </button>
      </div>
    `;

    notificationList.appendChild(card);
  });

  updateSummary();
}

/* Summary */
function updateSummary() {
  totalCount.textContent = notifications.length;

  unreadCount.textContent = notifications.filter(
    (n) => n.status === "Unread",
  ).length;

  highPriorityCount.textContent = notifications.filter(
    (n) => n.priority === "High",
  ).length;
}

/* Filters */
function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const type = typeFilter.value;
  const status = statusFilter.value;

  filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search) ||
      n.message.toLowerCase().includes(search);

    const matchesType = type === "all" || n.type === type;
    const matchesStatus = status === "all" || n.status === status;

    return matchesSearch && matchesType && matchesStatus;
  });

  renderNotifications();
}

/* Actions */
function markAsRead(id) {
  const notification = notifications.find((n) => n.id === id);
  if (notification) {
    notification.status = "Read";
    applyFilters();
  }
}

function deleteNotification(id) {
  if (!confirm("Delete this notification?")) return;

  notifications = notifications.filter((n) => n.id !== id);
  applyFilters();
}

function markAllAsRead() {
  notifications.forEach((n) => {
    n.status = "Read";
  });
  applyFilters();
}

function clearAll() {
  if (!confirm("Clear all notifications?")) return;

  notifications = [];
  applyFilters();
}

/* Event Listeners */
searchInput.addEventListener("input", applyFilters);
typeFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);

markAllReadBtn.addEventListener("click", markAllAsRead);
clearAllBtn.addEventListener("click", clearAll);

/* Init */
renderNotifications();

/* Global Functions */
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;
