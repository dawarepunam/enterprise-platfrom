/* ============================================================
   JMKC CRM — Users Module
   Real-time backend connected, correct API parsing
   ============================================================ */
let allUsers = [], currentPage = 1, perPage = 15, deptList = [];
let currentStatFilter = 'all';

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
window.openModal = openModal; window.closeModal = closeModal;
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden'); });

async function loadUsers() {
  try {
    showTableLoader();
    const data = await AdminAPI.getUsers('?limit=500&sort=-createdAt');
    // Backend returns { success, data: [...] }  not { users: [...] }
    allUsers = data.users || data.data || [];
    renderStats();
    renderTable();
  } catch (err) {
    document.getElementById('usersTableBody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--danger)">
        ⚠️ Failed to load users: ${err.message}<br>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="loadUsers()">Retry</button>
      </td></tr>`;
  }
}

function showTableLoader() {
  document.getElementById('usersTableBody').innerHTML =
    `<tr><td colspan="7" style="text-align:center;padding:60px;">
      <div style="display:inline-block;width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div style="margin-top:12px;color:var(--text-3)">Loading users...</div>
    </td></tr>`;
}

function renderStats() {
  const total = allUsers.length;
  const active = allUsers.filter(u => (u.status || 'ACTIVE') === 'ACTIVE').length;
  const managers = allUsers.filter(u => u.role === 'MANAGER' || u.role === 'PRODUCT_MANAGER').length;
  const inactive = allUsers.filter(u => u.status === 'INACTIVE' || u.status === 'BLOCKED').length;
  animateCount('statTotal', total);
  animateCount('statActive', active);
  animateCount('statManagers', managers);
  animateCount('statInactive', inactive);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const duration = 600;
  const startTime = performance.now();
  const step = (now) => {
    const t = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + diff * t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function filterUsers() { currentPage = 1; renderTable(); }
window.filterUsers = filterUsers;

function getFiltered() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const dept = document.getElementById('filterDept')?.value || '';
  const role = document.getElementById('filterRole')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  let filtered = allUsers.filter(u => {
    const matchSearch = !search ||
      (u.name || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search) ||
      (u.employeeId || '').toLowerCase().includes(search);
    const deptVal = u.department?.name || u.department || '';
    const matchDept = !dept || deptVal.toLowerCase().includes(dept.toLowerCase()) || deptVal === dept;
    const matchRole = !role || u.role === role;
    const uStatus = u.status || 'ACTIVE';
    const matchStatus = !status || uStatus === status;
    return matchSearch && matchDept && matchRole && matchStatus;
  });

  if (currentStatFilter === 'active') {
    filtered = filtered.filter(u => (u.status || 'ACTIVE') === 'ACTIVE');
    filtered.sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0));
  } else if (currentStatFilter === 'managers') {
    filtered = filtered.filter(u => u.role === 'MANAGER' || u.role === 'PRODUCT_MANAGER');
    filtered.sort((a, b) => (b.projectCount || b.projects?.length || 0) - (a.projectCount || a.projects?.length || 0));
  } else if (currentStatFilter === 'inactive') {
    filtered = filtered.filter(u => u.status === 'INACTIVE' || u.status === 'BLOCKED');
  }

  return filtered;
}

window.filterByStat = function(stat) {
  currentStatFilter = stat;
  ['all', 'active', 'managers', 'inactive'].forEach(s => {
    const el = document.getElementById('kpi-' + s);
    if (el) el.style.border = (s === stat) ? '2px solid var(--primary)' : 'none';
  });
  filterUsers();
};

function renderTable() {
  const filtered = getFiltered();
  const total = filtered.length;
  const start = (currentPage - 1) * perPage;
  const paged = filtered.slice(start, start + perPage);

  document.getElementById('userCount').textContent = ` (${total})`;
  const showing1 = total ? Math.min(start + 1, total) : 0;
  const showing2 = Math.min(start + perPage, total);
  document.getElementById('pageInfo').textContent = `Showing ${showing1}–${showing2} of ${total}`;

  const tbody = document.getElementById('usersTableBody');
  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon">👥</div>
      <div class="empty-title">${allUsers.length ? 'No users match your filters' : 'No users yet'}</div>
      <div class="empty-desc">${allUsers.length ? 'Try adjusting your filters' : 'Click "+ Add User" to add the first user'}</div>
    </div></td></tr>`;
    renderPagination(0);
    return;
  }

  const roleColors = { ADMIN:'#7C3AED', MANAGER:'#2563EB', PRODUCT_MANAGER:'#0891B2',
    HR:'#059669', MARKETING:'#D97706', SALES:'#DC2626', CALLING:'#EA580C', MEMBER:'#64748B', CLIENT:'#8B5CF6' };

  tbody.innerHTML = paged.map(u => {
    const initials = window.fmt.initials(u.name || u.email);
    const color = roleColors[u.role] || '#64748B';
    const dept = u.department?.name || u.department || '—';
    const status = u.status || 'ACTIVE';
    return `
    <tr onclick="goToUser('${u._id}')" style="cursor:pointer">
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
          <div>
            <div style="font-weight:600;font-size:13px;">${u.name || '—'}</div>
            <div style="font-size:11px;color:var(--text-4);">${u.email || ''}</div>
            <div style="font-size:10px;color:var(--text-4);">${u.employeeId || ''}</div>
          </div>
        </div>
      </td>
      <td>${dept}</td>
      <td><span style="background:${color}18;color:${color};padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">${formatRole(u.role)}</span></td>
      <td>${u.projectCount || u.projects?.length || 0}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:60px;height:5px;border-radius:3px;background:var(--border);overflow:hidden;">
            <div style="width:${u.attendanceRate || 0}%;height:100%;background:${(u.attendanceRate||0)>=80?'var(--success)':'var(--warning)'};border-radius:3px;"></div>
          </div>
          <span style="font-size:11px;color:var(--text-3)">${u.attendanceRate || 0}%</span>
        </div>
      </td>
      <td>${window.statusBadge(status)}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="btn btn-icon btn-sm" title="View Profile" onclick="goToUser('${u._id}')">👁️</button>
          <button class="btn btn-icon btn-sm" title="Edit" onclick="openEditModal('${u._id}')">✏️</button>
          <button class="btn btn-icon btn-sm" title="Toggle Block" onclick="toggleBlock('${u._id}','${u.status||'ACTIVE'}','${u.name||''}')" style="${status==='BLOCKED'?'color:var(--success)':'color:var(--danger)'}">
            ${status === 'BLOCKED' ? '🔓' : '🚫'}
          </button>
          <button class="btn btn-icon btn-sm" title="Delete" onclick="deleteUser('${u._id}','${(u.name||'').replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(total);
}

function formatRole(role) {
  const map = { ADMIN:'Admin', MANAGER:'Project Manager', PRODUCT_MANAGER:'Product Manager',
    HR:'HR', MARKETING:'Marketing', SALES:'Sales', CALLING:'Calling', MEMBER:'Employee', CLIENT:'Client' };
  return map[role] || role || '—';
}

function renderPagination(total) {
  const pages = Math.ceil(total / perPage);
  const el = document.getElementById('pageBtns');
  if (!el) return;
  el.innerHTML = Array.from({ length: Math.min(pages, 10) }, (_, i) =>
    `<button class="page-btn ${i+1===currentPage?'active':''}" onclick="goPage(${i+1})">${i+1}</button>`
  ).join('');
}

function goPage(n) { currentPage = n; renderTable(); }
window.goPage = goPage;

function goToUser(id) { window.location.href = `/admin/users/${id}`; }
window.goToUser = goToUser;

async function openEditModal(id) {
  const u = allUsers.find(x => x._id === id);
  if (!u) return;
  document.getElementById('editUserId').value = id;
  document.getElementById('euName').value = u.name || '';
  document.getElementById('euEmail').value = u.email || '';
  document.getElementById('euPhone').value = u.phone || '';
  document.getElementById('euRole').value = u.role || '';
  document.getElementById('euStatus').value = u.status || 'ACTIVE';
  document.getElementById('euDesig').value = u.designation || '';
  const deptSel = document.getElementById('euDept');
  const currentDept = u.department?.name || u.department || '';
  deptSel.innerHTML = '<option value="">None</option>' +
    deptList.map(d => `<option value="${d.name}" ${d.name === currentDept ? 'selected' : ''}>${d.name}</option>`).join('');
  openModal('editUserModal');
}
window.openEditModal = openEditModal;

async function submitEditUser() {
  const id = document.getElementById('editUserId').value;
  const data = {
    name: document.getElementById('euName').value,
    email: document.getElementById('euEmail').value,
    phone: document.getElementById('euPhone').value,
    role: document.getElementById('euRole').value,
    status: document.getElementById('euStatus').value,
    department: document.getElementById('euDept').value,
    designation: document.getElementById('euDesig').value,
  };
  try {
    const result = await AdminAPI.updateUser(id, data);
    const updated = result.data;
    const idx = allUsers.findIndex(u => u._id === id);
    if (idx !== -1 && updated) allUsers[idx] = { ...allUsers[idx], ...updated };
    closeModal('editUserModal');
    window.showToast('Updated!', 'User changes saved.', 'success');
    renderStats(); renderTable();
  } catch (err) {
    window.showToast('Error', err.message, 'error');
  }
}
window.submitEditUser = submitEditUser;

async function toggleBlock(id, currentStatus, name) {
  const action = currentStatus === 'BLOCKED' ? 'unblock' : 'block';
  if (!confirm(`${action === 'block' ? 'Block' : 'Unblock'} user "${name}"?`)) return;
  try {
    await AdminAPI.patch(`/users/${id}/status`);
    const u = allUsers.find(x => x._id === id);
    if (u) u.status = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    window.showToast('Done', `${name} has been ${action}ed.`, 'success');
    renderStats(); renderTable();
  } catch (err) { window.showToast('Error', err.message, 'error'); }
}
window.toggleBlock = toggleBlock;

async function deleteUser(id, name) {
  if (!confirm(`Permanently delete user "${name}"? This cannot be undone.`)) return;
  try {
    await AdminAPI.deleteUser(id);
    allUsers = allUsers.filter(u => u._id !== id);
    window.showToast('Deleted', `${name} removed.`, 'success');
    renderStats(); renderTable();
  } catch (err) { window.showToast('Error', err.message, 'error'); }
}
window.deleteUser = deleteUser;

async function submitAddUser() {
  const name = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  const role = document.getElementById('uRole').value;
  const dept = document.getElementById('uDept').value;
  const phone = document.getElementById('uPhone').value.trim();
  const password = document.getElementById('uPass').value;
  const designation = document.getElementById('uDesig').value.trim();
  if (!name || !email || !role || !password) {
    window.showToast('Validation', 'Name, Email, Role & Password are required.', 'error'); return;
  }
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
  try {
    const result = await AdminAPI.createUser({ name, email, role, department: dept, phone, password, designation });
    const newUser = result.data || result.user;
    if (newUser) allUsers.unshift(newUser);
    closeModal('addUserModal');
    window.showToast('User Created!', `${name} added successfully.`, 'success');
    // Reset form
    ['uName','uEmail','uPass','uPhone','uDesig'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    renderStats(); renderTable();
  } catch (err) {
    // Friendly error messages
    let msg = err.message;
    if (msg && msg.toLowerCase().includes('already exists')) {
      msg = `Email "${email}" is already registered. Please use a different email address.`;
    } else if (msg && msg.toLowerCase().includes('validation')) {
      msg = 'Please check all required fields and try again.';
    }
    window.showToast('Error', msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Create User'; }
  }
}
window.submitAddUser = submitAddUser;

function exportUsers() {
  const filtered = getFiltered();
  const rows = [['Name','Email','Role','Department','Status','Employee ID']];
  filtered.forEach(u => rows.push([
    u.name||'', u.email||'', u.role||'',
    u.department?.name||u.department||'',
    u.status||'ACTIVE', u.employeeId||''
  ]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.showToast('Exported!', `${filtered.length} users downloaded.`, 'success');
}
function importUsers() { window.showToast('Import', 'Bulk import coming soon.', 'info'); }
window.exportUsers = exportUsers; window.importUsers = importUsers;

async function loadDepts() {
  try {
    const data = await AdminAPI.getDepts('?limit=100');
    deptList = data.departments || data.data || [];
    const sel = document.getElementById('filterDept');
    const uDeptSel = document.getElementById('uDept');
    if (sel) sel.innerHTML = '<option value="">All Departments</option>' +
      deptList.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    if (uDeptSel) uDeptSel.innerHTML = '<option value="">Select Department</option>' +
      deptList.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => { loadDepts(); loadUsers(); });
