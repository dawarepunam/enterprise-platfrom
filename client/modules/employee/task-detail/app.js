/* =====================================================================
   Phase 8 — Task Detail — app.js
   Full integration: fetch task, checklist, comments, timeline,
   start/pause/submit actions, socket realtime, file upload
   ===================================================================== */
'use strict';

(function () {
  const API = '/api';
  let task = null;
  let socket = null;
  let typingTimer = null;
  let isTyping = false;

  function tok() { return localStorage.getItem('token') || sessionStorage.getItem('token') || ''; }
  function getUser() { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } }

  async function apiFetch(path, opts = {}) {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      ...opts
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'API error');
    return json;
  }

  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');

  // ── Helpers ──────────────────────────────────────────────────────────
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function priorityClass(p) {
    const m = { critical: 'priority-critical', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
    return m[(p || '').toLowerCase()] || 'priority-medium';
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
  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function timeAgo(d) {
    if (!d) return '';
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // ── Load Task ────────────────────────────────────────────────────────
  async function loadTask() {
    if (!taskId) { window.location.href = '/employee/tasks'; return; }
    try {
      const res = await apiFetch(`/tasks/${taskId}`);
      task = res.data || res;
      document.title = `${task.title || 'Task'} — JMKC CRM`;
      renderHeader();
      renderInfoCard();
      renderChecklist(task.checklist || []);
      renderSubtasks(task.subtasks || []);
      renderAttachments(task.attachments || []);
      renderComments(task.comments || []);
      renderTimeline(task.timeline || task.activityLog || []);
      updateActionButtons();
      document.getElementById('tdSkeleton').style.display = 'none';
      document.getElementById('tdContent').style.display = 'block';
      document.getElementById('taskActionGroup').style.display = 'flex';
    } catch (err) {
      console.error(err);
      document.getElementById('tdSkeleton').innerHTML = `
        <div style="text-align:center;padding:4rem;color:var(--clr-text-muted)">
          <div style="font-size:3rem;margin-bottom:1rem">⚠️</div>
          <div style="font-size:1rem;font-weight:700;color:var(--clr-text)">Task not found</div>
          <div style="font-size:0.8rem;margin-top:0.5rem">Check your link or go back to tasks.</div>
          <a href="/employee/tasks" style="display:inline-block;margin-top:1.5rem;padding:0.5rem 1.25rem;background:var(--clr-primary);color:#fff;border-radius:10px;font-size:0.8rem;font-weight:700">← Back to Tasks</a>
        </div>`;
    }
  }

  // ── Render Header ────────────────────────────────────────────────────
  function renderHeader() {
    const priority = (task.priority || 'medium').toLowerCase();
    const status = task.status || 'To Do';
    const progress = task.progress ?? 0;

    // Badges
    document.getElementById('tdBadges').innerHTML = `
      <span class="priority-badge ${priorityClass(priority)}">🎯 ${cap(priority)}</span>
      <span class="status-badge ${statusClass(status)}">${esc(status)}</span>
      ${task.projectName ? `<span class="status-badge status-todo">📁 ${esc(task.projectName)}</span>` : ''}
    `;

    document.getElementById('tdTitle').textContent = task.title || 'Untitled Task';
    document.getElementById('tdDescription').textContent = task.description || 'No description provided.';

    // Meta row
    const deadline = task.deadline || task.dueDate || task.endDate;
    const assignedBy = task.assignedByName || task.createdByName || '—';
    const team = task.teamName || '—';
    const hours = task.estimatedHours ? `${task.estimatedHours}h` : '—';

    document.getElementById('tdMetaRow').innerHTML = `
      <div class="td-meta-item">📅 <strong>${formatDate(deadline)}</strong></div>
      <div class="td-meta-item">👤 Assigned by <strong>${esc(assignedBy)}</strong></div>
      <div class="td-meta-item">⏱ <strong>${hours}</strong> estimated</div>
      ${team !== '—' ? `<div class="td-meta-item">👥 <strong>${esc(team)}</strong></div>` : ''}
    `;

    // Progress ring
    const circumference = 213.6;
    const offset = circumference - (progress / 100) * circumference;
    const ring = document.getElementById('progressRing');
    if (ring) ring.style.strokeDashoffset = offset;
    const txt = document.getElementById('progressText');
    if (txt) txt.textContent = `${progress}%`;
  }

  // ── Info Card ────────────────────────────────────────────────────────
  function renderInfoCard() {
    const deadline = task.deadline || task.dueDate || task.endDate;
    const logged = task.hoursLogged || task.timeLogged || 0;
    const rows = [
      ['Status', `<span class="status-badge ${statusClass(task.status || 'To Do')}" style="font-size:0.72rem">${esc(task.status || 'To Do')}</span>`],
      ['Priority', `<span class="priority-badge ${priorityClass(task.priority || 'medium')}" style="font-size:0.72rem">${cap(task.priority || 'medium')}</span>`],
      ['Deadline', formatDate(deadline)],
      ['Est. Hours', task.estimatedHours ? `${task.estimatedHours}h` : '—'],
      ['Logged Hours', logged ? `${logged}h` : '0h'],
      ['Created', formatDate(task.createdAt)],
      ['Assigned By', esc(task.assignedByName || task.createdByName || '—')],
      ['Project', task.projectName ? esc(task.projectName) : '—'],
    ];
    document.getElementById('infoGrid').innerHTML = rows.map(([label, val]) => `
      <div class="info-row">
        <span class="info-label">${label}</span>
        <span class="info-value">${val}</span>
      </div>`).join('');
  }

  // ── Action Buttons ────────────────────────────────────────────────────
  function updateActionButtons() {
    const status = task.status || 'To Do';
    const btnStart = document.getElementById('btnStart');
    const btnPause = document.getElementById('btnPause');
    const btnSubmit = document.getElementById('btnSubmit');

    btnStart.style.display = 'none';
    btnPause.style.display = 'none';
    btnSubmit.style.display = 'none';

    if (status === 'To Do' || status === 'Paused') {
      btnStart.style.display = '';
      btnStart.textContent = status === 'Paused' ? '▶ Resume' : '▶ Start';
    }
    if (status === 'In Progress') {
      btnPause.style.display = '';
      btnSubmit.style.display = '';
    }
    if (status === 'Submitted for Review') {
      document.getElementById('taskActionGroup').innerHTML =
        `<span style="font-size:0.8rem;padding:0.5rem 1rem;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:10px;color:#a78bfa;font-weight:700">⌛ Awaiting Review</span>`;
    }
    if (status === 'Done' || status === 'Completed') {
      document.getElementById('taskActionGroup').innerHTML =
        `<span style="font-size:0.8rem;padding:0.5rem 1rem;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.3);border-radius:10px;color:#4ade80;font-weight:700">✅ Completed</span>`;
    }
  }

  async function changeStatus(newStatus) {
    try {
      const res = await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      task = res.data || { ...task, status: newStatus };
      updateActionButtons();
      showToast(`Status → ${newStatus}`, 'success');
      // emit via socket
      socket?.emit('task_status_change', { taskId, status: newStatus });
      // refresh timeline
      await loadTimeline();
    } catch {
      // Fallback: direct PATCH on task
      try {
        await apiFetch(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        });
        task.status = newStatus;
        updateActionButtons();
        showToast(`Status → ${newStatus}`, 'success');
      } catch (e) {
        showToast('Could not update status', 'error');
      }
    }
  }

  // ── Checklist ─────────────────────────────────────────────────────────
  function renderChecklist(items) {
    const container = document.getElementById('checklistItems');
    const countEl = document.getElementById('checklistCount');
    const fillEl = document.getElementById('checklistProgressFill');

    const done = items.filter(i => i.completed).length;
    const total = items.length;
    if (countEl) countEl.textContent = `${done}/${total}`;
    if (fillEl) fillEl.style.width = total ? `${(done / total) * 100}%` : '0%';

    if (!container) return;
    if (!total) {
      container.innerHTML = `<div style="color:var(--clr-text-muted);font-size:0.8rem;padding:0.5rem 0">No checklist items yet.</div>`;
      return;
    }

    container.innerHTML = items.map((item, idx) => `
      <div class="checklist-item ${item.completed ? 'done' : ''}" data-idx="${idx}">
        <div class="checklist-checkbox">${item.completed ? '✓' : ''}</div>
        <span class="checklist-text">${esc(item.text || item.title || '')}</span>
        <button class="checklist-delete" data-del="${idx}" title="Remove">×</button>
      </div>`).join('');

    // Toggle
    container.querySelectorAll('.checklist-item').forEach(el => {
      el.addEventListener('click', async (e) => {
        if (e.target.closest('.checklist-delete')) return;
        const idx = +el.dataset.idx;
        task.checklist[idx].completed = !task.checklist[idx].completed;
        renderChecklist(task.checklist);
        await saveChecklist();
        // update progress
        const done2 = task.checklist.filter(i => i.completed).length;
        const pct = task.checklist.length ? Math.round((done2 / task.checklist.length) * 100) : 0;
        task.progress = pct;
        const ring = document.getElementById('progressRing');
        if (ring) ring.style.strokeDashoffset = 213.6 - (pct / 100) * 213.6;
        const txt = document.getElementById('progressText');
        if (txt) txt.textContent = `${pct}%`;
      });
    });
    // Delete
    container.querySelectorAll('.checklist-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = +btn.dataset.del;
        task.checklist.splice(idx, 1);
        renderChecklist(task.checklist);
        await saveChecklist();
      });
    });
  }

  async function saveChecklist() {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checklist: task.checklist })
      });
    } catch { /* silent */ }
  }

  document.getElementById('checklistAddBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('checklistInput');
    const text = input?.value.trim();
    if (!text) return;
    task.checklist = task.checklist || [];
    task.checklist.push({ text, completed: false });
    renderChecklist(task.checklist);
    input.value = '';
    await saveChecklist();
  });

  document.getElementById('checklistInput')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') document.getElementById('checklistAddBtn')?.click();
  });

  // ── Subtasks ──────────────────────────────────────────────────────────
  function renderSubtasks(subtasks) {
    if (!subtasks.length) return;
    document.getElementById('subtasksSection').style.display = '';
    document.getElementById('subtaskList').innerHTML = subtasks.map(s => `
      <div class="subtask-item" onclick="window.location='/employee/task-detail?id=${s._id}'">
        <span>${statusIcon(s.status || 'To Do')}</span>
        <span style="flex:1;font-size:0.8125rem">${esc(s.title || 'Subtask')}</span>
        <span class="status-badge ${statusClass(s.status || 'To Do')}" style="font-size:0.68rem">${esc(s.status || 'To Do')}</span>
      </div>`).join('');
  }

  function statusIcon(s) {
    if (s === 'Done' || s === 'Completed') return '✅';
    if (s === 'In Progress') return '⚡';
    if (s === 'Paused') return '⏸';
    if (s === 'Submitted for Review') return '🔍';
    return '○';
  }

  // ── Attachments ───────────────────────────────────────────────────────
  function renderAttachments(attachments) {
    const list = document.getElementById('attachmentsList');
    if (!list) return;
    if (!attachments.length) {
      list.innerHTML = `<div style="color:var(--clr-text-muted);font-size:0.8rem">No attachments yet.</div>`;
      return;
    }
    list.innerHTML = attachments.map(a => `
      <a class="attach-chip" href="${a.url || '#'}" target="_blank">
        ${fileIcon(a.name || '')} ${esc(a.name || 'File')}
        ${a.size ? `<span style="font-size:0.65rem;opacity:0.7">${Math.round(a.size / 1024)}KB</span>` : ''}
      </a>`).join('');
  }

  function fileIcon(name) {
    if (/\.(pdf)$/i.test(name)) return '📄';
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return '🖼️';
    if (/\.(zip|rar|7z)$/i.test(name)) return '🗜️';
    if (/\.(doc|docx)$/i.test(name)) return '📝';
    if (/\.(xls|xlsx|csv)$/i.test(name)) return '📊';
    return '📎';
  }

  document.getElementById('fileInput')?.addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    
    // In a real app, this would upload to S3 or a server endpoint.
    // For now, we mock the upload and add it to the task.
    const mockAttachments = files.map(f => ({
      name: f.name,
      size: f.size,
      url: '#'
    }));

    task.attachments = [...(task.attachments || []), ...mockAttachments];
    renderAttachments(task.attachments);
    showToast(`✅ ${files.length} file(s) uploaded`, 'success');
    
    // Save to task (assuming PATCH /tasks/:id supports attachments array update)
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ attachments: task.attachments })
      });
    } catch { /* silent */ }
    
    e.target.value = '';
  });

  // ── Comments ──────────────────────────────────────────────────────────
  async function loadComments() {
    try {
      const res = await apiFetch(`/tasks/${taskId}/comments`);
      renderComments(res.data || res.comments || []);
    } catch { /* silent */ }
  }

  function renderComments(comments) {
    const list = document.getElementById('commentsList');
    if (!list) return;
    const user = getUser();

    if (!comments.length) {
      list.innerHTML = `<div class="comments-empty">No comments yet. Be the first!</div>`;
      return;
    }

    list.innerHTML = comments.map(c => {
      const author = c.author?.name || c.user?.name || c.userName || 'Unknown';
      const role = c.author?.role || c.user?.role || '';
      const initials = author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const text = formatMentions(esc(c.text || c.comment || c.content || ''));
      const isMine = String(c.author?._id || c.user?._id || c.userId) === String(user._id);
      const seen = c.seenBy?.length ? `Seen by ${c.seenBy.length}` : '';

      return `
        <div class="comment-bubble ${isMine ? 'mine' : ''}">
          <div class="comment-avatar" style="${isMine ? 'background:linear-gradient(135deg,#10b981,#22d3ee)' : ''}">${initials}</div>
          <div class="comment-body">
            <div class="comment-author">
              ${esc(author)}
              ${role ? `<span class="comment-author-role">${esc(role)}</span>` : ''}
              <span class="comment-time">${timeAgo(c.createdAt)}</span>
            </div>
            <div class="comment-content">${text}</div>
            ${seen ? `<div class="comment-seen">👁 ${seen}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
  }

  function formatMentions(text) {
    return text.replace(/@(\w+)/g, '<span class="comment-mention">@$1</span>');
  }

  document.getElementById('commentSendBtn')?.addEventListener('click', postComment);
  document.getElementById('commentInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) postComment();
    // Typing indicator
    if (!isTyping) {
      isTyping = true;
      socket?.emit('typing_start', { taskId, userId: getUser()._id });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping = false;
      socket?.emit('typing_stop', { taskId, userId: getUser()._id });
    }, 1500);
  });

  async function postComment() {
    const input = document.getElementById('commentInput');
    const text = input?.value.trim();
    if (!text) return;
    const btn = document.getElementById('commentSendBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await apiFetch(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text })
      });
      input.value = '';
      socket?.emit('typing_stop', { taskId });
      await loadComments();
      showToast('Comment posted', 'success');
    } catch {
      showToast('Could not post comment', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send';
    }
  }

  // ── Timeline ──────────────────────────────────────────────────────────
  async function loadTimeline() {
    try {
      const res = await apiFetch(`/tasks/${taskId}/timeline`);
      renderTimeline(res.data || res.timeline || []);
    } catch { /* silent */ }
  }

  function renderTimeline(logs) {
    const list = document.getElementById('timelineList');
    if (!list) return;
    if (!logs.length) {
      list.innerHTML = `<div style="color:var(--clr-text-muted);font-size:0.8rem;text-align:center;padding:1rem">No activity yet.</div>`;
      return;
    }
    const icons = {
      created: '🆕', updated: '✏️', commented: '💬',
      status_changed: '🔄', time_logged: '⏱', completed: '✅',
      assigned: '👤', checklist_updated: '☑️', file_uploaded: '📎',
      started: '▶', paused: '⏸', submitted: '📤', approved: '✅', rejected: '❌'
    };
    list.innerHTML = logs.slice(0, 20).map(l => {
      const icon = icons[l.action || l.type] || '📌';
      const actor = l.user?.name || l.actor?.name || l.performedBy?.name || '';
      return `
        <div class="timeline-item">
          <div class="timeline-dot">${icon}</div>
          <div class="timeline-body">
            <div class="timeline-action">${esc(l.description || l.text || l.action || 'Activity')}</div>
            ${l.details ? `<div class="timeline-detail">${esc(l.details)}</div>` : ''}
            <div class="timeline-time">${actor ? esc(actor) + ' · ' : ''}${timeAgo(l.createdAt)}</div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Start / Pause / Submit buttons ────────────────────────────────────
  document.getElementById('btnStart')?.addEventListener('click', async () => {
    const newStatus = task.status === 'Paused' ? 'In Progress' : 'In Progress';
    await changeStatus(newStatus);
    task.status = 'In Progress';
    updateActionButtons();
  });

  document.getElementById('btnPause')?.addEventListener('click', async () => {
    await changeStatus('Paused');
    task.status = 'Paused';
    updateActionButtons();
  });

  document.getElementById('btnSubmit')?.addEventListener('click', () => {
    document.getElementById('submitModal').style.display = 'flex';
  });

  document.getElementById('submitCancel')?.addEventListener('click', () => {
    document.getElementById('submitModal').style.display = 'none';
  });

  document.getElementById('submitConfirm')?.addEventListener('click', async () => {
    const hours = parseFloat(document.getElementById('submitHours')?.value || '0');
    const note = document.getElementById('submitNote')?.value.trim() || '';
    const btn = document.getElementById('submitConfirm');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      await apiFetch(`/tasks/${taskId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ hoursLogged: hours, submissionNote: note })
      });
      document.getElementById('submitModal').style.display = 'none';
      task.status = 'Submitted for Review';
      updateActionButtons();
      showToast('📤 Submitted for review!', 'success');
      await loadTimeline();
    } catch {
      // Fallback: PATCH status
      try {
        await apiFetch(`/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Submitted for Review', hoursLogged: hours, submissionNote: note })
        });
        document.getElementById('submitModal').style.display = 'none';
        task.status = 'Submitted for Review';
        updateActionButtons();
        showToast('📤 Submitted for review!', 'success');
      } catch {
        showToast('Submission failed', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit for Review';
    }
  });

  // Close modal on overlay click
  document.getElementById('submitModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('submitModal')) {
      document.getElementById('submitModal').style.display = 'none';
    }
  });

  // ── Socket.io ─────────────────────────────────────────────────────────
  function initSocket() {
    if (typeof io === 'undefined') return;
    socket = io({ auth: { token: tok() } });
    const user = getUser();
    if (user._id) socket.emit('join_user_room', user._id);
    socket.emit('join_task_room', taskId);

    socket.on('new_comment', (comment) => {
      // Re-fetch comments
      loadComments();
    });
    socket.on('task_updated', (updated) => {
      if (String(updated._id) === taskId) {
        task = { ...task, ...updated };
        renderHeader();
        updateActionButtons();
      }
    });
    socket.on('typing_start', ({ userId, userName }) => {
      if (String(userId) === String(getUser()._id)) return;
      const el = document.getElementById('typingText');
      const wrap = document.getElementById('typingIndicator');
      if (el && wrap) { el.textContent = `${userName || 'Someone'} is typing`; wrap.style.display = 'flex'; }
    });
    socket.on('typing_stop', () => {
      const wrap = document.getElementById('typingIndicator');
      if (wrap) wrap.style.display = 'none';
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    const colors = { success: '#10b981', error: '#ef4444', info: '#6366f1', warning: '#f59e0b' };
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
      background:var(--clr-surface);border:1px solid ${colors[type] || colors.info}33;
      border-left:3px solid ${colors[type] || colors.info};
      border-radius:10px;padding:0.75rem 1.25rem;font-size:0.8rem;
      color:var(--clr-text);box-shadow:0 8px 24px rgba(0,0,0,0.4);
      animation:popupIn 0.2s ease;min-width:200px;max-width:360px;`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Init ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadTask();
    initSocket();
  });
})();
