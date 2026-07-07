window.init_hr_assets = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Assets';
  const grid = document.getElementById('hrAssetsGrid');
  
  try {
    setTimeout(() => {
      const assets = [
        { id: 'ast1', name: 'MacBook Pro M2', type: 'Laptop', status: 'Assigned', assignee: 'Rahul Sharma', date: '10 May 2026', icon: '💻' },
        { id: 'ast2', name: 'Dell UltraSharp', type: 'Monitor', status: 'Available', assignee: '-', date: '-', icon: '🖥️' },
        { id: 'ast3', name: 'Logitech MX Master', type: 'Mouse', status: 'Assigned', assignee: 'Priya Mehta', date: '12 May 2026', icon: '🖱️' },
        { id: 'ast4', name: 'Keychron K2', type: 'Keyboard', status: 'Damaged', assignee: '-', date: '-', icon: '⌨️' },
        { id: 'ast5', name: 'ThinkPad T14', type: 'Laptop', status: 'Available', assignee: '-', date: '-', icon: '💻' }
      ];

      grid.innerHTML = assets.map(a => {
        let statusStyle = 'background:#D1FAE5; color:#065F46;'; // Assigned
        if(a.status === 'Available') statusStyle = 'background:#DBEAFE; color:#1E40AF;'; // Blue
        if(a.status === 'Damaged') statusStyle = 'background:#FEE2E2; color:#B91C1C;'; // Red

        return `
          <div class="hr-card hoverable" style="display:flex; flex-direction:column; padding:1.5rem; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
              <div style="width:40px; height:40px; border-radius:8px; background:#F1F5F9; display:flex; justify-content:center; align-items:center; font-size:1.5rem;">
                ${a.icon}
              </div>
              <span style="${statusStyle} padding:4px 8px; border-radius:12px; font-size:0.75rem;">${a.status}</span>
            </div>
            <h3 style="margin:0 0 0.25rem 0; font-size:1rem;">${a.name}</h3>
            <div style="color:var(--hr-text-muted); font-size:0.875rem; margin-bottom:1rem;">${a.type}</div>
            
            <div style="font-size:0.875rem; margin-bottom:1rem;">
              <div style="margin-bottom:0.25rem;"><span style="color:var(--hr-text-muted);">Assignee:</span> ${a.assignee}</div>
              <div><span style="color:var(--hr-text-muted);">Date:</span> ${a.date}</div>
            </div>

            <div style="border-top:1px solid var(--hr-border); padding-top:1rem; margin-top:auto; display:flex; gap:0.5rem; justify-content:center;">
              ${a.status === 'Available' ? `<button class="hr-icon-btn" onclick="window.UI.openAssetAssignModal()" title="Assign" style="font-size:0.875rem; border:1px solid var(--hr-primary); color:var(--hr-primary); border-radius:6px; padding:0.25rem 0.75rem;">Assign</button>` : ''}
              ${a.status === 'Assigned' ? `<button class="hr-icon-btn" title="Return" style="font-size:0.875rem; border:1px solid #F59E0B; color:#F59E0B; border-radius:6px; padding:0.25rem 0.75rem;">Return</button>` : ''}
              ${a.status === 'Assigned' ? `<button class="hr-icon-btn" title="Replace" style="font-size:0.875rem; border:1px solid var(--hr-border); border-radius:6px; padding:0.25rem 0.75rem;">Replace</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }, 400);

  } catch (error) {
    grid.innerHTML = `<div style="color:red;">Failed to load assets.</div>`;
  }
};

// UI Manager Extensions
if (window.UI) {
  window.UI.openAssetAssignModal = function() {
    document.getElementById('hrAssetAssignModal').classList.remove('hidden');
  };

  window.UI.closeAssetAssignModal = function() {
    document.getElementById('hrAssetAssignModal').classList.add('hidden');
  };

  window.UI.submitAssetAssign = function() {
    window.UI.closeAssetAssignModal();
    window.UI.toast('Asset Assigned Successfully', 'success');
  };
}
