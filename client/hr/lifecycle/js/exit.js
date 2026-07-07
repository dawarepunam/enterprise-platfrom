document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const tbody = document.getElementById('exitTableBody');

  socket.on('exitInitiated', () => {
    fetchExitRecords();
  });

  socket.on('exitUpdated', () => {
    fetchExitRecords();
  });

  async function fetchExitRecords() {
    try {
      const res = await fetch('/api/lifecycle/exits');
      const records = await res.json();
      renderTable(records);
    } catch (err) {
      console.error('Error fetching exit records:', err);
    }
  }

  function renderTable(records) {
    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No active exit records found.</td></tr>';
      return;
    }

    tbody.innerHTML = records.map(row => {
      const lastDay = new Date(row.lastWorkingDay).toLocaleDateString();
      const empName = row.employeeId ? row.employeeId.name : 'Unknown';
      
      const ktClass = row.ktStatus === 'Completed' ? 'status-success' : 'status-pending';
      const clrClass = row.clearanceStatus === 'Cleared' ? 'status-success' : 'status-danger';

      return \`
        <tr>
          <td><strong>\${empName}</strong></td>
          <td>\${lastDay}</td>
          <td><span class="status-badge \${ktClass}">\${row.ktStatus}</span></td>
          <td><span class="status-badge \${clrClass}">\${row.clearanceStatus}</span></td>
          <td>\${row.status}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn" title="View Checklist" onclick="showToast('Loading Checklist...', 'info')"><i class="fas fa-list-check"></i></button>
            </div>
          </td>
        </tr>
      \`;
    }).join('');
  }

  fetchExitRecords();
});
