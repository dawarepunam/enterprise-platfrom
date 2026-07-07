window.init_hr_leaves = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Leaves';
  const tbody = document.getElementById('hrLeavesTableBody');
  
  try {
    setTimeout(() => {
      const leaves = [
        { id: 'EMP001', name: 'Rahul Sharma', type: 'Casual Leave', from: '16 May', to: '17 May', days: 2, status: 'Pending' },
        { id: 'EMP002', name: 'Priya Patel', type: 'Sick Leave', from: '10 May', to: '10 May', days: 1, status: 'Approved' },
        { id: 'EMP003', name: 'Amit Verma', type: 'Earned Leave', from: '01 Jun', to: '05 Jun', days: 5, status: 'Pending' },
        { id: 'EMP004', name: 'Sneha Singh', type: 'Casual Leave', from: '20 Apr', to: '21 Apr', days: 2, status: 'Rejected' },
      ];

      const urlParams = new URLSearchParams(window.location.search);
      const statusFilter = urlParams.get('status');
      let filtered = leaves;
      if(statusFilter) {
        filtered = leaves.filter(l => l.status.toLowerCase() === statusFilter.toLowerCase());
      }

      tbody.innerHTML = filtered.map(l => {
        let statusStyle = '';
        if(l.status === 'Approved') statusStyle = 'background:#D1FAE5; color:#065F46; border:1px solid #34D399;';
        if(l.status === 'Pending') statusStyle = 'background:#FEF3C7; color:#B45309; border:1px solid #FBBF24;';
        if(l.status === 'Rejected') statusStyle = 'background:#FEE2E2; color:#B91C1C; border:1px solid #F87171;';

        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem 0;">
              <div style="width:36px; height:36px; border-radius:50%; background:#E2E8F0; display:flex; justify-content:center; align-items:center;">
                👤
              </div>
            </td>
            <td style="padding:1rem 0;">
              <div style="font-weight:500;">${l.name}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${l.id}</div>
            </td>
            <td style="padding:1rem 0; font-weight:500;">${l.type}</td>
            <td style="padding:1rem 0; color:var(--hr-text-muted);">${l.from}</td>
            <td style="padding:1rem 0; color:var(--hr-text-muted);">${l.to}</td>
            <td style="padding:1rem 0;">${l.days}</td>
            <td style="padding:1rem 0;">
              <span style="${statusStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem; font-weight:500;">${l.status}</span>
            </td>
            <td style="padding:1rem 0; text-align:right;">
              <div class="row-actions" style="display:flex; justify-content:flex-end; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
                ${l.status === 'Pending' ? `
                  <button class="hr-icon-btn" onclick="window.UI.openLeaveActionModal('Approve', '${l.name}')" style="font-size:0.75rem; border:1px solid #10B981; color:#10B981; padding:0.25rem 0.5rem; border-radius:6px;">Approve</button>
                  <button class="hr-icon-btn" onclick="window.UI.openLeaveActionModal('Reject', '${l.name}')" style="font-size:0.75rem; border:1px solid #EF4444; color:#EF4444; padding:0.25rem 0.5rem; border-radius:6px;">Reject</button>
                ` : ''}
                <button class="hr-icon-btn" onclick="window.UI.openLeaveDrawer('${l.name}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">Details</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      document.querySelectorAll('#hrLeavesTableBody tr').forEach(tr => {
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
    tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Failed to load leaves.</td></tr>`;
  }
};

if (window.UI) {
  window.UI.toggleLeaveView = function(view) {
    const tableBtn = document.getElementById('lvToggleTable');
    const calBtn = document.getElementById('lvToggleCalendar');
    const tableContainer = document.getElementById('lvTableViewContainer');
    const calContainer = document.getElementById('lvCalendarViewContainer');

    if(view === 'table') {
      tableBtn.classList.add('active');
      tableBtn.style.background = 'white';
      tableBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      calBtn.classList.remove('active');
      calBtn.style.background = 'transparent';
      calBtn.style.boxShadow = 'none';

      tableContainer.classList.remove('hidden');
      calContainer.classList.add('hidden');
    } else {
      calBtn.classList.add('active');
      calBtn.style.background = 'white';
      calBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      tableBtn.classList.remove('active');
      tableBtn.style.background = 'transparent';
      tableBtn.style.boxShadow = 'none';

      calContainer.classList.remove('hidden');
      tableContainer.classList.add('hidden');
    }
  };

  window.UI.openLeaveDrawer = function(name) {
    document.getElementById('lvDrawerName').innerText = name;
    window.UI.switchLeaveTab('overview');
    const drawer = document.getElementById('hrLeaveDrawer');
    drawer.classList.remove('hidden');
    drawer.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      drawer.style.transform = 'translateX(0)';
    });
  };

  window.UI.closeLeaveDrawer = function() {
    const drawer = document.getElementById('hrLeaveDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => drawer.classList.add('hidden'), 300);
  };

  window.UI.switchLeaveTab = function(tabName) {
    const tabs = document.querySelectorAll('#hrLeaveDrawer .hr-tab');
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

    document.querySelectorAll('#hrLeaveDrawer .lv-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`lv-tab-${tabName}`).classList.remove('hidden');
  };

  window.UI.openLeaveActionModal = function(action, name) {
    document.getElementById('lvActionTitle').innerText = `${action} Leave - ${name}`;
    const btn = document.getElementById('lvActionConfirmBtn');
    btn.innerText = action;
    btn.style.background = action === 'Approve' ? '#10B981' : '#EF4444';
    
    document.getElementById('hrLeaveActionModal').classList.remove('hidden');
  };

  window.UI.closeLeaveActionModal = function() {
    document.getElementById('hrLeaveActionModal').classList.add('hidden');
  };

  window.UI.submitLeaveAction = function() {
    const action = document.getElementById('lvActionConfirmBtn').innerText;
    window.UI.closeLeaveActionModal();
    window.UI.toast(`Leave ${action}d Successfully`, action === 'Approve' ? 'success' : 'error');
  };
}
