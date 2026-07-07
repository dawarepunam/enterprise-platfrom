window.init_documents = async function() {
  const reqId = localStorage.getItem('pm_active_req_id');
  if (!reqId) {
    window.UI.toast('Please select a requirement first.', 'error');
    return window.App.navigate('/product-manager/queue');
  }

  try {
    const requirement = await ProductAPI.getRequirement(reqId);
    window.currentRequirement = requirement;
    renderDocuments();
  } catch (error) {
    console.error('Failed to load documents', error);
  }
};

function renderDocuments() {
  const tbody = document.getElementById('documentTableBody');
  const items = window.currentRequirement.documents || [];
  
  if (items.length > 0) {
    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${window.UI.escapeHtml(item.name)}</strong></td>
        <td>${window.UI.escapeHtml(item.type)}</td>
        <td>v${item.version || 1}</td>
        <td><span class="pm-status ${item.approvalStatus ? item.approvalStatus.toLowerCase() : 'draft'}">${window.UI.escapeHtml(item.approvalStatus || 'Draft')}</span></td>
        <td>${window.UI.formatDate(item.uploadedAt)}</td>
        <td>
          <a href="${item.url}" target="_blank" class="pm-btn primary">View</a>
          <button class="pm-btn danger" data-action="deleteDocument" data-id="${item._id}">Delete</button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No documents uploaded yet.</td></tr>';
  }
}

window.action_documents = async function(action, id, target) {
  const reqId = localStorage.getItem('pm_active_req_id');

  if (action === 'addDocument') {
    window.UI.openModal('Add Document', `
      <form id="documentForm" onsubmit="event.preventDefault(); window.submitDocumentForm();">
        <div class="pm-form-group">
          <label>Document Name</label>
          <input type="text" name="name" class="pm-form-control" required placeholder="e.g., BRD v1" />
        </div>
        <div class="pm-form-group">
          <label>Document Type</label>
          <select name="type" class="pm-form-control">
            <option value="BRD">BRD</option>
            <option value="SRS">SRS</option>
            <option value="Proposal">Proposal</option>
            <option value="Wireframe">Wireframe</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="pm-form-group">
          <label>URL / File Path</label>
          <input type="url" name="url" class="pm-form-control" required placeholder="https://..." />
        </div>
        <div style="margin-top: 1rem; text-align: right;">
          <button type="submit" class="pm-btn primary">Save Document</button>
        </div>
      </form>
    `);
    
    window.submitDocumentForm = async function() {
      const form = document.getElementById('documentForm');
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const updatedReq = await ProductAPI.addSubdoc(reqId, 'documents', data);
        window.currentRequirement = updatedReq;
        renderDocuments();
        window.UI.closeModal();
        window.UI.toast('Document added', 'success');
      } catch (err) { }
    };
  }
  
  if (action === 'deleteDocument') {
    if (confirm('Delete this document?')) {
      try {
        const updatedReq = await ProductAPI.deleteSubdoc(reqId, 'documents', id);
        window.currentRequirement = updatedReq;
        renderDocuments();
        window.UI.toast('Document deleted', 'info');
      } catch (err) { }
    }
  }
};
