/* ============================================================
   PM Dashboard - app.js
   Real API data, Socket.io real-time, UI interactions
   ============================================================ */

'use strict';

const API_BASE = '';
let currentUser = null;

// ── Helpers ──────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('jmkc_token') || '';
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || 'null');
  } catch { return null; }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
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

function showToast(message, type = 'success') {
  const container = document.getElementById('pmToastContainer');
  if (!container) return;
  const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  const toast = document.createElement('div');
  toast.className = `pm-toast ${type}`;
  toast.innerHTML = `<i class="fa fa-${icons[type] || 'info-circle'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Modal open/close
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
window.openModal = openModal;
window.closeModal = closeModal;

// Close modal on overlay click
document.querySelectorAll('.pm-modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Logout
function confirmLogout() { openModal('modal-logout'); }
function performLogout() {
  localStorage.clear();
  window.location.href = '/login';
}
window.confirmLogout = confirmLogout;
window.performLogout = performLogout;

// Sidebar toggle (mobile)
function toggleSidebar() {
  document.getElementById('pmSidebar')?.classList.toggle('open');
}
window.toggleSidebar = toggleSidebar;

// Integrations
function openTeams() {
  const msTeamsUrl = 'https://teams.microsoft.com';
  window.open(msTeamsUrl, '_blank');
}
function openOutlook() {
  window.open('https://outlook.office.com', '_blank');
}
function openOneDrive() {
  window.open('https://onedrive.live.com', '_blank');
}
window.openTeams = openTeams;
window.openOutlook = openOutlook;
window.openOneDrive = openOneDrive;

function generateReport() {
  window.location.href = '/project-manager/reports';
}
window.generateReport = generateReport;

// ── Active nav detection ─────────────────────────────────────
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.pm-nav-item').forEach(item => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (href && path.includes(href.replace('/project-manager/', ''))) {
      item.classList.add('active');
    }
  });
  // Always mark dashboard active on dashboard page
  if (path.includes('/dashboard')) {
    document.getElementById('nav-dashboard')?.classList.add('active');
  }
}

// ── Populate user info ───────────────────────────────────────
function populateUserInfo(user) {
  if (!user) return;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'PM';

  const avatarColors = ['#3b82f6','#22c55e','#f97316','#a855f7','#ef4444'];
  const color = avatarColors[user.name ? user.name.charCodeAt(0) % avatarColors.length : 0];

  // Sidebar
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarDept = document.getElementById('sidebarUserDept');
  if (sidebarAvatar) { sidebarAvatar.textContent = initials; sidebarAvatar.style.background = color; }
  if (sidebarName) sidebarName.textContent = user.name || 'Project Manager';
  if (sidebarDept)  sidebarDept.textContent = user.department || 'Project Manager';

  // Header
  const headerAvatar = document.getElementById('headerAvatar');
  const headerName   = document.getElementById('headerUserName');
  if (headerAvatar) { headerAvatar.textContent = initials; headerAvatar.style.background = color; }
  if (headerName)   headerName.textContent = (user.name || '').split(' ')[0];

  // Welcome
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = user.name || 'Project Manager';
}

// ── Date display ─────────────────────────────────────────────
function updateDateDisplay() {
  const el = document.getElementById('welcomeDate');
  if (!el) return;
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = now.toLocaleDateString('en-IN', options);
  // Set greeting based on hour
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const greetEl = document.getElementById('timeGreeting');
  if (greetEl) greetEl.textContent = greeting;
}

// ── Animate numbers ──────────────────────────────────────────
function animateCount(el, target, suffix = '') {
  if (!el) return;
  const duration = 900;
  const start = performance.now();
  const from = 0;
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (target - from) * eased) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Load KPI Data ─────────────────────────────────────────────
async function loadKPIs() {
  try {
    const [projectsRes, tasksRes, teamsRes, meetingsRes, risksRes] = await Promise.allSettled([
      apiFetch('/api/analytics/pm-dashboard'),
      apiFetch('/api/tasks?size=200'),
      apiFetch('/api/teams?size=100'),
      apiFetch('/api/meetings?size=100'),
      apiFetch('/api/risks?size=100'),
    ]);

    // Load projects count directly from projects API
    try {
      const pRes = await apiFetch('/api/projects?size=500');
      const projects = pRes.data || [];
      // Non-active statuses (case-insensitive)
      const doneStatuses = ['completed', 'archived', 'cancelled'];
      const active = projects.filter(p => !doneStatuses.includes((p.status||'').toLowerCase())).length;
      animateCount(document.getElementById('kpi-projects'), active);
      const badge = document.getElementById('badge-projects');
      if (badge) badge.textContent = active;
      const changeEl = document.getElementById('kpi-proj-txt');
      if (changeEl) changeEl.textContent = `${active} active this month`;
      // Popup breakdown
      const completed  = projects.filter(p => p.status?.toLowerCase() === 'completed').length;
      const inProgress = projects.filter(p => ['active','in_progress','in progress'].includes((p.status||'').toLowerCase())).length;
      const pending    = projects.filter(p => ['planning','pending','draft'].includes((p.status||'').toLowerCase())).length;
      const delayed    = projects.filter(p => ['on hold','on_hold','assigned'].includes((p.status||'').toLowerCase())).length;
      const elC = document.getElementById('p-completed'); if (elC) elC.textContent = completed;
      const elP = document.getElementById('p-progress');  if (elP) elP.textContent = inProgress;
      const elN = document.getElementById('p-pending');   if (elN) elN.textContent = pending;
      const elD = document.getElementById('p-delayed');   if (elD) elD.textContent = delayed;
    } catch (e) {
      console.warn('Projects KPI error:', e);
      animateCount(document.getElementById('kpi-projects'), 0);
    }

    // Tasks
    if (tasksRes.status === 'fulfilled') {
      const tasks = tasksRes.value?.data || [];
      const pending = tasks.filter(t => t.status !== 'COMPLETED').length;
      animateCount(document.getElementById('kpi-tasks'), pending);
      document.getElementById('badge-tasks').textContent = pending;
      document.getElementById('t-todo').textContent      = tasks.filter(t => t.status === 'TODO').length;
      document.getElementById('t-progress').textContent  = tasks.filter(t => t.status === 'IN_PROGRESS').length;
      document.getElementById('t-review').textContent    = tasks.filter(t => t.status === 'REVIEW').length;
      document.getElementById('t-completed').textContent = tasks.filter(t => t.status === 'COMPLETED').length;
      const changeEl = document.getElementById('kpi-tasks-change');
      if (changeEl) changeEl.innerHTML = `<i class="fa fa-arrow-up"></i> ${pending} tasks pending`;
    }

    // Team
    if (teamsRes.status === 'fulfilled') {
      const teams = teamsRes.value?.data || [];
      const total = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
      animateCount(document.getElementById('kpi-team'), total);
    }

    // Meetings
    if (meetingsRes.status === 'fulfilled') {
      const meetings = meetingsRes.value?.data || [];
      const today = new Date().toDateString();
      const todayMeetings = meetings.filter(m => new Date(m.date || m.scheduledAt).toDateString() === today);
      animateCount(document.getElementById('kpi-meetings'), todayMeetings.length);
      document.getElementById('badge-meetings').textContent = todayMeetings.length;
      document.getElementById('m-today').textContent   = todayMeetings.length;
      document.getElementById('m-upcoming').textContent = meetings.filter(m => new Date(m.date || m.scheduledAt) > new Date()).length;
      document.getElementById('m-done').textContent     = meetings.filter(m => m.status === 'COMPLETED').length;
      renderMeetings(todayMeetings.slice(0, 4));
    }

    // Risks
    if (risksRes.status === 'fulfilled') {
      const risks = risksRes.value?.data || [];
      const open = risks.filter(r => r.status !== 'RESOLVED').length;
      animateCount(document.getElementById('kpi-risks'), open);
      document.getElementById('badge-risks').textContent = open;
      document.getElementById('r-critical').textContent = risks.filter(r => r.severity === 'CRITICAL').length;
      document.getElementById('r-high').textContent     = risks.filter(r => r.severity === 'HIGH').length;
      document.getElementById('r-medium').textContent   = risks.filter(r => r.severity === 'MEDIUM').length;
      document.getElementById('r-low').textContent      = risks.filter(r => r.severity === 'LOW').length;
      renderRiskAlerts(risks.filter(r => r.status !== 'RESOLVED').slice(0, 4));
    }

  } catch (err) {
    console.warn('KPI load error:', err);
  }
}

// ── Load Recent Projects ──────────────────────────────────────
async function loadRecentProjects() {
  const loading = document.getElementById('recentProjectsLoading');
  const table   = document.getElementById('recentProjectsTable');
  const tbody   = document.getElementById('recentProjectsBody');
  try {
    const res = await apiFetch('/api/projects?size=100');
    let projects = res.data || [];
    
    // Sort descending by createdAt to show newest first
    projects.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    projects = projects.slice(0, 8); // Keep only 8

    if (loading) loading.style.display = 'none';
    if (table)   table.style.display = 'table';
    if (!tbody) return;

    if (projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="pm-empty-state"><i class="fa fa-folder-open"></i><p>No projects yet. Create your first project!</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = projects.map(p => {
      const pct = Math.round(p.progress || p.completionRate || 0);
      const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : 'var(--red)';
      const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'2-digit'}) : '—';
      const statusMap = {
        COMPLETED: 'success', IN_PROGRESS: 'info', PENDING: 'warning',
        ON_HOLD: 'neutral', CANCELLED: 'danger', DELAYED: 'danger'
      };
      const statusClass = statusMap[p.status] || 'neutral';
      return `
        <tr onclick="window.location='/project-manager/projects/${p._id}'" style="cursor:pointer">
          <td><span style="font-weight:600">${p.projectName || p.name || 'Unnamed'}</span></td>
          <td>${p.clientName || p.client || '—'}</td>
          <td>
            <span class="prio-dot ${p.priority || 'MEDIUM'}"></span>
            ${p.priority || 'Medium'}
          </td>
          <td style="min-width:120px">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="pm-progress" style="flex:1">
                <div class="pm-progress-bar" style="width:${pct}%;background:${color}"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${color}">${pct}%</span>
            </div>
          </td>
          <td><span class="pm-date-chip"><i class="fa fa-calendar-alt"></i>${deadline}</span></td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:24px;height:24px;border-radius:50%;background:${p.assignedByRole?.toLowerCase().includes('admin') ? '#ef4444' : '#a855f7'};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0;">${(p.assignedByName || p.clientName || 'Admin').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}</div>
              <div style="font-size:11.5px;line-height:1.3;">
                <div style="font-weight:600;">${p.assignedByName || p.clientName || 'Admin'}</div>
                <div style="color:var(--text-4);font-size:10px;">${p.assignedByRole || 'Administrator'}</div>
              </div>
            </div>
          </td>
          <td><span class="pm-badge ${statusClass}">${p.status || 'Active'}</span></td>
        </tr>`;
    }).join('');

  } catch (err) {
    if (loading) loading.innerHTML = '<div class="pm-empty-state"><i class="fa fa-exclamation-circle"></i><p>Failed to load projects.</p></div>';
    console.warn('Projects load error:', err);
  }
}


// ── Render Meetings ───────────────────────────────────────────
function renderMeetings(meetings) {
  const el = document.getElementById('meetingsList');
  if (!el) return;

  if (!meetings.length) {
    el.innerHTML = '<div class="pm-empty-state"><i class="fa fa-calendar-times"></i><p>No meetings scheduled for today</p></div>';
    return;
  }

  el.innerHTML = meetings.map(m => {
    const d = new Date(m.date || m.scheduledAt);
    const hour = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    return `
      <div class="pm-meeting-item">
        <div class="pm-meeting-time">
          <div class="hour">${hour}:${String(d.getMinutes()).padStart(2,'0')}</div>
          <div class="ampm">${ampm}</div>
        </div>
        <div class="pm-meeting-info">
          <div class="pm-meeting-title">${m.title || 'Team Meeting'}</div>
          <div class="pm-meeting-meta"><i class="fa fa-users" style="margin-right:3px"></i>${m.platform || 'Teams'} • ${m.participants?.length || 0} participants</div>
        </div>
        <button class="pm-join-btn" onclick="openTeams()"><i class="fa fa-video"></i> Join</button>
      </div>`;
  }).join('');
}

// ── Render Risk Alerts ────────────────────────────────────────
function renderRiskAlerts(risks) {
  const el = document.getElementById('riskAlerts');
  if (!el) return;

  if (!risks.length) {
    el.innerHTML = '<div class="pm-empty-state"><i class="fa fa-shield-alt"></i><p>No open risks 🎉</p></div>';
    return;
  }

  const severityMap = { CRITICAL: 'high', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };
  const iconMap     = { CRITICAL: 'skull-crossbones', HIGH: 'exclamation-circle', MEDIUM: 'exclamation-triangle', LOW: 'info-circle' };
  el.innerHTML = risks.map(r => `
    <div class="pm-risk-item ${severityMap[r.severity] || 'medium'}">
      <i class="fa fa-${iconMap[r.severity] || 'exclamation-triangle'}"></i>
      <div style="flex:1">
        <div style="font-weight:600;font-size:12px">${r.title || 'Risk'}</div>
        <div style="font-size:11px;opacity:.7">${r.project?.name || 'General'}</div>
      </div>
      <span class="pm-badge ${r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'danger' : r.severity === 'MEDIUM' ? 'warning' : 'success'}" style="font-size:10px">${r.severity}</span>
    </div>`).join('');
}

// ── Load Activity Feed ────────────────────────────────────────
async function loadActivity() {
  const el = document.getElementById('activityFeed');
  if (!el) return;

  const colors = ['#3b82f6','#22c55e','#f97316','#a855f7','#ef4444'];
  const fallbackActivities = [
    { text: 'Project Manager Dashboard loaded', time: 'Just now' },
    { text: 'System ready for new activities', time: '1 min ago' },
  ];

  try {
    const res = await apiFetch('/api/analytics?type=activity&limit=8').catch(() => null);
    const activities = res?.data || fallbackActivities;

    el.innerHTML = activities.map((a, i) => `
      <div class="pm-activity-item">
        <div class="pm-activity-dot" style="background:${colors[i % colors.length]}"></div>
        <div>
          <div class="pm-activity-text">${a.text || a.message || 'Activity recorded'}</div>
          <div class="pm-activity-time"><i class="fa fa-clock"></i> ${a.time || a.createdAt || 'Recently'}</div>
        </div>
      </div>`).join('');
  } catch {
    el.innerHTML = fallbackActivities.map((a, i) => `
      <div class="pm-activity-item">
        <div class="pm-activity-dot" style="background:${colors[i % colors.length]}"></div>
        <div>
          <div class="pm-activity-text">${a.text}</div>
          <div class="pm-activity-time"><i class="fa fa-clock"></i> ${a.time}</div>
        </div>
      </div>`).join('');
  }
}

// ── Load Team Availability ────────────────────────────────────
async function loadTeamAvailability() {
  try {
    const res = await apiFetch('/api/analytics/workload').catch(() => null);
    const data = res?.data || {};

    const available = data.availableMembers || 0;
    const busy      = data.busyMembers || 0;
    const onLeave   = data.onLeaveMembers || 0;
    const total     = available + busy + onLeave || 1;

    document.getElementById('avail-count').textContent = available;
    document.getElementById('busy-count').textContent  = busy;
    document.getElementById('leave-count').textContent = onLeave;

    // Update donut
    const avPct   = Math.round((available / total) * 360);
    const busyPct = Math.round((busy / total) * 360);
    const donut   = document.getElementById('availabilityDonut');
    if (donut) {
      donut.style.background = `conic-gradient(
        var(--green)  0deg ${avPct}deg,
        var(--orange) ${avPct}deg ${avPct + busyPct}deg,
        var(--red)    ${avPct + busyPct}deg 360deg
      )`;
    }
  } catch (err) {
    console.warn('Team availability error:', err);
  }
}

// ── Load Team Members ─────────────────────────────────────────
async function loadTeamMembers() {
  const el = document.getElementById('teamMembersGrid');
  if (!el) return;

  try {
    // Try manager API first, then fall back to teams
    let members = [];
    try {
      const mRes = await apiFetch('/api/manager/members?size=50');
      members = mRes.data || [];
    } catch {
      const tRes = await apiFetch('/api/teams?size=20');
      const teams = tRes.data || [];
      // Get all unique member IDs from teams
      const memberIds = [...new Set(teams.flatMap(t => t.memberIds || []))];
      if (memberIds.length) {
        const uRes = await apiFetch('/api/users?ids=' + memberIds.slice(0, 20).join(',') + '&size=20');
        members = uRes.data || [];
      } else {
        // Fallback: load all users
        const uRes = await apiFetch('/api/users?size=20');
        members = uRes.data || [];
      }
    }

    if (!members.length) {
      el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--pm-text-muted);font-size:13px"><i class="fa fa-users" style="font-size:28px;margin-bottom:8px;display:block;opacity:.4"></i>No team members found.<br><a href="/project-manager/team" style="color:var(--pm-accent);font-weight:600;margin-top:8px;display:inline-block">Manage Team →</a></div>';
      return;
    }

    const colors = ['#3b82f6','#22c55e','#f97316','#a855f7','#ef4444','#06b6d4','#84cc16','#f43f5e'];
    el.innerHTML = members.slice(0, 8).map((m, i) => {
      const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const color = colors[i % colors.length];
      const tasksDone = m.completedTasks || m.tasksCompleted || 0;
      const tasksTotal = m.assignedTasks || m.totalTasks || m.taskCount || 0;
      const perf = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : (m.performanceScore || 0);
      const perfColor = perf >= 70 ? '#22c55e' : perf >= 40 ? '#f97316' : '#ef4444';
      const online = (m.onlineStatus || m.status || '').toUpperCase() !== 'OFFLINE';
      return `<div style="background:var(--pm-card,#fff);border:1px solid var(--pm-border,#e5e7eb);border-radius:12px;padding:16px;cursor:pointer;transition:all .2s ease;" onclick="window.location='/project-manager/employee-profile?id=${m._id}'" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;position:relative">
            ${m.profilePhoto ? `<img src="${m.profilePhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : initials}
            <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius:50%;background:${online ? '#22c55e' : '#94a3b8'};border:2px solid #fff"></div>
          </div>
          <div style="flex:1;overflow:hidden">
            <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name || 'Unknown'}</div>
            <div style="font-size:11px;color:var(--pm-text-muted,#64748b)">${m.designation || m.role || 'Member'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;background:#f8fafc;padding:8px;border-radius:8px;margin-bottom:10px">
          <div style="text-align:center"><div style="font-size:14px;font-weight:800;color:var(--pm-accent,#3b82f6)">${tasksTotal}</div><div style="font-size:9.5px;color:#94a3b8">Tasks</div></div>
          <div style="text-align:center"><div style="font-size:14px;font-weight:800;color:#22c55e">${tasksDone}</div><div style="font-size:9.5px;color:#94a3b8">Done</div></div>
          <div style="text-align:center"><div style="font-size:14px;font-weight:800;color:${perfColor}">${perf}%</div><div style="font-size:9.5px;color:#94a3b8">Perf</div></div>
        </div>
        <div style="height:4px;background:#e5e7eb;border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${perf}%;background:${perfColor};border-radius:99px;transition:width .6s ease"></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button style="flex:1;padding:5px;border:1.5px solid var(--pm-border,#e5e7eb);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:none;color:var(--pm-text,#0f172a);transition:all .2s" onclick="event.stopPropagation();window.location='/project-manager/tasks?assignee=${m._id}'" onmouseover="this.style.borderColor='var(--pm-accent,#3b82f6)';this.style.color='var(--pm-accent,#3b82f6)'" onmouseout="this.style.borderColor='';this.style.color=''"><i class="fa fa-tasks"></i> Tasks</button>
          <button style="flex:1;padding:5px;border:1.5px solid var(--pm-border,#e5e7eb);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:none;color:var(--pm-text,#0f172a);transition:all .2s" onclick="event.stopPropagation();window.location='/project-manager/employee-profile?id=${m._id}'" onmouseover="this.style.borderColor='var(--pm-accent,#3b82f6)';this.style.color='var(--pm-accent,#3b82f6)'" onmouseout="this.style.borderColor='';this.style.color=''"><i class="fa fa-user"></i> Profile</button>
        </div>
      </div>`;
    }).join('');

    // Update KPI badge
    const kpiTeam = document.getElementById('kpi-team');
    if (kpiTeam) animateCount(kpiTeam, members.length);
    const kpiTeamTxt = document.getElementById('kpi-team-txt');
    if (kpiTeamTxt) kpiTeamTxt.textContent = `${members.length} active members`;

  } catch (err) {
    console.warn('Team members load error:', err);
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--pm-text-muted)"><i class="fa fa-exclamation-circle"></i> Failed to load team data</div>';
  }
}

// ── Form Submissions ──────────────────────────────────────────
async function submitCreateProject(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('submitProject');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating...'; }

  const data = Object.fromEntries(new FormData(form));
  try {
    await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) });
    closeModal('modal-create-project');
    form.reset();
    showToast('Project created successfully! 🎉', 'success');
    loadKPIs();
    loadRecentProjects();
  } catch (err) {
    showToast(err.message || 'Failed to create project', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-save"></i> Create Project'; }
  }
}
window.submitCreateProject = submitCreateProject;

async function submitCreateTeam(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify(data) });
    closeModal('modal-create-team');
    e.target.reset();
    showToast('Team created successfully! 👥', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to create team', 'error');
  }
}
window.submitCreateTeam = submitCreateTeam;

async function submitScheduleMeeting(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const dateTime = new Date(`${data.date}T${data.time}`);
    const payload  = { ...data, scheduledAt: dateTime, date: dateTime };
    await apiFetch('/api/meetings', { method: 'POST', body: JSON.stringify(payload) });
    closeModal('modal-schedule-meeting');
    e.target.reset();
    showToast('Meeting scheduled! 📅', 'success');
    loadKPIs();
  } catch (err) {
    showToast(err.message || 'Failed to schedule meeting', 'error');
  }
}
window.submitScheduleMeeting = submitScheduleMeeting;

// ── Socket.io real-time ───────────────────────────────────────
function initSocket() {
  if (typeof io === 'undefined') return;
  try {
    const socket = io({ auth: { token: getToken() } });

    socket.on('connect', () => {
      const user = getUser();
      if (user?._id) socket.emit('join', `user_${user._id}`);
    });

    socket.on('projectAssigned', data => {
      showToast(`📁 New project assigned: ${data.projectName}`, 'info');
      loadKPIs();
      loadRecentProjects();
    });

    socket.on('taskAssigned', data => {
      showToast(`✅ New task: ${data.taskTitle}`, 'info');
      loadKPIs();
      const badge = document.getElementById('badge-tasks');
      if (badge) badge.textContent = parseInt(badge.textContent || 0) + 1;
    });

    socket.on('notification', data => {
      showToast(data.message || 'New notification', 'info');
      const dot  = document.getElementById('headerNotifDot');
      const nb   = document.getElementById('badge-notif');
      if (dot) dot.style.display = 'block';
      if (nb)  nb.textContent = parseInt(nb.textContent || 0) + 1;
      document.querySelector('.pm-icon-btn .fa-bell')?.classList.add('bell-active');
    });

    socket.on('chatMessage', () => {
      const dot = document.getElementById('headerChatDot');
      const nb  = document.getElementById('badge-chat');
      if (dot) dot.style.display = 'block';
      if (nb)  nb.textContent = parseInt(nb.textContent || 0) + 1;
    });

    socket.on('riskCreated', data => {
      showToast(`⚠️ New risk: ${data.title}`, 'warning');
      loadKPIs();
    });

  } catch (err) {
    console.warn('Socket init error:', err);
  }
}

// ── Auth guard ────────────────────────────────────────────────
function authGuard() {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) {
    window.location.href = '/login';
    return false;
  }
  // Allow MANAGER and PROJECT_MANAGER
  const pmRoles = ['MANAGER', 'PROJECT_MANAGER'];
  if (!pmRoles.includes((user.role || '').toUpperCase())) {
    window.location.href = '/login?role=PROJECT_MANAGER';
    return false;
  }
  return true;
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!authGuard()) return;

  currentUser = getUser();

  updateDateDisplay();
  setActiveNav();
  populateUserInfo(currentUser);

  // Load all data in parallel
  loadKPIs();
  loadRecentProjects();
  loadActivity();
  loadTeamAvailability();
  loadTeamMembers();

  // Socket.io
  initSocket();

  // Search
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = e.target.value.trim();
        if (q.length >= 2) {
          console.log('Search:', q); // TODO: implement global search
        }
      }, 400);
    });
  }

  // Refresh KPIs every 60 seconds
  setInterval(() => {
    loadKPIs();
    loadActivity();
  }, 60000);
});


