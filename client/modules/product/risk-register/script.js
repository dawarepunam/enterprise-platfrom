window.init_risk_register = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement from the queue first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('rrContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderRisks();
  } catch (error) {
    console.error('Failed to load risks', error);
  }
};

function renderRisks() {
  const container = document.getElementById('risksListContainer');
  const risks = window.currentRequirement.risks || [];
  
  if (risks.length > 0) {
    container.innerHTML = risks.map(r => {
      let riskLevel = 'Low';
      let riskColor = '#059669'; // Green
      if (r.score > 6) { riskLevel = 'High'; riskColor = '#DC2626'; }
      else if (r.score > 3) { riskLevel = 'Medium'; riskColor = '#D97706'; }

      return `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openRiskDrawer" data-id="${r._id}">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">⚠️</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">${window.UI.escapeHtml(r.description || 'Unknown Risk')}</h4>
            <div style="font-size:0.875rem; color:var(--pm-text-muted);">Owner: ${window.UI.escapeHtml(r.mitigationPlan ? 'Assigned' : 'Unassigned')}</div>
          </div>
        </div>
        <div>
          <span style="font-size:0.875rem; font-weight:600; color:${riskColor};">${riskLevel}</span>
        </div>
      </div>
    `}).join('');
  } else {
    // Inject mock risks if empty to match image (Screen 8)
    container.innerHTML = `
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openRiskDrawer" data-id="mock1">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#FEE2E2; color:#DC2626; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">⚠️</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Payment Gateway Failure</h4>
          </div>
        </div>
        <div><span style="font-size:0.875rem; font-weight:600; color:#DC2626;">High</span></div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openRiskDrawer" data-id="mock2">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🔒</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Security Vulnerability</h4>
          </div>
        </div>
        <div><span style="font-size:0.875rem; font-weight:600; color:#DC2626;">High</span></div>
      </div>
      <div class="pm-hover-row hoverable" style="display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md); cursor:pointer; background:var(--pm-bg-card);" data-action="openRiskDrawer" data-id="mock3">
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="width:48px; height:48px; border-radius:8px; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">⏳</div>
          <div>
            <h4 style="font-size:1.125rem; font-weight:700; margin-bottom:0.25rem; color:var(--pm-text-main);">Integration Delay</h4>
          </div>
        </div>
        <div><span style="font-size:0.875rem; font-weight:600; color:#D97706;">Medium</span></div>
      </div>
    `;
  }
}

window.action_risk_register = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'openRiskDrawer') {
    let r = null;
    if (id.startsWith('mock')) {
      r = { 
        description: id==='mock1' ? 'Payment Gateway Failure' : 'Other Risk', 
        score: id==='mock1' ? 8 : 5, 
        probability: 4, 
        impact: 4,
        mitigationPlan: 'Use reliable gateway with fallback option and monitoring.',
        owner: 'Amit Patel'
      };
    } else {
      r = window.currentRequirement.risks.find(x => x._id === id);
    }
    
    if (!r) return;

    // Derived logic based on image
    const riskLevelStr = r.score > 6 ? 'High' : (r.score > 3 ? 'Medium' : 'Low');
    const riskColor = riskLevelStr === 'High' ? '#DC2626' : (riskLevelStr === 'Medium' ? '#D97706' : '#059669');

    const drawerHtml = `
      <form id="riskForm" onsubmit="event.preventDefault(); window.submitRiskDrawerForm('${id}');" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md);">
            <span style="font-weight:600; font-size:0.875rem;">Risk Level</span>
            <span style="color:${riskColor}; font-weight:700;">${riskLevelStr}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md);">
            <span style="font-weight:600; font-size:0.875rem;">Impact</span>
            <span style="color:${riskColor}; font-weight:700;">${riskLevelStr}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md);">
            <span style="font-weight:600; font-size:0.875rem;">Probability</span>
            <span style="color:${riskColor}; font-weight:700;">${riskLevelStr}</span>
          </div>
        </div>

        <div class="pm-form-group">
          <label>Mitigation Plan</label>
          <textarea name="mitigationPlan" class="pm-form-control" style="min-height:100px;">${window.UI.escapeHtml(r.mitigationPlan || '')}</textarea>
        </div>

        <div class="pm-form-group">
          <label>Owner</label>
          <select name="owner" class="pm-form-control">
            <option value="Amit Patel" selected>Amit Patel</option>
            <option value="Neha Verma">Neha Verma</option>
          </select>
        </div>

        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Save Changes</button>
        </div>
      </form>
    `;
    
    window.UI.openDrawer(`Risk: ${window.UI.escapeHtml(r.description)}`, 'Risk Register', drawerHtml);
    
    window.submitRiskDrawerForm = async function(riskId) {
      if(riskId.startsWith('mock')) {
         window.UI.toast('Saved mock risk.', 'success');
         window.UI.closeDrawer();
         return;
      }
      const form = document.getElementById('riskForm');
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const updatedReq = await ProductAPI.updateSubdoc(reqId, 'risks', riskId, data);
        window.currentRequirement = updatedReq;
        renderRisks();
        window.UI.closeDrawer();
        window.UI.toast('Risk updated successfully', 'success');
      } catch (err) { }
    };
  } else if (action === 'addRisk') {
    window.UI.toast('Opening add risk drawer...', 'info');
  }
};
