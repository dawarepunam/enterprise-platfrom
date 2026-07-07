const socket = io();

function switchSection(sectionId, btn = null) {
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(`section-${sectionId}`).classList.add('active');
  
  if (btn) {
    document.querySelectorAll('.table-container .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    // If triggered from card click
    document.querySelectorAll('.table-container .tab-btn').forEach(b => {
      if(b.textContent.toLowerCase().includes(sectionId)) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const approvePopup = document.getElementById('approvePopup');
  const closeApproveBtn = document.getElementById('closeApproveBtn');
  const cancelApproveBtn = document.getElementById('cancelApproveBtn');
  const approveForm = document.getElementById('approveForm');

  function openApprovePopup(amount, title = "Approve Request") {
    document.getElementById('approvePopupTitle').textContent = title;
    document.getElementById('approveAmount').value = amount;
    approvePopup.classList.add('active');
  }

  function closePopup() { approvePopup.classList.remove('active'); }

  closeApproveBtn.addEventListener('click', closePopup);
  cancelApproveBtn.addEventListener('click', closePopup);
  approvePopup.addEventListener('click', (e) => { if(e.target === approvePopup) closePopup(); });

  approveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Request Approved Successfully', 'success');
    socket.emit('dashboardUpdate', { event: 'approval' });
    closePopup();
  });

  function renderTables() {
    // Bonuses
    const bonusesBody = document.getElementById('bonusesTableBody');
    bonusesBody.innerHTML = `
      <tr>
        <td><strong>Alice Johnson</strong></td>
        <td>$5000</td>
        <td><span class="status-badge status-pending">Pending</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn approve-btn" onclick="openApprovePopup(5000, 'Approve Bonus')"><i class="fas fa-check"></i></button>
            <button class="action-btn text-danger"><i class="fas fa-times"></i></button>
            <button class="action-btn"><i class="fas fa-history"></i></button>
          </div>
        </td>
      </tr>
    `;

    // Arrears
    const arrearsBody = document.getElementById('arrearsTableBody');
    arrearsBody.innerHTML = `
      <tr>
        <td><strong>Bob Smith</strong></td>
        <td>$1200</td>
        <td>2 Months</td>
        <td><span class="status-badge status-pending">Pending</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn approve-btn" onclick="openApprovePopup(1200, 'Approve Arrears')"><i class="fas fa-check"></i></button>
            <button class="action-btn text-danger"><i class="fas fa-times"></i></button>
          </div>
        </td>
      </tr>
    `;

    // Loans
    const loansBody = document.getElementById('loansTableBody');
    loansBody.innerHTML = `
      <tr>
        <td><strong>Charlie Davis</strong></td>
        <td>$10000</td>
        <td>$500</td>
        <td>$8000</td>
        <td><span class="status-badge status-success">Active</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn"><i class="fas fa-eye"></i></button>
            <button class="action-btn"><i class="fas fa-history"></i></button>
          </div>
        </td>
      </tr>
    `;
  }

  // Attach global function for inline onclick
  window.openApprovePopup = openApprovePopup;
  window.switchSection = switchSection;

  renderTables();
});
