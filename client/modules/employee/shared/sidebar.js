/* ===================================================
   sidebar.js — Employee Module Sidebar
=================================================== */
(function () {
  'use strict';

  const NAV = [
    { section: null, items: [
      { icon: '⊞', label: 'Dashboard',     href: '/employee/dashboard' },
      { icon: '🏠', label: 'My Work',       href: '/employee/my-work'  },
    ]},
    { section: 'WORKSPACE', items: [
      { icon: '📁', label: 'My Projects',   href: '/employee/projects'     },
      { icon: '✅', label: 'My Tasks',      href: '/employee/tasks'        },
      { icon: '🏃', label: 'Sprint Board',  href: '/employee/sprint-board' },
      { icon: '📌', label: 'Kanban Board',  href: '/employee/kanban-board' },
    ]},
    { section: 'COLLABORATION', items: [
      { icon: '📅', label: 'Meetings',      href: '/employee/meetings' },
      { icon: '💬', label: 'Team Chat',     href: '/employee/chat'    },
      { icon: '📂', label: 'Files',         href: '/employee/files'   },
    ]},
    { section: 'EMPLOYEE', items: [
      { icon: '🕐', label: 'Attendance',    href: '/employee/attendance'    },
      { icon: '🏖️', label: 'Leaves',        href: '/employee/leave'         },
      { icon: '📝', label: 'Daily Updates', href: '/employee/daily-updates' },
      { icon: '📢', label: 'Announcements', href: '/employee/announcements' },
    ]},
    { section: 'ANALYTICS', items: [
      { icon: '🎯', label: 'Goals & KPI',   href: '/employee/goals-kpi'   },
      { icon: '📈', label: 'Performance',   href: '/employee/performance'  },
      { icon: '📊', label: 'Reports',       href: '/employee/reports'      },
    ]},
    { section: 'ACCOUNT', items: [
      { icon: '🔔', label: 'Notifications', href: '/employee/notifications' },
      { icon: '⚡', label: 'Activity Feed', href: '/employee/activity-feed' },
      { icon: '🏆', label: 'Rewards',       href: '/employee/rewards'       },
      { icon: '🔄', label: 'Shift History', href: '/employee/shift-history' },
      { icon: '⚙️', label: 'Settings',      href: '/employee/settings'      },
      { icon: '👤', label: 'Profile',       href: '/employee/profile'       },
    ]},
  ];

  function buildSidebar() {
    const user = window.__empUser || JSON.parse(localStorage.getItem('user') || '{}');
    const name = user.name || user.fullName || 'Employee';
    const role = user.role || 'MEMBER';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const currentPath = window.location.pathname;

    let navHTML = '';
    NAV.forEach(group => {
      if (group.section) {
        navHTML += `<div class="sb-section-label">${group.section}</div>`;
      }
      group.items.forEach(item => {
        const active = currentPath === item.href || currentPath.startsWith(item.href + '/') ? 'active' : '';
        navHTML += `
          <a href="${item.href}" class="sb-nav-item ${active}" title="${item.label}">
            <span class="sb-nav-icon">${item.icon}</span>
            <span class="sb-nav-label">${item.label}</span>
          </a>`;
      });
    });

    return `
      <div class="sidebar" id="empSidebar">
        <div class="sb-head">
          <div class="sb-logo">
            <div class="sb-logo-icon">J</div>
            <div class="sb-logo-text">
              <span class="sb-brand">JMKC</span>
              <span class="sb-brand-sub">CRM</span>
            </div>
          </div>
          <button class="sb-collapse-btn" id="sbCollapseBtn" title="Collapse sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>

        <div class="sb-user">
          <div class="avatar sb-avatar">${initials}</div>
          <div class="sb-user-info">
            <div class="sb-user-name">${name}</div>
            <div class="sb-user-role">Employee</div>
          </div>
          <div class="dot dot-online" style="margin-left:auto;flex-shrink:0"></div>
        </div>

        <nav class="sb-nav" id="sbNav">
          ${navHTML}
        </nav>

        <div class="sb-footer">
          <button class="sb-collapse-bottom" id="sbCollapseBtn2" title="Toggle sidebar">
            <span class="sb-nav-icon">◀</span>
            <span class="sb-nav-label">Collapse</span>
          </button>
          <div class="sb-version">v1.0.0</div>
        </div>
      </div>

      <div class="sb-overlay" id="sbOverlay"></div>`;
  }

  function inject() {
    const el = document.getElementById('sidebar');
    if (!el) return;
    el.outerHTML = buildSidebar();
    bindEvents();
  }

  function bindEvents() {
    const shell = document.querySelector('.app-shell');
    const sidebar = document.getElementById('empSidebar');
    const overlay = document.getElementById('sbOverlay');

    // Collapse buttons
    ['sbCollapseBtn', 'sbCollapseBtn2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => {
        shell?.classList.toggle('sidebar-collapsed');
        const icon = document.querySelector('#sbCollapseBtn svg path');
        if (icon) {
          icon.setAttribute('d', shell?.classList.contains('sidebar-collapsed') ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6');
        }
        const colBtn = document.getElementById('sbCollapseBtn2');
        if (colBtn) colBtn.querySelector('.sb-nav-label').textContent = shell?.classList.contains('sidebar-collapsed') ? 'Expand' : 'Collapse';
        localStorage.setItem('sbCollapsed', shell?.classList.contains('sidebar-collapsed') ? '1' : '0');
      });
    });

    // Overlay click → close mobile sidebar
    if (overlay) overlay.addEventListener('click', () => {
      sidebar?.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });

    // Restore collapse state
    if (localStorage.getItem('sbCollapsed') === '1') {
      shell?.classList.add('sidebar-collapsed');
    }

    // Hamburger (from header)
    document.addEventListener('click', e => {
      if (e.target.closest('#hamburgerBtn')) {
        const isDesktop = window.innerWidth > 900;
        if (isDesktop) {
          shell?.classList.toggle('sidebar-collapsed');
        } else {
          sidebar?.classList.toggle('mobile-open');
          overlay?.classList.toggle('active');
        }
      }
    });
  }

  // CSS for sidebar
  function injectSidebarStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0; z-index: var(--z-sidebar);
        width: var(--sidebar-w);
        background: var(--clr-surface);
        border-right: 1px solid var(--clr-border);
        display: flex; flex-direction: column;
        transition: width var(--t-slow), transform var(--t-slow);
        overflow: hidden;
      }
      .sb-head {
        padding: 1.25rem 1rem;
        display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid var(--clr-border);
        flex-shrink: 0;
      }
      .sb-logo { display: flex; align-items: center; gap: 0.75rem; overflow: hidden; }
      .sb-logo-icon {
        width: 36px; height: 36px; border-radius: 10px;
        background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent));
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 1rem; color: #fff;
        flex-shrink: 0;
      }
      .sb-logo-text { overflow: hidden; }
      .sb-brand { display: block; font-size: 1rem; font-weight: 800; color: var(--clr-text); line-height: 1.1; }
      .sb-brand-sub { font-size: 0.7rem; color: var(--clr-text-muted); font-weight: 500; }
      .sb-collapse-btn {
        width: 28px; height: 28px; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        color: var(--clr-text-muted); flex-shrink: 0;
        transition: all var(--t-fast);
      }
      .sb-collapse-btn:hover { background: var(--clr-surface-2); color: var(--clr-text); }
      .sb-user {
        padding: 1rem;
        display: flex; align-items: center; gap: 0.75rem;
        border-bottom: 1px solid var(--clr-border);
        flex-shrink: 0;
        overflow: hidden;
      }
      .sb-avatar { flex-shrink: 0; }
      .sb-user-info { overflow: hidden; }
      .sb-user-name { font-size: 0.8125rem; font-weight: 600; color: var(--clr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sb-user-role { font-size: 0.6875rem; color: var(--clr-text-muted); }
      .sb-nav { flex: 1; overflow-y: auto; padding: 0.75rem 0.5rem; }
      .sb-nav::-webkit-scrollbar { width: 0; }
      .sb-section-label {
        font-size: 0.625rem; font-weight: 700; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--clr-text-muted);
        padding: 0.75rem 0.75rem 0.25rem;
      }
      .sb-nav-item {
        display: flex; align-items: center; gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        color: var(--clr-text-muted);
        font-size: 0.8125rem; font-weight: 500;
        transition: all var(--t-fast);
        white-space: nowrap; overflow: hidden;
        margin-bottom: 1px;
        position: relative;
      }
      .sb-nav-item:hover { background: var(--clr-surface-2); color: var(--clr-text); }
      .sb-nav-item.active {
        background: var(--clr-primary-glow);
        color: var(--clr-primary-light);
        font-weight: 600;
      }
      .sb-nav-item.active::before {
        content: ''; position: absolute; left: 0; top: 25%; bottom: 25%;
        width: 3px; border-radius: 0 3px 3px 0;
        background: var(--clr-primary);
      }
      .sb-nav-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; }
      .sb-nav-label { overflow: hidden; text-overflow: ellipsis; transition: opacity var(--t); }
      .sb-footer {
        padding: 0.75rem 0.5rem;
        border-top: 1px solid var(--clr-border);
        flex-shrink: 0;
      }
      .sb-collapse-bottom {
        display: flex; align-items: center; gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        color: var(--clr-text-muted);
        font-size: 0.8125rem; font-weight: 500;
        width: 100%;
        transition: all var(--t-fast);
      }
      .sb-collapse-bottom:hover { background: var(--clr-surface-2); color: var(--clr-text); }
      .sb-version { font-size: 0.625rem; color: var(--clr-text-muted); padding: 0.25rem 0.75rem; }

      /* Collapsed */
      .app-shell.sidebar-collapsed .sidebar { width: var(--sidebar-collapsed); }
      .app-shell.sidebar-collapsed .sb-nav-label,
      .app-shell.sidebar-collapsed .sb-user-info,
      .app-shell.sidebar-collapsed .sb-logo-text,
      .app-shell.sidebar-collapsed .sb-section-label,
      .app-shell.sidebar-collapsed .sb-version,
      .app-shell.sidebar-collapsed .sb-collapse-btn { opacity: 0; pointer-events: none; }
      .app-shell.sidebar-collapsed .sb-nav-item { justify-content: center; padding: 0.6rem; }
      .app-shell.sidebar-collapsed .sb-user { justify-content: center; }
      .app-shell.sidebar-collapsed .sb-head { justify-content: center; padding: 1.25rem 0.5rem; }
      .app-shell.sidebar-collapsed .sb-collapse-bottom { justify-content: center; }

      /* Tooltip in collapsed mode */
      .app-shell.sidebar-collapsed .sb-nav-item:hover::after {
        content: attr(title);
        position: absolute; left: calc(var(--sidebar-collapsed) + 8px);
        background: var(--clr-surface-2); color: var(--clr-text);
        padding: 0.35rem 0.75rem;
        border-radius: 6px; font-size: 0.75rem; font-weight: 500;
        border: 1px solid var(--clr-border);
        white-space: nowrap; z-index: calc(var(--z-dropdown) + 10);
        box-shadow: var(--sh);
        pointer-events: none;
      }

      /* Mobile */
      .sb-overlay {
        display: none; position: fixed; inset: 0; z-index: calc(var(--z-drawer) - 10);
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        opacity: 0; transition: opacity var(--t);
      }
      @media (max-width: 900px) {
        .sidebar { transform: translateX(-100%); z-index: var(--z-drawer); }
        .sidebar.mobile-open { transform: translateX(0); }
        .sb-overlay { display: block; }
        .sb-overlay.active { opacity: 1; pointer-events: all; }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectSidebarStyles();
    inject();
  });
})();
