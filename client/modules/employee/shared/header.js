/* ===================================================
   header.js — Employee Module Global Header
=================================================== */
(function () {
  'use strict';

  function getUser() {
    try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || '{}'); }
    catch { return {}; }
  }
  function getToken() { return localStorage.getItem('token') || localStorage.getItem('jmkc_token'); }
  function apiFetch(path) {
    return fetch(window.location.origin + '/api' + path, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
    }).then(r => r.ok ? r.json() : Promise.reject());
  }

  function buildHeader() {
    const user = getUser();
    const initials = (user.name || 'E').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return `
    <header class="emp-header" id="empHeader">
      <div class="hdr-left">
        <button class="hdr-btn hdr-hamburger" id="hamburgerBtn" title="Toggle Sidebar">
          <span></span><span></span><span></span>
        </button>
        <div class="hdr-search-trigger" id="searchTrigger">
          <span class="hdr-search-icon">🔍</span>
          <span class="hdr-search-text">Search projects, tasks, people…</span>
          <kbd class="hdr-kbd">Ctrl K</kbd>
        </div>
      </div>

      <div class="hdr-right">
        <button class="hdr-icon-btn" id="calendarBtn" title="Calendar" onclick="window.location='/employee/attendance'">
          📅
        </button>
        <button class="hdr-icon-btn" id="chatBtn" title="Team Chat" onclick="window.location='/employee/chat'">
          💬
          <span class="hdr-badge" id="chatBadge"></span>
        </button>
        <div class="hdr-divider"></div>
        <button class="hdr-icon-btn" id="notifBtn" title="Notifications">
          🔔
          <span class="hdr-badge" id="notifBadge"></span>
        </button>
        <div class="hdr-icon-btn hdr-quick-wrap dropdown" id="quickActionsWrap">
          <button class="hdr-icon-btn" id="quickActionsBtn" title="Quick Actions">⚡</button>
          <div class="dropdown-menu" id="quickActionsMenu">
            <div class="dropdown-item" onclick="window.location='/employee/leave'">🏖️ Apply Leave</div>
            <div class="dropdown-item" onclick="window.location='/employee/daily-updates'">📝 Daily Update</div>
            <div class="dropdown-item" onclick="window.location='/employee/attendance'">🕐 Open Attendance</div>
            <div class="dropdown-item" onclick="window.location='/employee/meetings'">📅 Schedule Meeting</div>
            <div class="dropdown-item" onclick="window.location='/employee/tasks'">✅ My Tasks</div>
          </div>
        </div>
        <div class="hdr-profile-wrap dropdown" id="profileWrap">
          <button class="hdr-profile-btn" id="profileBtn">
            <div class="avatar avatar-sm hdr-avatar">${initials}</div>
            <span class="hdr-profile-name">${(user.name || 'Employee').split(' ')[0]}</span>
            <span class="hdr-caret">▾</span>
          </button>
          <div class="dropdown-menu" id="profileMenu">
            <div class="dropdown-item-header">
              <div class="avatar">${initials}</div>
              <div>
                <div style="font-weight:600;font-size:0.875rem">${user.name || 'Employee'}</div>
                <div style="font-size:0.75rem;color:var(--clr-text-muted)">${user.email || ''}</div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="/employee/profile">👤 My Profile</a>
            <a class="dropdown-item" href="/employee/settings">⚙️ Settings</a>
            <div class="dropdown-item" id="themeToggleBtn">🌓 Toggle Dark/Light</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" id="logoutBtn">🚪 Logout</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Search Popup -->
    <div class="search-popup-overlay" id="searchPopup">
      <div class="search-popup-box">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="searchInput" placeholder="Search projects, tasks, people, files…" autocomplete="off">
          <kbd class="hdr-kbd">ESC</kbd>
        </div>
        <div class="search-results" id="searchResults">
          <div class="search-section-label">Quick Links</div>
          <div class="search-result-item" onclick="window.location='/employee/dashboard'">
            <div class="search-result-icon" style="background:var(--clr-primary-glow)">⊞</div>
            <div><div style="font-size:0.875rem;font-weight:500">Dashboard</div><div style="font-size:0.75rem;color:var(--clr-text-muted)">Your home base</div></div>
          </div>
          <div class="search-result-item" onclick="window.location='/employee/tasks'">
            <div class="search-result-icon" style="background:var(--clr-success-bg)">✅</div>
            <div><div style="font-size:0.875rem;font-weight:500">My Tasks</div><div style="font-size:0.75rem;color:var(--clr-text-muted)">All your assigned tasks</div></div>
          </div>
          <div class="search-result-item" onclick="window.location='/employee/projects'">
            <div class="search-result-icon" style="background:var(--clr-info-bg)">📁</div>
            <div><div style="font-size:0.875rem;font-weight:500">Projects</div><div style="font-size:0.75rem;color:var(--clr-text-muted)">Your active projects</div></div>
          </div>
          <div class="search-result-item" onclick="window.location='/employee/meetings'">
            <div class="search-result-icon" style="background:var(--clr-purple-bg)">📅</div>
            <div><div style="font-size:0.875rem;font-weight:500">Meetings</div><div style="font-size:0.75rem;color:var(--clr-text-muted)">Today's schedule</div></div>
          </div>
          <div id="searchDynamicResults"></div>
        </div>
      </div>
    </div>

    <!-- Notifications Drawer -->
    <div class="drawer" id="notifDrawer">
      <div class="drawer-header">
        <div>
          <h3 style="font-size:1rem;font-weight:700">Notifications</h3>
          <p style="font-size:0.75rem;color:var(--clr-text-muted)" id="notifCount">Loading…</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="markAllReadBtn">Mark all read</button>
      </div>
      <div class="drawer-body" id="notifList">
        <div class="skeleton skeleton-card" style="margin-bottom:0.75rem"></div>
        <div class="skeleton skeleton-card" style="margin-bottom:0.75rem"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>
    <div class="drawer-overlay" id="drawerOverlay"></div>

    <!-- Toast container -->
    <div class="toast-container" id="toastContainer"></div>`;
  }

  function bindEvents() {
    // Search
    document.getElementById('searchTrigger')?.addEventListener('click', openSearch);
    document.getElementById('searchInput')?.addEventListener('input', onSearch);
    document.querySelector('.search-popup-overlay')?.addEventListener('click', e => {
      if (e.target.classList.contains('search-popup-overlay')) closeSearch();
    });

    // Notifications
    document.getElementById('notifBtn')?.addEventListener('click', toggleNotifDrawer);
    document.getElementById('drawerOverlay')?.addEventListener('click', closeNotifDrawer);
    document.getElementById('markAllReadBtn')?.addEventListener('click', markAllNotifRead);

    // Quick Actions
    const qaBtn = document.getElementById('quickActionsBtn');
    const qaMenu = document.getElementById('quickActionsMenu');
    qaBtn?.addEventListener('click', e => { e.stopPropagation(); qaMenu?.classList.toggle('open'); });

    // Profile
    const pfBtn = document.getElementById('profileBtn');
    const pfMenu = document.getElementById('profileMenu');
    pfBtn?.addEventListener('click', e => { e.stopPropagation(); pfMenu?.classList.toggle('open'); qaMenu?.classList.remove('open'); });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      qaMenu?.classList.remove('open');
      pfMenu?.classList.remove('open');
    });

    // Theme
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      localStorage.clear(); window.location.href = '/login?logout=1';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') { closeSearch(); closeNotifDrawer(); }
    });

    // Load notifications
    loadNotifications();
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function openSearch() {
    document.getElementById('searchPopup')?.classList.add('active');
    setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
  }
  function closeSearch() { document.getElementById('searchPopup')?.classList.remove('active'); }

  async function onSearch(e) {
    const q = e.target.value.trim();
    const results = document.getElementById('searchDynamicResults');
    if (!results) return;
    if (!q) { results.innerHTML = ''; return; }

    results.innerHTML = `<div class="search-section-label">Searching…</div>`;
    try {
      const [tasks, projects] = await Promise.all([
        apiFetch(`/tasks?search=${encodeURIComponent(q)}&limit=3`).catch(() => ({ data: [] })),
        apiFetch(`/projects?search=${encodeURIComponent(q)}&limit=3`).catch(() => ({ data: [] })),
      ]);
      const taskList = tasks.data || tasks || [];
      const projList = projects.data || projects || [];
      let html = '';
      if (projList.length) {
        html += `<div class="search-section-label">Projects</div>`;
        projList.forEach(p => {
          html += `<div class="search-result-item" onclick="window.location='/employee/project-detail?id=${p._id}'">
            <div class="search-result-icon" style="background:var(--clr-info-bg)">📁</div>
            <div><div style="font-size:0.875rem;font-weight:500">${p.name || p.title || ''}</div>
            <div style="font-size:0.75rem;color:var(--clr-text-muted)">${p.status || ''}</div></div>
          </div>`;
        });
      }
      if (taskList.length) {
        html += `<div class="search-section-label">Tasks</div>`;
        taskList.forEach(t => {
          html += `<div class="search-result-item" onclick="window.location='/employee/task-detail?id=${t._id}'">
            <div class="search-result-icon" style="background:var(--clr-success-bg)">✅</div>
            <div><div style="font-size:0.875rem;font-weight:500">${t.title || t.name || ''}</div>
            <div style="font-size:0.75rem;color:var(--clr-text-muted)">${t.status || ''}</div></div>
          </div>`;
        });
      }
      if (!html) html = `<div class="empty-state" style="padding:2rem"><div class="empty-state-icon">🔍</div><p>No results for "<strong>${q}</strong>"</p></div>`;
      results.innerHTML = html;
    } catch { results.innerHTML = ''; }
  }

  function toggleNotifDrawer() {
    const drawer = document.getElementById('notifDrawer');
    const overlay = document.getElementById('drawerOverlay');
    drawer?.classList.toggle('active');
    overlay?.classList.toggle('active');
  }
  function closeNotifDrawer() {
    document.getElementById('notifDrawer')?.classList.remove('active');
    document.getElementById('drawerOverlay')?.classList.remove('active');
  }

  async function loadNotifications() {
    try {
      const res = await apiFetch('/notifications?limit=20');
      const items = res.data || res || [];
      const badge = document.getElementById('notifBadge');
      const unread = items.filter(n => !n.read).length;
      if (badge) badge.textContent = unread > 0 ? (unread > 99 ? '99+' : unread) : '';

      const list = document.getElementById('notifList');
      const count = document.getElementById('notifCount');
      if (count) count.textContent = `${unread} unread`;
      if (!list) return;

      if (!items.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔔</div><p>No notifications yet</p></div>`;
        return;
      }

      const icons = { task: '✅', leave: '🏖️', meeting: '📅', project: '📁', file: '📂', comment: '💬', announcement: '📢', goal: '🎯' };
      list.innerHTML = items.map(n => {
        const icon = icons[n.type] || '🔔';
        const time = n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n._id}" onclick="markNotifRead('${n._id}', '${n.link || ''}')">
            <div class="notif-icon">${icon}</div>
            <div class="notif-body">
              <div class="notif-text">${n.message || n.title || ''}</div>
              <div class="notif-time">${time}</div>
            </div>
            ${!n.read ? '<div class="notif-dot"></div>' : ''}
          </div>`;
      }).join('');
    } catch {
      const list = document.getElementById('notifList');
      if (list) list.innerHTML = `<div class="empty-state"><p>Could not load notifications</p></div>`;
    }
  }

  async function markAllNotifRead() {
    try {
      await fetch(window.location.origin + '/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      loadNotifications();
    } catch {}
  }

  window.markNotifRead = async function(id, link) {
    try {
      await fetch(window.location.origin + `/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
    } catch {}
    if (link) window.location.href = link;
  };

  window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  function injectHeaderStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .emp-header {
        position: fixed; top: 0; left: var(--sidebar-w); right: 0; z-index: var(--z-header);
        height: var(--header-h);
        background: var(--glass);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        border-bottom: 1px solid var(--clr-border);
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 1.5rem;
        transition: left var(--t-slow);
      }
      .app-shell.sidebar-collapsed .emp-header { left: var(--sidebar-collapsed); }
      @media (max-width:900px) { .emp-header { left: 0 !important; } }

      .hdr-left { display: flex; align-items: center; gap: 1rem; flex: 1; }
      .hdr-right { display: flex; align-items: center; gap: 0.25rem; }
      .hdr-hamburger {
        width: 38px; height: 38px; border-radius: 8px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
        color: var(--clr-text-muted);
        transition: all var(--t-fast);
      }
      .hdr-hamburger:hover { background: var(--clr-surface-2); color: var(--clr-text); }
      .hdr-hamburger span { display: block; width: 18px; height: 2px; background: currentColor; border-radius: 2px; transition: all var(--t-fast); }
      .hdr-search-trigger {
        display: flex; align-items: center; gap: 0.75rem;
        background: var(--clr-surface-2); border: 1px solid var(--clr-border);
        border-radius: 8px; padding: 0.4rem 0.85rem;
        cursor: text; max-width: 400px; flex: 1;
        transition: all var(--t-fast);
      }
      .hdr-search-trigger:hover { border-color: var(--clr-border-hover); }
      .hdr-search-icon { font-size: 0.85rem; color: var(--clr-text-muted); }
      .hdr-search-text { font-size: 0.8rem; color: var(--clr-text-muted); flex: 1; }
      .hdr-kbd {
        font-size: 0.65rem; color: var(--clr-text-muted);
        background: var(--clr-surface-3); border-radius: 4px;
        padding: 1px 5px; font-family: monospace;
      }
      .hdr-icon-btn {
        width: 36px; height: 36px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; color: var(--clr-text-muted);
        transition: all var(--t-fast);
        position: relative;
      }
      .hdr-icon-btn:hover { background: var(--clr-surface-2); color: var(--clr-text); }
      .hdr-badge {
        position: absolute; top: 3px; right: 3px;
        min-width: 16px; height: 16px;
        background: var(--clr-danger); color: #fff;
        border-radius: 99px; font-size: 0.6rem; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        padding: 0 4px; line-height: 1;
        border: 2px solid var(--clr-surface);
      }
      .hdr-divider { width: 1px; height: 22px; background: var(--clr-border); margin: 0 0.25rem; }
      .hdr-profile-btn {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.3rem 0.6rem; border-radius: 8px;
        transition: all var(--t-fast);
      }
      .hdr-profile-btn:hover { background: var(--clr-surface-2); }
      .hdr-profile-name { font-size: 0.8125rem; font-weight: 600; color: var(--clr-text); }
      .hdr-caret { font-size: 0.6rem; color: var(--clr-text-muted); }
      .dropdown-item-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; }
      .notif-item {
        display: flex; align-items: flex-start; gap: 0.75rem;
        padding: 0.75rem; border-radius: 8px; cursor: pointer;
        transition: background var(--t-fast);
        border-left: 3px solid transparent;
        margin-bottom: 0.25rem;
      }
      .notif-item:hover { background: var(--clr-surface-2); }
      .notif-item.unread { border-left-color: var(--clr-primary); }
      .notif-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
      .notif-body { flex: 1; }
      .notif-text { font-size: 0.8125rem; color: var(--clr-text-secondary); line-height: 1.4; }
      .notif-time { font-size: 0.6875rem; color: var(--clr-text-muted); margin-top: 0.2rem; }
      .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--clr-primary); flex-shrink: 0; margin-top: 5px; }
      .drawer-overlay {
        display: none; position: fixed; inset: 0; z-index: var(--z-drawer);
        background: rgba(0,0,0,0.5);
        opacity: 0; transition: opacity var(--t);
      }
      .drawer-overlay.active { display: block; opacity: 1; }
      .dropdown-menu { z-index: var(--z-dropdown) !important; }
      .search-popup-overlay { z-index: var(--z-modal) !important; }
      .drawer { z-index: calc(var(--z-drawer) + 10) !important; }
    `;
    document.head.appendChild(style);
  }

  function inject() {
    const el = document.getElementById('header');
    if (!el) return;
    el.outerHTML = buildHeader();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectHeaderStyles();
    inject();
  });
})();
