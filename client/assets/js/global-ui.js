/* 
  JMKC Enterprise CRM - Global UI Logic
  Phase 1: Header, Modals, Drawers, Theme
  + Enterprise: Command Palette, Notifications, Bookmarks, Recent Items, Announcements, Offline, Autosave
*/

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initSearchModal();
  initDrawers();
  initPopups();
  initKeyboardNavigation();
  initProfileData();
  initCommandPalette();
  initNotificationsAPI();
  initBookmarks();
  initRecentItems();
  initAnnouncementsCenter();
  initOfflineSync();
  initAutosave();
  initSocketGlobal();
});

/* ==================== THEME ==================== */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (!themeToggleBtn) return;

  let currentTheme = localStorage.getItem("jmkc_theme") || "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  themeToggleBtn.textContent = currentTheme === "dark" ? "☀️" : "🌙";

  themeToggleBtn.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("jmkc_theme", currentTheme);
    themeToggleBtn.textContent = currentTheme === "dark" ? "☀️" : "🌙";
  });
}

/* ==================== SEARCH MODAL ==================== */
function initSearchModal() {
  const searchInput = document.getElementById("headerSearchInput");
  const searchWrapper = document.getElementById("headerSearchWrapper");
  const searchModal = document.getElementById("searchModal");
  const searchOverlay = document.getElementById("searchOverlay");
  const modalInput = document.getElementById("searchModalInput");

  if (!searchInput || !searchModal) return;

  const openSearch = () => {
    searchModal.classList.add("active");
    searchOverlay.classList.add("active");
    setTimeout(() => modalInput.focus(), 100);
  };

  const closeSearch = () => {
    searchModal.classList.remove("active");
    searchOverlay.classList.remove("active");
    modalInput.value = "";
  };

  searchInput.addEventListener("click", openSearch);
  searchWrapper.addEventListener("click", openSearch);
  searchOverlay.addEventListener("click", closeSearch);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape" && searchModal.classList.contains("active")) {
      closeSearch();
    }
  });

  // Debounced live search against API
  let searchDebounce;
  modalInput.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    const resultsContainer = document.getElementById("searchResults");
    clearTimeout(searchDebounce);

    if (val.length < 2) {
      const recents = JSON.parse(localStorage.getItem("jmkc_recent_searches") || "[]");
      resultsContainer.innerHTML = recents.length
        ? `<div class="search-section-title">Recent Searches</div>` + recents.map(r => `<div class="search-result-item" onclick="window.location.href='${r.url}'" style="padding:10px;cursor:pointer;border-bottom:1px solid var(--border-color)"><strong>${r.type}</strong>: ${r.name}</div>`).join("")
        : `<div class="empty-state"><p style="color: var(--text-secondary); text-align: center;">Type to search projects, tasks, employees...</p></div>`;
      return;
    }

    searchDebounce = setTimeout(async () => {
      resultsContainer.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary)">Searching...</div>`;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${window.location.origin}/api/search?q=${encodeURIComponent(val)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (!res.ok) throw new Error("Search failed");
        const json = await res.json();
        const items = json.data || [];

        if (items.length === 0) {
          resultsContainer.innerHTML = `<div class="empty-state"><p style="color:var(--text-secondary);text-align:center;padding:20px">No results found for "${val}"</p></div>`;
          return;
        }

        let html = "";
        const grouped = items.reduce((acc, item) => {
          if (!acc[item.type]) acc[item.type] = [];
          acc[item.type].push(item);
          return acc;
        }, {});

        for (const [type, typeItems] of Object.entries(grouped)) {
          const icon = type === 'Project' ? '🏢' : type === 'Task' ? '✅' : type === 'Meeting' ? '🤝' : '👤';
          html += `<div class="search-section-title" style="padding:8px 16px;font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);border-bottom:1px solid var(--border-color)">${icon} ${type}s</div>`;
          typeItems.forEach(item => {
            html += `<div class="search-result-item" onclick="JMKC.addRecentSearch('${type}','${item.title.replace(/'/g, "\\'")}','${item.url}');window.location.href='${item.url}'" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border-color);transition:background 0.2s" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='transparent'"><strong>${item.title}</strong></div>`;
          });
        }
        
        resultsContainer.innerHTML = html;
      } catch (err) {
        resultsContainer.innerHTML = `<div class="empty-state"><p style="color:var(--danger-color);text-align:center;padding:20px">Search failed. Please try again.</p></div>`;
      }
    }, 300);
  });
}

/* ==================== NOTIFICATIONS DRAWER (API) ==================== */
function initDrawers() {
  const notificationsBtn = document.getElementById("notificationsBtn");
  const notificationsDrawer = document.getElementById("notificationsDrawer");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const drawerOverlay = document.getElementById("drawerOverlay");

  if (!notificationsBtn || !notificationsDrawer) return;

  const openDrawer = () => {
    notificationsDrawer.classList.add("active");
    drawerOverlay.classList.add("active");
    document.getElementById("notificationCount")?.classList.remove("realtime-glow");
  };

  const closeDrawer = () => {
    notificationsDrawer.classList.remove("active");
    drawerOverlay.classList.remove("active");
  };

  notificationsBtn.addEventListener("click", openDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && notificationsDrawer.classList.contains("active")) {
      closeDrawer();
    }
  });
}

function initNotificationsAPI() {
  const list = document.getElementById("notificationsList");
  const badge = document.getElementById("notificationCount");
  if (!list) return;

  async function fetchNotifications() {
    list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-secondary)">Loading...</div>`;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${window.location.origin}/api/notifications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const notifications = Array.isArray(json) ? json : (json.data || []);

      if (notifications.length === 0) {
        list.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px 20px;color:var(--text-secondary)">No new notifications.</div>`;
        if (badge) badge.style.display = "none";
        return;
      }

      const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;
      if (badge) {
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = unreadCount > 0 ? "flex" : "none";
      }

      // Group by day
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const groups = { Today: [], Yesterday: [], Earlier: [] };
      notifications.forEach(n => {
        const d = new Date(n.createdAt || n.date).toDateString();
        if (d === today) groups.Today.push(n);
        else if (d === yesterday) groups.Yesterday.push(n);
        else groups.Earlier.push(n);
      });

      let html = `<div style="padding:10px 16px;text-align:right"><button onclick="JMKC.markAllNotificationsRead()" style="background:none;border:none;color:var(--accent-color);cursor:pointer;font-size:0.85rem">Mark All Read</button></div>`;
      for (const [label, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        html += `<div style="padding:8px 16px;font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);border-bottom:1px solid var(--border-color)">${label}</div>`;
        items.forEach(n => {
          const title = n.title || n.message || n.type || "Notification";
          const desc = n.description || n.body || "";
          const isRead = n.read || n.isRead;
          html += `<div style="padding:12px 16px;border-bottom:1px solid var(--border-color);opacity:${isRead ? '0.6' : '1'};cursor:pointer" onclick="JMKC.openNotification('${n._id || ""}')"><strong>${title}</strong><p style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">${desc}</p></div>`;
        });
      }
      list.innerHTML = html;
    } catch (err) {
      list.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px 20px;color:var(--text-secondary)">Failed to load notifications.<br><button onclick="JMKC.refreshNotifications()" class="btn btn-primary" style="margin-top:10px">Retry</button></div>`;
    }
  }

  fetchNotifications();

  // Expose for Socket.io and retry
  window.JMKC = window.JMKC || {};
  window.JMKC.refreshNotifications = fetchNotifications;
  window.JMKC.markAllNotificationsRead = async function () {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${window.location.origin}/api/notifications/mark-all-read`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchNotifications();
    } catch (e) { console.error("Mark all read failed", e); }
  };
  window.JMKC.openNotification = function (id) {
    // Could open related record. For now, just log.
    console.log("Open notification", id);
  };
}

/* ==================== POPUPS ==================== */
function initPopups() {
  const popups = [
    { btnId: "quickActionsBtn", popupId: "quickActionsPopup" },
    { btnId: "profileBtn", popupId: "profilePopup" }
  ];

  popups.forEach(({ btnId, popupId }) => {
    const btn = document.getElementById(btnId);
    const popup = document.getElementById(popupId);

    if (btn && popup) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".popup-dropdown").forEach(p => {
          if (p.id !== popupId) p.classList.remove("active");
        });
        popup.classList.toggle("active");
      });
    }
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".popup-dropdown.active").forEach(p => {
      p.classList.remove("active");
    });
  });
}

/* ==================== COMMAND PALETTE (Ctrl+K) ==================== */
function initCommandPalette() {
  // The Ctrl+K already opens the search modal (implemented in initSearchModal).
  // Here we add quick-action commands to the search results when the modal is empty.
  window.JMKC = window.JMKC || {};
  window.JMKC.commandPaletteActions = [
    { label: "Open Projects Hub", icon: "🏢", action: () => window.location.href = "/modules/employee/projects/index.html" },
    { label: "Open My Work", icon: "💼", action: () => window.location.href = "/modules/employee/my-work/index.html" },
    { label: "Open Dashboard", icon: "📊", action: () => window.location.href = "/modules/employee/dashboard/index.html" },
    { label: "Apply Leave", icon: "🌴", action: () => window.location.href = "/employee/leave" },
    { label: "Start Timer", icon: "⏱️", action: () => { if (window.JMKC.startGlobalTimer) window.JMKC.startGlobalTimer(); else alert("Navigate to My Work to use the timer."); }},
    { label: "Create Note", icon: "📝", action: () => { JMKC.addStickyNote("New note..."); }},
    { label: "Open Chat", icon: "💬", action: () => window.location.href = "/employee/chat" },
  ];

  // Override the search default empty state to show commands
  const modalInput = document.getElementById("searchModalInput");
  if (modalInput) {
    const orig = modalInput.oninput;
    const resultsContainer = document.getElementById("searchResults");
    // Show palette commands on open
    const showCommands = () => {
      if (!resultsContainer || modalInput.value.trim().length > 0) return;
      let html = `<div style="padding:8px 16px;font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);border-bottom:1px solid var(--border-color)">⚡ Quick Actions (Ctrl+K)</div>`;
      window.JMKC.commandPaletteActions.forEach((cmd, i) => {
        html += `<div class="search-result-item" data-cmd-index="${i}" onclick="JMKC.commandPaletteActions[${i}].action()" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px;transition:background 0.2s" onmouseover="this.style.background='var(--bg-primary)'" onmouseout="this.style.background='transparent'"><span>${cmd.icon}</span> <span>${cmd.label}</span></div>`;
      });
      resultsContainer.innerHTML = html;
    };
    // Trigger on modal open
    const observer = new MutationObserver(() => {
      const modal = document.getElementById("searchModal");
      if (modal && modal.classList.contains("active") && modalInput.value.trim() === "") {
        showCommands();
      }
    });
    const modal = document.getElementById("searchModal");
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }
}

/* ==================== BOOKMARKS ==================== */
function initBookmarks() {
  window.JMKC = window.JMKC || {};
  let cachedBookmarks = [];

  const fetchBookmarks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${window.location.origin}/api/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        cachedBookmarks = json.data || [];
        document.dispatchEvent(new CustomEvent("jmkc:bookmarks:updated"));
      }
    } catch (e) { console.error("Failed to load bookmarks"); }
  };

  window.JMKC.getBookmarks = () => cachedBookmarks;

  window.JMKC.addBookmark = async (type, name, url, itemId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${window.location.origin}/api/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type, name, url, itemId })
      });
      if (res.ok) fetchBookmarks();
    } catch (e) { console.error("Failed to add bookmark"); }
  };

  window.JMKC.removeBookmark = async (url) => {
    const b = cachedBookmarks.find(b => b.url === url);
    if (!b) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${window.location.origin}/api/bookmarks/${b._id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) fetchBookmarks();
    } catch (e) { console.error("Failed to remove bookmark"); }
  };

  window.JMKC.isBookmarked = (url) => cachedBookmarks.some(b => b.url === url);
  
  fetchBookmarks();
}

/* ==================== RECENT ITEMS ==================== */
function initRecentItems() {
  window.JMKC = window.JMKC || {};
  const STORAGE_KEY = "jmkc_recent_items";

  window.JMKC.getRecentItems = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  window.JMKC.trackRecentItem = (type, name, url) => {
    let items = JMKC.getRecentItems().filter(i => i.url !== url);
    items.unshift({ type, name, url, openedAt: new Date().toISOString() });
    if (items.length > 30) items.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  // Recent searches
  window.JMKC.addRecentSearch = (type, name, url) => {
    let searches = JSON.parse(localStorage.getItem("jmkc_recent_searches") || "[]").filter(s => s.url !== url);
    searches.unshift({ type, name, url });
    if (searches.length > 10) searches.pop();
    localStorage.setItem("jmkc_recent_searches", JSON.stringify(searches));
  };
}

/* ==================== ANNOUNCEMENTS ==================== */
function initAnnouncementsCenter() {
  window.JMKC = window.JMKC || {};

  window.JMKC.fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      // Try enterprise endpoint first, fallback to notifications
      const res = await fetch(`${window.location.origin}/api/notifications?type=announcement`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data || []);
    } catch (e) {
      return [];
    }
  };

  window.JMKC.markAnnouncementRead = (id) => {
    let read = JSON.parse(localStorage.getItem("jmkc_announcements_read") || "[]");
    if (!read.includes(id)) read.push(id);
    localStorage.setItem("jmkc_announcements_read", JSON.stringify(read));
  };
}

/* ==================== OFFLINE SYNC ==================== */
function initOfflineSync() {
  window.JMKC = window.JMKC || {};
  const QUEUE_KEY = "jmkc_offline_queue";

  window.JMKC.isOnline = () => navigator.onLine;

  window.JMKC.enqueueOffline = (method, url, body) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    queue.push({ method, url, body, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  window.JMKC.syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    if (queue.length === 0) return;
    const token = localStorage.getItem("token");
    const remaining = [];
    for (const item of queue) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });
      } catch (e) {
        remaining.push(item);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  };

  window.addEventListener("online", () => {
    document.querySelectorAll(".offline-banner").forEach(el => el.remove());
    JMKC.syncOfflineQueue();
  });

  window.addEventListener("offline", () => {
    if (!document.querySelector(".offline-banner")) {
      const banner = document.createElement("div");
      banner.className = "offline-banner";
      banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#ef4444;color:#fff;text-align:center;padding:8px;z-index:10000;font-size:0.85rem";
      banner.textContent = "⚠️ You are offline. Changes will sync when reconnected.";
      document.body.appendChild(banner);
    }
  });

  if (!navigator.onLine) window.dispatchEvent(new Event("offline"));
}

/* ==================== AUTOSAVE ==================== */
function initAutosave() {
  window.JMKC = window.JMKC || {};
  window.JMKC.autosaveTimers = {};

  window.JMKC.autosave = (key, getData, saveCallback, intervalMs = 5000) => {
    if (JMKC.autosaveTimers[key]) clearInterval(JMKC.autosaveTimers[key]);
    JMKC.autosaveTimers[key] = setInterval(() => {
      const data = getData();
      if (data) {
        localStorage.setItem(`jmkc_autosave_${key}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));
        if (typeof saveCallback === "function") saveCallback(data);
      }
    }, intervalMs);
  };

  window.JMKC.getAutosaved = (key) => {
    try { return JSON.parse(localStorage.getItem(`jmkc_autosave_${key}`)); } catch (e) { return null; }
  };
}

/* ==================== SOCKET.IO GLOBAL ==================== */
function initSocketGlobal() {
  window.JMKC = window.JMKC || {};
  if (typeof io === "undefined") return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const socket = io(window.location.origin, { auth: { token } });
    window.JMKC.socket = socket;

    socket.on("connect", () => {
      console.log("[JMKC] Socket connected globally");
    });

    // Realtime notification badge updates
    socket.on("notification", (data) => {
      const badge = document.getElementById("notificationCount");
      if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
        badge.style.display = "flex";
        badge.classList.add("realtime-glow");
      }
      if (JMKC.refreshNotifications) JMKC.refreshNotifications();
    });

    socket.on("chat:message", () => {
      // Dispatch custom event for pages that listen
      document.dispatchEvent(new CustomEvent("jmkc:chat:message"));
    });

    socket.on("project:updated", (data) => {
      document.dispatchEvent(new CustomEvent("jmkc:project:updated", { detail: data }));
    });

    socket.on("task:updated", (data) => {
      document.dispatchEvent(new CustomEvent("jmkc:task:updated", { detail: data }));
    });

    socket.on("disconnect", () => {
      console.log("[JMKC] Socket disconnected");
    });
  } catch (e) {
    console.error("[JMKC] Socket init failed", e);
  }
}

/* ==================== KEYBOARD NAVIGATION ==================== */
function initKeyboardNavigation() {
  // Arrow keys for search results
  document.addEventListener("keydown", (e) => {
    const results = document.querySelectorAll(".search-result-item");
    if (results.length === 0) return;
    const active = document.querySelector(".search-result-item.active-result");
    let index = Array.from(results).indexOf(active);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (active) active.classList.remove("active-result");
      index = (index + 1) % results.length;
      results[index].classList.add("active-result");
      results[index].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (active) active.classList.remove("active-result");
      index = index <= 0 ? results.length - 1 : index - 1;
      results[index].classList.add("active-result");
      results[index].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && active) {
      active.click();
    }
  });
}

/* ==================== PROFILE ==================== */
function initProfileData() {
  const userStr = localStorage.getItem("user") || localStorage.getItem("jmkc_user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const avatarStr = user.name ? user.name.substring(0, 2).toUpperCase() : "EM";
      const avatarEl = document.getElementById("headerAvatar");
      if (avatarEl) avatarEl.textContent = avatarStr;
    } catch(e) {}
  }
}
