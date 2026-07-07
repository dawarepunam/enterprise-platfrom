window.currentRequirementId = null;

window.init_workspace = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('No requirement selected.', 'error');
    window.App.navigate('/product-manager/queue');
    return;
  }
  
  window.currentRequirementId = reqId;

  try {
    const req = await ProductAPI.getRequirement(reqId);
    if (!req) throw new Error('Not found');

    const reqIdStr = `REQ-${req._id.substring(req._id.length - 4).toUpperCase()}`;
    const titleStr = req.title || req.company + ' Requirement';
    document.getElementById('wsTitle').innerText = `${reqIdStr} - ${titleStr}`;
    
    // Header Status Badge
    let statusClass = 'pending';
    if(req.status === 'Analysis' || req.status === 'Under Analysis') statusClass = 'analysis';
    if(req.status === 'Frozen' || req.status === 'Project Created') statusClass = 'frozen';
    document.getElementById('wsStatusBadge').className = `pm-status ${statusClass}`;
    document.getElementById('wsStatusBadge').innerText = req.status || 'New';

    // Button Toggles
    const btnFreeze = document.getElementById('btnFreezeReq');
    const btnGen = document.getElementById('btnGenProject');
    if (btnFreeze && btnGen) {
      if (req.status === 'Frozen') {
        btnFreeze.classList.add('hidden');
        btnGen.classList.remove('hidden');
      } else if (req.status === 'Project Created') {
        btnFreeze.classList.add('hidden');
        btnGen.classList.add('hidden');
      } else {
        btnFreeze.classList.remove('hidden');
        btnGen.classList.add('hidden');
      }
    }

    // Left Pane Details
    document.getElementById('wsClient').innerText = req.client || req.company || '-';
    document.getElementById('wsDept').innerText = req.department || '-';
    document.getElementById('wsPriorityStr').innerText = req.priority || 'Medium';
    
    let prioColor = '#D97706';
    if(req.priority === 'High' || req.priority === 'Critical') prioColor = '#DC2626';
    if(req.priority === 'Low') prioColor = '#059669';
    document.getElementById('wsPriorityStr').style.color = prioColor;

    // Computed totals
    const totalBudget = req.budgetItems ? req.budgetItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0) : 0;
    document.getElementById('wsBudgetStr').innerText = totalBudget > 0 ? window.UI.formatCurrency(totalBudget) : '-';
    
    const totalTimeline = req.timelinePhases ? req.timelinePhases.reduce((acc, curr) => acc + (curr.durationDays || 0), 0) : 0;
    document.getElementById('wsTimelineStr').innerText = totalTimeline > 0 ? `${totalTimeline} Days` : '-';
    
    document.getElementById('wsOwnerStr').innerText = req.assignedPm ? req.assignedPm.name : 'Unassigned';
    document.getElementById('wsStatusStr').innerText = req.status || 'New';
    document.getElementById('wsCreatedOn').innerText = window.UI.formatDate(req.createdAt);
    
    // Middle Pane Texts
    document.getElementById('wsBusinessReq').value = req.businessRequirements || '';
    document.getElementById('wsFunctionalReq').value = req.functionalRequirements || '';
    document.getElementById('wsAcceptanceCriteria').value = req.acceptanceCriteria || '';

    // Right Pane Activity Feed
    const feedContainer = document.getElementById('wsActivityFeed');
    if (req.auditLog && req.auditLog.length > 0) {
      // Sort desc
      const sortedLog = [...req.auditLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
      
      feedContainer.innerHTML = sortedLog.map(log => {
        // Initials avatar
        const initials = log.user ? log.user.substring(0, 2).toUpperCase() : 'SY';
        return `
        <div style="display:flex; gap:1rem; align-items:flex-start;">
          <div style="width:32px; height:32px; border-radius:50%; background:var(--pm-bg-hover); color:var(--pm-text-muted); display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:bold; border:1px solid var(--pm-border); flex-shrink:0;">${initials}</div>
          <div style="flex:1;">
            <div style="font-size:0.875rem; font-weight:600; color:var(--pm-text-main);">${window.UI.escapeHtml(log.user)}</div>
            <div style="font-size:0.75rem; color:var(--pm-text-muted);">${window.UI.escapeHtml(log.action)}</div>
            <div style="font-size:0.7rem; color:var(--pm-text-muted); margin-top:0.25rem;">${window.UI.formatDate(log.timestamp)}</div>
          </div>
        </div>
        `;
      }).join('');
    } else {
      feedContainer.innerHTML = '<div style="text-align:center; color:var(--pm-text-muted);">No activity logged yet.</div>';
    }

  } catch (error) {
    console.error('Failed to load requirement', error);
  }

  // Wire up tabs
  setTimeout(() => {
    document.querySelectorAll('.pm-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = e.target.getAttribute('data-tab');
        if (tabName !== 'overview') {
          // Map tab names to route paths
          const routeMap = {
            'features': 'feature-planning',
            'budget': 'budget-planning',
            'timeline': 'timeline-planning',
            'resources': 'resource-planning',
            'risks': 'risk-register',
            'stakeholders': 'stakeholders',
            'documents': 'documents',
            'meetings': 'meetings'
          };
          if (routeMap[tabName]) {
            window.App.navigate(`/product-manager/${routeMap[tabName]}`);
          } else {
            window.UI.toast(`${tabName} tab is coming soon.`, 'info');
          }
        }
      });
    });
  }, 100);
};

window.action_workspace = async function(action, id, target) {
  if (action === 'saveCoreReq') {
    try {
      const data = {
        businessRequirements: document.getElementById('wsBusinessReq').value,
        functionalRequirements: document.getElementById('wsFunctionalReq').value,
        acceptanceCriteria: document.getElementById('wsAcceptanceCriteria').value,
      };
      
      await ProductAPI.updateRequirement(window.currentRequirementId, data);
      window.UI.toast('Core requirements saved.', 'success');
      window.init_workspace();
    } catch (error) {
      console.error(error);
    }
  } else if (action === 'freezeReq') {
    if (confirm('Are you sure you want to freeze this requirement? Changes will require a Change Request.')) {
      try {
        await ProductAPI.freezeRequirement(window.currentRequirementId);
        window.UI.toast('Requirement Frozen successfully.', 'success');
        window.init_workspace();
      } catch (err) {
        window.UI.toast('Failed to freeze: ' + err.message, 'error');
      }
    }
  } else if (action === 'assignPM') {
    const pmId = prompt("Enter the ID of the Project Manager to assign:");
    if (pmId) {
      try {
        await ProductAPI.assignPM(window.currentRequirementId, pmId);
        window.UI.toast('PM Assigned successfully.', 'success');
        window.init_workspace();
      } catch (err) {
        window.UI.toast('Failed to assign PM: ' + err.message, 'error');
      }
    }
  } else if (action === 'approveReq') {
    if (confirm('Approve and send to next phase?')) {
      try {
        await ProductAPI.updateRequirement(window.currentRequirementId, { status: 'Planning' });
        window.UI.toast('Requirement Approved.', 'success');
        window.init_workspace();
      } catch(err) {
        window.UI.toast('Failed to approve: ' + err.message, 'error');
      }
    }
  } else if (action === 'rejectReq') {
    if (confirm('Reject requirement?')) {
      try {
        await ProductAPI.updateRequirement(window.currentRequirementId, { status: 'Rejected' });
        window.UI.toast('Requirement Rejected.', 'success');
        window.init_workspace();
      } catch(err) {}
    }
  } else if (action === 'clarification') {
    window.UI.toast('Clarification thread opened.', 'info');
  } else if (action === 'generateProject') {
    if (confirm('Convert this Frozen Requirement into a live Project?')) {
      try {
        await ProductAPI.generateProject(window.currentRequirementId);
        window.UI.toast('Project Generated Successfully! Handed over to PMO.', 'success');
        window.init_workspace();
      } catch(err) {
        window.UI.toast('Failed to generate project: ' + err.message, 'error');
      }
    }
  }
};
