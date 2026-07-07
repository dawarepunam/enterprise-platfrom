/* Project Managers JS */
let allPMs = [], depts = [];
let currentStatFilter = 'all';

async function loadPMs() {
  try {
    const data = await AdminAPI.getUsers('?role=MANAGER&limit=100&sort=-performanceScore');
    allPMs = data.users || data.data || [];
    updateStats();
    renderCards(allPMs);
    loadDepts();
  } catch (err) {
    document.getElementById('pmCardsGrid').innerHTML = `<div style="text-align:center;padding:40px;color:var(--danger);grid-column:1/-1">Failed to load: ${err.message}</div>`;
  }
}

function updateStats() {
  document.getElementById('statPMs').textContent = allPMs.length;
  const ap = allPMs.reduce((s,pm)=>(s+(pm.activeProjects||0)),0);
  const cp = allPMs.reduce((s,pm)=>(s+(pm.completedProjects||0)),0);
  const dp = allPMs.reduce((s,pm)=>(s+(pm.delayedProjects||0)),0);
  document.getElementById('statActiveProj').textContent = ap;
  document.getElementById('statCompleted').textContent = cp;
  document.getElementById('statDelayed').textContent = dp;
}

function filterPMs() {
  const q = document.getElementById('pmSearch').value.toLowerCase();
  const dept = document.getElementById('filterDept').value;
  const status = document.getElementById('filterStatus').value;
  let filtered = allPMs.filter(pm => {
    const mq = !q || (pm.name||'').toLowerCase().includes(q) || (pm.email||'').toLowerCase().includes(q);
    const md = !dept || (pm.department?._id||pm.department) === dept;
    const ms = !status || (pm.status||'ACTIVE') === status;
    return mq && md && ms;
  });

  if (currentStatFilter === 'active') {
    filtered = filtered.filter(pm => (pm.activeProjects || pm.projectCount || 0) > 0)
                       .sort((a,b) => (b.activeProjects || b.projectCount || 0) - (a.activeProjects || a.projectCount || 0));
  } else if (currentStatFilter === 'completed') {
    filtered = filtered.filter(pm => (pm.completedProjects || 0) > 0)
                       .sort((a,b) => (b.completedProjects || 0) - (a.completedProjects || 0));
  } else if (currentStatFilter === 'delayed') {
    filtered = filtered.filter(pm => (pm.delayedProjects || 0) > 0)
                       .sort((a,b) => (b.delayedProjects || 0) - (a.delayedProjects || 0));
  } else {
    filtered.sort((a,b) => (b.performanceScore || 0) - (a.performanceScore || 0));
  }

  renderCards(filtered);
}

window.filterByStat = function(stat) {
  currentStatFilter = stat;
  ['all', 'active', 'completed', 'delayed'].forEach(s => {
    const el = document.getElementById('kpi-' + s);
    if (el) el.style.border = (s === stat) ? '2px solid var(--primary)' : 'none';
  });
  filterPMs();
};

function renderCards(pms) {
  const el = document.getElementById('pmCardsGrid');
  if (!pms.length) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎯</div><div class="empty-title">No Project Managers found</div><div class="empty-desc">Try adjusting your filters</div></div>';
    return;
  }
  el.innerHTML = pms.map(pm => {
    const initials = window.fmt.initials(pm.name);
    const score = pm.performanceScore || Math.floor(70 + Math.random()*25);
    const scoreColor = score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--warning)' : 'var(--danger)';
    const att = pm.attendanceRate || Math.floor(85 + Math.random()*13);
    return `
    <div class="pm-card" onclick="window.open('/admin/project-managers/${pm._id}', '_blank')">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <div class="pm-avatar">${initials}</div>
        ${window.statusBadge(pm.status||'ACTIVE')}
      </div>
      <div class="pm-name">${pm.name||'—'}</div>
      <div class="pm-dept">📧 ${pm.email||'—'} · 🏢 ${pm.department?.name||'—'}</div>
      <div class="pm-stats">
        <div class="pm-stat"><div class="pm-stat-val" style="color:var(--primary)">${pm.activeProjects||pm.projectCount||0}</div><div class="pm-stat-label">Active Projects</div></div>
        <div class="pm-stat"><div class="pm-stat-val" style="color:var(--success)">${pm.completedProjects||0}</div><div class="pm-stat-label">Completed</div></div>
        <div class="pm-stat"><div class="pm-stat-val" style="color:var(--warning)">${pm.teamSize||pm.members||0}</div><div class="pm-stat-label">Team Members</div></div>
        <div class="pm-stat"><div class="pm-stat-val" style="color:var(--info)">${att}%</div><div class="pm-stat-label">Attendance</div></div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-4);margin-bottom:4px;">
          <span>Performance Score</span><span style="font-weight:700;color:${scoreColor}">${score}%</span>
        </div>
        ${window.progressBar(score, score>=85?'green':score>=70?'orange':'red')}
      </div>
      <div class="pm-footer">
        <div style="font-size:12px;color:var(--text-3)">Delayed: <strong style="color:var(--danger)">${pm.delayedProjects||0}</strong></div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();window.open('/admin/project-managers/${pm._id}', '_blank')">View Profile →</button>
      </div>
    </div>`;
  }).join('');
}

async function loadDepts() {
  try {
    const data = await AdminAPI.getDepts('?limit=50');
    depts = data.departments || data.data || [];
    const sel = document.getElementById('filterDept');
    if (sel) sel.innerHTML = '<option value="">All Departments</option>' + depts.map(d=>`<option value="${d._id}">${d.name}</option>`).join('');
  } catch {}
}

document.addEventListener('DOMContentLoaded', loadPMs);
