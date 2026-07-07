window.init_hr_documents = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Documents';
  const grid = document.getElementById('hrDocumentsGrid');
  
  try {
    setTimeout(() => {
      const docs = [
        { id: 'doc1', emp: 'Rahul Sharma', type: 'Aadhar Card', status: 'Pending', file: 'Aadhar_Rahul.pdf' },
        { id: 'doc2', emp: 'Rahul Sharma', type: 'PAN Card', status: 'Verified', file: 'PAN_Rahul.pdf' },
        { id: 'doc3', emp: 'Priya Mehta', type: 'Offer Letter', status: 'Verified', file: 'Offer_Priya.pdf' },
        { id: 'doc4', emp: 'Amit Verma', type: 'Degree', status: 'Pending', file: 'Degree_Amit.pdf' },
        { id: 'doc5', emp: 'Sneha Kulkarni', type: 'Aadhar Card', status: 'Rejected', file: 'Aadhar_Sneha.pdf' }
      ];

      grid.innerHTML = docs.map(d => {
        let statusStyle = 'background:#FEF3C7; color:#B45309;';
        if(d.status === 'Verified') statusStyle = 'background:#D1FAE5; color:#065F46;';
        if(d.status === 'Rejected') statusStyle = 'background:#FEE2E2; color:#B91C1C;';

        return `
          <div class="hr-card hoverable hr-doc-card" style="display:flex; flex-direction:column; padding:1.5rem; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
              <div style="width:40px; height:40px; border-radius:8px; background:#F1F5F9; display:flex; justify-content:center; align-items:center; font-size:1.5rem;">
                📄
              </div>
              <span style="${statusStyle} padding:4px 8px; border-radius:12px; font-size:0.75rem;">${d.status}</span>
            </div>
            <h3 style="margin:0 0 0.25rem 0; font-size:1rem;">${d.type}</h3>
            <div style="color:var(--hr-text-muted); font-size:0.875rem; margin-bottom:0.5rem;">${d.emp}</div>
            
            <div class="hr-doc-actions" style="border-top:1px solid var(--hr-border); padding-top:1rem; margin-top:auto; display:flex; gap:0.5rem; justify-content:center;">
              <button class="hr-icon-btn" title="Preview" onclick="window.UI.openDocPreview('${d.file}')" style="font-size:1rem; border:1px solid var(--hr-border); border-radius:6px; padding:0.25rem 0.5rem;">👁️</button>
              <button class="hr-icon-btn" title="Download" style="font-size:1rem; border:1px solid var(--hr-border); border-radius:6px; padding:0.25rem 0.5rem;">📥</button>
              ${d.status === 'Pending' ? `<button class="hr-icon-btn" title="Verify" onclick="window.UI.verifyDocument()" style="font-size:1rem; border:1px solid #10B981; color:#10B981; border-radius:6px; padding:0.25rem 0.5rem;">✓</button>` : ''}
              <button class="hr-icon-btn" title="Delete" style="font-size:1rem; border:1px solid #EF4444; color:#EF4444; border-radius:6px; padding:0.25rem 0.5rem;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }, 400);

  } catch (error) {
    grid.innerHTML = `<div style="color:red;">Failed to load documents.</div>`;
  }
};

// UI Manager Extensions
if (window.UI) {
  window.UI.openDocPreview = function(fileName) {
    document.getElementById('previewDocTitle').innerText = fileName;
    document.getElementById('hrDocPreviewModal').classList.remove('hidden');
  };

  window.UI.closeDocPreview = function() {
    document.getElementById('hrDocPreviewModal').classList.add('hidden');
  };

  window.UI.verifyDocument = function() {
    if(confirm("Verify Document?")) {
      window.UI.closeDocPreview();
      window.UI.toast('Document Verified Successfully', 'success');
      // In real scenario, re-fetch documents to update grid
    }
  };
}
