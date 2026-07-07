window.init_dependency_center = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    renderDependencies();
  } catch (error) {
    console.error('Failed to load dependencies', error);
  }
};

function renderDependencies() {
  const tbody = document.getElementById('dependencyTableBody');
  const items = window.currentRequirement.dependencies || [];
  const features = window.currentRequirement.features || [];
  
  if (items.length > 0) {
    tbody.innerHTML = items.map(item => {
      const source = features.find(f => f._id === item.sourceFeatureId) || { name: 'Unknown' };
      const target = features.find(f => f._id === item.targetFeatureId) || { name: 'Unknown' };
      return `
        <tr>
          <td><strong>${window.UI.escapeHtml(source.name)}</strong></td>
          <td><span class="pm-status" style="background:#E5E7EB;color:#374151;">${window.UI.escapeHtml(item.type)}</span></td>
          <td><strong>${window.UI.escapeHtml(target.name)}</strong></td>
          <td>
            <button class="pm-btn danger" data-action="deleteDependency" data-id="${item._id}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No dependencies mapped yet.</td></tr>';
  }
}

window.action_dependency_center = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');
  const features = window.currentRequirement.features || [];

  if (action === 'addDependency') {
    if (features.length < 2) {
      return window.UI.toast('You need at least 2 features to map a dependency.', 'warning');
    }

    const featureOptions = features.map(f => `<option value="${f._id}">${window.UI.escapeHtml(f.name)}</option>`).join('');

    window.UI.openModal('Add Dependency', `
      <form id="dependencyForm" onsubmit="event.preventDefault(); window.submitDependencyForm();">
        <div class="pm-form-group">
          <label>Source Feature</label>
          <select name="sourceFeatureId" class="pm-form-control" required>
            <option value="" disabled selected>Select Source</option>
            ${featureOptions}
          </select>
        </div>
        <div class="pm-form-group">
          <label>Dependency Type</label>
          <select name="type" class="pm-form-control">
            <option value="Blocks">Blocks</option>
            <option value="Is Blocked By">Is Blocked By</option>
            <option value="Relates To">Relates To</option>
          </select>
        </div>
        <div class="pm-form-group">
          <label>Target Feature</label>
          <select name="targetFeatureId" class="pm-form-control" required>
            <option value="" disabled selected>Select Target</option>
            ${featureOptions}
          </select>
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button type="submit" class="pm-btn primary">Save Dependency</button>
        </div>
      </form>
    `);
    
    window.submitDependencyForm = async function() {
      const form = document.getElementById('dependencyForm');
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.sourceFeatureId === data.targetFeatureId) {
        return window.UI.toast('Source and Target cannot be the same', 'error');
      }
      try {
        const updatedReq = await ProductAPI.addSubdoc(reqId, 'dependencies', data);
        window.currentRequirement = updatedReq;
        renderDependencies();
        window.UI.closeModal();
        window.UI.toast('Dependency added', 'success');
      } catch (err) { }
    };
  }
  
  if (action === 'deleteDependency') {
    if (confirm('Delete this dependency?')) {
      try {
        const updatedReq = await ProductAPI.deleteSubdoc(reqId, 'dependencies', id);
        window.currentRequirement = updatedReq;
        renderDependencies();
        window.UI.toast('Dependency deleted', 'info');
      } catch (err) { }
    }
  }
};
