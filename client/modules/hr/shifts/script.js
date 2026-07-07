window.init_hr_shifts = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Shift Management';
};

if (window.UI) {
  window.UI.openShiftDetails = function(shiftName, empCount) {
    document.getElementById('shiftsDashboard').classList.add('hidden');
    document.getElementById('shiftDetailsView').classList.remove('hidden');
    
    document.getElementById('shiftDetailTitle').innerText = `${shiftName} Details`;
    document.getElementById('shiftTotalEmp').innerText = empCount;

    // Mock data for table based on shift
    const tbody = document.getElementById('hrShiftTableBody');
    const mockData = [
      { id: 'EMP001', name: 'Rahul Sharma', dept: 'Sales', timing: '09:00 AM - 06:00 PM', status: 'Active' },
      { id: 'EMP002', name: 'Priya Patel', dept: 'Marketing', timing: '09:30 AM - 06:30 PM', status: 'Active' },
      { id: 'EMP003', name: 'Amit Verma', dept: 'Development', timing: '10:00 AM - 07:00 PM', status: 'Inactive' }
    ];

    tbody.innerHTML = mockData.map(d => {
      let statusStyle = d.status === 'Active' ? 'color:#10B981; background:#D1FAE5;' : 'color:#64748B; background:#F1F5F9;';
      return `
        <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
          <td style="padding:1rem;">
            <div style="font-weight:500;">${d.name}</div>
            <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
          </td>
          <td style="padding:1rem; color:var(--hr-text-muted);">${d.dept}</td>
          <td style="padding:1rem; font-weight:500;">${d.timing}</td>
          <td style="padding:1rem;">
            <span style="${statusStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem;">${d.status}</span>
          </td>
          <td style="padding:1rem; text-align:right;">
            <div class="row-actions" style="display:flex; justify-content:flex-end; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
              <button class="hr-icon-btn" onclick="window.UI.openChangeShiftModal('${d.name}', '${shiftName}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">Change Shift</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('#hrShiftTableBody tr').forEach(tr => {
      tr.addEventListener('mouseenter', () => {
        const actions = tr.querySelector('.row-actions');
        if(actions) actions.style.opacity = '1';
      });
      tr.addEventListener('mouseleave', () => {
        const actions = tr.querySelector('.row-actions');
        if(actions) actions.style.opacity = '0';
      });
    });
  };

  window.UI.closeShiftDetails = function() {
    document.getElementById('shiftDetailsView').classList.add('hidden');
    document.getElementById('shiftsDashboard').classList.remove('hidden');
  };

  window.UI.openChangeShiftModal = function(empName, currentShift) {
    document.getElementById('changeShiftEmpName').innerText = empName;
    document.getElementById('changeShiftCurrent').value = currentShift;
    document.getElementById('hrChangeShiftModal').classList.remove('hidden');
  };

  window.UI.closeChangeShiftModal = function() {
    document.getElementById('hrChangeShiftModal').classList.add('hidden');
  };

  window.UI.submitChangeShift = function() {
    window.UI.closeChangeShiftModal();
    window.UI.toast('Shift Updated Successfully', 'success');
  };
}
