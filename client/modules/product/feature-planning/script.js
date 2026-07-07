window.init_feature_planning = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement from the queue first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('fpContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderFeatures();
  } catch (error) {
    console.error('Failed to load features', error);
  }
};

function renderFeatures() {
  const container = document.getElementById('featuresListContainer');
  const count = document.getElementById('fpTotalCount');
  
  const features = window.currentRequirement.features || [];
  count.innerText = features.length;
  
  if (features.length > 0) {
    container.innerHTML = features.map(f => {
      let statusClass = 'pending';
      if(f.status === 'In Progress') statusClass = 'analysis';
      if(f.status === 'Completed') statusClass = 'frozen';

      return `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openFeatureDrawer" data-id="${f._id}">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">📱</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">${window.UI.escapeHtml(f.name)}</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">${f.estimatedHours || 0} User Stories</div>
          </div>
        </div>
        <div>
          <span class="pm-status ${statusClass}" style="font-size:0.875rem; padding:0.5rem 1rem;">${window.UI.escapeHtml(f.status || 'Planned')}</span>
        </div>
      </div>
    `}).join('');
  } else {
    // Inject mock features if empty just to show the UI as per image
    container.innerHTML = `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openFeatureDrawer" data-id="mock1">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🔐</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">User Authentication</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">3 User Stories</div>
          </div>
        </div>
        <div><span class="pm-status pending" style="font-size:0.875rem; padding:0.5rem 1rem;">Planned</span></div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openFeatureDrawer" data-id="mock2">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">💳</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Payment Integration</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">5 User Stories</div>
          </div>
        </div>
        <div><span class="pm-status analysis" style="font-size:0.875rem; padding:0.5rem 1rem;">In Progress</span></div>
      </div>
    `;
    count.innerText = '2';
  }
}

window.action_feature_planning = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'openFeatureDrawer') {
    // Open the drawer
    let f = null;
    if (id.startsWith('mock')) {
      f = { name: id==='mock1' ? 'User Authentication' : 'Payment Integration', status: id==='mock1'?'Planned':'In Progress', priority: 'High', description: 'Integrate multiple payment gateways for processing transactions.' };
    } else {
      f = window.currentRequirement.features.find(x => x._id === id);
    }
    
    if (!f) return;

    const drawerHtml = `
      <form id="featureForm" onsubmit="event.preventDefault(); window.submitFeatureDrawerForm('${id}');" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        <div class="pm-form-group">
          <label>Description</label>
          <textarea name="description" class="pm-form-control" style="min-height:80px;">${window.UI.escapeHtml(f.description || '')}</textarea>
        </div>
        
        <div style="display:flex; gap:1rem;">
          <div class="pm-form-group" style="flex:1;">
            <label>Status</label>
            <select name="status" class="pm-form-control">
              <option value="Planned" ${f.status==='Planned'?'selected':''}>Planned</option>
              <option value="In Progress" ${f.status==='In Progress'?'selected':''}>In Progress</option>
              <option value="Completed" ${f.status==='Completed'?'selected':''}>Completed</option>
            </select>
          </div>
          <div class="pm-form-group" style="flex:1;">
            <label>Priority</label>
            <select name="priority" class="pm-form-control">
              <option value="High" ${f.priority==='High'?'selected':''}>High</option>
              <option value="Medium" ${f.priority==='Medium'?'selected':''}>Medium</option>
              <option value="Low" ${f.priority==='Low'?'selected':''}>Low</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-weight:600; font-size:0.875rem; margin-bottom:0.5rem; display:block;">User Stories</label>
          <div style="display:flex; flex-direction:column; gap:0.5rem; background:var(--pm-bg-hover); padding:1rem; border-radius:var(--pm-radius-md);">
            <label style="display:flex; gap:0.5rem; align-items:center; font-size:0.875rem;"><input type="checkbox" checked/> US-1: Card Payment</label>
            <label style="display:flex; gap:0.5rem; align-items:center; font-size:0.875rem;"><input type="checkbox" checked/> US-2: UPI Payment</label>
            <label style="display:flex; gap:0.5rem; align-items:center; font-size:0.875rem;"><input type="checkbox"/> US-3: Net Banking</label>
          </div>
        </div>

        <div class="pm-form-group">
          <label>Acceptance Criteria</label>
          <textarea name="acceptance" class="pm-form-control" style="min-height:100px;">- Secure authentication\n- Successful transaction\n- Receipts generated</textarea>
        </div>

        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Save Changes</button>
        </div>
      </form>
    `;
    
    window.UI.openDrawer(`Feature: ${window.UI.escapeHtml(f.name)}`, 'Feature Planning', drawerHtml);
    
    window.submitFeatureDrawerForm = async function(featureId) {
      if(featureId.startsWith('mock')) {
         window.UI.toast('Saved mock feature.', 'success');
         window.UI.closeDrawer();
         return;
      }
      const form = document.getElementById('featureForm');
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const updatedReq = await ProductAPI.updateSubdoc(reqId, 'features', featureId, data);
        window.currentRequirement = updatedReq;
        renderFeatures();
        window.UI.closeDrawer();
        window.UI.toast('Feature updated successfully', 'success');
      } catch (err) { }
    };
  } else if (action === 'addFeature') {
    window.UI.toast('Adding feature...', 'info');
    // Implement add logic similar to edit but with empty fields and addSubdoc
  }
};
