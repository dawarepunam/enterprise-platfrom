/**
 * PM Shell - Shared Layout System
 * Injects sidebar + header into every PM page automatically.
 * Usage: Just add <script src="/modules/project-manager/pm-shell.js"></script>
 *        and have <div id="pm-sidebar-root"></div> + <div id="pm-header-root"></div>
 */
(function () {
  'use strict';

  // ── Auth ──────────────────────────────────────────────────────
  function getToken() { return localStorage.getItem('token') || localStorage.getItem('jmkc_token') || ''; }
  function getUser()  {
    try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || 'null'); }
    catch { return null; }
  }
  function authGuard() {
    const t = getToken(), u = getUser();
    if (!t || !u) { window.location.href = '/login'; return false; }
    // Optionally check if role is employee/team member, but for now just ensure they are logged in.
    return true;
  }
  window.getToken  = getToken;
  window.getUser   = getUser;
  window.authGuard = authGuard;

  // ── Sidebar HTML ──────────────────────────────────────────────
  function buildSidebarHTML() {
    const links = [
      { group:'Main', items:[
        { href:'/employee/dashboard',      icon:'fa-home',               label:'Dashboard' },
        { href:'/employee/tasks',          icon:'fa-check-square',       label:'My Tasks',       badge:'badge-task' },
        { href:'/employee/projects',       icon:'fa-folder-open',        label:'My Projects' },
      ]},
      { group:'Workforce', items:[
        { href:'/employee/attendance',     icon:'fa-clock',              label:'Attendance' },
        { href:'/employee/leave',          icon:'fa-calendar-times',     label:'Leaves' },
        { href:'/employee/daily-updates',  icon:'fa-clipboard-list',     label:'Daily Updates' },
        { href:'/employee/shift-history',  icon:'fa-history',            label:'Shift History' },
      ]},
      { group:'Collaborate', items:[
        { href:'/employee/meetings',       icon:'fa-video',              label:'Meetings',       badge:'badge-meet' },
        { href:'/employee/chat',           icon:'fa-comments',           label:'Team Chat',      badge:'badge-chat' },
        { href:'/employee/files',          icon:'fa-file-alt',           label:'Files' },
      ]},
      { group:'Performance', items:[
        { href:'/employee/goals-kpi',      icon:'fa-bullseye',           label:'Goals & KPI' },
        { href:'/employee/rewards',        icon:'fa-award',              label:'Rewards' },
      ]},
      { group:'System', items:[
        { href:'/employee/profile',        icon:'fa-id-card',            label:'My Profile' },
        { href:'/employee/settings',       icon:'fa-cog',                label:'Settings' },
      ]},
    ];

    const navHTML = links.map(({ group, items }) => `
      <div class="pm-nav-group">
        <div class="pm-nav-group-label">${group}</div>
        ${items.map(({ href, icon, label, badge }) => `
          <a href="${href}" class="pm-nav-item" data-path="${href}">
            <i class="fa ${icon}"></i>
            <span class="pm-nav-label">${label}</span>
            ${badge ? `<span class="nav-badge" id="${badge}" style="display:none">0</span>` : ''}
          </a>`).join('')}
      </div>`).join('');

    return `
      <aside class="pm-sidebar" id="pmSidebar">
        <div class="pm-sidebar-brand">
          <div class="pm-sidebar-logo">EMP</div>
          <div class="pm-sidebar-brand-text">
            <div class="brand-name">JMKC CRM</div>
            <div class="brand-role">Employee</div>
          </div>
          <button class="pm-sidebar-collapse-btn" id="sidebarCollapseBtn" title="Collapse sidebar">
            <i class="fa fa-chevron-left"></i>
          </button>
        </div>
        <nav class="pm-sidebar-nav" id="pmSidebarNav">${navHTML}</nav>
        <div class="pm-sidebar-footer">
          <div class="pm-user-mini" onclick="window.pmShell?.confirmLogout()">
            <div class="pm-user-avatar" id="sidebarAvatar">EMP</div>
            <div class="pm-user-info">
              <div class="pm-user-name"  id="sidebarUserName">Employee</div>
              <div class="pm-user-role"  id="sidebarUserDept">Department</div>
            </div>
            <button class="logout-btn" title="Logout" onclick="event.stopPropagation(); window.pmShell?.confirmLogout()">
              <i class="fa fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </aside>
      <div class="pm-mobile-overlay" id="pmMobileOverlay" onclick="window.pmShell?.closeSidebar()"></div>`;
  }

  // ── Header HTML ───────────────────────────────────────────────
  function buildHeaderHTML() {
    return `
      <header class="pm-header" id="pmHeader">
        <button class="pm-icon-btn" id="mobileMenuBtn" onclick="window.pmShell?.toggleSidebar()" title="Menu">
          <i class="fa fa-bars"></i>
        </button>
        
        <div id="headerBackBtnContainer" style="display:none; margin-right: 15px;">
          <button onclick="history.back()" style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
            <i class="fa fa-arrow-left"></i> Back
          </button>
        </div>

        <div class="pm-header-search">
          <i class="fa fa-search"></i>
          <input type="text" placeholder="Search projects, tasks, employees..." id="globalSearch" autocomplete="off" />
          <div class="pm-search-results" id="searchResults" style="display:none"></div>
        </div>
        <div class="pm-header-actions">
          <div class="pm-integration-btns">
            <button class="pm-integration-btn" title="Microsoft Teams" onclick="window.open('https://teams.microsoft.com','_blank')">
              <i class="fa fa-video" style="color:#5b5ea6"></i><span>Teams</span>
            </button>
            <button class="pm-integration-btn" title="Outlook" onclick="window.open('https://outlook.office.com','_blank')">
              <i class="fa fa-envelope" style="color:#0078d4"></i><span>Outlook</span>
            </button>
            <button class="pm-integration-btn" title="OneDrive" onclick="window.open('https://onedrive.live.com','_blank')">
              <i class="fa fa-cloud" style="color:#0078d4"></i><span>Drive</span>
            </button>
          </div>
          <div class="pm-header-divider"></div>
          <!-- Notification Bell -->
          <div class="pm-icon-btn pm-notif-trigger" id="headerNotifBtn" title="Notifications">
            <i class="fa fa-bell"></i>
            <span class="notif-dot" id="headerNotifDot" style="display:none"></span>
            <!-- Notification Dropdown -->
            <div class="pm-notif-dropdown" id="notifDropdown">
              <div class="pm-notif-header">
                <span class="pm-notif-title">Notifications</span>
                <span class="pm-notif-mark" onclick="event.stopPropagation();markAllRead()">Mark all read</span>
              </div>
              <div class="pm-notif-list" id="notifList">
                <div class="pm-notif-loading"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
              </div>
              <div class="pm-notif-footer">
                <a href="/project-manager/notifications">View All Notifications</a>
              </div>
            </div>
          </div>
          <!-- Chat -->
          <div class="pm-icon-btn" title="Team Chat" onclick="window.location='/employee/chat'">
            <i class="fa fa-comment-dots"></i>
            <span class="notif-dot" id="headerChatDot" style="display:none"></span>
          </div>
          <!-- Calendar -->
          <div class="pm-icon-btn" title="Calendar" onclick="window.location='/employee/calendar'">
            <i class="fa fa-calendar-alt"></i>
          </div>
          <div class="pm-header-divider"></div>
          <!-- Profile -->
          <div class="pm-profile-btn" id="profileBtn" onclick="window.location='/employee/profile'">
            <div class="pm-profile-avatar" id="headerAvatar">EMP</div>
            <span class="pm-profile-name" id="headerUserName">Employee</span>
            <i class="fa fa-chevron-down" style="font-size:10px;color:var(--pm-text-muted);margin-left:4px"></i>
          </div>
        </div>
      </header>`;
  }

  // ── Notification Dropdown CSS injection ───────────────────────
  function injectExtraCSS() {
    if (document.getElementById('pm-shell-extra-css')) return;
    const style = document.createElement('style');
    style.id = 'pm-shell-extra-css';
    style.textContent = `
      /* Collapsible sidebar */
      .pm-sidebar.collapsed { width: 64px; }
      .pm-sidebar.collapsed .pm-nav-label,
      .pm-sidebar.collapsed .pm-nav-group-label,
      .pm-sidebar.collapsed .pm-sidebar-brand-text,
      .pm-sidebar.collapsed .pm-user-info,
      .pm-sidebar.collapsed .nav-badge { display: none; }
      .pm-sidebar.collapsed .pm-sidebar-logo { width: 36px; }
      .pm-sidebar.collapsed .pm-sidebar-brand { justify-content: center; }
      .pm-sidebar.collapsed .pm-nav-item { justify-content: center; padding: 10px; }
      .pm-sidebar.collapsed .pm-nav-item i { width: auto; font-size: 16px; }
      .pm-sidebar.collapsed .pm-user-mini { justify-content: center; }
      .pm-sidebar.collapsed .pm-user-avatar { margin: 0; }
      .pm-sidebar.collapsed ~ .pm-header,
      .pm-sidebar.collapsed ~ * .pm-header { left: 64px; }
      .pm-sidebar.collapsed ~ .pm-main,
      .pm-sidebar.collapsed ~ * .pm-main  { margin-left: 64px; }
      .pm-sidebar.collapsed .pm-sidebar-collapse-btn i { transform: rotate(180deg); }
      .pm-sidebar-collapse-btn {
        width: 22px; height: 22px; border-radius: 50%;
        background: rgba(255,255,255,.1); color: rgba(255,255,255,.6);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 10px; border: none;
        transition: var(--pm-transition); margin-left: auto; flex-shrink: 0;
      }
      .pm-sidebar-collapse-btn:hover { background: rgba(255,255,255,.2); color: #fff; }
      .pm-sidebar-collapse-btn i { transition: transform .3s ease; }
      .logout-btn {
        width: 32px; height: 32px; border: none; border-radius: 10px;
        display: inline-flex; align-items: center; justify-content: center;
        color: #bfdbfe; background: rgba(255,255,255,.08); cursor: pointer;
      }
      .logout-btn:hover { color: #fff; background: rgba(239,68,68,.28); }

      /* Notification dropdown */
      .pm-notif-trigger { position: relative; }
      .pm-notif-dropdown {
        display: none; position: absolute;
        top: calc(100% + 10px); right: -80px;
        width: 320px; background: #fff;
        border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius);
        box-shadow: var(--pm-shadow-lg);
        z-index: 500;
        animation: popupIn .18s ease;
        overflow: hidden;
      }
      .pm-notif-trigger:hover .pm-notif-dropdown,
      .pm-notif-trigger.open .pm-notif-dropdown { display: block; }
      .pm-notif-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; border-bottom: 1px solid var(--pm-border);
      }
      .pm-notif-title { font-size: 13px; font-weight: 700; }
      .pm-notif-mark  { font-size: 11px; color: var(--pm-accent); cursor: pointer; }
      .pm-notif-mark:hover { text-decoration: underline; }
      .pm-notif-list  { max-height: 280px; overflow-y: auto; }
      .pm-notif-item  {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 10px 16px; border-bottom: 1px solid var(--pm-border);
        cursor: pointer; transition: var(--pm-transition);
        font-size: 12.5px;
      }
      .pm-notif-item:hover { background: var(--pm-bg); }
      .pm-notif-item.unread { background: var(--pm-accent-light); }
      .pm-notif-item .ni-icon {
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; flex-shrink: 0;
      }
      .pm-notif-item .ni-text { flex: 1; }
      .pm-notif-item .ni-time { font-size: 10.5px; color: var(--pm-text-muted); margin-top: 2px; }
      .pm-notif-footer { padding: 10px 16px; text-align: center; border-top: 1px solid var(--pm-border); }
      .pm-notif-footer a { font-size: 12px; color: var(--pm-accent); font-weight: 600; }
      .pm-notif-loading { padding: 20px; text-align: center; color: var(--pm-text-muted); font-size: 12.5px; }

      /* Search results */
      .pm-header-search { position: relative; }
      .pm-search-results {
        position: absolute; top: calc(100% + 8px); left: 0; right: 0;
        background: #fff; border: 1px solid var(--pm-border);
        border-radius: var(--pm-radius-sm);
        box-shadow: var(--pm-shadow-lg); z-index: 500;
        max-height: 300px; overflow-y: auto;
      }
      .pm-search-item {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 14px; font-size: 12.5px; cursor: pointer;
        border-bottom: 1px solid var(--pm-border); transition: var(--pm-transition);
      }
      .pm-search-item:hover { background: var(--pm-bg); }
      .pm-search-item:last-child { border: none; }
      .pm-search-item i { color: var(--pm-accent); width: 16px; }

      /* Mobile */
      @media (max-width: 768px) {
        #mobileMenuBtn { display: flex !important; }
        .pm-integration-btns { display: none; }
        .pm-integration-btns span { display: none; }
        .pm-mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 150;
          background: rgba(15, 23, 42, 0.42);
        }
        .pm-mobile-overlay.active {
          display: block;
        }
      }
      @media (min-width: 769px) {
        #mobileMenuBtn { display: none !important; }
        .pm-mobile-overlay { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Inject HTML ───────────────────────────────────────────────
  function inject() {
    const sidebarRoot = document.getElementById('pm-sidebar-root');
    const headerRoot  = document.getElementById('pm-header-root');

    if (sidebarRoot) sidebarRoot.outerHTML = buildSidebarHTML();
    if (headerRoot)  headerRoot.outerHTML  = buildHeaderHTML();
  }

  // ── Set active nav ────────────────────────────────────────────
  function setActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.pm-nav-item[data-path]').forEach(item => {
      const href = item.getAttribute('data-path');
      const isActive = path === href || (href !== '/project-manager/dashboard' && path.startsWith(href));
      item.classList.toggle('active', isActive);
    });
  }

  // ── Populate user ─────────────────────────────────────────────
  function populateUser() {
    const user = getUser();
    if (!user) return;
    const initials = user.name
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'PM';
    const colors = ['#3b82f6','#22c55e','#f97316','#a855f7','#ef4444','#06b6d4'];
    const color  = colors[user.name ? user.name.charCodeAt(0) % colors.length : 0];

    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarAvatar) { sidebarAvatar.textContent = initials; sidebarAvatar.style.background = color; }
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = user.name || 'Project Manager';
    const sidebarDept = document.getElementById('sidebarUserDept');
    if (sidebarDept) sidebarDept.textContent = user.department || 'Project Manager';

    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) { headerAvatar.textContent = initials; headerAvatar.style.background = color; }
    const headerName = document.getElementById('headerUserName');
    if (headerName) headerName.textContent = (user.name || 'PM').split(' ')[0];
  }

  // ── Sidebar collapse ──────────────────────────────────────────
  function initCollapse() {
    const btn     = document.getElementById('sidebarCollapseBtn');
    const sidebar = document.getElementById('pmSidebar');
    if (!btn || !sidebar) return;

    const collapsed = localStorage.getItem('pm_sidebar_collapsed') === 'true';
    if (collapsed) sidebar.classList.add('collapsed');

    btn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('pm_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
  }

  // ── Toggle sidebar (mobile) ───────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('pmSidebar');
    const overlay = document.getElementById('pmMobileOverlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active', sidebar?.classList.contains('open'));
  }

  function closeSidebar() {
    document.getElementById('pmSidebar')?.classList.remove('open');
    document.getElementById('pmMobileOverlay')?.classList.remove('active');
  }

  // ── Logout ────────────────────────────────────────────────────
  function confirmLogout() {
    if (typeof openModal === 'function') {
      openModal('modal-logout');
    } else {
      if (confirm('Are you sure you want to logout?')) performLogout();
    }
  }
  function performLogout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.clear();
    window.location.href = '/login';
  }
  window.performLogout = performLogout;

  // ── Load Notifications ────────────────────────────────────────
  async function loadNotifications() {
    try {
      const token = getToken();
      const res = await fetch('/api/notifications?size=8&unread=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.data || [];

      const notifList = document.getElementById('notifList');
      const notifDot  = document.getElementById('headerNotifDot');
      const badge     = document.getElementById('badge-notif');

      const unread = list.filter(n => !n.isRead).length;
      if (unread > 0) {
        if (notifDot) notifDot.style.display = 'block';
        if (badge) { badge.textContent = unread; badge.style.display = 'inline-flex'; }
      }

      if (!notifList) return;
      if (!list.length) {
        notifList.innerHTML = '<div class="pm-notif-loading"><i class="fa fa-bell-slash"></i> No new notifications</div>';
        return;
      }

      const iconMap = {
        task: { icon: 'fa-tasks', bg: '#dbeafe', color: '#2563eb' },
        project: { icon: 'fa-folder', bg: '#dcfce7', color: '#16a34a' },
        meeting: { icon: 'fa-video', bg: '#f3e8ff', color: '#7e22ce' },
        risk: { icon: 'fa-exclamation-triangle', bg: '#fee2e2', color: '#dc2626' },
        daily_update: { icon: 'fa-clipboard', bg: '#fef9c3', color: '#a16207' },
        default: { icon: 'fa-bell', bg: '#f0f0f0', color: '#666' },
      };

      notifList.innerHTML = list.map(n => {
        const type = (n.type || n.category || 'default').toLowerCase().replace(/_/g, '_');
        const style = iconMap[type] || iconMap.default;
        const time  = n.createdAt ? new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently';
        return `
          <div class="pm-notif-item ${!n.isRead ? 'unread' : ''}" onclick="window.location='/project-manager/notifications'">
            <div class="ni-icon" style="background:${style.bg};color:${style.color}">
              <i class="fa ${style.icon}"></i>
            </div>
            <div class="ni-text">
              <div>${n.message || n.title || 'New notification'}</div>
              <div class="ni-time"><i class="fa fa-clock"></i> ${time}</div>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      const notifList = document.getElementById('notifList');
      if (notifList) notifList.innerHTML = '<div class="pm-notif-loading">Unable to load notifications</div>';
    }
  }

  window.markAllRead = async function () {
    try {
      const token = getToken();
      await fetch('/api/notifications/mark-all-read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const dot   = document.getElementById('headerNotifDot');
      const badge = document.getElementById('badge-notif');
      if (dot)   dot.style.display = 'none';
      if (badge) badge.style.display = 'none';
      loadNotifications();
    } catch (e) { /* ignore */ }
  };

  // ── Global Search ─────────────────────────────────────────────
  function initSearch() {
    const input   = document.getElementById('globalSearch');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q) { results.style.display = 'none'; return; }
      timer = setTimeout(() => performSearch(q), 350);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => results.style.display = 'none', 200);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) results.style.display = 'block';
    });
  }

  async function performSearch(q) {
    const results = document.getElementById('searchResults');
    if (!results) return;
    results.style.display = 'block';
    results.innerHTML = '<div class="pm-search-item"><i class="fa fa-spinner fa-spin"></i> Searching...</div>';
    try {
      const token = getToken();
      const res   = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items = data.data || data.results || [];
      if (!items.length) {
        results.innerHTML = `<div class="pm-search-item"><i class="fa fa-search"></i> No results for "${q}"</div>`;
        return;
      }
      results.innerHTML = items.map(item => {
        const icons = { project:'fa-folder-open', task:'fa-check-square', user:'fa-user', team:'fa-users' };
        const icon  = icons[item.type] || 'fa-search';
        const url   = item.url || `/project-manager/${item.type}s/${item._id}`;
        return `<div class="pm-search-item" onclick="window.location='${url}'">
          <i class="fa ${icon}"></i>
          <div>
            <div style="font-weight:600">${item.name || item.title || 'Unknown'}</div>
            <div style="font-size:11px;color:var(--pm-text-muted)">${item.type || ''} ${item.subtitle || ''}</div>
          </div>
        </div>`;
      }).join('');
    } catch {
      results.innerHTML = `<div class="pm-search-item"><i class="fa fa-search"></i> No results for "${q}"</div>`;
    }
  }

  // ── Toast ─────────────────────────────────────────────────────
  window.pmToast = function (message, type = 'success') {
    let container = document.getElementById('pmToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pmToastContainer';
      container.className = 'pm-toast-container';
      document.body.appendChild(container);
    }
    const icons = { success:'check-circle', error:'times-circle', warning:'exclamation-triangle', info:'info-circle' };
    const toast = document.createElement('div');
    toast.className = `pm-toast ${type}`;
    toast.innerHTML = `<i class="fa fa-${icons[type]||'info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  // ── apiFetch ──────────────────────────────────────────────────
  async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }
  // Also expose globally
  window.apiFetch = apiFetch;

  // ── Modal helpers ─────────────────────────────────────────────
  window.openModal  = function (id) { document.getElementById(id)?.classList.add('open'); };
  window.closeModal = function (id) { document.getElementById(id)?.classList.remove('open'); };

  // ── Expose shell API ──────────────────────────────────────────
  window.pmShell = { toggleSidebar, closeSidebar, confirmLogout, performLogout, loadNotifications, apiFetch };

  // ── Auto-inject Footer + Back Button ────────────────────────
  function injectFooterAndBackBtn() {
    const path = window.location.pathname;
    const isDashboard = path.includes('/dashboard');
    const main = document.querySelector('.pm-main');
    
    if (!main) return;

    // 1. Inject Back Button
    if (!isDashboard) {
      const backContainer = document.getElementById('headerBackBtnContainer');
      if (backContainer) {
        backContainer.style.display = 'block';
      } else {
        // Fallback for pages without the updated header yet
        if (!document.getElementById('pm-auto-back-btn')) {
          const backBtn = document.createElement('a');
          backBtn.id = 'pm-auto-back-btn';
          backBtn.href = 'javascript:void(0)';
          backBtn.onclick = () => history.back();
          backBtn.className = 'pm-back-btn';
          backBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#374151;cursor:pointer;text-decoration:none;transition:all 0.15s;margin-bottom:20px;width:fit-content;align-self:flex-start;';
          backBtn.innerHTML = '<i class="fa fa-arrow-left" style="font-size:12px;"></i> Back';
          backBtn.onmouseover = () => { backBtn.style.background = '#e2e8f0'; backBtn.style.color = '#1e293b'; };
          backBtn.onmouseout  = () => { backBtn.style.background = '#f1f5f9'; backBtn.style.color = '#374151'; };
          main.insertBefore(backBtn, main.firstChild);
        }
      }
    }

    // 2. Inject Standard Footer (Bottom of main)
    if (!document.getElementById('pm-auto-footer')) {
      const footer = document.createElement('footer');
      footer.id = 'pm-auto-footer';
      footer.className = 'pm-page-footer';
      footer.style.cssText = 'margin-top:auto !important;padding:24px 0 16px;border-top:1px solid var(--pm-border,#eef0f4);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;width:100%;';
      footer.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;">JM</div>
          <span style="font-size:12.5px;color:var(--pm-text-muted,#94a3b8);">© 2026 JMKC Enterprise Platform. All rights reserved.</span>
        </div>
        <div style="display:flex;gap:16px;">
          <a href="#" style="font-size:12px;color:var(--pm-text-muted,#94a3b8);text-decoration:none;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color=''">Privacy Policy</a>
          <a href="#" style="font-size:12px;color:var(--pm-text-muted,#94a3b8);text-decoration:none;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color=''">Terms of Use</a>
          <a href="/project-manager/settings" style="font-size:12px;color:var(--pm-text-muted,#94a3b8);text-decoration:none;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color=''">Settings</a>
        </div>`;
      main.appendChild(footer);
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    if (!authGuard()) return;
    injectExtraCSS();
    inject();
    populateUser();
    setActiveNav();
    initCollapse();
    initSearch();

    // Load notifications async
    setTimeout(loadNotifications, 500);
    // Inject centralized Footer + Back Button
    setTimeout(injectFooterAndBackBtn, 100);


    // Close modal on overlay click
    document.addEventListener('click', e => {
      if (e.target.classList.contains('pm-modal-overlay')) {
        e.target.classList.remove('open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
