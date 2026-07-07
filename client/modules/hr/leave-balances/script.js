window.init_hr_leave_balances = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Leave Balances';
  
  const tbody = document.getElementById('hrLBTableBody');
  try {
    setTimeout(() => {
      const data = [
        { emp: 'Rahul Sharma', id: 'EMP001', type: 'Casual Leave', used: 4, rem: 8, cf: 2 },
        { emp: 'Rahul Sharma', id: 'EMP001', type: 'Sick Leave', used: 1, rem: 5, cf: 0 },
        { emp: 'Priya Patel', id: 'EMP002', type: 'Casual Leave', used: 2, rem: 10, cf: 0 },
        { emp: 'Amit Verma', id: 'EMP003', type: 'Paid Leave', used: 5, rem: 15, cf: 5 },
      ];

      tbody.innerHTML = data.map(d => {
        return `
          <tr class="hr-table-row hoverable" style="border-bottom:1px solid var(--hr-border);">
            <td style="padding:1rem;">
              <div style="font-weight:500;">${d.emp}</div>
              <div style="font-size:0.75rem; color:var(--hr-text-muted);">${d.id}</div>
            </td>
            <td style="padding:1rem; font-weight:500;">${d.type}</td>
            <td style="padding:1rem; color:#EF4444; font-weight:500;">${d.used}</td>
            <td style="padding:1rem; color:#10B981; font-weight:500;">${d.rem}</td>
            <td style="padding:1rem; color:var(--hr-text-muted);">${d.cf}</td>
            <td style="padding:1rem;">
              <div class="row-actions" style="display:flex; gap:0.5rem; opacity:0; transition:opacity 0.2s;">
                <button class="hr-icon-btn" onclick="window.UI.openAdjustBalanceModal('${d.emp}', '${d.type}')" style="font-size:0.75rem; border:1px solid var(--hr-primary); color:var(--hr-primary); padding:0.25rem 0.5rem; border-radius:6px;">Adjust</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      document.querySelectorAll('#hrLBTableBody tr').forEach(tr => {
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
    tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load balances.</td></tr>`;
  }
};

if (window.UI) {
  window.UI.openAdjustBalanceModal = function(emp, type) {
    document.getElementById('adjEmpName').innerText = emp;
    document.getElementById('adjType').value = type;
    document.getElementById('hrAdjustBalanceModal').classList.remove('hidden');
  };

  window.UI.closeAdjustBalanceModal = function() {
    document.getElementById('hrAdjustBalanceModal').classList.add('hidden');
  };

  window.UI.submitAdjustBalance = function() {
    window.UI.closeAdjustBalanceModal();
    window.UI.toast('Leave Balance Updated Successfully', 'success');
  };
}
