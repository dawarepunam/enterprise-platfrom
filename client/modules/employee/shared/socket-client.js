/* =====================================================================
   socket-client.js — Employee Module Socket.io Client
   Auto-connects and joins user room on load.
   Exposes window.__socket for module-specific event binding.
   ===================================================================== */
(function () {
  'use strict';

  function getUser() {
    try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || '{}'); }
    catch { return {}; }
  }

  function init() {
    // Only connect if socket.io client is loaded
    if (typeof io === 'undefined') return;

    const user = getUser();
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      // Auto-join user room
      if (user._id || user.id) {
        socket.emit('join_user_room', user._id || user.id);
        socket.emit('join_notification_room', user._id || user.id);
        socket.emit('join_attendance_room', user._id || user.id);
        socket.emit('join_leave_room', user._id || user.id);
        socket.emit('join_daily_updates_room', user._id || user.id);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    // Global notification listener — show toast on new notification
    socket.on('new_notification', (data) => {
      if (window.showToast) {
        window.showToast(data.message || 'New notification', 'info');
      }
      // Refresh badge count
      const badge = document.getElementById('notifBadge');
      if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
      }
    });

    // Task list auto-refresh
    socket.on('task_list_refreshed', () => {
      if (typeof window.loadTasks === 'function') {
        window.loadTasks();
      }
    });

    // Attendance auto-update
    socket.on('attendance_updated', (data) => {
      if (typeof window.refreshAttendance === 'function') {
        window.refreshAttendance(data);
      }
    });

    // Leave status update
    socket.on('leave_updated', (data) => {
      if (typeof window.refreshLeaves === 'function') {
        window.refreshLeaves(data);
      }
      if (window.showToast) {
        window.showToast(`Leave ${data.status || 'updated'}`, 'info');
      }
    });

    // Daily update confirmation
    socket.on('daily_update_new', (data) => {
      if (window.showToast) {
        window.showToast('Daily update submitted!', 'success');
      }
    });

    // Expose globally
    window.__socket = socket;
  }

  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
