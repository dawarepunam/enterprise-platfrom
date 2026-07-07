window.init_hr_ess = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > ESS Requests';
  
  const tbody = document.getElementById('hrESSTableBody');
  try {
    setTimeout(() => {
      const data = [
        { emp: 'Rahul Sharma', id: 'EMP001', type: 'Profile Update', priority: 'Low', status: 'Pending' },
        { emp: 'Priya Patel', id: 'EMP002', type: 'Attendance Correction', priority: 'High', status: 'Approved' },
        { emp: 'Amit Verma', id: 'EMP003', type: 'Asset Request', priority: 'Medium', status: 'Rejected' },
        { emp: 'Sneha Singh', id: 'EMP004', type: 'Leave Cancellation', priority: 'Low', status: 'Pending' }
      ];

      tbody.innerHTML = data.map(d => {
        let pStyle = d.priority === 'High' ? 'color:#EF4444;' : d.priority === 'Medium' ? 'color:#F59E0B;' : 'color:#10B981;';
        let sStyle = d.status === 'Approved' ? 'background:#D1FAE5; color:#065F46;' : d.status === 'Rejected' ? 'background:#FEE2E2; color:#B91C1C;' : 'background:#FEF3C7; color:#B45309;';
        
        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem;">
              <div style="font-weight:500;">${d.emp}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
            </td>
            <td style="padding:1rem; font-weight:500;">${d.type}</td>
            <td style="padding:1rem; font-weight:500; ${pStyle}">${d.priority}</td>
            <td style="padding:1rem;">
              <span style="${sStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem;">${d.status}</span>
            </td>
            <td style="padding:1rem; text-align:right;">
              <div class="row-actions" style="display:flex; justify-content:flex-end; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
                ${d.status === 'Pending' ? `
                  <button class="hr-icon-btn" onclick="window.UI.openESSActionModal('Approve', '${d.emp}')" style="font-size:0.75rem; border:1px solid #10B981; color:#10B981; padding:0.25rem 0.5rem; border-radius:6px;">Approve</button>
                  <button class="hr-icon-btn" onclick="window.UI.openESSActionModal('Reject', '${d.emp}')" style="font-size:0.75rem; border:1px solid #EF4444; color:#EF4444; padding:0.25rem 0.5rem; border-radius:6px;">Reject</button>
                ` : ''}
                <button class="hr-icon-btn" onclick="window.UI.openESSDrawer('${d.emp}', '${d.type}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">View</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      document.querySelectorAll('#hrESSTableBody tr').forEach(tr => {
        tr.addEventListener('mouseenter', () => {
          const actions = tr.querySelector('.row-actions');
          if(actions) actions.style.opacity = '1';
        });
        tr.addEventListener('mouseleave', () => {
          const actions = tr.querySelector('.row-actions');
          if(actions) actions.style.opacity = '0';
        });
      });
    }, 300);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Failed to load ESS requests.</td></tr>`;
  }
};

if (window.UI) {
  window.UI.openESSDrawer = function(name, type) {
    document.getElementById('essDrawerName').innerText = name;
    document.getElementById('essDrawerType').innerText = type;
    window.UI.switchESSTab('overview');
    
    const drawer = document.getElementById('hrESSDrawer');
    drawer.classList.remove('hidden');
    drawer.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      drawer.style.transform = 'translateX(0)';
    });
  };

  window.UI.closeESSDrawer = function() {
    const drawer = document.getElementById('hrESSDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => drawer.classList.add('hidden'), 300);
  };

  window.UI.switchESSTab = function(tabName) {
    const tabs = document.querySelectorAll('#hrESSDrawer .hr-tab');
    tabs.forEach(t => {
      t.classList.remove('active');
      t.style.color = 'var(--hr-text-muted)';
      t.style.borderBottom = 'none';
      t.style.fontWeight = 'normal';
    });
    const activeTab = Array.from(tabs).find(t => t.innerText.toLowerCase().includes(tabName));
    if(activeTab) {
      activeTab.classList.add('active');
      activeTab.style.color = 'var(--hr-primary)';
      activeTab.style.borderBottom = '2px solid var(--hr-primary)';
      activeTab.style.fontWeight = '500';
    }

    document.querySelectorAll('#hrESSDrawer .ess-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`ess-tab-${tabName}`).classList.remove('hidden');
  };

  window.UI.openESSActionModal = function(action, name) {
    document.getElementById('essActionTitle').innerText = `${action} Request - ${name}`;
    const btn = document.getElementById('essActionConfirmBtn');
    btn.innerText = action;
    btn.style.background = action === 'Approve' ? '#10B981' : '#EF4444';
    
    document.getElementById('hrESSActionModal').classList.remove('hidden');
  };

  window.UI.closeESSActionModal = function() {
    document.getElementById('hrESSActionModal').classList.add('hidden');
  };

  window.UI.submitESSAction = function() {
    const action = document.getElementById('essActionConfirmBtn').innerText;
    window.UI.closeESSActionModal();
    window.UI.toast(`Request ${action}d Successfully`, action === 'Approve' ? 'success' : 'error');
  };
}
