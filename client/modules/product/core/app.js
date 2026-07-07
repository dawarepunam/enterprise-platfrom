class AppRouter {
  static routes = [
    { id: 'dashboard', path: '/product-manager', folder: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'dashboard', path: '/product-manager/dashboard', folder: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'pm-queue', path: '/product-manager/queue', folder: 'pm-queue', label: 'PM Queue', icon: 'Inbox' },
    { id: 'workspace', path: '/product-manager/workspace', folder: 'workspace', label: 'Requirement Workspace', icon: '📝' },
    { id: 'feature-planning', path: '/product-manager/feature-planning', folder: 'feature-planning', label: 'Feature Planning', icon: '⚡' },
    { id: 'dependency-center', path: '/product-manager/dependency-center', folder: 'dependency-center', label: 'Dependency Center', icon: '🔗' },
    { id: 'budget-planning', path: '/product-manager/budget-planning', folder: 'budget-planning', label: 'Budget Planning', icon: '💰' },
    { id: 'timeline-planning', path: '/product-manager/timeline-planning', folder: 'timeline-planning', label: 'Timeline Planning', icon: '📅' },
    { id: 'resource-planning', path: '/product-manager/resource-planning', folder: 'resource-planning', label: 'Resource Planning', icon: '👥' },
    { id: 'risk-register', path: '/product-manager/risk-register', folder: 'risk-register', label: 'Risk Register', icon: '⚠️' },
    { id: 'stakeholders', path: '/product-manager/stakeholders', folder: 'stakeholders', label: 'Stakeholder Mgmt', icon: '🤝' },
    { id: 'documents', path: '/product-manager/documents', folder: 'documents', label: 'Document Center', icon: '📄' },
    { id: 'meetings', path: '/product-manager/meetings', folder: 'meetings', label: 'Meeting Center', icon: '📅' },
    { id: 'client-approval', path: '/product-manager/client-approval', folder: 'client-approval', label: 'Client Approval', icon: '✅' },
    { id: 'freeze', path: '/product-manager/freeze', folder: 'freeze', label: 'Requirement Freeze', icon: '❄️' },
    { id: 'change-requests', path: '/product-manager/change-requests', folder: 'change-requests', label: 'Change Requests', icon: '🔄' },
    { id: 'pm-assignment', path: '/product-manager/pm-assignment', folder: 'pm-assignment', label: 'PM Assignment', icon: '🧑‍💼' },
    { id: 'analytics', path: '/product-manager/analytics', folder: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', path: '/product-manager/settings', folder: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  static async init() {
    this.renderNav();
    window.addEventListener('popstate', () => this.handleRoute());
    await this.handleRoute();
  }

  static renderNav() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    
    // Distinct navigation menu rendering
    const menuItems = this.routes.filter(r => !r.path.endsWith('/product-manager'));
    
    nav.innerHTML = menuItems.map(route => `
      <a href="${route.path}" data-route="${route.id}">
        <span class="icon">${route.icon}</span>
        ${route.label}
      </a>
    `).join('');

    nav.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a) {
        e.preventDefault();
        this.navigate(a.getAttribute('href'));
      }
    });
  }

  static async navigate(path) {
    window.history.pushState({}, '', path);
    await this.handleRoute();
  }

  static async handleRoute() {
    const path = window.location.pathname;
    let route = this.routes.find(r => r.path === path);
    if (!route) {
      // Default fallback
      route = this.routes[0];
      window.history.replaceState({}, '', route.path);
    }

    // Update active nav state
    document.querySelectorAll('#sidebarNav a').forEach(a => a.classList.remove('active'));
    const activeNav = document.querySelector(`#sidebarNav a[data-route="${route.id}"]`);
    if (activeNav) activeNav.classList.add('active');

    document.getElementById('pmBreadcrumbs').innerText = `Dashboard > ${route.label}`;
    document.getElementById('pmPageTitle').innerText = route.label;

    await this.loadModule(route.folder);
  }

  static async loadModule(folder) {
    const host = document.getElementById('pmPageHost');
    host.innerHTML = '<div class="pm-loader">Loading module...</div>';
    
    try {
      // Fetch HTML
      const htmlResponse = await fetch(`/modules/product/${folder}/view.html`);
      if (!htmlResponse.ok) throw new Error('View not found');
      const htmlText = await htmlResponse.text();
      host.innerHTML = htmlText;

      // Load JS if not already loaded
      const scriptId = `script_${folder}`;
      const funcName = folder.replace(/-/g, '_');
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `/modules/product/${folder}/script.js`;
        document.body.appendChild(script);
        
        script.onload = () => {
          if (window[`init_${funcName}`]) {
            window[`init_${funcName}`]();
          }
        };
      } else {
        // If already loaded, just re-init
        if (window[`init_${funcName}`]) {
          window[`init_${funcName}`]();
        }
      }
    } catch (error) {
      console.error(error);
      host.innerHTML = `<div class="pm-empty">Module not implemented yet or failed to load.<br><br><small>${error.message}</small></div>`;
    }
  }

  static refreshCurrentView() {
    const path = window.location.pathname;
    const route = this.routes.find(r => r.path === path) || this.routes[0];
    const funcName = route.folder.replace(/-/g, '_');
    if (window[`init_${funcName}`]) {
      window[`init_${funcName}`]();
    }
  }

  static handleAction(action, id, targetElement) {
    // Actions are usually handled by the specific module's script
    const path = window.location.pathname;
    const route = this.routes.find(r => r.path === path) || this.routes[0];
    const funcName = route.folder.replace(/-/g, '_');
    if (window[`action_${funcName}`]) {
      window[`action_${funcName}`](action, id, targetElement);
    } else {
      console.warn(`Action handler not implemented for ${route.folder}`);
    }
  }
}

window.App = AppRouter;
document.addEventListener('DOMContentLoaded', () => AppRouter.init());
