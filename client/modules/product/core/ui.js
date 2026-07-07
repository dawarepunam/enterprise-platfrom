class UI {
  static init() {
    this.bindEvents();
    if (window.io) {
      this.socket = io();
      this.setupSockets();
    }
  }

  static bindEvents() {
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('pmSidebar').classList.toggle('collapsed');
    });

    document.getElementById('drawerCloseBtn')?.addEventListener('click', () => this.closeDrawer());
    document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.closeModal());
    
    // Global click delegate for action buttons
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      
      // Global Header Actions
      if (action === 'notifications') {
        this.openDrawer('Notification Center', 'Alerts & Updates', `
          <div style="display:flex; flex-direction:column; gap:1rem;">
            <div class="pm-card" style="border-left: 4px solid var(--pm-primary);">
              <div style="display:flex; justify-content:space-between;">
                <strong>Requirement Approved</strong>
                <small>10m ago</small>
              </div>
              <p style="color:var(--pm-text-muted); font-size:0.875rem; margin-top:0.5rem;">The Client Requirement has been approved by Finance.</p>
              <div style="margin-top:0.5rem;"><button class="pm-btn">Mark Read</button></div>
            </div>
            <div class="pm-card" style="border-left: 4px solid var(--pm-danger);">
              <div style="display:flex; justify-content:space-between;">
                <strong>Critical Risk Alert</strong>
                <small>1h ago</small>
              </div>
              <p style="color:var(--pm-text-muted); font-size:0.875rem; margin-top:0.5rem;">A high probability timeline risk was added.</p>
              <div style="margin-top:0.5rem;"><button class="pm-btn">View Risk</button></div>
            </div>
          </div>
        `);
        return;
      }

      if (action === 'settings') {
        window.App.navigate('/product-manager/settings');
        return;
      }

      const id = btn.dataset.id;
      if (window.App && typeof window.App.handleAction === 'function') {
        window.App.handleAction(action, id, btn);
      }
    });

    // Profile Dropdown
    document.getElementById('userProfileBtn')?.addEventListener('click', () => {
      this.openModal('Enterprise Profile Dropdown', `
        <div style="display:flex; flex-direction:column; gap: 0.5rem;">
          <button class="pm-btn" style="text-align:left; border:none; padding:1rem;" onclick="window.UI.closeModal(); window.App.navigate('/product-manager/settings');">👤 My Profile & Account Settings</button>
          <button class="pm-btn" style="text-align:left; border:none; padding:1rem;" onclick="window.UI.closeModal();">⚙️ Preferences & Notifications</button>
          <button class="pm-btn" style="text-align:left; border:none; padding:1rem;" onclick="window.UI.closeModal();">🛡️ Privacy & Security</button>
          <button class="pm-btn" style="text-align:left; border:none; padding:1rem;" onclick="window.UI.closeModal();">🎨 Theme Options</button>
          <button class="pm-btn" style="text-align:left; border:none; padding:1rem;" onclick="window.UI.closeModal();">❓ Help Center</button>
          <hr style="border:0; border-top:1px solid var(--pm-border); margin:0.5rem 0;" />
          <button class="pm-btn danger" style="text-align:left; border:none; padding:1rem;" onclick="window.auth.logout();">🚪 Logout</button>
        </div>
      `);
    });

    // Global Search
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const query = e.target.value.trim();
          if (query.length > 2) {
            this.toast(`Searching Enterprise records for "${query}"...`, 'info');
          }
        }, 500);
      });
    }
  }

  static setupSockets() {
    this.socket.on('requirement_updated', (data) => {
      this.toast('Requirement updated by another user', 'success');
      if (window.App) window.App.refreshCurrentView();
    });
    this.socket.on('freeze_completed', (data) => {
      this.toast('A requirement has been frozen.', 'success');
      if (window.App) window.App.refreshCurrentView();
    });
    this.socket.on('project_created', (data) => {
      this.toast('A new project has been created successfully.', 'success');
      if (window.App) window.App.refreshCurrentView();
    });
  }

  static toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `pm-toast ${type}`;
    el.innerHTML = `<span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  static openDrawer(title, context, htmlContent) {
    document.getElementById('drawerTitle').innerText = title;
    document.getElementById('drawerEyebrow').innerText = context;
    document.getElementById('drawerBody').innerHTML = htmlContent;
    document.getElementById('pmGlobalDrawer').classList.add('open');
  }

  static closeDrawer() {
    document.getElementById('pmGlobalDrawer').classList.remove('open');
  }

  static openModal(title, htmlContent) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerHTML = htmlContent;
    document.getElementById('pmGlobalModal').classList.add('open');
  }

  static closeModal() {
    document.getElementById('pmGlobalModal').classList.remove('open');
  }

  static escapeHtml(unsafe) {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  static formatCurrency(num) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);
  }

  static formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

window.UI = UI;
document.addEventListener('DOMContentLoaded', () => UI.init());
