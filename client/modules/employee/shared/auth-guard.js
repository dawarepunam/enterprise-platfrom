/* ===================================================
   auth-guard.js — Employee Module Auth & Status
=================================================== */
(function () {
  'use strict';

  const BASE = window.location.origin;

  /* ── Helpers ── */
  function getToken() { return localStorage.getItem('token') || localStorage.getItem('jmkc_token'); }
  function getUser()  {
    try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || 'null'); }
    catch { return null; }
  }
  function apiHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
  }

  /* ── requireAuth ── */
  function requireAuth() {
    if (!getToken()) {
      window.location.href = '/login';
      return false;
    }
    return true;
  }

  /* ── Fetch current user status ── */
  async function fetchUserStatus() {
    try {
      const res = await fetch(`${BASE}/api/users/me`, { headers: apiHeaders() });
      if (!res.ok) throw new Error('unauthorized');
      const data = await res.json();
      return data.data || data.user || data;
    } catch {
      return null;
    }
  }

  /* ── Hold / Remove / Shift Banner ── */
  function renderStatusBanner(status) {
    if (!status) return;

    // Blocked pages when on hold
    const holdBlockedPaths = ['/employee/chat', '/employee/meetings', '/employee/task-detail', '/employee/files', '/employee/daily-updates'];
    const currentPath = window.location.pathname;

    if (status.holdStatus?.isOnHold) {
      const hold = status.holdStatus;
      if (holdBlockedPaths.some(p => currentPath.startsWith(p))) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#080d1a;font-family:'Inter',sans-serif;">
            <div style="text-align:center;padding:3rem;max-width:420px;">
              <div style="font-size:4rem;margin-bottom:1rem;">⚠️</div>
              <h2 style="color:#f59e0b;margin-bottom:0.5rem;">Access Blocked — You Are On Hold</h2>
              <p style="color:#64748b;margin-bottom:2rem;">This section is not accessible while you are on hold.</p>
              <a href="/employee/dashboard" style="background:#6366f1;color:#fff;padding:0.6rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
            </div>
          </div>`;
        return;
      }

      insertBanner('hold', `
        <span class="alert-icon">⚠️</span>
        <div class="alert-body">
          <div class="alert-title">You Are On Hold</div>
          <div class="alert-text">
            Project: <strong>${hold.project || '—'}</strong> &nbsp;|&nbsp;
            Reason: <strong>${hold.reason || '—'}</strong> &nbsp;|&nbsp;
            By: <strong>${hold.heldBy || '—'}</strong> &nbsp;|&nbsp;
            From: <strong>${hold.from ? new Date(hold.from).toLocaleDateString('en-IN') : '—'}</strong>
          </div>
        </div>`);
    }

    if (status.removedFromProject) {
      insertBanner('removed', `
        <span class="alert-icon">🚫</span>
        <div class="alert-body">
          <div class="alert-title">Removed From Project — Read Only Mode</div>
          <div class="alert-text">You have been removed. You can still view history, tasks, files, and meetings.</div>
        </div>`);
      setReadOnlyMode();
    }

    if (status.shiftedToProject) {
      insertBanner('shifted', `
        <span class="alert-icon">🔄</span>
        <div class="alert-body">
          <div class="alert-title">You Have Been Shifted</div>
          <div class="alert-text">Shifted to: <strong>${status.shiftedToProject}</strong>. Previous project is now read-only.</div>
        </div>`);
    }
  }

  function insertBanner(type, content) {
    const main = document.getElementById('pageMain') || document.querySelector('.page-main') || document.body;
    const banner = document.createElement('div');
    banner.className = `alert-banner alert-${type}`;
    banner.innerHTML = content;
    main.insertBefore(banner, main.firstChild);
  }

  function setReadOnlyMode() {
    document.querySelectorAll('button:not(.read-only-allow), [type="submit"], textarea, .btn-primary:not(.read-only-allow)').forEach(el => {
      el.disabled = true;
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'none';
    });
  }

  /* ── Initialize ── */
  async function init() {
    if (!requireAuth()) return;

    const localUser = getUser();
    if (localUser) {
      window.__empUser = localUser;
    }

    // Fetch fresh status
    const status = await fetchUserStatus();
    if (status) {
      window.__empUser = status;
      renderStatusBanner(status);
    }
  }

  /* ── Exports ── */
  window.EmpAuth = {
    getToken,
    getUser,
    apiHeaders,
    requireAuth,
    fetchUserStatus,
    init,
  };

  // Auto-init on load
  document.addEventListener('DOMContentLoaded', init);
})();
