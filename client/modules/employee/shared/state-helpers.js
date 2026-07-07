/* =====================================================================
   state-helpers.js — Global UI State Utilities
   Loading, Error, Empty, Toast, Skeleton helpers for all employee modules
   ===================================================================== */
(function () {
  'use strict';

  // ── Loading State ──────────────────────────────────────────────────
  window.showLoading = function (containerId, message = 'Loading…') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>`;
  };

  // ── Skeleton Loader ────────────────────────────────────────────────
  window.showSkeleton = function (containerId, count = 3) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < count; i++) {
      html += '<div class="skeleton skeleton-card"></div>';
    }
    el.innerHTML = html;
  };

  // ── Error State ────────────────────────────────────────────────────
  window.showError = function (containerId, message = 'Something went wrong', retryFn) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const retryBtn = retryFn
      ? `<button class="btn btn-primary btn-sm" onclick="(${retryFn.toString()})()">🔄 Retry</button>`
      : '';
    el.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">❌</div>
        <h3>Error</h3>
        <p>${message}</p>
        ${retryBtn}
      </div>`;
  };

  // ── Empty State ────────────────────────────────────────────────────
  window.showEmpty = function (containerId, message = 'No data found', icon = '📭') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3>Nothing Here</h3>
        <p>${message}</p>
      </div>`;
  };

  // ── Toast (already provided by header.js, but this is a fallback) ──
  if (!window.showToast) {
    window.showToast = function (msg, type = 'success') {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<span>${icons[type] || '💬'}</span><span>${msg}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    };
  }

  // ── Confirm Dialog ─────────────────────────────────────────────────
  window.showConfirm = function (message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" style="max-width:400px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:0.75rem;">⚠️</div>
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.5rem;">Confirm Action</h3>
        <p style="font-size:0.85rem;color:var(--clr-text-muted);margin-bottom:1.25rem;">${message}</p>
        <div style="display:flex;gap:0.75rem;justify-content:center;">
          <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
          <button class="btn btn-primary" id="confirmOk">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmCancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#confirmOk').addEventListener('click', () => {
      overlay.remove();
      if (onConfirm) onConfirm();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  };

})();
