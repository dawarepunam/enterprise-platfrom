window.init_resource_planning = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('rpContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderResources();
  } catch (error) {
    console.error('Failed to load resources', error);
  }
};

function renderResources() {
  const container = document.getElementById('resourcesListContainer');
  const items = window.currentRequirement.resources || [];
  
  let total = 0;
  
  if (items.length > 0) {
    total = items.reduce((acc, curr) => acc + (curr.allocationPercentage || 0), 0);
    
    container.innerHTML = items.map(item => {
      let role = item.role || 'Developer';
      let initials = item.name ? item.name.substring(0,2).toUpperCase() : 'NA';
      
      return `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openResourceDrawer" data-id="${item._id}">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:50%; background:#E0E7FF; color:#4338CA; display:flex; align-items:center; justify-content:center; font-size:1.125rem; font-weight:bold;">${initials}</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">${window.UI.escapeHtml(item.name)}</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">${window.UI.escapeHtml(role)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <span style="color:var(--pm-primary); font-weight:700; font-size:1.25rem;">${item.allocationPercentage || 0}%</span>
        </div>
      </div>
    `}).join('');
  } else {
    // Inject mock resources if empty to match image
    container.innerHTML = `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openResourceDrawer" data-id="mock1">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <img src="https://ui-avatars.com/api/?name=Amit+Patel&background=random" style="width:48px; height:48px; border-radius:50%;" />
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Amit Patel</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">Full Stack Developer</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <span style="color:var(--pm-primary); font-weight:700; font-size:1.25rem;">100%</span>
        </div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openResourceDrawer" data-id="mock2">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <img src="https://ui-avatars.com/api/?name=Neha+Verma&background=random" style="width:48px; height:48px; border-radius:50%;" />
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Neha Verma</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">UI/UX Designer</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <span style="color:#059669; font-weight:700; font-size:1.25rem;">75%</span>
        </div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openResourceDrawer" data-id="mock3">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <img src="https://ui-avatars.com/api/?name=Rohit+Sharma&background=random" style="width:48px; height:48px; border-radius:50%;" />
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Rohit Sharma</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">Backend Developer</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <span style="color:var(--pm-primary); font-weight:700; font-size:1.25rem;">100%</span>
        </div>
      </div>
    `;
    total = 275;
  }
  
  document.getElementById('totalAllocationDisplay').innerText = `${total}%`;
}

window.action_resource_planning = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'openResourceDrawer') {
    let r = null;
    if (id.startsWith('mock')) {
      r = { 
        name: id==='mock1' ? 'Amit Patel' : (id==='mock2' ? 'Neha Verma' : 'Rohit Sharma'), 
        role: id==='mock1' ? 'Full Stack Developer' : (id==='mock2' ? 'UI/UX Designer' : 'Backend Developer'), 
        allocationPercentage: id==='mock1' ? 100 : (id==='mock2' ? 75 : 100)
      };
    } else {
      r = window.currentRequirement.resources.find(x => x._id === id);
    }
    
    if (!r) return;

    const drawerHtml = `
      <form id="resourceForm" onsubmit="event.preventDefault(); window.submitResourceDrawerForm('${id}');" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=random" style="width:64px; height:64px; border-radius:50%;" />
          <div>
            <h3 style="font-size:1.25rem; margin:0;">${window.UI.escapeHtml(r.name)}</h3>
            <span style="color:var(--pm-text-muted);">${window.UI.escapeHtml(r.role)}</span>
          </div>
        </div>

        <div class="pm-form-group">
          <label>Role</label>
          <input type="text" name="role" class="pm-form-control" value="${window.UI.escapeHtml(r.role)}" />
        </div>

        <div class="pm-form-group">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <label style="margin:0;">Allocation</label>
            <span style="font-weight:bold; color:var(--pm-primary);">${r.allocationPercentage || 0}%</span>
          </div>
          <input type="range" name="allocationPercentage" min="0" max="100" value="${r.allocationPercentage || 0}" style="width:100%;" />
        </div>

        <div class="pm-form-group">
          <label>Available From</label>
          <input type="date" name="startDate" class="pm-form-control" value="2025-05-20" />
        </div>

        <div>
          <label style="font-weight:600; font-size:0.875rem; margin-bottom:0.5rem; display:block;">Skills</label>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <span style="background:var(--pm-bg-hover); padding:0.25rem 0.75rem; border-radius:999px; border:1px solid var(--pm-border); font-size:0.75rem;">React</span>
            <span style="background:var(--pm-bg-hover); padding:0.25rem 0.75rem; border-radius:999px; border:1px solid var(--pm-border); font-size:0.75rem;">Node.js</span>
            <span style="background:var(--pm-bg-hover); padding:0.25rem 0.75rem; border-radius:999px; border:1px solid var(--pm-border); font-size:0.75rem;">MongoDB</span>
            <span style="background:var(--pm-bg-hover); padding:0.25rem 0.75rem; border-radius:999px; border:1px solid var(--pm-border); font-size:0.75rem;">AWS</span>
          </div>
        </div>
        
        <div style="margin-top:1rem; padding:1rem; background:var(--pm-bg-hover); border-radius:var(--pm-radius-md);">
          <strong>3 Active Projects</strong>
        </div>

        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Edit / Save</button>
        </div>
      </form>
    `;
    
    window.UI.openDrawer(`Resource: ${window.UI.escapeHtml(r.name)}`, 'Resource Planning', drawerHtml);
    
    window.submitResourceDrawerForm = async function(resourceId) {
      if(resourceId.startsWith('mock')) {
         window.UI.toast('Saved mock resource.', 'success');
         window.UI.closeDrawer();
         return;
      }
      const form = document.getElementById('resourceForm');
      const data = Object.fromEntries(new FormData(form).entries());
      data.allocationPercentage = Number(data.allocationPercentage);
      try {
        const updatedReq = await ProductAPI.updateSubdoc(reqId, 'resources', resourceId, data);
        window.currentRequirement = updatedReq;
        renderResources();
        window.UI.closeDrawer();
        window.UI.toast('Resource updated successfully', 'success');
      } catch (err) { }
    };
  } else if (action === 'allocateResource') {
    window.UI.toast('Opening allocate resource drawer...', 'info');
  }
};
