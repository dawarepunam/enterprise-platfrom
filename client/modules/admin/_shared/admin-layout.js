/* ============================================================
   JMKC CRM — ADMIN LAYOUT INJECTOR
   Renders Sidebar, Header, Footer on every admin page
   Handles auth guard, active nav, toasts, modals
   ============================================================ */

(function () {
  "use strict";

  /* ── Config ─────────────────────────────────────────────── */
  const API = window.location.origin;
  const SIDEBAR_KEY = "jmkc_sidebar_collapsed";

  /* ── Sidebar Nav Items ──────────────────────────────────── */
  const NAV_ITEMS = [
    { section: "MAIN" },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "⊞",
      href: "/modules/admin/dashboard/dashboard.html",
      badge: null,
    },
    {
      id: "executive-overview",
      label: "Executive Overview",
      icon: "👑",
      href: "/admin/executive-overview",
      badge: null,
    },
    { section: "MANAGEMENT" },
    {
      id: "departments",
      label: "Departments",
      icon: "🏢",
      href: "/admin/departments",
      badge: null,
    },
    {
      id: "users",
      label: "Users",
      icon: "👥",
      href: "/admin/users",
      badge: null,
    },
    {
      id: "project-managers",
      label: "Project Managers",
      icon: "🎯",
      href: "/admin/project-managers",
      badge: null,
    },
    {
      id: "projects",
      label: "Projects",
      icon: "📁",
      href: "/admin/projects",
      badge: null,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: "✅",
      href: "/admin/tasks",
      badge: null,
    },
    { section: "HR & OPS" },
    {
      id: "attendance",
      label: "Attendance",
      icon: "📅",
      href: "/admin/attendance",
      badge: null,
    },
    {
      id: "leaves",
      label: "Leaves",
      icon: "🌿",
      href: "/admin/leaves",
      badge: null,
    },
    {
      id: "clients",
      label: "Clients",
      icon: "🤝",
      href: "/admin/crm",
      badge: null,
    },
    {
      id: "meetings",
      label: "Meetings",
      icon: "📹",
      href: "/admin/meetings",
      badge: null,
    },
    { section: "COLLABORATION" },
    {
      id: "microsoft-hub",
      label: "Microsoft Hub",
      icon: "🪟",
      href: "/admin/microsoft-hub",
      badge: null,
    },
    { id: "chat", label: "Chat", icon: "💬", href: "/admin/chat", badge: null },
    {
      id: "documents",
      label: "Documents",
      icon: "📄",
      href: "/admin/documents",
      badge: null,
    },
    { section: "INSIGHTS" },
    {
      id: "reports",
      label: "Reports",
      icon: "📊",
      href: "/admin/reports",
      badge: null,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "📈",
      href: "/admin/analytics",
      badge: null,
    },
    {
      id: "finance",
      label: "Finance",
      icon: "💰",
      href: "/admin/finance",
      badge: null,
    },
    {
      id: "ai-center",
      label: "AI Center",
      icon: "🤖",
      href: "/admin/ai-center",
      badge: null,
    },
    { section: "ADMIN" },
    {
      id: "support",
      label: "Support Tickets",
      icon: "🎫",
      href: "/admin/support",
      badge: null,
    },
    {
      id: "audit-logs",
      label: "Audit Logs",
      icon: "🔍",
      href: "/admin/audit-logs",
      badge: null,
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
      href: "/admin/settings",
      badge: null,
    },
  ];

  /* ── Detect current page ────────────────────────────────── */
  function getActiveId() {
    const path = window.location.pathname;
    const found = NAV_ITEMS.filter((i) => i.href)
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => path.startsWith(i.href));
    return found ? found.id : "dashboard";
  }

  /* ── Auth Guard ─────────────────────────────────────────── */
  function getUser() {
    try {
      const token = localStorage.getItem("jmkc_token");
      const user = JSON.parse(localStorage.getItem("jmkc_user") || "null");
      if (!token || !user) return null;
      return user;
    } catch {
      return null;
    }
  }

  function authGuard() {
    const user = getUser();
    if (!user) {
      window.location.href = "/login";
      return null;
    }
    if (user.role !== "ADMIN" && user.role !== "admin") {
      window.location.href = "/login";
      return null;
    }
    return user;
  }

  /* ── Build Sidebar HTML ─────────────────────────────────── */
  function buildSidebar(user, collapsed) {
    const activeId = getActiveId();
    let html = `
    <aside class="admin-sidebar${collapsed ? " collapsed" : ""}" id="adminSidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-logo">JM</div>
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-name">JMKC CRM</span>
          <span class="sidebar-brand-tagline">Enterprise Suite</span>
        </div>
        <button class="sidebar-toggle" id="sidebarToggle" title="Collapse sidebar">
          ${collapsed ? "▶" : "◀"}
        </button>
      </div>
      <nav class="sidebar-nav" id="sidebarNav">`;

    NAV_ITEMS.forEach((item) => {
      if (item.section) {
        html += `<div class="sidebar-section-label">${item.section}</div>`;
        return;
      }
      const isActive = item.id === activeId;
      html += `
        <a class="sidebar-nav-item${isActive ? " active" : ""}" href="${item.href}" id="nav-${item.id}">
          <span class="sidebar-nav-icon">${item.icon}</span>
          <span class="sidebar-nav-label">${item.label}</span>
          ${item.badge ? `<span class="sidebar-nav-badge">${item.badge}</span>` : ""}
          <span class="nav-tooltip">${item.label}</span>
        </a>`;
    });

    const initials = user
      ? (user.name || "Admin")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "AD";
    const name = user ? user.name || "Admin" : "Admin";
    const role = user ? user.role || "ADMIN" : "ADMIN";

    html += `
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebarUserMenu">
          <div class="sidebar-user-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${name}</div>
            <div class="sidebar-user-role">${role}</div>
          </div>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
    return html;
  }

  /* ── Build Header HTML ──────────────────────────────────── */
  function buildHeader(user) {
    const initials = user
      ? (user.name || "Admin")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "AD";
    const name = user ? user.name || "Admin" : "Admin";
    const role = user ? user.role || "ADMIN" : "ADMIN";

    // Clean title for header instead of raw path breadcrumbs
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    let currentModule = "Dashboard";
    if (pathSegments.length > 1) {
      currentModule = pathSegments[pathSegments.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('.html', '');
    }

    const isDashboard = window.location.pathname.includes('/dashboard') || window.location.pathname === '/admin' || window.location.pathname === '/admin/';
    const backBtnDisplay = isDashboard ? 'display: none;' : 'display: flex;';

    return `
    <header class="admin-header" id="adminHeader">
      <div style="display:flex; align-items:center;">
        <button class="header-menu-btn" id="headerMenuBtn" title="Toggle sidebar">☰</button>
        <button class="btn btn-outline" style="padding: 4px 10px; margin-right: 15px; border-radius: 6px; font-size: 13px; font-weight: 500; align-items: center; gap: 5px; cursor: pointer; ${backBtnDisplay}" onclick="window.history.back()" title="Go Back">
          <span>←</span> Back
        </button>
      </div>
      <div class="header-breadcrumb"><strong>${currentModule}</strong></div>

      <div class="header-search">
        <span class="header-search-icon">🔍</span>
        <input type="search" class="header-search-input" id="globalSearch"
               placeholder="Search users, projects, clients, tasks..." autocomplete="off">
        <div class="search-dropdown" id="searchDropdown">
          <div class="search-dropdown-section">
            <div class="search-dropdown-label">Quick Access</div>
            <a class="search-result-item" href="/admin/users">
              <div class="search-result-icon" style="background:#EFF6FF">👥</div>
              <div><div>Users</div><div style="font-size:11px;color:var(--text-4)">Manage team members</div></div>
            </a>
            <a class="search-result-item" href="/admin/projects">
              <div class="search-result-icon" style="background:#FFF7ED">📁</div>
              <div><div>Projects</div><div style="font-size:11px;color:var(--text-4)">All active projects</div></div>
            </a>
            <a class="search-result-item" href="/admin/crm">
              <div class="search-result-icon" style="background:#F0FDF4">🤝</div>
              <div><div>Clients</div><div style="font-size:11px;color:var(--text-4)">Client management</div></div>
            </a>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button class="header-icon-btn" id="notifBtn" title="Notifications">
          🔔
          <span class="header-notif-badge" id="notifCount">0</span>
        </button>
        <button class="header-icon-btn" id="msgBtn" title="Messages">💬</button>
        <div class="header-profile">
          <div class="header-avatar" id="profileAvatar" title="${name}">${initials}</div>
          <div class="profile-dropdown" id="profileDropdown">
            <div class="profile-dropdown-user">
              <div class="profile-dropdown-avatar">${initials}</div>
              <div>
                <div class="profile-dropdown-name">${name}</div>
                <div class="profile-dropdown-role">${role}</div>
              </div>
            </div>
            <div class="profile-dropdown-menu">
              <a class="profile-dropdown-item" href="/admin/settings?tab=profile">
                <span class="item-icon">👤</span> My Profile
              </a>
              <a class="profile-dropdown-item" href="/admin/settings">
                <span class="item-icon">⚙️</span> Settings
              </a>
              <a class="profile-dropdown-item" href="/admin/settings?tab=security">
                <span class="item-icon">🔒</span> Security
              </a>
              <a class="profile-dropdown-item" href="/admin/settings?tab=privacy">
                <span class="item-icon">🛡️</span> Privacy
              </a>
              <a class="profile-dropdown-item" href="/admin/microsoft-hub">
                <span class="item-icon">🪟</span> Integrations
              </a>
              <div class="profile-dropdown-divider"></div>
              <div class="profile-dropdown-item danger" id="logoutBtn">
                <span class="item-icon">🚪</span> Logout
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Panel -->
      <div class="notif-panel" id="notifPanel">
        <div class="notif-panel-header">
          <h4>Notifications</h4>
          <span class="notif-mark-all" id="markAllRead">Mark all read</span>
        </div>
        <div class="notif-list" id="notifList">
          <div class="notif-item">
            <div class="notif-item-icon" style="background:var(--primary-light)">🔔</div>
            <div class="notif-item-text">
              <div class="notif-item-title">Loading notifications...</div>
            </div>
          </div>
        </div>
        <div class="notif-panel-footer">
          <a href="/admin/notifications">View all notifications</a>
        </div>
      </div>
    </header>`;
  }

  /* ── Build Footer HTML ──────────────────────────────────── */
  function buildFooter() {
    const year = new Date().getFullYear();
    return `
    <footer class="admin-footer" id="adminFooter" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: #fff; border-top: 1px solid var(--border-color); font-size: 13px; color: var(--text-3); margin-top: auto;">
      <div class="admin-footer-copy">
        <span style="font-weight: 700; color: var(--primary); font-size: 14px;">ProERP</span>
        <span style="margin: 0 8px;">|</span>
        &copy; ${year} <strong>JMKCGRPINDIA</strong>. All rights reserved.
      </div>
      <div class="admin-footer-right" style="display: flex; gap: 15px; align-items: center;">
        <span style="display:flex; align-items:center; gap:5px;">
          <span style="width:8px; height:8px; border-radius:50%; background:var(--success); display:inline-block;"></span>
          System Online
        </span>
        <span style="margin: 0 5px; color: var(--border-color);">|</span>
        <span>Version 2.0</span>
        <span style="margin: 0 5px; color: var(--border-color);">|</span>
        <a class="admin-footer-link" href="/admin/support" style="color: var(--text-3); text-decoration: none;">Support</a>
        <a class="admin-footer-link" href="/admin/settings?tab=privacy" style="color: var(--text-3); text-decoration: none;">Privacy</a>
      </div>
    </footer>`;
  }

  /* ── Toast System ───────────────────────────────────────── */
  function createToastContainer() {
    const c = document.createElement("div");
    c.className = "toast-container";
    c.id = "toastContainer";
    document.body.appendChild(c);
    return c;
  }

  window.showToast = function (
    title,
    msg = "",
    type = "info",
    duration = 4000,
  ) {
    const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    const cont =
      document.getElementById("toastContainer") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ""}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    cont.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("out");
      setTimeout(() => toast.remove(), 350);
    }, duration);
  };

  /* ── Page Loader ────────────────────────────────────────── */
  function showLoader(show = true) {
    let l = document.getElementById("pageLoader");
    if (!l) {
      l = document.createElement("div");
      l.id = "pageLoader";
      l.className = "page-loader";
      l.innerHTML =
        '<div class="loader-spinner"></div><div class="loader-text">Loading...</div>';
      document.body.appendChild(l);
    }
    l.classList.toggle("hidden", !show);
  }
  window.showLoader = showLoader;

  /* ── Bind Sidebar Toggle ────────────────────────────────── */
  function bindSidebarToggle() {
    const sidebar = document.getElementById("adminSidebar");
    const toggle = document.getElementById("sidebarToggle");
    const menuBtn = document.getElementById("headerMenuBtn");
    const overlay = document.getElementById("sidebarOverlay");

    toggle?.addEventListener("click", () => {
      const collapsed = sidebar.classList.toggle("collapsed");
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
      toggle.textContent = collapsed ? "▶" : "◀";
    });

    menuBtn?.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle("mobile-open");
        overlay.classList.toggle("active");
      } else {
        sidebar.classList.toggle("collapsed");
      }
    });

    overlay?.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      overlay.classList.remove("active");
    });
  }

  /* ── Bind Header Dropdowns ──────────────────────────────── */
  function bindHeaderActions() {
    const notifBtn = document.getElementById("notifBtn");
    const notifPan = document.getElementById("notifPanel");
    const avatar = document.getElementById("profileAvatar");
    const profDrop = document.getElementById("profileDropdown");
    const logoutBtn = document.getElementById("logoutBtn");
    const search = document.getElementById("globalSearch");
    const searchDd = document.getElementById("searchDropdown");
    const msgBtn = document.getElementById("msgBtn");

    function closeAll() {
      notifPan?.classList.remove("open");
      profDrop?.classList.remove("open");
      searchDd?.classList.remove("open");
    }

    notifBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = notifPan.classList.contains("open");
      closeAll();
      if (!wasOpen) {
        notifPan.classList.add("open");
        loadNotifications();
      }
    });

    avatar?.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = profDrop.classList.contains("open");
      closeAll();
      if (!wasOpen) profDrop.classList.add("open");
    });

    search?.addEventListener("focus", () => {
      searchDd?.classList.add("open");
    });
    search?.addEventListener("input", debounce(doSearch, 300));

    msgBtn?.addEventListener("click", () => {
      window.location.href = "/admin/chat";
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#notifBtn") && !e.target.closest("#notifPanel"))
        notifPan?.classList.remove("open");
      if (
        !e.target.closest("#profileAvatar") &&
        !e.target.closest("#profileDropdown")
      )
        profDrop?.classList.remove("open");
      if (!e.target.closest(".header-search"))
        searchDd?.classList.remove("open");
    });

    logoutBtn?.addEventListener("click", logout);
  }

  /* ── Global Search ──────────────────────────────────────── */
  async function doSearch(e) {
    const q = e.target.value.trim();
    const dd = document.getElementById("searchDropdown");
    if (!q) {
      dd.classList.remove("open");
      return;
    }
    dd.classList.add("open");
    try {
      const token = localStorage.getItem("jmkc_token");
      const res = await fetch(
        `${API}/api/users?search=${encodeURIComponent(q)}&limit=3`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      const users = data.users || data.data || [];
      if (users.length > 0) {
        dd.innerHTML = `
          <div class="search-dropdown-section">
            <div class="search-dropdown-label">Users</div>
            ${users
              .map(
                (u) => `
              <a class="search-result-item" href="/admin/users/${u._id}">
                <div class="search-result-icon" style="background:var(--primary-light)">👤</div>
                <div>
                  <div>${u.name || u.email}</div>
                  <div style="font-size:11px;color:var(--text-4)">${u.role} · ${u.department || ""}</div>
                </div>
              </a>`,
              )
              .join("")}
          </div>`;
      }
    } catch (err) {
      /* silently fail */
    }
  }

  /* ── Load Notifications ─────────────────────────────────── */
  async function loadNotifications() {
    try {
      const token = localStorage.getItem("jmkc_token");
      const res = await fetch(`${API}/api/notifications?limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const notifs = data.notifications || data.data || [];
      const list = document.getElementById("notifList");
      const countEl = document.getElementById("notifCount");
      const unread = notifs.filter((n) => !n.read).length;

      if (countEl) countEl.textContent = unread > 0 ? unread : "0";

      if (!list) return;
      if (notifs.length === 0) {
        list.innerHTML =
          '<div class="notif-item"><div class="notif-item-text"><div class="notif-item-title">No new notifications</div></div></div>';
        return;
      }
      list.innerHTML = notifs
        .map(
          (n) => `
        <div class="notif-item${n.read ? "" : " unread"}" onclick="window.location.href='${n.link || "#"}'">
          <div class="notif-item-icon" style="background:var(--primary-light)">${getNotifIcon(n.type)}</div>
          <div class="notif-item-text">
            <div class="notif-item-title">${n.title || n.message || "Notification"}</div>
            <div class="notif-item-desc">${n.body || n.description || ""}</div>
            <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
          </div>
        </div>`,
        )
        .join("");
    } catch {
      /* silently fail */
    }
  }

  function getNotifIcon(type) {
    const map = {
      task: "✅",
      project: "📁",
      leave: "🌿",
      meeting: "📹",
      chat: "💬",
      alert: "🚨",
      system: "⚙️",
    };
    return map[type] || "🔔";
  }

  /* ── Logout ─────────────────────────────────────────────── */
  function logout() {
    localStorage.removeItem("jmkc_token");
    localStorage.removeItem("jmkc_user");
    window.location.href = "/login";
  }
  window.logout = logout;

  /* ── Helpers ────────────────────────────────────────────── */
  function debounce(fn, ms) {
    let t;
    return function (...a) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, a), ms);
    };
  }

  function timeAgo(date) {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  window.timeAgo = timeAgo;

  /* ── INIT ───────────────────────────────────────────────── */
  function init() {
    const user = authGuard();
    if (!user) return;

    const collapsed = localStorage.getItem(SIDEBAR_KEY) === "1";

    // Create wrapper if not exists
    if (!document.getElementById("adminSidebar")) {
      document.body.insertAdjacentHTML(
        "afterbegin",
        buildSidebar(user, collapsed),
      );
    }

    // Wrap existing main content in admin-wrapper
    let wrapper = document.getElementById("adminWrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "admin-wrapper";
      wrapper.id = "adminWrapper";
      // Move all existing body children (except sidebar/overlay) into wrapper
      const toMove = [...document.body.children].filter(
        (el) =>
          !el.classList.contains("admin-sidebar") &&
          !el.classList.contains("sidebar-overlay") &&
          el.id !== "toastContainer" &&
          el.id !== "pageLoader",
      );
      toMove.forEach((el) => wrapper.appendChild(el));
      document.body.appendChild(wrapper);
    }

    // Inject header at top of wrapper
    if (!document.getElementById("adminHeader")) {
      wrapper.insertAdjacentHTML("afterbegin", buildHeader(user));
    }

    // Inject footer at end of wrapper
    if (!document.getElementById("adminFooter")) {
      wrapper.insertAdjacentHTML("beforeend", buildFooter());
    }

    // Ensure content area has class
    const main =
      wrapper.querySelector("main") || wrapper.querySelector(".admin-content");
    if (main && !main.classList.contains("admin-content")) {
      main.classList.add("admin-content");
    }

    // Toast container
    if (!document.getElementById("toastContainer")) createToastContainer();

    bindSidebarToggle();
    bindHeaderActions();

    // Initial notification count
    loadNotificationsCount();
  }

  async function loadNotificationsCount() {
    try {
      const token = localStorage.getItem("jmkc_token");
      const res = await fetch(`${API}/api/notifications?limit=1&unread=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const count = data.unreadCount || data.total || 0;
      const el = document.getElementById("notifCount");
      if (el) el.textContent = count > 99 ? "99+" : count;
    } catch {
      /* silently fail */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
