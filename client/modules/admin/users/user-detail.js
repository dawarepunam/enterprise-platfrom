/* User Detail JS */
const userId = window.location.pathname.split('/').pop();
let userData = null;

// Tab switching
document.querySelectorAll('.tab-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab)?.classList.remove('hidden');
    // Lazy load tab data
    if (tab === 'attendance') loadUserAttendance();
    if (tab === 'leaves') loadUserLeaves();
    if (tab === 'meetings') loadUserMeetings();
    if (tab === 'documents') loadUserDocuments();
    if (tab === 'performance') loadPerformanceCharts();
    if (tab === 'timeline') loadTimeline();
    if (tab === 'audit') loadAuditLogs();
    if (tab === 'projects') loadUserProjects();
  });
});

async function loadUser() {
  try {
    const isClientRoute = window.location.pathname.includes('/admin/clients/');
    if (isClientRoute) {
      const data = await AdminAPI.getClientById(userId);
      const c = data.client || data.data || data;
      userData = {
        _id: c._id,
        name: c.companyName || c.name || 'Client',
        email: c.email,
        phone: c.phone,
        departmentName: 'CRM Client',
        role: 'CLIENT',
        designation: c.contactName || 'Contact',
        status: c.status,
        createdAt: c.createdAt,
        projectCount: c.projectCount || c.projects?.length || 0,
      };
      document.getElementById('breadUser').textContent = 'Client Profile';
      const breadcrumbList = document.querySelector('.breadcrumb a');
      if (breadcrumbList) {
        breadcrumbList.href = '/admin/clients';
        breadcrumbList.textContent = 'Clients';
      }
    } else {
      const data = await AdminAPI.getUserById(userId);
      userData = data.user || data;
    }
    renderHero(userData);
    renderOverview(userData);
    if (userData.role === 'CLIENT') {
      document.querySelectorAll('[data-tab="attendance"], [data-tab="leaves"], [data-tab="performance"], [data-tab="audit"]').forEach(el => el.classList.add('hidden'));
      document.getElementById('heroAtt')?.parentElement?.classList.add('hidden');
      document.getElementById('heroScore')?.parentElement?.classList.add('hidden');
      document.getElementById('heroLeaves')?.parentElement?.classList.add('hidden');
      document.getElementById('attTrendChart')?.closest('.chart-box')?.classList.add('hidden');
      // Hide work stats related to attendance
      const workStats = document.getElementById('workStats');
      if (workStats) {
        workStats.querySelectorAll('.info-row').forEach(row => {
          if (row.textContent.includes('Attendance') || row.textContent.includes('Performance') || row.textContent.includes('Leave')) {
            row.style.display = 'none';
          }
        });
      }
    } else {
      loadAttTrendChart();
    }
    loadUserProjects();
  } catch (err) {
    document.getElementById('heroName').textContent = 'User not found';
    window.showToast('Error', err.message, 'error');
  }
}

function renderHero(u) {
  const initials = window.fmt.initials(u.name || u.email);
  document.getElementById('heroInitials').textContent = initials;
  document.getElementById('heroName').textContent = u.name || '—';
  document.getElementById('heroRole').textContent = formatRole(u.role) + (u.designation ? ` · ${u.designation}` : '');
  document.getElementById('heroEmail').textContent = u.email || '—';
  document.getElementById('heroPhone').textContent = u.phone || '—';
  document.getElementById('heroDept').textContent = u.department?.name || u.departmentName || '—';
  document.getElementById('heroJoined').textContent = window.fmt.date(u.createdAt);
  document.getElementById('heroAtt').textContent = (u.attendanceRate || 0) + '%';
  document.getElementById('heroProj').textContent = u.projectCount || u.projects?.length || 0;
  document.getElementById('heroTasks').textContent = u.taskCount || u.tasks?.length || 0;
  document.getElementById('heroScore').textContent = (u.performanceScore || 0) + '%';
  document.getElementById('heroLeaves').textContent = u.leavesCount || 0;
  document.getElementById('breadUser').textContent = u.name || 'Profile';
}

function formatRole(role) {
  const map = { ADMIN:'Admin', MANAGER:'Project Manager', PRODUCT_MANAGER:'Product Manager',
    HR:'HR', MARKETING:'Marketing', SALES:'Sales', CALLING:'Calling Team', MEMBER:'Employee', CLIENT:'Client' };
  return map[role] || role || '—';
}

function renderOverview(u) {
  document.getElementById('personalInfo').innerHTML = `
    <div class="info-row"><span class="info-label">Full Name</span><span class="info-val">${u.name||'—'}</span></div>
    <div class="info-row"><span class="info-label">Email</span><span class="info-val">${u.email||'—'}</span></div>
    <div class="info-row"><span class="info-label">Phone</span><span class="info-val">${u.phone||'—'}</span></div>
    <div class="info-row"><span class="info-label">Department</span><span class="info-val">${u.department?.name||u.departmentName||'—'}</span></div>
    <div class="info-row"><span class="info-label">Role</span><span class="info-val">${formatRole(u.role)}</span></div>
    <div class="info-row"><span class="info-label">Designation</span><span class="info-val">${u.designation||'—'}</span></div>
    <div class="info-row"><span class="info-label">Status</span><span class="info-val">${window.statusBadge(u.status||'ACTIVE')}</span></div>
    <div class="info-row"><span class="info-label">Joined</span><span class="info-val">${window.fmt.date(u.createdAt)}</span></div>`;

  document.getElementById('workStats').innerHTML = `
    <div class="info-row"><span class="info-label">Projects Assigned</span><span class="info-val">${u.projectCount||0}</span></div>
    <div class="info-row"><span class="info-label">Tasks Completed</span><span class="info-val">${u.completedTasks||0}</span></div>
    <div class="info-row"><span class="info-label">Tasks Pending</span><span class="info-val">${u.pendingTasks||0}</span></div>
    <div class="info-row"><span class="info-label">Attendance Rate</span><span class="info-val">${u.attendanceRate||0}%</span></div>
    <div class="info-row"><span class="info-label">Performance Score</span><span class="info-val">${u.performanceScore||0}%</span></div>
    <div class="info-row"><span class="info-label">Leave Balance</span><span class="info-val">${u.leaveBalance||12} days</span></div>
    <div class="info-row"><span class="info-label">Leaves Taken</span><span class="info-val">${u.leavesCount||0} days</span></div>
    <div class="info-row"><span class="info-label">Last Login</span><span class="info-val">${window.fmt.dateTime(u.lastLogin)}</span></div>`;
}

async function loadAttTrendChart() {
  const ctx = document.getElementById('attTrendChart'); if (!ctx) return;
  const days = []; const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}));
    data.push(Math.random() > 0.15 ? 1 : 0);
  }
  new Chart(ctx, { type:'bar', data: { labels:days, datasets:[{
    label:'Present', data, backgroundColor: data.map(v=>v?'#22C55E':'#EF4444'),
    borderRadius:3, barThickness:12,
  }]}, options:{ responsive:true, plugins:{legend:{display:false}},
    scales:{ x:{grid:{display:false},ticks:{font:{size:9},maxTicksLimit:10}},
             y:{display:false,min:0,max:1} } }});
}

async function loadUserProjects() {
  try {
    const data = await AdminAPI.getProjects(`?member=${userId}&limit=20`);
    const projects = data.projects || data.data || [];
    document.getElementById('userProjectsTable').innerHTML = projects.length ? projects.map(p => `
      <tr onclick="window.location.href='/admin/projects/${p._id}'" style="cursor:pointer;">
        <td><strong>${p.name||p.title||'—'}</strong></td>
        <td>${window.statusBadge(p.status)}</td>
        <td>${window.progressBar(p.progress||0)} <span style="font-size:11px">${p.progress||0}%</span></td>
        <td><span class="badge badge-gray">${p.userRole||'Member'}</span></td>
        <td>${window.fmt.date(p.deadline||p.endDate)}</td>
      </tr>`).join('') :
      '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📁</div><div class="empty-title">No projects found</div></div></td></tr>';
  } catch { document.getElementById('userProjectsTable').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Could not load projects</td></tr>'; }
}

async function loadUserAttendance() {
  const days = document.getElementById('attPeriod')?.value || 30;
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - days*86400000).toISOString().split('T')[0];
  try {
    const data = await AdminAPI.getAttByUser(userId, `?startDate=${start}&endDate=${end}`);
    const recs = data.attendance || data.data || [];
    document.getElementById('userAttTable').innerHTML = recs.length ? recs.map(r => `
      <tr>
        <td>${window.fmt.date(r.date)}</td>
        <td>${r.checkIn ? window.fmt.time(r.checkIn) : '—'}</td>
        <td>${r.checkOut ? window.fmt.time(r.checkOut) : '—'}</td>
        <td>${r.hours || r.totalHours || '—'}</td>
        <td>${window.statusBadge(r.status||'PRESENT')}</td>
      </tr>`).join('') :
      '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No records</div></div></td></tr>';
  } catch { document.getElementById('userAttTable').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Could not load attendance</td></tr>'; }
}

async function loadUserLeaves() {
  try {
    const data = await AdminAPI.getLeaves(`?user=${userId}&limit=30`);
    const leaves = data.leaves || data.data || [];
    document.getElementById('userLeavesTable').innerHTML = leaves.length ? leaves.map(l => `
      <tr>
        <td>${l.type||'—'}</td>
        <td>${window.fmt.date(l.startDate)}</td>
        <td>${window.fmt.date(l.endDate)}</td>
        <td>${l.days||1}</td>
        <td>${window.statusBadge(l.status)}</td>
        <td>${window.fmt.truncate(l.reason||'—',40)}</td>
      </tr>`).join('') :
      '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🌿</div><div class="empty-title">No leave records</div></div></td></tr>';
  } catch { document.getElementById('userLeavesTable').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Could not load leaves</td></tr>'; }
}

async function loadUserMeetings() {
  try {
    const data = await AdminAPI.getMeetings(`?attendee=${userId}&limit=20`);
    const meetings = data.meetings || data.data || [];
    const el = document.getElementById('userMeetingsList');
    el.innerHTML = meetings.length ? meetings.map(m => `
      <div class="card card-clickable" onclick="window.location.href='/admin/meetings'" style="margin-bottom:8px;">
        <div class="card-body" style="display:flex;align-items:center;gap:16px;">
          <div style="font-size:32px;">📹</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:14px;">${m.title||m.name||'Meeting'}</div>
            <div style="font-size:12px;color:var(--text-3);">${window.fmt.dateTime(m.startTime||m.date)} · ${m.attendees?.length||0} attendees</div>
          </div>
          ${window.statusBadge(m.status||'SCHEDULED')}
        </div>
      </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📹</div><div class="empty-title">No meetings found</div></div>';
  } catch {}
}

async function loadUserDocuments() {
  try {
    const data = await AdminAPI.getFiles(`?user=${userId}&limit=20`);
    const files = data.files || data.data || [];
    const el = document.getElementById('userDocsList');
    const iconMap = { pdf:'📄', doc:'📝', docx:'📝', xlsx:'📊', xls:'📊', png:'🖼️', jpg:'🖼️', mp4:'🎬' };
    el.innerHTML = files.length ? files.map(f => {
      const ext = (f.name||f.filename||'').split('.').pop()?.toLowerCase();
      return `<div class="doc-card" onclick="window.open('${f.url||f.path}','_blank')">
        <div class="doc-icon">${iconMap[ext]||'📎'}</div>
        <div class="doc-name">${f.name||f.filename||'File'}</div>
        <div class="doc-meta">${window.fmt.date(f.createdAt)} · ${(f.size||0/1024).toFixed(0)} KB</div>
      </div>`;}).join('') : '<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-title">No documents</div></div>';
  } catch {}
}

function loadPerformanceCharts() {
  const pCtx = document.getElementById('perfChart');
  const tCtx = document.getElementById('taskChart');
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  if (pCtx) new Chart(pCtx, { type:'line', data:{ labels:months, datasets:[{
    label:'Score', data:[72,78,75,82,85,88], borderColor:'#2563EB',
    backgroundColor:'rgba(37,99,235,0.1)', fill:true, tension:0.4, borderWidth:2.5
  }]}, options:{ responsive:true, plugins:{legend:{display:false}},
    scales:{ y:{min:0,max:100,ticks:{callback:v=>v+'%'}} } }});

  if (tCtx) new Chart(tCtx, { type:'doughnut', data:{
    labels:['Completed','In Progress','Pending','Blocked'],
    datasets:[{ data:[65,20,10,5], backgroundColor:['#22C55E','#2563EB','#F59E0B','#EF4444'], borderWidth:0, hoverOffset:6 }]
  }, options:{ responsive:true, cutout:'65%', plugins:{ legend:{ position:'bottom' } } }});
}

async function loadTimeline() {
  const el = document.getElementById('userTimeline'); if (!el) return;
  try {
    const data = await AdminAPI.getAuditLogs(`?user=${userId}&limit=15`);
    const logs = data.logs || data.data || [];
    el.innerHTML = logs.length ? logs.map(l => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-time">${window.fmt.dateTime(l.createdAt)}</div>
        <div class="timeline-title">${l.description||l.action||'Action'}</div>
        <div class="timeline-desc">${l.module||''} · IP: ${l.ip||'—'}</div>
      </div>`).join('') : '<div class="empty-state"><div class="empty-icon">⏱️</div><div class="empty-title">No timeline data</div></div>';
  } catch { el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏱️</div><div class="empty-title">Could not load timeline</div></div>'; }
}

async function loadAuditLogs() {
  try {
    const data = await AdminAPI.getAuditLogs(`?user=${userId}&limit=20`);
    const logs = data.logs || data.data || [];
    document.getElementById('userAuditTable').innerHTML = logs.length ? logs.map(l => `
      <tr>
        <td><strong>${l.action||'—'}</strong></td>
        <td>${l.module||'—'}</td>
        <td>${l.ip||'—'}</td>
        <td>${l.device||l.userAgent?.split(' ')[0]||'—'}</td>
        <td>${window.fmt.dateTime(l.createdAt)}</td>
      </tr>`).join('') :
      '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No audit logs</div></div></td></tr>';
  } catch { document.getElementById('userAuditTable').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Could not load logs</td></tr>'; }
}

async function deactivateUser() {
  if (!userData) return;
  if (!confirm(`Deactivate user "${userData.name}"?`)) return;
  try {
    await AdminAPI.updateUser(userId, { status: userData.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE' });
    window.showToast('Updated', 'User status changed.', 'success');
    loadUser();
  } catch (err) { window.showToast('Error', err.message, 'error'); }
}
function openEditUser() { window.location.href = '/admin/users'; }

document.addEventListener('DOMContentLoaded', () => {
  if (!userId || userId === 'users') { window.location.href = '/admin/users'; return; }
  loadUser();
});
