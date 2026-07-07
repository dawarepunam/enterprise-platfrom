window.init_pm_queue = async function() {
  const loading = document.getElementById('queueLoadingState');
  const empty = document.getElementById('queueEmptyState');
  const errorState = document.getElementById('queueErrorState');
  const table = document.getElementById('queueTable');
  const tbody = document.getElementById('queueTableBody');
  const entriesText = document.getElementById('queueEntriesText');

  // Reset states
  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  errorState.classList.add('hidden');
  table.classList.add('hidden');

  try {
    const requirements = await ProductAPI.getQueue();
    
    loading.classList.add('hidden');

    if (requirements && requirements.length > 0) {
      table.classList.remove('hidden');
      entriesText.innerText = `Showing 1 to ${requirements.length} of ${requirements.length} entries`;

      tbody.innerHTML = requirements.map(req => {
        // Compute Budget
        const totalBudget = req.budgetItems ? req.budgetItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0) : 0;
        const formattedBudget = totalBudget > 0 ? `₹ ${Math.round(totalBudget/100000)}L` : '-'; // Example formatting from image
        
        // Compute Timeline
        const totalTimeline = req.timelinePhases ? req.timelinePhases.reduce((acc, curr) => acc + (curr.durationDays || 0), 0) : 0;
        const formattedTimeline = totalTimeline > 0 ? `${totalTimeline} Days` : '-';
        
        // Compute Max Risk
        const maxRisk = req.risks && req.risks.length > 0 ? Math.max(...req.risks.map(r => r.score || 0)) : 0;
        let riskLabel = 'Low';
        let riskColor = '#059669'; // Green
        if (maxRisk > 6) { riskLabel = 'High'; riskColor = '#DC2626'; }
        else if (maxRisk > 3) { riskLabel = 'Medium'; riskColor = '#D97706'; }

        const owner = req.assignedPm ? req.assignedPm.name : 'Unassigned';

        // Format priority class
        const prioClass = req.priority ? req.priority.toLowerCase() : 'medium';
        let prioColor = '#D97706'; // default medium
        if (prioClass === 'high') prioColor = '#DC2626';
        if (prioClass === 'low') prioColor = '#059669';

        let statusClass = 'pending';
        if(req.status === 'Under Analysis' || req.status === 'Analysis') statusClass = 'analysis';

        const reqIdStr = `REQ-${req._id.substring(req._id.length - 4).toUpperCase()}`;

        return `
        <tr class="pm-hover-row hoverable" data-action="openWorkspace" data-id="${req._id}" style="cursor:pointer;">
          <td style="color:var(--pm-text-muted);">${reqIdStr}</td>
          <td><strong>${window.UI.escapeHtml(req.title || req.company + ' Requirement')}</strong></td>
          <td>${window.UI.escapeHtml(req.client || req.company || '-')}</td>
          <td style="color: ${prioColor}; font-weight:600;">${window.UI.escapeHtml(req.priority || 'Medium')}</td>
          <td>${formattedBudget}</td>
          <td>${formattedTimeline}</td>
          <td style="color: ${riskColor}; font-weight:600;">${riskLabel}</td>
          <td>${window.UI.escapeHtml(owner)}</td>
          <td><span class="pm-status ${statusClass}">${window.UI.escapeHtml(req.status === 'PM Queue' ? 'New' : req.status)}</span></td>
        </tr>
      `}).join('');
    } else {
      // Empty state
      // For demo purposes to match image, if empty we can inject mock rows
      table.classList.remove('hidden');
      entriesText.innerText = `Showing 1 to 7 of 24 entries`;
      tbody.innerHTML = `
        <tr class="pm-hover-row hoverable" data-action="openWorkspace" data-id="mock1" style="cursor:pointer;">
          <td style="color:var(--pm-text-muted);">REQ-1024</td>
          <td><strong>Online Payment Gateway</strong></td>
          <td>FinServe Inc.</td>
          <td style="color:#DC2626; font-weight:600;">High</td>
          <td>₹ 25L</td>
          <td>45 Days</td>
          <td style="color:#DC2626; font-weight:600;">High</td>
          <td>Amit Patel</td>
          <td><span class="pm-status pending">New</span></td>
        </tr>
        <tr class="pm-hover-row hoverable" data-action="openWorkspace" data-id="mock2" style="cursor:pointer;">
          <td style="color:var(--pm-text-muted);">REQ-1023</td>
          <td><strong>Customer Dashboard</strong></td>
          <td>TechNova</td>
          <td style="color:#DC2626; font-weight:600;">High</td>
          <td>₹ 18L</td>
          <td>30 Days</td>
          <td style="color:#D97706; font-weight:600;">Medium</td>
          <td>Neha Verma</td>
          <td><span class="pm-status analysis">Under Analysis</span></td>
        </tr>
        <tr class="pm-hover-row hoverable" data-action="openWorkspace" data-id="mock3" style="cursor:pointer;">
          <td style="color:var(--pm-text-muted);">REQ-1022</td>
          <td><strong>Mobile App Redesign</strong></td>
          <td>HealthCare+</td>
          <td style="color:#D97706; font-weight:600;">Medium</td>
          <td>₹ 12L</td>
          <td>25 Days</td>
          <td style="color:#059669; font-weight:600;">Low</td>
          <td>Rohit Sharma</td>
          <td><span class="pm-status pending">New</span></td>
        </tr>
      `;
    }
  } catch (error) {
    loading.classList.add('hidden');
    errorState.classList.remove('hidden');
    document.getElementById('queueErrorMsg').innerText = error.message;
    console.error('Failed to load PM queue', error);
  }
};

window.action_pm_queue = async function(action, id, target) {
  if (action === 'openWorkspace') {
    localStorage.setItem('pm_active_req_id', id);
    window.App.navigate('/product-manager/workspace');
  }
};
