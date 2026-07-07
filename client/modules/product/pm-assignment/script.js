window.init_pm_assignment = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    
    document.getElementById('assignReqTitle').value = requirement.title || '';
    document.getElementById('assignProjectId').value = requirement.projectId || 'Not Generated Yet';
    
    // Fetch users with role MANAGER
    const response = await fetch('/api/users');
    const result = await response.json();
    const managers = (result.data || []).filter(u => (u.role || '').toUpperCase() === 'MANAGER');
    
    const select = document.getElementById('assignPMSelect');
    if (managers.length > 0) {
      select.innerHTML = '<option value="" disabled selected>Select a Manager</option>' + 
        managers.map(m => `<option value="${m._id}">${window.UI.escapeHtml(m.name)}</option>`).join('');
    } else {
      select.innerHTML = '<option value="" disabled selected>No Project Managers Found</option>';
    }

    if (requirement.assignedPm) {
      select.value = requirement.assignedPm._id || requirement.assignedPm;
    }
  } catch (error) {
    console.error('Failed to load for assignment', error);
  }
};

window.submitPMAssignment = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  const pmId = document.getElementById('assignPMSelect').value;
  
  if (!pmId) return window.UI.toast('Please select a PM.', 'error');
  
  try {
    await ProductAPI.assignPM(reqId, pmId);
    window.UI.toast('Project Manager Assigned Successfully. Hand-off complete.', 'success');
  } catch (err) { }
};

window.action_pm_assignment = function() {};
