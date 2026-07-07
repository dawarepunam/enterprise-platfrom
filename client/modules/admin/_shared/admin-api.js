/* ============================================================
   JMKC CRM — ADMIN API HELPER
   All API calls for admin module
   ============================================================ */
const AdminAPI = (() => {
  const BASE = window.location.origin + '/api';

  function headers() {
    const token = localStorage.getItem('jmkc_token') || localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async function req(method, path, body = null) {
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  return {
    get:    (path)         => req('GET',    path),
    post:   (path, body)   => req('POST',   path, body),
    put:    (path, body)   => req('PUT',    path, body),
    patch:  (path, body)   => req('PATCH',  path, body),
    delete: (path)         => req('DELETE', path),

    // ── Users ────────────────────────────────────────────
    getUsers:       (p = '') => req('GET', `/users${p}`),
    getUserById:    (id)     => req('GET', `/users/${id}`),
    createUser:     (data)   => req('POST', '/users', data),
    updateUser:     (id, d)  => req('PUT',  `/users/${id}`, d),
    deleteUser:     (id)     => req('DELETE', `/users/${id}`),

    // ── Departments ──────────────────────────────────────
    getDepts:       (p = '') => req('GET', `/departments${p}`),
    createDept:     (data)   => req('POST', '/departments', data),
    updateDept:     (id, d)  => req('PUT',  `/departments/${id}`, d),
    deleteDept:     (id)     => req('DELETE', `/departments/${id}`),

    // ── Projects ─────────────────────────────────────────
    getProjects:    (p = '') => req('GET', `/projects${p}`),
    getProjectById: (id)     => req('GET', `/projects/${id}`),
    createProject:  (data)   => req('POST', '/projects', data),
    updateProject:  (id, d)  => req('PUT',  `/projects/${id}`, d),
    deleteProject:  (id)     => req('DELETE', `/projects/${id}`),

    // ── Tasks ────────────────────────────────────────────
    getTasks:       (p = '') => req('GET', `/tasks${p}`),
    getTaskById:    (id)     => req('GET', `/tasks/${id}`),
    createTask:     (data)   => req('POST', '/tasks', data),
    updateTask:     (id, d)  => req('PUT',  `/tasks/${id}`, d),

    // ── Attendance ───────────────────────────────────────
    getAttendance:  (p = '') => req('GET', `/attendance${p}`),
    getAttByUser:   (uid, p) => req('GET', `/attendance/user/${uid}${p || ''}`),
    markAttendance: (data)   => req('POST', '/attendance', data),

    // ── Leaves ───────────────────────────────────────────
    getLeaves:      (p = '') => req('GET', `/leave${p}`),
    updateLeave:    (id, d)  => req('PUT',  `/leave/${id}`, d),

    // ── Clients (CRM) ────────────────────────────────────
    getClients:     (p = '') => req('GET', `/clients${p}`),
    getEnterpriseClients: (p = '') => req('GET', `/clients${p}`),
    getClientById:  (id)     => req('GET', `/clients/${id}`),
    createClient:   (data)   => req('POST', '/clients', data),
    updateClient:   (id, d)  => req('PUT',  `/clients/${id}`, d),

    // ── Meetings ─────────────────────────────────────────
    getMeetings:    (p = '') => req('GET', `/meetings${p}`),
    createMeeting:  (data)   => req('POST', '/meetings', data),
    updateMeeting:  (id, d)  => req('PUT',  `/meetings/${id}`, d),

    // ── Reports ──────────────────────────────────────────
    getReports:     (p = '') => req('GET', `/reports${p}`),

    // ── Analytics ────────────────────────────────────────
    getAnalytics:   (p = '') => req('GET', `/analytics${p}`),

    // ── Notifications ────────────────────────────────────
    getNotifs:      (p = '') => req('GET', `/notifications${p}`),
    markRead:       (id)     => req('PUT',  `/notifications/${id}/read`),

    // ── Audit Logs ───────────────────────────────────────
    getAuditLogs:   (p = '') => req('GET', `/audit-logs${p}`),

    // ── AI ───────────────────────────────────────────────
    getAISummary:   ()       => req('GET', '/ai/summary'),
    getAIInsights:  ()       => req('GET', '/ai/insights'),

    // ── Finance / Expenses ───────────────────────────────
    getExpenses:    (p = '') => req('GET', `/expenses${p}`),

    // ── Microsoft ────────────────────────────────────────
    getMSTeams:     ()       => req('GET', '/microsoft/teams'),
    getMSCalendar:  ()       => req('GET', '/microsoft/calendar'),
    getMSFiles:     ()       => req('GET', '/microsoft/files'),

    // ── Chat ─────────────────────────────────────────────
    getChats:       (p = '') => req('GET', `/chat${p}`),
    sendMessage:    (data)   => req('POST', '/chat/message', data),

    // ── Settings ─────────────────────────────────────────
    getSettings:    ()       => req('GET', '/settings'),
    saveSettings:   (data)   => req('PUT', '/settings', data),

    // ── Files / Documents ────────────────────────────────
    getFiles:       (p = '') => req('GET', `/files${p}`),

    // ── Support ──────────────────────────────────────────
    getTickets:     (p = '') => req('GET', `/enterprise/tickets${p}`),
  };
})();

window.AdminAPI = AdminAPI;

// ── Utility helpers used across all pages ───────────────────
window.fmt = {
  currency: v => '₹' + Number(v || 0).toLocaleString('en-IN'),
  percent:  v => Number(v || 0).toFixed(1) + '%',
  date:     d => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '-',
  time:     d => d ? new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '-',
  dateTime: d => d ? `${window.fmt.date(d)} ${window.fmt.time(d)}` : '-',
  initials: s => (s || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2),
  truncate: (s, n=40) => s && s.length > n ? s.slice(0, n) + '...' : (s || ''),
};

window.statusBadge = (status) => {
  const map = {
    'ACTIVE':      ['success','Active'],
    'INACTIVE':    ['gray','Inactive'],
    'PENDING':     ['warning','Pending'],
    'APPROVED':    ['success','Approved'],
    'REJECTED':    ['danger','Rejected'],
    'CANCELLED':   ['gray','Cancelled'],
    'IN_PROGRESS': ['info','In Progress'],
    'COMPLETED':   ['success','Completed'],
    'DELAYED':     ['danger','Delayed'],
    'ON_HOLD':     ['warning','On Hold'],
    'DRAFT':       ['gray','Draft'],
    'BLOCKED':     ['danger','Blocked'],
    'REVIEW':      ['purple','Review'],
    'WFH':         ['info','WFH'],
    'PRESENT':     ['success','Present'],
    'ABSENT':      ['danger','Absent'],
    'LATE':        ['warning','Late'],
    'ON_LEAVE':    ['orange','On Leave'],
    // Title-case versions for DB enum values
    'Present':     ['success','Present'],
    'Absent':      ['danger','Absent'],
    'Half Day':    ['warning','Half Day'],
    'On Leave':    ['orange','On Leave'],
    'Holiday':     ['info','Holiday'],
    'Weekend':     ['gray','Weekend'],
    'Active':      ['success','Active'],
    'Inactive':    ['gray','Inactive'],
    'Planning':    ['info','Planning'],
    'Assigned':    ['purple','Assigned'],
    'On Hold':     ['warning','On Hold'],
    'Completed':   ['success','Completed'],
    'Draft':       ['gray','Draft'],
    'Cancelled':   ['gray','Cancelled'],
  };
  const [type, label] = map[status] || map[status?.toUpperCase()] || ['gray', status || '-'];
  return `<span class="badge badge-${type}">${label}</span>`;
};

window.avatar = (name, size = 34) => `
  <div style="width:${size}px;height:${size}px;border-radius:50%;
    background:linear-gradient(135deg,#2563EB,#7C3AED);
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size*0.35)}px;font-weight:700;color:#fff;flex-shrink:0;">
    ${window.fmt.initials(name)}
  </div>`;

window.progressBar = (pct, color='') => `
  <div class="progress-bar"><div class="progress-fill ${color}" style="width:${Math.min(pct||0,100)}%"></div></div>`;
