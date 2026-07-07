/* =====================================================================
   Phase 10 — Leave Management — app.js
   Balance cards, leave card list, calendar, history table,
   apply modal, detail/workflow modal, cancel, socket.io
   ===================================================================== */
'use strict';

(function () {
  const API = '/api';
  let allLeaves = [];
  let currentFilter = '';
  let calYear, calMonth;
  let currentDetailId = null;
  let socket = null;

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

  // ── Helpers ──────────────────────────────────────────────────────────
  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function timeAgo(d) {
    if (!d) return '';
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return fmtDate(d);
  }

  function statusClass(s) {
    const m = { pending: 'lv-pending', approved: 'lv-approved', rejected: 'lv-rejected', cancelled: 'lv-cancelled' };
    return m[(s || '').toLowerCase()] || 'lv-pending';
  }
  function statusIcon(s) {
    const m = { pending: '⏳', approved: '✅', rejected: '❌', cancelled: '🚫' };
    return m[(s || '').toLowerCase()] || '⏳';
  }
  function typeColor(t) {
    const m = {
      'Casual Leave': '#6366f1', 'Sick Leave': '#ef4444',
      'Earned Leave': '#10b981', 'Comp Off': '#f59e0b',
      'Maternity Leave': '#ec4899', 'Paternity Leave': '#ec4899',
    };
    return m[t] || '#6366f1';
  }
  function calcDays(from, to, halfDay) {
    if (!from || !to) return 0;
    const d = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
    return halfDay ? 0.5 : Math.max(d, 1);
  }

  // ── Load Balance ─────────────────────────────────────────────────────
  async function loadBalance() {
    try {
      const res = await apiFetch('/leave/balance');
      const b = res.data || res.balance || res || {};

      const map = [
        { key: 'casual',    prefix: 'cl', fallback: 'Casual Leave'    },
        { key: 'sick',      prefix: 'sl', fallback: 'Sick Leave'       },
        { key: 'earned',    prefix: 'el', fallback: 'Earned Leave'     },
        { key: 'comp',      prefix: 'co', fallback: 'Comp Off'         },
        { key: 'maternity', prefix: 'ml', fallback: 'Maternity Leave'  },
      ];

      map.forEach(({ key, prefix }) => {
        const entry  = b[key] || {};
        const total  = entry.total  ?? entry.allocated ?? 12;
        const used   = (entry.used || 0) + (entry.pending || 0);
        const avail  = entry.available ?? Math.max(0, total - used);

        const usedValEl = document.getElementById(`${prefix}UsedVal`);
        const totalEl   = document.getElementById(`${prefix}Total`);
        const barEl     = document.getElementById(`${prefix}Bar`);
        const availLbl  = document.getElementById(`${prefix}AvailLbl`);

        if (usedValEl) usedValEl.textContent = used;
        if (totalEl)   totalEl.textContent = total;
        if (barEl)     barEl.style.width   = total ? `${Math.min((used / total) * 100, 100)}%` : '0%';
        if (availLbl)  availLbl.textContent = `${avail} available`;
      });
    } catch {
      /* Balance not critical — silently show dashes */
    }
  }

  // ── Load Leaves ───────────────────────────────────────────────────────
  async function loadLeaves() {
    try {
      const url = currentFilter ? `/leave?status=${encodeURIComponent(currentFilter)}` : '/leave';
      const res = await apiFetch(url);
      allLeaves = res.data || res.leaves || res || [];
      renderLeaveCards(allLeaves);
      buildCalendar(calYear, calMonth);
    } catch {
      document.getElementById('leaveCardsList').innerHTML =
        `<div class="leave-empty"><div class="leave-empty-icon">📋</div>Could not load leave records.</div>`;
    }
  }

  // ── Render Leave Cards ────────────────────────────────────────────────
  function renderLeaveCards(leaves) {
    const container = document.getElementById('leaveCardsList');
    if (!leaves.length) {
      container.innerHTML = `
        <div class="leave-empty">
          <div class="leave-empty-icon">🏖️</div>
          No leave applications found.
          <div style="margin-top:0.5rem;font-size:0.78rem">Click "Apply for Leave" to submit your first request.</div>
        </div>`;
      return;
    }

    container.innerHTML = leaves.map(l => {
      const type    = l.type || l.leaveType || 'Casual Leave';
      const status  = (l.status || 'pending').toLowerCase();
      const color   = typeColor(type);
      const days    = l.days || calcDays(l.from || l.startDate, l.to || l.endDate, l.halfDay);
      const from    = fmtDate(l.from || l.startDate);
      const to      = fmtDate(l.to   || l.endDate);
      const reviewer = l.reviewedBy?.name || l.approvedBy?.name || '—';
      const sc = statusClass(status);
      const si = statusIcon(status);

      return `
        <div class="leave-card" style="--lc:${color}" data-id="${l._id}" onclick="openDetail('${l._id}')">
          <div class="lc-top">
            <span class="lc-type">${esc(type)}</span>
            <span class="lv-badge ${sc}">${si} ${cap(status)}</span>
          </div>
          <div class="lc-dates">📅 ${from} → ${to}</div>
          <div class="lc-reason" title="${esc(l.reason || '')}">${esc(l.reason || '—')}</div>
          <div class="lc-bottom">
            <span class="lc-days">${days} day${days !== 1 ? 's' : ''}</span>
            ${reviewer !== '—' ? `<span class="lc-reviewer">👤 ${esc(reviewer)}</span>` : ''}
            <span class="lc-applied">${timeAgo(l.createdAt || l.appliedAt)}</span>
          </div>
        </div>`;
    }).join('');
  }

  // ── Open Detail / Workflow Modal ──────────────────────────────────────
  window.openDetail = function (id) {
    const l = allLeaves.find(x => String(x._id) === String(id));
    if (!l) return;
    currentDetailId = id;
    const status = (l.status || 'pending').toLowerCase();
    const type   = l.type || l.leaveType || 'Casual Leave';
    const days   = l.days || calcDays(l.from || l.startDate, l.to || l.endDate, l.halfDay);

    document.getElementById('detailModalTitle').textContent = `${type} — ${days} Day${days !== 1 ? 's' : ''}`;

    // Workflow steps
    const steps = buildWorkflowSteps(l);

    document.getElementById('detailModalContent').innerHTML = `
      <div class="detail-info-grid">
        <div class="detail-row"><span class="dr-label">Status</span>
          <span class="lv-badge ${statusClass(status)}">${statusIcon(status)} ${cap(status)}</span></div>
        <div class="detail-row"><span class="dr-label">Leave Type</span><span class="dr-val">${esc(type)}</span></div>
        <div class="detail-row"><span class="dr-label">From</span><span class="dr-val">${fmtDate(l.from || l.startDate)}</span></div>
        <div class="detail-row"><span class="dr-label">To</span><span class="dr-val">${fmtDate(l.to || l.endDate)}</span></div>
        <div class="detail-row"><span class="dr-label">Days</span><span class="dr-val">${days}</span></div>
        <div class="detail-row"><span class="dr-label">Reason</span><span class="dr-val" style="max-width:200px;text-align:right">${esc(l.reason || '—')}</span></div>
        ${l.emergencyContact || l.contact ? `<div class="detail-row"><span class="dr-label">Contact</span><span class="dr-val">${esc(l.emergencyContact || l.contact)}</span></div>` : ''}
        ${l.reviewNote || l.remarks ? `<div class="detail-row"><span class="dr-label">Reviewer Note</span><span class="dr-val" style="max-width:200px;text-align:right;color:#fbbf24">${esc(l.reviewNote || l.remarks)}</span></div>` : ''}
      </div>
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--clr-text-muted);margin:1rem 0 0.5rem">Approval Workflow</div>
      <div class="workflow-steps">${steps}</div>`;

    // Show cancel button only for pending
    const cancelBtn = document.getElementById('detailCancelBtn');
    cancelBtn.style.display = status === 'pending' ? '' : 'none';
    cancelBtn.onclick = () => cancelLeave(id);

    document.getElementById('detailModal').style.display = 'flex';
  };

  function buildWorkflowSteps(l) {
    const status = (l.status || 'pending').toLowerCase();
    const appliedAt  = l.createdAt || l.appliedAt;
    const reviewedAt = l.reviewedAt || l.updatedAt;
    const reviewer   = l.reviewedBy?.name || l.approvedBy?.name || 'Manager';

    const steps = [
      { label: 'Application Submitted', icon: '📝', cls: 'done', note: `Applied ${timeAgo(appliedAt)}`, time: fmtDate(appliedAt) },
      { label: 'Under Review',          icon: '🔍', cls: status === 'pending' ? 'active' : 'done', note: status === 'pending' ? 'Awaiting manager review' : `Reviewed by ${reviewer}`, time: status !== 'pending' ? fmtDate(reviewedAt) : '' },
      status === 'approved'
        ? { label: 'Approved',  icon: '✅', cls: 'done',     note: `Approved by ${reviewer}`, time: fmtDate(reviewedAt) }
        : status === 'rejected'
        ? { label: 'Rejected',  icon: '❌', cls: 'rejected', note: l.reviewNote || l.remarks || `Rejected by ${reviewer}`, time: fmtDate(reviewedAt) }
        : status === 'cancelled'
        ? { label: 'Cancelled', icon: '🚫', cls: 'rejected', note: 'You cancelled this request', time: fmtDate(l.cancelledAt || reviewedAt) }
        : { label: 'Approval Pending', icon: '⏳', cls: 'idle', note: 'Awaiting decision', time: '' },
    ];

    if (status === 'approved') {
      steps.push({ label: 'Leave Active / Completed', icon: '🌴', cls: 'done', note: '', time: '' });
    }

    return steps.map(s => `
      <div class="wf-step">
        <div class="wf-dot ${s.cls}">${s.icon}</div>
        <div class="wf-body">
          <div class="wf-label">${s.label}</div>
          ${s.note ? `<div class="wf-note">${esc(s.note)}</div>` : ''}
          ${s.time ? `<div class="wf-time">${s.time}</div>` : ''}
        </div>
      </div>`).join('');
  }

  // ── Cancel Leave ──────────────────────────────────────────────────────
  window.cancelLeave = async function (id) {
    if (!confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await apiFetch(`/leave/${id}/cancel`, { method: 'PATCH' });
      document.getElementById('detailModal').style.display = 'none';
      showToast('Leave request cancelled.', 'info');
      loadLeaves();
      loadBalance();
    } catch {
      // Fallback: PATCH status
      try {
        await apiFetch(`/leave/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Cancelled' }) });
        document.getElementById('detailModal').style.display = 'none';
        showToast('Leave request cancelled.', 'info');
        loadLeaves();
        loadBalance();
      } catch {
        showToast('Could not cancel leave.', 'error');
      }
    }
  };

  // ── History Table (full list) ─────────────────────────────────────────
  async function loadHistory(year) {
    try {
      const url = year ? `/leave?year=${year}` : '/leave';
      const res = await apiFetch(url);
      const leaves = res.data || res.leaves || res || [];
      renderHistoryTable(leaves);
    } catch {
      document.getElementById('leaveTableBody').innerHTML =
        `<tr><td colspan="8" class="loading-cell">Could not load history.</td></tr>`;
    }
  }

  function renderHistoryTable(leaves) {
    const tbody = document.getElementById('leaveTableBody');
    if (!leaves.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="loading-cell">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = leaves.map(l => {
      const status   = (l.status || 'pending').toLowerCase();
      const type     = l.type || l.leaveType || 'Casual';
      const days     = l.days || calcDays(l.from || l.startDate, l.to || l.endDate, l.halfDay);
      const reviewer = l.reviewedBy?.name || l.approvedBy?.name || '—';
      const canCancel = status === 'pending';

      return `
        <tr>
          <td><span style="font-weight:700">${esc(type)}</span></td>
          <td>${fmtDate(l.from || l.startDate)}</td>
          <td>${fmtDate(l.to   || l.endDate)}</td>
          <td style="font-weight:700;color:var(--clr-primary)">${days}d</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis" title="${esc(l.reason||'')}">${esc(l.reason||'—')}</td>
          <td><span class="lv-badge ${statusClass(status)}">${statusIcon(status)} ${cap(status)}</span></td>
          <td style="font-size:0.78rem">${esc(reviewer)}</td>
          <td>
            ${canCancel
              ? `<button class="btn-danger" style="font-size:0.72rem;padding:0.25rem 0.6rem" onclick="event.stopPropagation();cancelLeave('${l._id}')">Cancel</button>`
              : '<span style="color:var(--clr-text-muted);font-size:0.78rem">—</span>'}
          </td>
        </tr>`;
    }).join('');
  }

  // ── Calendar ──────────────────────────────────────────────────────────
  function buildCalendar(year, month) {
    const label = document.getElementById('calMonthLabel');
    if (label) label.textContent = new Date(year, month - 1, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const grid = document.getElementById('calendarGrid');
    const dows = Array.from(grid.querySelectorAll('.cal-dow'));
    grid.innerHTML = '';
    dows.forEach(d => grid.appendChild(d));

    const firstDay   = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    // Build a set of leave-covered days
    const leaveDays = {}; // { "YYYY-MM-DD": status }
    allLeaves.forEach(l => {
      const from = new Date(l.from || l.startDate);
      const to   = new Date(l.to   || l.endDate);
      const status = (l.status || 'pending').toLowerCase();
      if (status === 'cancelled' || status === 'rejected') return;
      const cur = new Date(from);
      while (cur <= to) {
        const key = cur.toISOString().split('T')[0];
        leaveDays[key] = status;
        cur.setDate(cur.getDate() + 1);
      }
    });

    // Empty prefix
    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dow  = new Date(year, month - 1, d).getDay();
      const key  = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const lvSt = leaveDays[key];
      const isToday = isCurrentMonth && d === today.getDate();
      const isWknd  = dow === 0 || dow === 6;

      let cls = 'cal-day';
      if (isToday)          cls += ' today';
      else if (lvSt === 'approved') cls += ' on-leave';
      else if (lvSt === 'pending')  cls += ' pending';
      else if (isWknd)      cls += ' weekend';

      const cell = document.createElement('div');
      cell.className = cls;
      cell.innerHTML = `<span class="cal-day-num">${d}</span>${lvSt ? '<span class="cal-day-dot"></span>' : ''}`;
      cell.title = lvSt ? `${cap(lvSt)} Leave` : isWknd ? 'Weekend' : '';

      if (lvSt) {
        const leave = allLeaves.find(l => {
          const from = new Date(l.from || l.startDate);
          const to   = new Date(l.to   || l.endDate);
          const date = new Date(year, month - 1, d);
          return date >= from && date <= to;
        });
        if (leave) cell.addEventListener('click', () => openDetail(leave._id));
      }

      grid.appendChild(cell);
    }
  }

  // Cal nav
  document.getElementById('calPrev')?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    buildCalendar(calYear, calMonth);
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    buildCalendar(calYear, calMonth);
  });

  // ── Filter Pills ──────────────────────────────────────────────────────
  document.getElementById('filterPills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.status-pill');
    if (!pill) return;
    document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.dataset.status;
    loadLeaves();
  });

  // ── History Filter ────────────────────────────────────────────────────
  document.getElementById('yearFilter')?.addEventListener('change', (e) => {
    loadHistory(e.target.value);
  });

  window.setLeaveFilter = function(filterStr) {
    // filterStr is the prefix like 'casual', 'sick', etc. Let's map to Leave Type name
    const typeMap = {
      cl: 'Casual Leave', sl: 'Sick Leave', el: 'Earned Leave', co: 'Comp Off', ml: 'Maternity Leave'
    };
    if (typeMap[filterStr]) {
      // Find all requests matching this type
      const typeStr = typeMap[filterStr].toLowerCase();
      const filtered = allLeaves.filter(l => (l.type || l.leaveType || '').toLowerCase() === typeStr);
      renderLeaveCards(filtered);
    } else {
      renderLeaveCards(allLeaves);
    }
  };

  // ── Status Pills Filter ────────────────────────────────────────────────
  document.querySelectorAll('.s-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.s-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      const filter = e.target.getAttribute('data-filter');
      if (filter === 'all') {
        renderLeaveCards(allLeaves);
      } else {
        renderLeaveCards(allLeaves.filter(l => (l.status || 'pending').toLowerCase().includes(filter)));
      }
    });
  });

  // ── Apply Modal ───────────────────────────────────────────────────────
  document.getElementById('btnApplyLeave')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    const fromEl = document.getElementById('lvFrom');
    const toEl   = document.getElementById('lvTo');
    if (fromEl) { fromEl.min = today; fromEl.value = today; }
    if (toEl)   { toEl.min   = today; toEl.value   = today; }
    updateDays();
    document.getElementById('leaveModal').style.display = 'flex';
  });

  document.getElementById('leaveModalClose')?.addEventListener('click',   closeApplyModal);
  document.getElementById('leaveModalCancel')?.addEventListener('click',  closeApplyModal);
  document.getElementById('leaveModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('leaveModal')) closeApplyModal();
  });
  document.getElementById('detailModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('detailModal'))
      document.getElementById('detailModal').style.display = 'none';
  });

  function closeApplyModal() {
    document.getElementById('leaveModal').style.display = 'none';
    // Reset form
    document.getElementById('lvReason').value = '';
    document.getElementById('lvContact').value = '';
    document.getElementById('lvHalfDay').checked = false;
    document.getElementById('lvDocLabel').textContent = 'Choose file…';
    document.getElementById('lvDoc').value = '';
  }

  // Type pills
  document.getElementById('lvTypePills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.lv-type-pill');
    if (!pill) return;
    document.querySelectorAll('.lv-type-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    document.getElementById('lvType').value = pill.dataset.type;
    updateBalanceHint(pill.dataset.type);
    updateDays();
  });

  function updateBalanceHint(type) {
    const keyMap = {
      'Casual Leave': 'cl', 'Sick Leave': 'sl', 'Earned Leave': 'el',
      'Comp Off': 'co', 'Maternity Leave': 'ml', 'Paternity Leave': 'ml'
    };
    const prefix = keyMap[type];
    const hint = document.getElementById('lvBalanceHint');
    if (!hint || !prefix) return;
    const avail = document.getElementById(`${prefix}Avail`)?.textContent;
    hint.textContent = avail && avail !== '—' ? `${avail} days available` : '';
  }

  // Date / days
  document.getElementById('lvFrom')?.addEventListener('change', updateDays);
  document.getElementById('lvTo')?.addEventListener('change',   updateDays);
  document.getElementById('lvHalfDay')?.addEventListener('change', updateDays);

  function updateDays() {
    const from = document.getElementById('lvFrom')?.value;
    const to   = document.getElementById('lvTo')?.value;
    const half = document.getElementById('lvHalfDay')?.checked;
    const daysEl = document.getElementById('lvDays');
    if (!daysEl) return;
    if (!from || !to) { daysEl.textContent = '0 days'; return; }
    if (new Date(to) < new Date(from)) { daysEl.textContent = 'Invalid range'; return; }
    const days = calcDays(from, to, half);
    daysEl.textContent = `${days} day${days !== 1 ? 's' : ''}`;
  }

  // Doc file label
  document.getElementById('lvDoc')?.addEventListener('change', (e) => {
    const label = document.getElementById('lvDocLabel');
    if (label) label.textContent = e.target.files[0]?.name || 'Choose file…';
  });

  // ── Submit Leave ──────────────────────────────────────────────────────
  document.getElementById('btnSubmitLeave')?.addEventListener('click', async () => {
    const type    = document.getElementById('lvType').value;
    const from    = document.getElementById('lvFrom').value;
    const to      = document.getElementById('lvTo').value;
    const reason  = document.getElementById('lvReason').value.trim();
    const contact = document.getElementById('lvContact').value.trim();
    const halfDay = document.getElementById('lvHalfDay').checked;

    if (!from || !to || !reason) {
      showToast('Please fill in all required fields.', 'error'); return;
    }
    if (new Date(to) < new Date(from)) {
      showToast('End date must be after start date.', 'error'); return;
    }

    const btn = document.getElementById('btnSubmitLeave');
    btn.disabled = true; btn.textContent = 'Submitting…';

    try {
      const payload = { type, from, to, reason, halfDay };
      if (contact) payload.emergencyContact = contact;

      // Try with document upload first if file selected
      const fileInput = document.getElementById('lvDoc');
      if (fileInput?.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
          payload.attachment = e.target.result;
          try {
            await apiFetch('/leave', { method: 'POST', body: JSON.stringify(payload) });
            finishSubmit();
          } catch(err) {
            showToast(err.message || 'Could not submit leave.', 'error');
            btn.disabled = false; btn.textContent = 'Submit Application';
          }
        };
        reader.readAsDataURL(file);
        return;
      } else {
        await apiFetch('/leave', { method: 'POST', body: JSON.stringify(payload) });
        finishSubmit();
      }

      function finishSubmit() {
        closeApplyModal();
        showToast('✅ Leave application submitted!', 'success');
        socket?.emit('leave_applied', { userId: getUser()._id, type, from, to });
        loadLeaves();
        loadBalance();
        btn.disabled = false; btn.textContent = 'Submit Application';
      }

    } catch (err) {
      showToast(err.message || 'Could not submit leave.', 'error');
      btn.disabled = false; btn.textContent = 'Submit Application';
    }
  });

  // ── Socket.io ─────────────────────────────────────────────────────────
  function initSocket() {
    if (typeof io === 'undefined') return;
    socket = io({ auth: { token: tok() } });
    const user = getUser();
    if (user._id) socket.emit('join_user_room', user._id);

    socket.on('leave_status_updated', (data) => {
      if (String(data.userId) === String(user._id)) {
        showToast(
          data.status === 'Approved'
            ? `✅ Your ${data.type || 'leave'} has been approved!`
            : `❌ Your ${data.type || 'leave'} was rejected.`,
          data.status === 'Approved' ? 'success' : 'error'
        );
        loadLeaves();
        loadBalance();
      }
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
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth() + 1;

    // Populate year filter
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
      const currentYear = now.getFullYear();
      yearFilter.innerHTML = `<option value="">This Year (${currentYear})</option>`;
      for (let y = currentYear - 1; y >= currentYear - 3; y--) {
        yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
      }
    }

    loadBalance();
    loadLeaves().then(() => loadHistory());
    initSocket();
  });
})();
