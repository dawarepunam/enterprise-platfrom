window.init_hr_attendance = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Attendance';
  const tbody = document.getElementById('hrAttendanceTableBody');
  
  try {
    setTimeout(() => {
      const logs = [
        { id: 'EMP001', name: 'Rahul Sharma', dept: 'Sales', checkIn: '09:05 AM', checkOut: '06:15 PM', hours: '09:10', status: 'Present' },
        { id: 'EMP002', name: 'Priya Patel', dept: 'Marketing', checkIn: '09:25 AM', checkOut: '06:30 PM', hours: '09:05', status: 'Late' },
        { id: 'EMP003', name: 'Amit Verma', dept: 'Development', checkIn: '-', checkOut: '-', hours: '00:00', status: 'Absent' },
        { id: 'EMP004', name: 'Sneha Singh', dept: 'HR', checkIn: '09:10 AM', checkOut: '06:20 PM', hours: '09:10', status: 'WFH' },
        { id: 'EMP005', name: 'Vikram Das', dept: 'Sales', checkIn: '09:00 AM', checkOut: '06:00 PM', hours: '09:00', status: 'Present' }
      ];

      // Quick filter check from URL
      const urlParams = new URLSearchParams(window.location.search);
      const statusFilter = urlParams.get('status');
      let filteredLogs = logs;
      
      if(statusFilter) {
        filteredLogs = logs.filter(l => l.status.toLowerCase() === statusFilter.toLowerCase());
      }

      tbody.innerHTML = filteredLogs.map(l => {
        let statusStyle = '';
        if(l.status === 'Present') statusStyle = 'background:#D1FAE5; color:#065F46; border:1px solid #34D399;';
        if(l.status === 'Late') statusStyle = 'background:#FEF3C7; color:#B45309; border:1px solid #FBBF24;';
        if(l.status === 'Absent') statusStyle = 'background:#FEE2E2; color:#B91C1C; border:1px solid #F87171;';
        if(l.status === 'WFH') statusStyle = 'background:#DBEAFE; color:#1E40AF; border:1px solid #60A5FA;';

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
            <td style="padding:1rem 0; color:var(--hr-text-muted);">${l.dept}</td>
            <td style="padding:1rem 0;">${l.checkIn}</td>
            <td style="padding:1rem 0;">${l.checkOut}</td>
            <td style="padding:1rem 0; font-weight:500;">${l.hours}</td>
            <td style="padding:1rem 0;">
              <span style="${statusStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem; font-weight:500;">${l.status}</span>
            </td>
            <td style="padding:1rem 0; text-align:right;">
              <div class="row-actions" style="display:flex; justify-content:flex-end; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
                <button class="hr-icon-btn" onclick="window.UI.openAttendanceDrawer('${l.name}', '${l.id}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">Logs</button>
                <button class="hr-icon-btn" onclick="window.UI.openRegularizeModal()" style="font-size:0.75rem; border:1px solid #F59E0B; color:#F59E0B; padding:0.25rem 0.5rem; border-radius:6px;">Regularize</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Add hover effect to rows to show actions
      document.querySelectorAll('#hrAttendanceTableBody tr').forEach(tr => {
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

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center; padding:1rem;">Failed to load attendance logs.</td></tr>`;
  }
};

// UI Manager Extensions for Attendance
if (window.UI) {
  window.UI.openAttendanceDrawer = function(name, id) {
    document.getElementById('drawerAttName').innerText = name;
    document.getElementById('drawerAttId').innerText = id;
    
    // Reset to today tab
    window.UI.switchAttTab('today');
    
    document.getElementById('hrAttendanceDrawer').classList.remove('hidden');
    // Animate slide in
    const drawer = document.getElementById('hrAttendanceDrawer');
    drawer.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      drawer.style.transform = 'translateX(0)';
    });
  };

  window.UI.closeAttendanceDrawer = function() {
    const drawer = document.getElementById('hrAttendanceDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => {
      drawer.classList.add('hidden');
    }, 300);
  };

  window.UI.switchAttTab = function(tabName) {
    // Update tab UI
    const tabs = document.querySelectorAll('#hrAttendanceDrawer .hr-tab');
    tabs.forEach(t => {
      t.classList.remove('active');
      t.style.color = 'var(--hr-text-muted)';
      t.style.borderBottom = 'none';
      t.style.fontWeight = 'normal';
    });
    const activeTab = Array.from(tabs).find(t => t.innerText.toLowerCase().includes(tabName) || t.innerText.toLowerCase() === tabName);
    if(activeTab) {
      activeTab.classList.add('active');
      activeTab.style.color = 'var(--hr-primary)';
      activeTab.style.borderBottom = '2px solid var(--hr-primary)';
      activeTab.style.fontWeight = '500';
    }

    // Show correct pane
    document.querySelectorAll('#hrAttendanceDrawer .att-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`att-tab-${tabName}`).classList.remove('hidden');
  };

  window.UI.openRegularizeModal = function() {
    document.getElementById('hrRegularizeModal').classList.remove('hidden');
  };

  window.UI.closeRegularizeModal = function() {
    document.getElementById('hrRegularizeModal').classList.add('hidden');
  };

  window.UI.submitRegularization = function() {
    window.UI.closeRegularizeModal();
    window.UI.toast('Attendance Updated Successfully', 'success');
  };
}
