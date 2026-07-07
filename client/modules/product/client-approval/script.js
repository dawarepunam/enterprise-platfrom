window.init_client_approval = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    document.getElementById('caContext').innerText = `← Back to Workspace (${requirement.title || requirement.company})`;
    renderApprovals();
  } catch (error) {
    console.error('Failed to load approvals', error);
  }
};

function renderApprovals() {
  const tbody = document.getElementById('approvalTableBody');
  const items = window.currentRequirement.approvals || [];
  
  if (items.length > 0) {
    tbody.innerHTML = items.map(item => {
      let statusClass = 'pending';
      if(item.status === 'Approved') statusClass = 'frozen'; // green
      if(item.status === 'Rejected') statusClass = 'danger'; // red

      return `
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" onclick="window.App.handleAction('openApprovalDrawer', '${item._id}')">
        <td><strong>${window.UI.escapeHtml(item.stage)}</strong></td>
        <td><span class="pm-status ${statusClass}">${window.UI.escapeHtml(item.status || 'Pending')}</span></td>
        <td>${window.UI.escapeHtml(item.approvedBy || '-')}</td>
        <td>${window.UI.formatDate(item.approvedAt)}</td>
      </tr>
    `}).join('');
  } else {
    // mock for visuals
    tbody.innerHTML = `
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" onclick="window.App.handleAction('openApprovalDrawer', 'mock1')">
        <td><strong>Business Requirements</strong></td>
        <td><span class="pm-status frozen">Approved</span></td>
        <td>Rajiv Sharma</td>
        <td>20 May 2025</td>
      </tr>
      <tr class="pm-hover-row hoverable" style="cursor:pointer;" onclick="window.App.handleAction('openApprovalDrawer', 'mock2')">
        <td><strong>Budget & Timeline</strong></td>
        <td><span class="pm-status pending">Pending Review</span></td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  }
}

window.action_client_approval = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'requestApproval') {
    const html = `
      <form id="approvalForm" onsubmit="event.preventDefault(); window.submitApprovalForm();" style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        <div class="pm-form-group">
          <label>Approval Stage</label>
          <select name="stage" class="pm-form-control" required>
            <option value="Business Requirements">Business Requirements</option>
            <option value="Timeline Approval">Timeline Approval</option>
            <option value="Budget Approval">Budget Approval</option>
            <option value="Final Sign-Off">Final Sign-Off</option>
          </select>
        </div>
        <div class="pm-form-group">
          <label>Request Sent To</label>
          <input type="email" name="requestedTo" class="pm-form-control" placeholder="client@company.com" required />
        </div>
        <div class="pm-form-group">
          <label>Message</label>
          <textarea name="comments" class="pm-form-control" style="min-height:100px;">Please review and approve.</textarea>
        </div>
        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); text-align:right;">
          <button type="submit" class="pm-btn primary" style="background:#4F46E5;">Send Request</button>
        </div>
      </form>
    `;
    window.UI.openDrawer('Request Approval', 'Client Approval', html);
    
    window.submitApprovalForm = async function() {
      const form = document.getElementById('approvalForm');
      const data = Object.fromEntries(new FormData(form).entries());
      data.status = 'Pending';
      try {
        const updatedReq = await ProductAPI.addSubdoc(reqId, 'approvals', data);
        window.currentRequirement = updatedReq;
        renderApprovals();
        window.UI.closeDrawer();
        window.UI.toast('Approval request sent', 'success');
      } catch (err) { }
    };
  }

  if (action === 'openApprovalDrawer') {
    let item = null;
    if (id.startsWith('mock')) {
       item = {
          stage: id==='mock1' ? 'Business Requirements' : 'Budget & Timeline',
          status: id==='mock1' ? 'Approved' : 'Pending Review',
          approvedBy: id==='mock1' ? 'Rajiv Sharma' : null,
          approvedAt: id==='mock1' ? new Date() : null,
          comments: id==='mock1' ? 'Looks good to proceed.' : ''
       };
    } else {
       item = (window.currentRequirement.approvals || []).find(i => i._id === id);
    }
    
    if (!item) return;

    let statusClass = 'pending';
    if(item.status === 'Approved') statusClass = 'frozen'; // green
    if(item.status === 'Rejected') statusClass = 'danger'; // red

    const html = `
      <div style="display:flex; flex-direction:column; gap:1.5rem; height:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border:1px solid var(--pm-border); border-radius:var(--pm-radius-md);">
          <span style="font-weight:600;">Status</span>
          <span class="pm-status ${statusClass}">${window.UI.escapeHtml(item.status)}</span>
        </div>
        
        <div class="pm-form-group">
          <label>Stage</label>
          <input type="text" class="pm-form-control" value="${window.UI.escapeHtml(item.stage)}" disabled />
        </div>
        
        <div class="pm-form-group">
          <label>Approved By</label>
          <input type="text" class="pm-form-control" value="${window.UI.escapeHtml(item.approvedBy || 'N/A')}" disabled />
        </div>
        
        <div class="pm-form-group">
          <label>Date</label>
          <input type="text" class="pm-form-control" value="${window.UI.formatDate(item.approvedAt)}" disabled />
        </div>
        
        <div class="pm-form-group">
          <label>Comments / Feedback</label>
          <textarea class="pm-form-control" disabled style="min-height:100px;">${window.UI.escapeHtml(item.comments || 'No comments.')}</textarea>
        </div>

        ${item.status === 'Pending' ? `
        <div style="margin-top:auto; padding-top:1rem; border-top:1px solid var(--pm-border); display:flex; justify-content:flex-end; gap:1rem;">
           <button class="pm-btn danger" onclick="window.UI.toast('Rejected', 'success'); window.UI.closeDrawer();">Reject</button>
           <button class="pm-btn primary" style="background:#10B981; border:none;" onclick="window.UI.toast('Approved', 'success'); window.UI.closeDrawer();">Approve</button>
        </div>
        ` : ''}
      </div>
    `;
    window.UI.openDrawer('Approval Details', 'Client Review', html);
  }
};
