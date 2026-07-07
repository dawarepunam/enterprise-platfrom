window.init_hr_compoff = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Comp-Off';
  
  const tbody = document.getElementById('hrCompOffTableBody');
  try {
    setTimeout(() => {
      const data = [
        { emp: 'Rahul Sharma', id: 'EMP001', balance: 2, expiry: '30 Jun 2026' },
        { emp: 'Priya Patel', id: 'EMP002', balance: 1, expiry: '15 Jun 2026' },
      ];

      tbody.innerHTML = data.map(d => {
        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem;">
              <div style="font-weight:500;">${d.emp}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
            </td>
            <td style="padding:1rem; font-weight:500;">${d.balance}</td>
            <td style="padding:1rem; color:var(--hr-text-muted);">${d.expiry}</td>
          </tr>
        `;
      }).join('');
    }, 300);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Failed to load comp-off balances.</td></tr>`;
  }
};

if (window.UI) {
  window.UI.openAssignCompOffModal = function() {
    document.getElementById('hrAssignCompOffModal').classList.remove('hidden');
  };

  window.UI.closeAssignCompOffModal = function() {
    document.getElementById('hrAssignCompOffModal').classList.add('hidden');
  };

  window.UI.submitAssignCompOff = function() {
    window.UI.closeAssignCompOffModal();
    window.UI.toast('Comp-Off Balance Updated', 'success');
  };
}
