document.addEventListener('DOMContentLoaded', () => {
  const downloadPopup = document.getElementById('downloadPopup');
  const closeDownloadBtn = document.getElementById('closeDownloadBtn');
  const downloadForm = document.getElementById('downloadForm');

  const historyModal = document.getElementById('historyModal');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');

  function openDownloadPopup() { downloadPopup.classList.add('active'); }
  function closeDownloadPopup() { downloadPopup.classList.remove('active'); }

  function openHistoryModal() { historyModal.classList.add('active'); }
  function closeHistoryModal() { historyModal.classList.remove('active'); }

  closeDownloadBtn.addEventListener('click', closeDownloadPopup);
  closeHistoryBtn.addEventListener('click', closeHistoryModal);

  downloadPopup.addEventListener('click', (e) => { if(e.target === downloadPopup) closeDownloadPopup(); });
  historyModal.addEventListener('click', (e) => { if(e.target === historyModal) closeHistoryModal(); });

  downloadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Payslip Downloaded Successfully', 'success');
    closeDownloadPopup();
  });

  function renderTable() {
    const tbody = document.getElementById('processedTableBody');
    const mockData = [
      { emp: 'John Doe', salary: '$5000', status: 'Processed', date: '2026-06-20', statusClass: 'status-success' },
      { emp: 'Jane Smith', salary: '$4500', status: 'Pending', date: '2026-06-20', statusClass: 'status-pending' }
    ];

    tbody.innerHTML = mockData.map(row => `
      <tr>
        <td>${row.emp}</td>
        <td>${row.salary}</td>
        <td><span class="status-badge ${row.statusClass}">${row.status}</span></td>
        <td>${row.date}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
            <button class="action-btn download-btn" title="Download Payslip"><i class="fas fa-download"></i></button>
            <button class="action-btn" title="Comments"><i class="fas fa-comment"></i></button>
            <button class="action-btn history-btn" title="History"><i class="fas fa-history"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.download-btn').forEach(btn => btn.addEventListener('click', openDownloadPopup));
    document.querySelectorAll('.history-btn').forEach(btn => btn.addEventListener('click', openHistoryModal));
  }

  renderTable();
});
