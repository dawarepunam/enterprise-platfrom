document.addEventListener('DOMContentLoaded', () => {
  // ---------- Tab navigation ----------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-panel');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      // Activate button
      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      // Show/hide content
      tabContents.forEach(c => {
        const isActive = c.id === `tab-${target}`;
        c.classList.toggle('active', isActive);
        if (isActive) {
          // Lazy load when a tab becomes active
          if (target === 'profile') loadProfile();
          else if (target === 'security') load2FAStatus();
          else if (target === 'devices') loadDevices();
          else if (target === 'sessions') loadSessions();
        }
      });
    });
  });

  // ---------- Profile ----------
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('profileName').value.trim();
      const email = document.getElementById('profileEmail').value.trim();
      try {
        const res = await fetch('/api/settings/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });
        if (!res.ok) throw new Error('Failed to update profile');
        alert('Profile updated successfully');
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }
  async function loadProfile() {
    try {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) throw new Error('Unable to load profile');
      const data = await res.json();
      document.getElementById('profileName').value = data.name || '';
      document.getElementById('profileEmail').value = data.email || '';
    } catch (err) {
      console.error(err);
    }
  }

  // ---------- 2FA ----------
  const toggle2faBtn = document.getElementById('toggle2faBtn');
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  const qrCodeImg = document.getElementById('qrCodeImg');
  const confirm2faBtn = document.getElementById('confirm2faBtn');
  const statusP = document.getElementById('2faStatus');

  async function load2FAStatus() {
    try {
      const res = await fetch('/api/settings/2fa');
      if (!res.ok) throw new Error('Unable to load 2FA status');
      const { enabled } = await res.json();
      statusP.textContent = enabled ? '2FA is ENABLED' : '2FA is DISABLED';
      toggle2faBtn.textContent = enabled ? 'Disable 2FA' : 'Enable 2FA';
    } catch (err) {
      console.error(err);
    }
  }

  if (toggle2faBtn) {
    toggle2faBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/settings/2fa', { method: 'POST' });
        if (!res.ok) throw new Error('Toggle 2FA failed');
        const data = await res.json();
        // If enabling, backend returns QR image data URL
        if (data.qrCode) {
          qrCodeImg.src = data.qrCode;
          qrCodeContainer.style.display = 'block';
        } else {
          qrCodeContainer.style.display = 'none';
        }
        await load2FAStatus();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }

  if (confirm2faBtn) {
    confirm2faBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/settings/2fa/confirm', { method: 'POST' });
        if (!res.ok) throw new Error('2FA verification failed');
        alert('2FA enabled successfully');
        qrCodeContainer.style.display = 'none';
        await load2FAStatus();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }

  // ---------- Devices ----------
  async function loadDevices() {
    const container = document.getElementById('devicesList');
    if (!container) return;
    container.innerHTML = '<p>Loading devices…</p>';
    try {
      const res = await fetch('/api/settings/devices');
      if (!res.ok) throw new Error('Failed to fetch devices');
      const devices = await res.json();
      if (!Array.isArray(devices) || devices.length === 0) {
        container.innerHTML = '<p>No registered devices.</p>';
        return;
      }
      const list = document.createElement('ul');
      list.className = 'device-list';
      devices.forEach(dev => {
        const li = document.createElement('li');
        li.textContent = `${dev.name || dev.id} – ${dev.lastSeen || ''}`;
        const revokeBtn = document.createElement('button');
        revokeBtn.textContent = 'Revoke';
        revokeBtn.className = 'btn btn-danger btn-sm ml-2';
        revokeBtn.addEventListener('click', async () => {
          if (!confirm('Revoke this device?')) return;
          try {
            const r = await fetch(`/api/settings/devices/${dev.id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('Failed to revoke');
            li.remove();
          } catch (e) {
            console.error(e);
            alert(e.message);
          }
        });
        li.appendChild(revokeBtn);
        list.appendChild(li);
      });
      container.innerHTML = '';
      container.appendChild(list);
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Error loading devices.</p>';
    }
  }

  // ---------- Sessions ----------
  async function loadSessions() {
    const container = document.getElementById('sessionsList');
    if (!container) return;
    container.innerHTML = '<p>Loading sessions…</p>';
    try {
      const res = await fetch('/api/settings/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const sessions = await res.json();
      if (!Array.isArray(sessions) || sessions.length === 0) {
        container.innerHTML = '<p>No active sessions.</p>';
        return;
      }
      const list = document.createElement('ul');
      list.className = 'session-list';
      sessions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.device || 'Unknown device'} – ${s.ip || ''} – ${new Date(s.lastActive).toLocaleString()}`;
        list.appendChild(li);
      });
      const logoutBtn = document.getElementById('logoutAllBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          if (!confirm('Log out from all sessions?')) return;
          try {
            const r = await fetch('/api/settings/logout-all', { method: 'POST' });
            if (!r.ok) throw new Error('Logout failed');
            alert('All sessions terminated');
            await loadSessions();
          } catch (e) {
            console.error(e);
            alert(e.message);
          }
        });
      }
      container.innerHTML = '';
      container.appendChild(list);
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Error loading sessions.</p>';
    }
  }

  // ---------- Password Change ----------
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async e => {
      e.preventDefault();
      const currentPwd = document.getElementById('currentPwd').value;
      const newPwd = document.getElementById('newPwd').value;
      const confirmPwd = document.getElementById('confirmPwd').value;
      if (newPwd !== confirmPwd) {
        alert('New passwords do not match');
        return;
      }
      try {
        const res = await fetch('/api/settings/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPwd, newPwd })
        });
        if (!res.ok) throw new Error('Password change failed');
        alert('Password updated successfully');
        passwordForm.reset();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }

  // Initialise default tab
  loadProfile(); // Pre‑load profile for the first view
});
