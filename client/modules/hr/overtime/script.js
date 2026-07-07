window.init_hr_overtime = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Overtime';
  
  const tbody = document.getElementById('hrOvertimeTableBody');
  try {
    setTimeout(() => {
      const data = [
        { emp: 'Rahul Sharma', id: 'EMP001', date: '15 May 2026', hours: '04:30', reason: 'Client Meeting', status: 'Pending' },
        { emp: 'Priya Patel', id: 'EMP002', date: '14 May 2026', hours: '03:15', reason: 'Project Work', status: 'Approved' },
        { emp: 'Amit Verma', id: 'EMP003', date: '12 May 2026', hours: '02:00', reason: 'Server Maintenance', status: 'Paid' },
      ];

      tbody.innerHTML = data.map(d => {
        let sStyle = d.status === 'Approved' ? 'background:#D1FAE5; color:#065F46;' : d.status === 'Paid' ? 'background:#DBEAFE; color:#1E40AF;' : 'background:#FEF3C7; color:#B45309;';
        
        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem;">
              <div style="font-weight:500;">${d.emp}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
            </td>
            <td style="padding:1rem; color:var(--hr-text-muted);">${d.date}</td>
            <td style="padding:1rem; font-weight:500;">${d.hours}</td>
            <td style="padding:1rem; color:var(--hr-text-muted);">${d.reason}</td>
            <td style="padding:1rem;">
              <span style="${sStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem;">${d.status}</span>
            </td>
            <td style="padding:1rem; text-align:right;">
              <div class="row-actions" style="display:flex; justify-content:flex-end; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
                ${d.status === 'Pending' ? `
                  <button class="hr-icon-btn" onclick="window.UI.toast('Overtime Approved! Payroll synced automatically.', 'success')" style="font-size:0.75rem; border:1px solid #10B981; color:#10B981; padding:0.25rem 0.5rem; border-radius:6px;">Approve</button>
                  <button class="hr-icon-btn" onclick="window.UI.toast('Overtime Rejected', 'error')" style="font-size:0.75rem; border:1px solid #EF4444; color:#EF4444; padding:0.25rem 0.5rem; border-radius:6px;">Reject</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      document.querySelectorAll('#hrOvertimeTableBody tr').forEach(tr => {
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
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load overtime.</td></tr>`;
  }
};
