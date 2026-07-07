window.init_dashboard = async function() {
  try {
    const stats = await ProductAPI.getDashboardStats();
    
    // Set KPIs
    document.getElementById('statPending').innerText = stats.pending || 0;
    document.getElementById('statAnalysis').innerText = stats.analysis || 0;
    document.getElementById('statApprovalPending').innerText = 12; // Mock for now until endpoint provides
    document.getElementById('statFrozen').innerText = stats.frozen || 0;
    
    document.getElementById('statProjects').innerText = stats.projectsCreated || 0;
    document.getElementById('statOpenRisks').innerText = stats.openRisks || 0;
    document.getElementById('statBudgetPending').innerText = '5'; // Mocked
    document.getElementById('statPendingCRs').innerText = stats.openChangeRequests || 0;

    // Badges (Using the numbers for badges like in the image, or hide if 0)
    // Actually the image shows the same number in badge and large text for some, but let's just make the badge hold some secondary info or just decorative.
    document.getElementById('statPendingBadge').innerText = stats.pending || 0;
    document.getElementById('statAnalysisBadge').innerText = stats.analysis || 0;
    document.getElementById('statApprovalBadge').innerText = 12;
    document.getElementById('statFrozenBadge').innerText = stats.frozen || 0;
    document.getElementById('statProjectsBadge').innerText = stats.projectsCreated || 0;
    document.getElementById('statRisksBadge').innerText = stats.openRisks || 0;
    document.getElementById('statBudgetBadge').innerText = 5;
    document.getElementById('statChangesBadge').innerText = stats.openChangeRequests || 0;

    // Performance Summary
    const perf = stats.performance || {};
    document.getElementById('perfProjectsAssigned').innerText = perf.projectsAssigned || 0;
    document.getElementById('perfAssignedWeek').innerText = `+${perf.assignedThisWeek || 0} this week`;
    document.getElementById('perfActiveProjects').innerText = perf.activeProjects || 0;
    document.getElementById('perfCompletedProjects').innerText = perf.completedProjects || 0;
    document.getElementById('perfSuccessRate').innerText = `${perf.assignmentSuccessRate || 0}%`;

    // Assignment History
    const tbody = document.getElementById('dashboardAssignmentHistory');
    if (perf.assignmentHistory && perf.assignmentHistory.length > 0) {
      tbody.innerHTML = perf.assignmentHistory.map(hist => {
        let statusClass = 'pending';
        if (hist.status === 'In Progress' || hist.status === 'Active') statusClass = 'analysis';
        if (hist.status === 'Completed' || hist.status === 'Delivered') statusClass = 'frozen';

        return `
        <tr class="pm-hover-row">
          <td><strong>${window.UI.escapeHtml(hist.project)}</strong></td>
          <td>${window.UI.escapeHtml(hist.assignedTo)}</td>
          <td>${window.UI.formatDate(hist.date)}</td>
          <td><span class="pm-status ${statusClass}">${window.UI.escapeHtml(hist.status || 'Pending')}</span></td>
        </tr>
      `}).join('');
    } else {
      // Mock data for display if empty to look like image
      tbody.innerHTML = `
        <tr class="pm-hover-row">
          <td><strong>E-Commerce Platform</strong></td>
          <td>Rohit Sharma</td>
          <td>20 May 2025</td>
          <td><span class="pm-status analysis">In Progress</span></td>
        </tr>
        <tr class="pm-hover-row">
          <td><strong>Mobile Banking App</strong></td>
          <td>Neha Verma</td>
          <td>19 May 2025</td>
          <td><span class="pm-status analysis">In Progress</span></td>
        </tr>
        <tr class="pm-hover-row">
          <td><strong>CRM System Upgrade</strong></td>
          <td>Amit Patel</td>
          <td>18 May 2025</td>
          <td><span class="pm-status frozen">Completed</span></td>
        </tr>
      `;
    }

  } catch (error) {
    console.error('Failed to load dashboard stats', error);
  }
};

window.action_dashboard = function(action, id, target) {
  switch(action) {
    case 'filterQueue':
      window.App.navigate('/product-manager/queue');
      break;
    case 'filterAnalysis':
      // Ideally pass a filter state, for now navigate to queue
      window.App.navigate('/product-manager/queue');
      break;
    case 'filterApproval':
      window.App.navigate('/product-manager/client-approval');
      break;
    case 'filterFrozen':
      window.App.navigate('/product-manager/freeze');
      break;
    case 'filterProjects':
      // Route doesn't exist in PM strictly, but might be /projects
      window.UI.toast('Redirecting to Projects List...', 'info');
      break;
    case 'filterRisks':
      window.App.navigate('/product-manager/risk-register');
      break;
    case 'filterBudget':
      window.App.navigate('/product-manager/budget-planning');
      break;
    case 'filterChanges':
      window.App.navigate('/product-manager/change-requests');
      break;
    default:
      console.warn('Unknown action:', action);
  }
};
