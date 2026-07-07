window.init_hr_attendance_exceptions = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Attendance Exceptions';
  
  const tbody = document.getElementById('hrAttExceptionsTableBody');
  try {
    setTimeout(() => {
      const data = [
        { emp: 'Priya Patel', id: 'EMP002', date: '15 May 2026', type: 'Missing Punch', details: 'No Check-Out' },
        { emp: 'Amit Verma', id: 'EMP003', date: '16 May 2026', type: 'Short Hours', details: 'Logged 6h 15m' },
      ];

      tbody.innerHTML = data.map(d => {
        let tStyle = d.type === 'Missing Punch' ? 'color:#EF4444;' : 'color:#F59E0B;';
        
        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem;">
              <div style="font-weight:500;">${d.emp}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
            </td>
            <td style="padding:1rem; color:var(--hr-text-muted);">${d.date}</td>
            <td style="padding:1rem; font-weight:500; ${tStyle}">${d.type}</td>
            <td style="padding:1rem; color:var(--hr-text-muted);">${d.details}</td>
            <td style="padding:1rem;">
              <button class="hr-icon-btn" onclick="window.UI.openResolveExceptionModal('${d.emp}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">Resolve</button>
            </td>
          </tr>
        `;
      }).join('');
    }, 300);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Failed to load exceptions.</td></tr>`;
  }
};

if (window.UI) {
  window.UI.openResolveExceptionModal = function(emp) {
    document.getElementById('excEmpName').innerText = emp;
    document.getElementById('hrResolveExceptionModal').classList.remove('hidden');
  };

  window.UI.closeResolveExceptionModal = function() {
    document.getElementById('hrResolveExceptionModal').classList.add('hidden');
  };

  window.UI.submitResolveException = function() {
    window.UI.closeResolveExceptionModal();
    window.UI.toast('Exception Resolved', 'success');
  };
}
