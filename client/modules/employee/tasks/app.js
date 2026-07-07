/* =====================================================================
   Phase 7 – My Tasks – app.js
   Full task list logic: fetch, filter, socket, hover popup, kanban
   ===================================================================== */
'use strict';

(function () {
  const API = '/api';
  let allTasks = [];
  let activeStatus = '';
  let activePriority = '';
  let activeSearch = '';
  let activeSort = 'deadline';
  let currentView = 'table';
  let popupTimer = null;
  let socket = null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const filterProjectId = urlParams.get('project');

  // ── Auth Token ──────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('token') || localStorage.getItem('jmkc_token') || sessionStorage.getItem('token') || '';
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || '{}'); } catch { return {}; }
  }

  // ── Fetch Tasks ─────────────────────────────────────────────────────
  async function fetchTasks() {
    try {
      const res = await fetch(`${API}/tasks?assignedToMe=true&size=200`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      allTasks = json.data || [];
      renderAll();
    } catch (err) {
      console.error(err);
      document.getElementById('taskSubtitle').textContent = 'Failed to load tasks.';
    }
  }

  // ── Filter & Sort ───────────────────────────────────────────────────
  function getFiltered() {
    let tasks = [...allTasks];
    
    if (filterProjectId) {
      tasks = tasks.filter(t => String(t.projectId || (t.project && t.project._id) || t.project) === filterProjectId);
    }
    
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      tasks = tasks.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    if (activeStatus) {
      tasks = tasks.filter(t => (t.status || '').toLowerCase() === activeStatus.toLowerCase());
    }
    if (activePriority) {
      tasks = tasks.filter(t => (t.priority || '').toLowerCase() === activePriority.toLowerCase());
    }
    // Sort
    if (activeSort === 'deadline') {
      tasks.sort((a, b) => new Date(a.deadline || '9999') - new Date(b.deadline || '9999'));
    } else if (activeSort === 'priority') {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      tasks.sort((a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99));
    } else if (activeSort === 'progress') {
      tasks.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    } else if (activeSort === 'created') {
      tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return tasks;
  }

  // ── Render All ──────────────────────────────────────────────────────
  function renderAll() {
    updateKpis();
    const filtered = getFiltered();
    document.getElementById('emptyState').style.display = filtered.length ? 'none' : 'block';
    if (currentView === 'table') renderTable(filtered);
    else renderKanban(filtered);
    updateSubtitle(filtered.length);
  }

  function updateSubtitle(count) {
    const user = getUser();
    const name = user.name || 'you';
    document.getElementById('taskSubtitle').textContent =
      `${count} task${count !== 1 ? 's' : ''} assigned to ${name}`;
  }

  // ── KPI Cards ────────────────────────────────────────────────────────
  function updateKpis() {
    const t = allTasks;
    document.getElementById('kpiTotal').textContent = t.length;
    document.getElementById('kpiInProgress').textContent = t.filter(x => x.status === 'In Progress').length;
    document.getElementById('kpiPending').textContent = t.filter(x => !x.status || x.status === 'To Do').length;
    document.getElementById('kpiReview').textContent = t.filter(x => x.status === 'Submitted for Review').length;
    document.getElementById('kpiDone').textContent = t.filter(x => x.status === 'Done' || x.status === 'Completed').length;
  }

  // ── Table Render ─────────────────────────────────────────────────────
  function renderTable(tasks) {
    const tbody = document.getElementById('taskTableBody');
    if (!tasks.length) { tbody.innerHTML = ''; return; }
    tbody.innerHTML = tasks.map(t => taskRow(t)).join('');
    // Bind row events
    tbody.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      const task = allTasks.find(t => String(t._id) === id);
      if (!task) return;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.open-btn')) return;
        window.location.href = `/employee/task-detail?id=${id}`;
      });
      row.addEventListener('mouseenter', (e) => showPopup(task, e));
      row.addEventListener('mousemove', movePopup);
      row.addEventListener('mouseleave', hidePopup);
    });
    tbody.querySelectorAll('.open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/employee/task-detail?id=${btn.dataset.id}`;
      });
    });
  }

  function taskRow(t) {
    const id = t._id;
    const priority = (t.priority || 'medium').toLowerCase();
    const status = t.status || 'To Do';
    const deadline = t.deadline || t.endDate || t.dueDate || null;
    const progress = t.progress ?? t.checklistProgress ?? 0;
    const assignedBy = t.assignedByName || t.createdByName || '—';
    const comments = t.commentCount || 0;

    return `
      <tr data-id="${id}">
        <td>
          <div class="task-title-cell">
            <span class="task-check-icon">${statusIcon(status)}</span>
            <div>
              <div class="task-title-main">${esc(t.title || 'Untitled')}</div>
              <div class="task-title-sub">
                ${t.projectName ? esc(t.projectName) + ' · ' : ''}
                ${comments ? `💬 ${comments}` : ''}
              </div>
            </div>
          </div>
        </td>
        <td><span class="priority-badge priority-${priority}">${priorityDot(priority)} ${cap(priority)}</span></td>
        <td><span class="status-badge ${statusClass(status)}">${esc(status)}</span></td>
        <td><span class="${deadlineClass(deadline)}">${formatDeadline(deadline)}</span></td>
        <td style="color:var(--clr-text-muted);font-size:0.78rem">${esc(assignedBy)}</td>
        <td>
          <div class="progress-wrap">
            <div class="progress-bar-thin">
              <div class="progress-fill-thin" style="width:${progress}%"></div>
            </div>
            <span class="progress-pct">${progress}%</span>
          </div>
        </td>
        <td>
          <button class="open-btn" data-id="${id}" title="Open Task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
        </td>
      </tr>`;
  }

  // ── Kanban Render ────────────────────────────────────────────────────
  const KANBAN_COLS = [
    { label: 'To Do',               key: 'todo',      color: '#94a3b8', statuses: ['To Do', ''] },
    { label: 'In Progress',         key: 'inprogress', color: '#10b981', statuses: ['In Progress'] },
    { label: 'Paused',              key: 'paused',    color: '#fbbf24', statuses: ['Paused'] },
    { label: 'In Review',           key: 'review',    color: '#a78bfa', statuses: ['Submitted for Review'] },
    { label: 'Done',                key: 'done',      color: '#22d3ee', statuses: ['Done', 'Completed', 'Approved'] },
  ];

  function renderKanban(tasks) {
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = KANBAN_COLS.map(col => {
      const colTasks = tasks.filter(t => col.statuses.includes(t.status || ''));
      const cards = colTasks.map(t => `
        <div class="kanban-card" data-id="${t._id}">
          <div class="kanban-card-title">${esc(t.title || 'Untitled')}</div>
          <div class="kanban-card-meta">
            <span class="priority-badge priority-${(t.priority||'medium').toLowerCase()}" style="font-size:0.65rem">
              ${priorityDot(t.priority||'medium')} ${cap(t.priority||'medium')}
            </span>
            <span style="font-size:0.7rem;color:var(--clr-text-muted)">${formatDeadline(t.deadline||t.endDate||null)}</span>
          </div>
          <div class="progress-wrap" style="margin-top:0.5rem">
            <div class="progress-bar-thin"><div class="progress-fill-thin" style="width:${t.progress||0}%"></div></div>
            <span class="progress-pct">${t.progress||0}%</span>
          </div>
        </div>`).join('');
      return `
        <div class="kanban-col">
          <div class="kanban-col-header" style="color:${col.color}">
            ${col.label}
            <span class="col-count">${colTasks.length}</span>
          </div>
          <div class="kanban-cards">${cards || '<div style="color:var(--clr-text-muted);font-size:0.75rem;text-align:center;padding:1rem">Empty</div>'}</div>
        </div>`;
    }).join('');
    board.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = `/employee/task-detail?id=${card.dataset.id}`;
      });
    });
  }

  // ── Hover Popup ──────────────────────────────────────────────────────
  let popupVisible = false;
  function showPopup(task, e) {
    clearTimeout(popupTimer);
    const popup = document.getElementById('taskPopup');
    const priority = (task.priority || 'medium').toLowerCase();
    const status = task.status || 'To Do';
    const progress = task.progress ?? task.checklistProgress ?? 0;
    const deadline = task.deadline || task.endDate || task.dueDate || null;
    const attachments = task.attachments || [];

    document.getElementById('popupPriority').textContent = `${priorityDot(priority)} ${cap(priority)}`;
    document.getElementById('popupPriority').className = `popup-priority-badge priority-badge priority-${priority}`;
    document.getElementById('popupStatus').textContent = status;
    document.getElementById('popupStatus').className = `popup-status-badge status-badge ${statusClass(status)}`;
    document.getElementById('popupTitle').textContent = task.title || 'Untitled';
    document.getElementById('popupDesc').textContent = task.description || 'No description provided.';
    document.getElementById('popupHours').textContent = task.hoursLogged ? `${task.hoursLogged}h` : (task.estimatedHours ? `~${task.estimatedHours}h est.` : '—');
    document.getElementById('popupDeadline').textContent = deadline ? formatDate(deadline) : '—';
    document.getElementById('popupComments').textContent = task.commentCount || 0;
    document.getElementById('popupProgressPct').textContent = `${progress}%`;
    document.getElementById('popupProgressFill').style.width = `${progress}%`;
    document.getElementById('popupCta').href = `/employee/task-detail?id=${task._id}`;

    if (attachments.length) {
      document.getElementById('popupAttachments').style.display = 'block';
      document.getElementById('popupAttachList').innerHTML = attachments.slice(0, 4).map(a =>
        `<span class="popup-attach-chip">📎 ${esc(a.name || 'File')}</span>`).join('');
    } else {
      document.getElementById('popupAttachments').style.display = 'none';
    }

    positionPopup(popup, e);
    popup.style.display = 'block';
    popupVisible = true;
  }

  function positionPopup(popup, e) {
    const margin = 16, width = 320;
    let x = e.clientX + 16, y = e.clientY + 16;
    if (x + width > window.innerWidth - margin) x = e.clientX - width - margin;
    if (y + popup.offsetHeight > window.innerHeight - margin) y = e.clientY - popup.offsetHeight - margin;
    popup.style.left = `${Math.max(margin, x)}px`;
    popup.style.top  = `${Math.max(margin, y)}px`;
  }

  function movePopup(e) {
    if (!popupVisible) return;
    positionPopup(document.getElementById('taskPopup'), e);
  }

  function hidePopup() {
    popupTimer = setTimeout(() => {
      document.getElementById('taskPopup').style.display = 'none';
      popupVisible = false;
    }, 120);
  }

  // ── Socket.io ────────────────────────────────────────────────────────
  function initSocket() {
    if (typeof io === 'undefined') return;
    socket = io({ auth: { token: getToken() } });
    const user = getUser();
    if (user._id) socket.emit('join_user_room', user._id);

    socket.on('task_assigned', (task) => {
      if (!allTasks.find(t => String(t._id) === String(task._id))) {
        allTasks.unshift(task);
        renderAll();
        showToast('📋 New task assigned: ' + (task.title || ''), 'info');
      }
    });
    socket.on('task_updated', (task) => {
      const idx = allTasks.findIndex(t => String(t._id) === String(task._id));
      if (idx !== -1) { allTasks[idx] = task; renderAll(); }
    });
  }

  function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:var(--clr-surface);
      border:1px solid var(--clr-border);border-radius:10px;padding:0.75rem 1.25rem;font-size:0.8rem;
      color:var(--clr-text);box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:popupIn 0.2s ease;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
  function priorityDot(p) {
    return { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[p] || '⚪';
  }
  function statusIcon(s) {
    if (s === 'Done' || s === 'Completed') return '✅';
    if (s === 'In Progress') return '⚡';
    if (s === 'Paused') return '⏸';
    if (s === 'Submitted for Review') return '🔍';
    return '○';
  }
  function statusClass(s) {
    if (!s || s === 'To Do') return 'status-todo';
    if (s === 'In Progress') return 'status-inprogress';
    if (s === 'Paused') return 'status-paused';
    if (s === 'Submitted for Review') return 'status-review';
    if (s === 'Done' || s === 'Completed' || s === 'Approved') return 'status-done';
    if (s === 'Rejected') return 'status-rejected';
    return 'status-todo';
  }
  function deadlineClass(d) {
    if (!d) return 'deadline-cell deadline-ok';
    const now = new Date(), dl = new Date(d);
    const diff = (dl - now) / 86400000;
    if (diff < 0) return 'deadline-cell deadline-overdue';
    if (diff <= 3) return 'deadline-cell deadline-soon';
    return 'deadline-cell deadline-ok';
  }
  function formatDeadline(d) {
    if (!d) return '—';
    const now = new Date(), dl = new Date(d);
    const diff = Math.round((dl - now) / 86400000);
    if (diff < 0) return `Overdue (${Math.abs(diff)}d)`;
    if (diff === 0) return 'Due Today';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 7) return `${diff}d left`;
    return dl.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Event Bindings ────────────────────────────────────────────────────
  function bindEvents() {
    // View toggle
    document.getElementById('btnTable').addEventListener('click', () => {
      currentView = 'table';
      document.getElementById('tableView').style.display = '';
      document.getElementById('kanbanView').style.display = 'none';
      document.getElementById('btnTable').classList.add('active');
      document.getElementById('btnKanban').classList.remove('active');
      renderAll();
    });
    document.getElementById('btnKanban').addEventListener('click', () => {
      currentView = 'kanban';
      document.getElementById('tableView').style.display = 'none';
      document.getElementById('kanbanView').style.display = '';
      document.getElementById('btnKanban').classList.add('active');
      document.getElementById('btnTable').classList.remove('active');
      renderAll();
    });
    // Search
    let searchTimer;
    document.getElementById('taskSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { activeSearch = e.target.value.trim(); renderAll(); }, 250);
    });
    // Status chips
    document.querySelectorAll('.chip[data-status]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeStatus = chip.dataset.status;
        renderAll();
      });
    });
    // Priority filter
    document.getElementById('priorityFilter').addEventListener('change', (e) => {
      activePriority = e.target.value;
      renderAll();
    });
    // Sort
    document.getElementById('sortFilter').addEventListener('change', (e) => {
      activeSort = e.target.value;
      renderAll();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    fetchTasks();
    initSocket();
  });
})();
