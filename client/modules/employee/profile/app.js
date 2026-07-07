// Phase 16 — Profile — app.js
'use strict';
const token = localStorage.getItem('token');
if (!token) location.href = '/login';

const api = (url, opts = {}) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'API Error'); return d; });
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupSettings();
  await Promise.all([loadProfile(), loadActivity()]);
});

function setupTabs() {
  document.querySelectorAll('.pt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pt-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pt-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function setupSettings() {
  $('btnSaveSettings').addEventListener('click', async () => {
    const btn = $('btnSaveSettings');
    btn.textContent = 'Saving...';
    btn.disabled = true;
    try {
      const payload = {
        theme: $('setTheme').value,
        emailNotifications: $('setNotifEmail').checked,
        pushNotifications: $('setNotifPush').checked
      };
      await api('/api/users/profile', { method: 'PATCH', body: JSON.stringify({ settings: payload }) });
      
      // Apply theme immediately if possible
      if (payload.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
      else document.documentElement.setAttribute('data-theme', 'dark');

      alert('Settings saved successfully!');
    } catch (e) {
      alert(e.message);
    } finally {
      btn.textContent = 'Save Settings';
      btn.disabled = false;
    }
  });
}

async function loadProfile() {
  try {
    const res = await api('/api/auth/me');
    const u = res.data || res.user || res;
    
    $('profName').textContent = u.name || 'Unknown User';
    $('profAvatar').textContent = (u.name || '?').charAt(0).toUpperCase();
    $('profRole').textContent = u.role || u.designation || 'Employee';
    $('profEmail').textContent = u.email || '—';
    $('profPhone').textContent = u.phone || u.mobile || '—';
    $('profLocation').textContent = u.location || u.city || 'India';
    
    $('profBio').textContent = u.bio || 'No bio provided.';
    $('profEmpId').textContent = u.employeeId || u.empId || '—';
    $('profDept').textContent = u.department || '—';
    $('profJoinDate').textContent = u.joiningDate ? new Date(u.joiningDate).toLocaleDateString() : '—';
    $('profManager').textContent = u.managerName || u.reportsTo || '—';

    const skills = u.skills || [];
    if (skills.length) {
      $('profSkills').innerHTML = skills.map(s => `<span class="skill-chip">${s}</span>`).join('');
    }

    // Load settings into form
    const s = u.settings || {};
    $('setTheme').value = s.theme || 'dark';
    $('setNotifEmail').checked = s.emailNotifications !== false;
    $('setNotifPush').checked = s.pushNotifications !== false;

  } catch (e) {
    console.error('Failed to load profile:', e);
  }
}

async function loadActivity() {
  try {
    const res = await api('/api/users/activity');
    const activities = res.data || res.activities || [];
    
    if (!activities.length) {
      $('profActivity').innerHTML = '<div style="color:var(--clr-text-muted);text-align:center;padding:1rem;">No recent activity.</div>';
      return;
    }

    $('profActivity').innerHTML = activities.slice(0, 10).map(a => {
      const type = a.type || 'action';
      const icon = type === 'task' ? '✅' : type === 'meeting' ? '📅' : type === 'update' ? '📝' : '⚡';
      return `
        <div class="tl-item">
          <div class="tl-icon">${icon}</div>
          <div class="tl-content">
            <div class="tl-title">${a.description || a.message || 'Performed an action'}</div>
            <div class="tl-time">${new Date(a.createdAt).toLocaleString()}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    $('profActivity').innerHTML = `<div style="color:#f87171;text-align:center;padding:1rem;">${e.message}</div>`;
  }
}
