window.init_freeze = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    
    document.getElementById('freezeStatePending').classList.add('hidden');
    document.getElementById('freezeStateFrozen').classList.add('hidden');
    document.getElementById('freezeStateProject').classList.add('hidden');

    if (requirement.status === 'Project Created') {
      document.getElementById('freezeStateProject').classList.remove('hidden');
    } else if (requirement.status === 'Frozen') {
      document.getElementById('freezeStateFrozen').classList.remove('hidden');
    } else {
      document.getElementById('freezeStatePending').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Failed to load requirement for freeze', error);
  }
};

window.action_freeze = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'executeFreeze') {
    if (confirm('Are you absolutely sure you want to freeze this requirement? This action cannot be undone.')) {
      try {
        const result = await ProductAPI.freezeRequirement(reqId);
        window.UI.toast('Requirement Frozen successfully.', 'success');
        window.init_freeze(); // re-init view
      } catch (error) { }
    }
  }
  
  if (action === 'generateProject') {
    if (confirm('Generate an actionable project for the Project Manager?')) {
      try {
        const result = await ProductAPI.generateProject(reqId);
        window.UI.toast('Project Generated successfully!', 'success');
        window.init_freeze(); // re-init view
      } catch (error) { }
    }
  }
  
  if (action === 'goToAssignment') {
    window.App.navigate('/product-manager/pm-assignment');
  }
};
