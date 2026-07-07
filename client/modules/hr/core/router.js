class AppRouter {
  constructor() {
    this.routes = {
      '/hr/dashboard': '/modules/hr/dashboard/view.html',
      '/hr/employees': '/modules/hr/directory/view.html',
      '/hr/profile': '/modules/hr/profile/view.html',
      '/hr/departments': '/modules/hr/departments/view.html',
      '/hr/department-details': '/modules/hr/departments/details.html',
      '/hr/designations': '/modules/hr/designations/view.html',
      '/hr/designation-details': '/modules/hr/designations/details.html',
      '/hr/documents': '/modules/hr/documents/view.html',
      '/hr/assets': '/modules/hr/assets/view.html',
      '/hr/attendance': '/modules/hr/attendance/view.html',
      '/hr/leaves': '/modules/hr/leaves/view.html',
      '/hr/leave-balances': '/modules/hr/leave-balances/view.html',
      '/hr/shifts': '/modules/hr/shifts/view.html',
      '/hr/holidays': '/modules/hr/holidays/view.html',
      '/hr/calendar': '/modules/hr/calendar/view.html',
      '/hr/ess': '/modules/hr/ess/view.html',
      '/hr/overtime': '/modules/hr/overtime/view.html',
      '/hr/compoff': '/modules/hr/compoff/view.html',
      '/hr/performance': '/modules/hr/performance/view.html',
      '/hr/goals': '/modules/hr/goals/view.html',
      '/hr/kpi': '/modules/hr/kpi/view.html',
      '/hr/appraisals': '/modules/hr/appraisals/view.html',
      '/hr/feedback': '/modules/hr/feedback/view.html',
      '/hr/training': '/modules/hr/training/view.html',
      '/hr/certifications': '/modules/hr/certifications/view.html',
      '/hr/skills': '/modules/hr/skills/view.html',
      '/hr/promotions': '/modules/hr/promotions/view.html',
      '/hr/transfers': '/modules/hr/transfers/view.html',
      '/hr/awards': '/modules/hr/awards/view.html',
      '/hr/career-path': '/modules/hr/career-path/view.html',
      '/hr/succession': '/modules/hr/succession/view.html',
      '/hr/surveys': '/modules/hr/surveys/view.html',
      '/hr/performance/analytics': '/modules/hr/performance/analytics/view.html',
      
      // Phase 4 Routes
      '/hr/payroll': '/modules/hr/payroll/view.html',
      '/hr/claims': '/modules/hr/claims/view.html',
      '/hr/recruitment/jobs': '/modules/hr/recruitment/jobs/view.html',
      '/hr/recruitment/candidates': '/modules/hr/recruitment/candidates/view.html',
      '/hr/recruitment/interviews': '/modules/hr/recruitment/interviews/view.html',
      '/hr/onboarding': '/modules/hr/onboarding/view.html',
      '/hr/exit': '/modules/hr/exit/view.html',

      // Phase 5 Routes
      '/ai/copilot': '/modules/hr/ai-copilot/view.html',
      '/ai/attrition': '/modules/hr/ai-attrition/view.html',
      '/analytics/forecasting': '/modules/hr/analytics-forecasting/view.html',
      '/analytics/skills': '/modules/hr/analytics-skills/view.html',
      '/analytics/executive': '/modules/hr/analytics-executive/view.html',

      // Phase 6 Routes
      '/social': '/modules/hr/social/view.html',
      '/hr/recognition-wall': '/modules/hr/recognition-wall/view.html',
      '/hr/communities': '/modules/hr/communities/view.html',
      '/hr/wellness': '/modules/hr/wellness/view.html',
      '/hr/visitors': '/modules/hr/visitors/view.html',
      '/hr/meeting-rooms': '/modules/hr/meeting-rooms/view.html',

      // Phase 7 Routes
      '/admin/workflows': '/modules/hr/admin-workflows/view.html',
      '/admin/audit': '/modules/hr/admin-audit/view.html',
      '/admin/roles': '/modules/hr/admin-roles/view.html',
      '/admin/security': '/modules/hr/admin-security/view.html'
    };
    
    // Set up popstate for browser back/forward
    window.addEventListener('popstate', () => this.handleRoute());
  }

  init() {
    this.handleRoute();
  }

  async navigate(path) {
    window.history.pushState({}, '', path);
    await this.handleRoute();
  }

  async handleRoute() {
    let path = window.location.pathname;
    let viewUrl = this.routes[path];

    // Handle dynamic department routes like /hr/departments/marketing
    let departmentId = null;
    if (path.startsWith('/hr/departments/') && path !== '/hr/departments') {
      departmentId = path.split('/').pop();
      viewUrl = this.routes['/hr/department-details'];
      path = '/hr/department-details';
    }

    // Handle dynamic designation routes like /hr/designations/manager
    let designationId = null;
    if (path.startsWith('/hr/designations/') && path !== '/hr/designations') {
      designationId = path.split('/').pop();
      viewUrl = this.routes['/hr/designation-details'];
      path = '/hr/designation-details';
    }

    if (!viewUrl) viewUrl = this.routes['/hr/dashboard'];
    
    // Update Active Nav Link
    document.querySelectorAll('.hr-nav-item').forEach(el => {
      // For dynamic routes, keep the parent nav active
      let routeCheck = window.location.pathname;
      if(routeCheck.startsWith('/hr/departments')) routeCheck = '/hr/departments';
      if(routeCheck.startsWith('/hr/designations')) routeCheck = '/hr/designations';
      if(routeCheck.startsWith('/hr/documents')) routeCheck = '/hr/documents';
      if(routeCheck.startsWith('/hr/assets')) routeCheck = '/hr/assets';
      
      // Match exact path or base path for departments/designations
      if(el.getAttribute('data-route') === window.location.pathname || el.getAttribute('data-route') === routeCheck) {
        el.classList.add('active');
        // If it's a child nav, ensure parent is open (e.g. Workforce)
        const parentId = el.parentElement.id;
        if(parentId && document.getElementById(parentId)) {
          document.getElementById(parentId).classList.remove('hidden');
        }
      } else {
        el.classList.remove('active');
      }
    });

    try {
      const response = await fetch(viewUrl);
      if (!response.ok) throw new Error('View not found');
      const html = await response.text();
      document.getElementById('hrMainContent').innerHTML = html;
      
      // Execute scripts inside the loaded view if needed
      this.executeScripts(document.getElementById('hrMainContent'));
      
      // Call initialization function if exists for the module
      this.initModule(path);
      
    } catch (error) {
      document.getElementById('hrMainContent').innerHTML = `<div style="padding: 3rem; text-align: center; color: red;">Failed to load view: ${error.message}</div>`;
    }
  }

  executeScripts(element) {
    const scripts = element.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = document.createElement('script');
      if (scripts[i].src) {
        script.src = scripts[i].src;
      } else {
        script.text = scripts[i].innerText;
      }
      document.body.appendChild(script).parentNode.removeChild(script);
    }
  }

  initModule(path) {
    // We can call specific init functions based on the path
    if (path === '/hr/dashboard' && window.init_hr_dashboard) window.init_hr_dashboard();
    if (path === '/hr/employees' && window.init_hr_directory) window.init_hr_directory();
    if (path === '/hr/profile' && window.init_hr_profile) window.init_hr_profile();
    if (path === '/hr/departments' && window.init_hr_departments) window.init_hr_departments();
    if (path === '/hr/department-details' && window.init_hr_department_details) window.init_hr_department_details();
    if (path === '/hr/designations' && window.init_hr_designations) window.init_hr_designations();
    if (path === '/hr/designation-details' && window.init_hr_designation_details) window.init_hr_designation_details();
    if (path === '/hr/documents' && window.init_hr_documents) window.init_hr_documents();
    if (path === '/hr/assets' && window.init_hr_assets) window.init_hr_assets();
    
    // Phase 2 Inits
    if (path === '/hr/attendance' && window.init_hr_attendance) window.init_hr_attendance();
    if (path === '/hr/team-attendance' && window.init_hr_team_attendance) window.init_hr_team_attendance();
    if (path === '/hr/attendance/exceptions' && window.init_hr_attendance_exceptions) window.init_hr_attendance_exceptions();
    if (path === '/hr/attendance/policies' && window.init_hr_attendance_policies) window.init_hr_attendance_policies();
    if (path === '/hr/attendance/analytics' && window.init_hr_attendance_analytics) window.init_hr_attendance_analytics();
    if (path === '/hr/leaves' && window.init_hr_leaves) window.init_hr_leaves();
    if (path === '/hr/leave-balances' && window.init_hr_leave_balances) window.init_hr_leave_balances();
    if (path === '/hr/shifts' && window.init_hr_shifts) window.init_hr_shifts();
    if (path === '/hr/holidays' && window.init_hr_holidays) window.init_hr_holidays();
    if (path === '/hr/calendar' && window.init_hr_calendar) window.init_hr_calendar();
    if (path === '/hr/ess' && window.init_hr_ess) window.init_hr_ess();
    if (path === '/hr/overtime' && window.init_hr_overtime) window.init_hr_overtime();
    if (path === '/hr/compoff' && window.init_hr_compoff) window.init_hr_compoff();
    
    // Phase 3 Inits
    if (path === '/hr/performance' && window.init_hr_performance) window.init_hr_performance();
    if (path === '/hr/goals' && window.init_hr_goals) window.init_hr_goals();
    if (path === '/hr/kpi' && window.init_hr_kpi) window.init_hr_kpi();
    if (path === '/hr/appraisals' && window.init_hr_appraisals) window.init_hr_appraisals();
    if (path === '/hr/feedback' && window.init_hr_feedback) window.init_hr_feedback();
    if (path === '/hr/training' && window.init_hr_training) window.init_hr_training();
    if (path === '/hr/certifications' && window.init_hr_certifications) window.init_hr_certifications();
    if (path === '/hr/skills' && window.init_hr_skills) window.init_hr_skills();
    if (path === '/hr/promotions' && window.init_hr_promotions) window.init_hr_promotions();
    if (path === '/hr/transfers' && window.init_hr_transfers) window.init_hr_transfers();
    if (path === '/hr/awards' && window.init_hr_awards) window.init_hr_awards();
    if (path === '/hr/career-path' && window.init_hr_career_path) window.init_hr_career_path();
    if (path === '/hr/succession' && window.init_hr_succession) window.init_hr_succession();
    if (path === '/hr/surveys' && window.init_hr_surveys) window.init_hr_surveys();
    if (path === '/hr/performance/analytics' && window.init_hr_performance_analytics) window.init_hr_performance_analytics();
    
    // Phase 4 Inits
    if (path === '/hr/payroll' && window.init_hr_payroll) window.init_hr_payroll();
    if (path === '/hr/claims' && window.init_hr_claims) window.init_hr_claims();
    if (path === '/hr/recruitment/jobs' && window.init_hr_jobs) window.init_hr_jobs();
    if (path === '/hr/recruitment/candidates' && window.init_hr_candidates) window.init_hr_candidates();
    if (path === '/hr/recruitment/interviews' && window.init_hr_interviews) window.init_hr_interviews();
    if (path === '/hr/onboarding' && window.init_hr_onboarding) window.init_hr_onboarding();
    if (path === '/hr/exit' && window.init_hr_exit) window.init_hr_exit();
  }
}

class UIManager {
  toggleNotificationDrawer() {
    const drawer = document.getElementById('hrNotificationDrawer');
    if (drawer.classList.contains('hidden')) {
      drawer.classList.remove('hidden');
      setTimeout(() => drawer.style.transform = 'translateX(0)', 10);
    } else {
      drawer.style.transform = 'translateX(100%)';
      setTimeout(() => drawer.classList.add('hidden'), 300);
    }
  }

  // Wizard State
  wizardStep = 1;

  openAddEmployeeWizard() {
    this.wizardStep = 1;
    this.updateWizardUI();
    const overlay = document.getElementById('hrModalOverlay');
    overlay.classList.remove('hidden');
  }

  closeAddEmployeeWizard() {
    const overlay = document.getElementById('hrModalOverlay');
    overlay.classList.add('hidden');
  }

  wizardNext() {
    if(this.wizardStep < 3) {
      this.wizardStep++;
      this.updateWizardUI();
    }
  }

  wizardPrev() {
    if(this.wizardStep > 1) {
      this.wizardStep--;
      this.updateWizardUI();
    }
  }

  wizardSubmit() {
    this.toast('Employee created successfully!', 'success');
    this.closeAddEmployeeWizard();
  }

  updateWizardUI() {
    // Hide all steps
    document.getElementById('wizardStep1').classList.add('hidden');
    document.getElementById('wizardStep2').classList.add('hidden');
    document.getElementById('wizardStep3').classList.add('hidden');
    
    // Reset indicators
    for(let i=1; i<=3; i++) {
      const ind = document.getElementById(`step${i}Indicator`);
      ind.style.color = 'var(--hr-text-muted)';
      ind.style.borderBottom = '3px solid var(--hr-border)';
    }

    // Show current step
    document.getElementById(`wizardStep${this.wizardStep}`).classList.remove('hidden');
    
    // Highlight current indicator
    const currentInd = document.getElementById(`step${this.wizardStep}Indicator`);
    currentInd.style.color = 'var(--hr-primary)';
    currentInd.style.borderBottom = '3px solid var(--hr-primary)';

    // Buttons
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    const submitBtn = document.getElementById('wizardSubmitBtn');

    if(this.wizardStep === 1) {
      prevBtn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    } else if(this.wizardStep === 2) {
      prevBtn.classList.remove('hidden');
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    } else if(this.wizardStep === 3) {
      prevBtn.classList.remove('hidden');
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    }
  }
  
  toast(message, type = 'info') {
    const container = document.getElementById('hrToastContainer');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = 'hr-card';
    let bgColor = '#FFF';
    let icon = 'ℹ️';
    
    if(type === 'success') { icon = '✅'; }
    if(type === 'error') { icon = '❌'; }
    
    toast.style.cssText = `
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      background: ${bgColor};
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      border-radius: 8px;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    toast.innerHTML = `<span style="font-size:1.25rem;">${icon}</span><span style="font-weight:500;">${message}</span>`;
    container.appendChild(toast);
    
    // Animate In
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    // Animate Out after 3s
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Command Palette
  openCommandPalette() {
    const palette = document.getElementById('hrCommandPalette');
    if(palette) {
      palette.classList.remove('hidden');
      document.getElementById('cmdSearchInput').focus();
    }
  }

  closeCommandPalette() {
    const palette = document.getElementById('hrCommandPalette');
    if(palette) palette.classList.add('hidden');
  }
}

// Global Keyboard Shortcut for Ctrl+K
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if(window.UI) window.UI.openCommandPalette();
  }
  // ESC to close
  if (e.key === 'Escape' && window.UI) {
    window.UI.closeCommandPalette();
  }
});

window.App = new AppRouter();
window.UI = new UIManager();
