window.init_stakeholders = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('stContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderStakeholders();
  } catch (error) {
    console.error('Failed to load stakeholders', error);
  }
};

function renderStakeholders() {
  const container = document.getElementById('stakeholdersListContainer');
  const count = document.getElementById('stTotalCount');
  
  // Create mock stakeholders if empty
  let items = window.currentRequirement.stakeholders || [];
  if (items.length === 0) {
    items = [
      { _id: 'mock1', name: 'Rajiv Sharma', title: 'VP of Engineering', email: 'rajiv.s@finserve.com', role: 'Decision Maker', department: 'Engineering' },
      { _id: 'mock2', name: 'Anjali Desai', title: 'Head of Product', email: 'anjali.d@finserve.com', role: 'Business Sponsor', department: 'Product' }
    ];
  }
  
  count.innerText = items.length;
  
  container.innerHTML = items.map(s => {
    let roleClass = 'pending';
    if(s.role === 'Decision Maker') roleClass = 'frozen';
    if(s.role === 'Business Sponsor') roleClass = 'analysis';

    return `
    <div class="pm-card hoverable" style="display:flex; flex-direction:column; gap:1rem; cursor:pointer;" data-action="openStakeholderDrawer" data-id="${s._id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random" style="width:48px; height:48px; border-radius:50%;" />
        <span class="pm-status ${roleClass}" style="font-size:0.75rem;">${window.UI.escapeHtml(s.role)}</span>
      </div>
      <div>
        <h4 style="font-size:1.125rem; font-weight:700; margin:0; color:var(--pm-text-main);">${window.UI.escapeHtml(s.name)}</h4>
        <div style="font-size:0.875rem; color:var(--pm-text-muted);">${window.UI.escapeHtml(s.title || '')}</div>
      </div>
      <div style="font-size:0.875rem; color:var(--pm-text-muted); border-top:1px solid var(--pm-border); padding-top:1rem; display:flex; flex-direction:column; gap:0.25rem;">
        <div style="display:flex; gap:0.5rem;"><span style="width:20px;">📧</span> ${window.UI.escapeHtml(s.email || '-')}</div>
        <div style="display:flex; gap:0.5rem;"><span style="width:20px;">🏢</span> ${window.UI.escapeHtml(s.department || '-')}</div>
      </div>
    </div>
  `}).join('');
}

window.action_stakeholders = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'openStakeholderDrawer') {
    let s = null;
    if (id.startsWith('mock')) {
      s = { 
        name: id==='mock1' ? 'Rajiv Sharma' : 'Anjali Desai', 
        title: id==='mock1' ? 'VP of Engineering' : 'Head of Product', 
        email: id==='mock1' ? 'rajiv.s@finserve.com' : 'anjali.d@finserve.com',
        role: id==='mock1' ? 'Decision Maker' : 'Business Sponsor',
        department: id==='mock1' ? 'Engineering' : 'Product'
      };
    } else {
      s = window.currentRequirement.stakeholders.find(x => x._id === id);
    }
    
    if (!s) return;

    const drawerHtml = `
      <form id="stakeholderForm" onsubmit="event.preventDefault(); window.submitStakeholderDrawerForm('${id}');" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random" style="width:64px; height:64px; border-radius:50%;" />
          <div>
            <h3 style="font-size:1.25rem; margin:0;">${window.UI.escapeHtml(s.name)}</h3>
            <span style="color:var(--pm-text-muted);">${window.UI.escapeHtml(s.title)}</span>
          </div>
        </div>

        <div style="display:flex; gap:1rem;">
          <div class="pm-form-group" style="flex:1;">
            <label>Name</label>
            <input type="text" name="name" class="pm-form-control" value="${window.UI.escapeHtml(s.name)}" />
          </div>
          <div class="pm-form-group" style="flex:1;">
            <label>Title</label>
            <input type="text" name="title" class="pm-form-control" value="${window.UI.escapeHtml(s.title)}" />
          </div>
        </div>

        <div style="display:flex; gap:1rem;">
          <div class="pm-form-group" style="flex:1;">
            <label>Role in Project</label>
            <select name="role" class="pm-form-control">
              <option value="Decision Maker" ${s.role==='Decision Maker'?'selected':''}>Decision Maker</option>
              <option value="Business Sponsor" ${s.role==='Business Sponsor'?'selected':''}>Business Sponsor</option>
              <option value="Subject Matter Expert" ${s.role==='Subject Matter Expert'?'selected':''}>Subject Matter Expert</option>
            </select>
          </div>
          <div class="pm-form-group" style="flex:1;">
            <label>Department</label>
            <input type="text" name="department" class="pm-form-control" value="${window.UI.escapeHtml(s.department || '')}" />
          </div>
        </div>

        <div class="pm-form-group">
          <label>Email</label>
          <input type="email" name="email" class="pm-form-control" value="${window.UI.escapeHtml(s.email || '')}" />
        </div>

        <div class="pm-form-group">
          <label>Influence Level</label>
          <input type="range" name="influence" min="0" max="100" value="80" style="width:100%;" />
        </div>

        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Save Profile</button>
        </div>
      </form>
    `;
    
    window.UI.openDrawer(`Profile: ${window.UI.escapeHtml(s.name)}`, 'Stakeholder Management', drawerHtml);
    
    window.submitStakeholderDrawerForm = async function(sid) {
      if(sid.startsWith('mock')) {
         window.UI.toast('Saved mock stakeholder.', 'success');
         window.UI.closeDrawer();
         return;
      }
      const form = document.getElementById('stakeholderForm');
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const updatedReq = await ProductAPI.updateSubdoc(reqId, 'stakeholders', sid, data);
        window.currentRequirement = updatedReq;
        renderStakeholders();
        window.UI.closeDrawer();
        window.UI.toast('Stakeholder updated successfully', 'success');
      } catch (err) { }
    };
  } else if (action === 'addStakeholder') {
    window.UI.toast('Opening add stakeholder drawer...', 'info');
  }
};
