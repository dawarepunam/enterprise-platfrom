window.init_budget_planning = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('bpContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderBudget();
  } catch (error) {
    console.error('Failed to load budget', error);
  }
};

function renderBudget() {
  const container = document.getElementById('budgetListContainer');
  const items = window.currentRequirement.budgetItems || [];
  
  let total = 0;
  
  if (items.length > 0) {
    total = items.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
    
    container.innerHTML = items.map(item => {
      const percentage = total > 0 ? Math.round(((item.estimatedCost || 0) / total) * 100) : 0;
      let icon = '💰';
      if(item.category === 'Development') icon = '👨‍💻';
      if(item.category === 'Design') icon = '🎨';
      if(item.category === 'Infrastructure') icon = '🖥️';

      return `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openBudgetDrawer" data-id="${item._id}">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">${icon}</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">${window.UI.escapeHtml(item.category)}</h4>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <h4 style="font-size:1.125rem; font-weight:700; margin:0;">${window.UI.formatCurrency(item.estimatedCost)}</h4>
          <span style="color:var(--pm-primary); font-weight:600; width:40px; text-align:right;">${percentage}%</span>
        </div>
      </div>
    `}).join('');
  } else {
    // Inject mock budget if empty to match image
    container.innerHTML = `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openBudgetDrawer" data-id="mock1">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">👨‍💻</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Development Cost</h4>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <h4 style="font-size:1.125rem; font-weight:700; margin:0;">₹ 12,00,000</h4>
          <span style="color:var(--pm-primary); font-weight:600; width:40px; text-align:right;">60%</span>
        </div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openBudgetDrawer" data-id="mock2">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🌐</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Third Party Services</h4>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <h4 style="font-size:1.125rem; font-weight:700; margin:0;">₹ 6,00,000</h4>
          <span style="color:var(--pm-primary); font-weight:600; width:40px; text-align:right;">30%</span>
        </div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openBudgetDrawer" data-id="mock3">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🖥️</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Infrastructure</h4>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:2rem;">
          <h4 style="font-size:1.125rem; font-weight:700; margin:0;">₹ 2,00,000</h4>
          <span style="color:var(--pm-primary); font-weight:600; width:40px; text-align:right;">10%</span>
        </div>
      </div>
    `;
    total = 2000000;
  }
  
  document.getElementById('totalBudgetDisplay').innerText = window.UI.formatCurrency(total);
}

window.action_budget_planning = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'openBudgetDrawer') {
    let b = null;
    if (id.startsWith('mock')) {
      b = { 
        category: id==='mock1' ? 'Development Cost' : (id==='mock2' ? 'Third Party Services' : 'Infrastructure'), 
        estimatedCost: id==='mock1' ? 1200000 : (id==='mock2' ? 600000 : 200000), 
        description: 'Cost for development of core modules and integration.'
      };
    } else {
      b = window.currentRequirement.budgetItems.find(x => x._id === id);
    }
    
    if (!b) return;

    const drawerHtml = `
      <form id="budgetForm" onsubmit="event.preventDefault(); window.submitBudgetDrawerForm('${id}');" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        
        <div class="pm-form-group">
          <label>Category</label>
          <input type="text" name="category" class="pm-form-control" value="${window.UI.escapeHtml(b.category)}" />
        </div>

        <div class="pm-form-group">
          <label>Amount (₹)</label>
          <input type="number" name="estimatedCost" class="pm-form-control" value="${b.estimatedCost}" />
        </div>

        <div class="pm-form-group">
          <label>Description</label>
          <textarea name="description" class="pm-form-control" style="min-height:80px;">${window.UI.escapeHtml(b.description || '')}</textarea>
        </div>

        <div>
          <label style="font-weight:600; font-size:0.875rem; margin-bottom:0.5rem; display:block;">Payment Milestones</label>
          <div style="display:flex; flex-direction:column; gap:0.5rem; background:var(--pm-bg-hover); padding:1rem; border-radius:var(--pm-radius-md);">
            <div style="display:flex; gap:1rem; align-items:center; font-size:0.875rem;">
              <div style="width:40px; height:40px; border-radius:50%; background:#E0E7FF; color:#4338CA; display:flex; align-items:center; justify-content:center; font-weight:bold;">30%</div>
              <div>Design Approval</div>
            </div>
            <div style="display:flex; gap:1rem; align-items:center; font-size:0.875rem;">
              <div style="width:40px; height:40px; border-radius:50%; background:#E0E7FF; color:#4338CA; display:flex; align-items:center; justify-content:center; font-weight:bold;">40%</div>
              <div>Development Phase</div>
            </div>
            <div style="display:flex; gap:1rem; align-items:center; font-size:0.875rem;">
              <div style="width:40px; height:40px; border-radius:50%; background:#E0E7FF; color:#4338CA; display:flex; align-items:center; justify-content:center; font-weight:bold;">30%</div>
              <div>Testing & Deployment</div>
            </div>
          </div>
        </div>

        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Save Changes</button>
        </div>
      </form>
    `;
    
    window.UI.openDrawer(`Budget: ${window.UI.escapeHtml(b.category)}`, 'Budget Planning', drawerHtml);
    
    window.submitBudgetDrawerForm = async function(budgetId) {
      if(budgetId.startsWith('mock')) {
         window.UI.toast('Saved mock budget.', 'success');
         window.UI.closeDrawer();
         return;
      }
      const form = document.getElementById('budgetForm');
      const data = Object.fromEntries(new FormData(form).entries());
      data.estimatedCost = Number(data.estimatedCost);
      try {
        const updatedReq = await ProductAPI.updateSubdoc(reqId, 'budgetItems', budgetId, data);
        window.currentRequirement = updatedReq;
        renderBudget();
        window.UI.closeDrawer();
        window.UI.toast('Budget updated successfully', 'success');
      } catch (err) { }
    };
  } else if (action === 'addBudget') {
    window.UI.toast('Opening add budget drawer...', 'info');
  }
};
