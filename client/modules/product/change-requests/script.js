window.init_change_requests = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    renderChangeRequests();
  } catch (error) {
    console.error('Failed to load CRs', error);
  }
};

function renderChangeRequests() {
  const tbody = document.getElementById('crTableBody');
  const items = window.currentRequirement.changeRequests || [];
  
  if (items.length > 0) {
    tbody.innerHTML = items.map(item => `
      <tr style="cursor:pointer;" onclick="window.App.handleAction('openCRDrawer', '${item._id}')">
        <td><strong>${window.UI.escapeHtml(item.title)}</strong></td>
        <td><span class="pm-status ${item.status ? item.status.toLowerCase().replace(' ', '-') : 'pending'}">${window.UI.escapeHtml(item.status || 'Pending')}</span></td>
        <td><strong style="color:var(--pm-danger)">+${window.UI.formatCurrency(item.budgetImpact)}</strong></td>
        <td><strong style="color:var(--pm-danger)">+${item.timelineImpactDays || 0} days</strong></td>
        <td>${window.UI.escapeHtml(item.requestedBy || '-')}</td>
        <td onclick="event.stopPropagation()">
          <button class="pm-btn danger" data-action="deleteCR" data-id="${item._id}">Delete</button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No active change requests.</td></tr>';
  }
}

window.action_change_requests = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'addCR') {
    window.UI.openModal('Create Change Request', `
      <form id="crForm" onsubmit="event.preventDefault(); window.submitCRForm();">
        <div class="pm-form-group">
          <label>CR Title</label>
          <input type="text" name="title" class="pm-form-control" required />
        </div>
        <div class="pm-form-group">
          <label>Description & Reason</label>
          <textarea name="description" class="pm-form-control" required></textarea>
        </div>
        <div class="pm-grid" style="gap:1rem;">
          <div class="pm-col-6 pm-form-group">
            <label>Budget Impact (₹ Addition)</label>
            <input type="number" name="budgetImpact" class="pm-form-control" value="0" />
          </div>
          <div class="pm-col-6 pm-form-group">
            <label>Timeline Impact (Extra Days)</label>
            <input type="number" name="timelineImpactDays" class="pm-form-control" value="0" />
          </div>
        </div>
        <div class="pm-form-group">
          <label>Requested By</label>
          <input type="text" name="requestedBy" class="pm-form-control" required />
        </div>
        <div class="pm-form-group">
          <label>Status</label>
          <select name="status" class="pm-form-control">
            <option value="Pending">Pending</option>
            <option value="Impact Analysis">Impact Analysis</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button type="submit" class="pm-btn primary">Save CR</button>
        </div>
      </form>
    `);
    
    window.submitCRForm = async function() {
      const form = document.getElementById('crForm');
      const data = Object.fromEntries(new FormData(form).entries());
      data.budgetImpact = Number(data.budgetImpact || 0);
      data.timelineImpactDays = Number(data.timelineImpactDays || 0);
      try {
        const updatedReq = await ProductAPI.addSubdoc(reqId, 'changeRequests', data);
        window.currentRequirement = updatedReq;
        renderChangeRequests();
        window.UI.closeModal();
        window.UI.toast('Change Request created', 'success');
      } catch (err) { }
    };
  }
  
  if (action === 'deleteCR') {
    if (confirm('Delete this CR?')) {
      try {
        const updatedReq = await ProductAPI.deleteSubdoc(reqId, 'changeRequests', id);
        window.currentRequirement = updatedReq;
        renderChangeRequests();
        window.UI.toast('CR deleted', 'info');
      } catch (err) { }
    }
  }

  if (action === 'openCRDrawer') {
    const item = (window.currentRequirement.changeRequests || []).find(i => i._id === id);
    if (!item) return;
    const html = `
      <div style="margin-bottom:1.5rem;">
        <h4>CR Title</h4>
        <p>${window.UI.escapeHtml(item.title)}</p>
      </div>
      <div style="margin-bottom:1.5rem;">
        <h4>Status</h4>
        <p><span class="pm-status ${item.status ? item.status.toLowerCase().replace(' ', '-') : 'pending'}">${window.UI.escapeHtml(item.status)}</span></p>
      </div>
      <div style="margin-bottom:1.5rem;">
        <h4>Description</h4>
        <p>${window.UI.escapeHtml(item.description)}</p>
      </div>
      <div style="margin-bottom:1.5rem; display: flex; gap: 2rem;">
        <div>
          <h4>Budget Impact</h4>
          <p style="color:var(--pm-danger); font-weight:bold;">+${window.UI.formatCurrency(item.budgetImpact)}</p>
        </div>
        <div>
          <h4>Timeline Impact</h4>
          <p style="color:var(--pm-danger); font-weight:bold;">+${item.timelineImpactDays} Days</p>
        </div>
      </div>
      <div style="margin-bottom:1.5rem;">
        <h4>Requested By</h4>
        <p>${window.UI.escapeHtml(item.requestedBy)}</p>
      </div>
    `;
    window.UI.openDrawer('Change Request Info', 'Version Control', html);
  }
};
