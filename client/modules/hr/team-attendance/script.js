window.init_hr_team_attendance = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Team Attendance';
  
  const tbody = document.getElementById('hrTeamAttTableBody');
  try {
    setTimeout(() => {
      const data = [
        { emp: 'Suresh Kumar', id: 'EMP005', in: '09:00 AM', status: 'Present' },
        { emp: 'Neha Gupta', id: 'EMP006', in: '09:15 AM', status: 'Late' },
        { emp: 'Ravi Singh', id: 'EMP007', in: '-', status: 'On Leave' },
      ];

      tbody.innerHTML = data.map(d => {
        let sStyle = d.status === 'Present' ? 'background:#D1FAE5; color:#065F46;' : d.status === 'On Leave' ? 'background:#FEF3C7; color:#B45309;' : 'background:#FEE2E2; color:#B91C1C;';
        
        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem;">
              <div style="font-weight:500;">${d.emp}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
            </td>
            <td style="padding:1rem; font-weight:500;">${d.in}</td>
            <td style="padding:1rem;">
              <span style="${sStyle} padding:0.25rem 0.75rem; border-radius:12px; font-size:0.75rem;">${d.status}</span>
            </td>
          </tr>
        `;
      }).join('');
    }, 300);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Failed to load team attendance.</td></tr>`;
  }
};
