document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  
  socket.on('payslipGenerated', (data) => {
    showToast(`Payslips generated successfully for ${data.month}`, 'success');
    renderTable(); 
  });

  const emailPopup = document.getElementById('emailPopup');
  const closeEmailBtn = document.getElementById('closeEmailBtn');
  const emailForm = document.getElementById('emailForm');

  const generatePopup = document.getElementById('generatePopup');
  const closeGenerateBtn = document.getElementById('closeGenerateBtn');
  const generateForm = document.getElementById('generateForm');
  const generatePayslipBtn = document.getElementById('generatePayslipBtn');

  const viewDrawer = document.getElementById('viewDrawer');
  const viewDrawerOverlay = document.getElementById('viewDrawerOverlay');
  const closeViewDrawer = document.getElementById('closeViewDrawer');

  function openEmailPopup() { emailPopup.classList.add('active'); }
  function closeEmailPopup() { emailPopup.classList.remove('active'); }

  function openGeneratePopup() { generatePopup.classList.add('active'); }
  function closeGeneratePopup() { generatePopup.classList.remove('active'); }

  function openViewDrawer() {
    viewDrawer.classList.add('active');
    viewDrawerOverlay.classList.add('active');
  }
  function closeDrawer() {
    viewDrawer.classList.remove('active');
    viewDrawerOverlay.classList.remove('active');
  }

  generatePayslipBtn.addEventListener('click', openGeneratePopup);
  closeGenerateBtn.addEventListener('click', closeGeneratePopup);
  closeEmailBtn.addEventListener('click', closeEmailPopup);
  
  generatePopup.addEventListener('click', (e) => { if(e.target === generatePopup) closeGeneratePopup(); });
  emailPopup.addEventListener('click', (e) => { if(e.target === emailPopup) closeEmailPopup(); });
  
  closeViewDrawer.addEventListener('click', closeDrawer);
  viewDrawerOverlay.addEventListener('click', closeDrawer);

  generateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Payslips Generating...', 'info');
    socket.emit('payslipGenerated', { month: 'June 2026' }); // Local demo emit
    closeGeneratePopup();
  });

  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Email Sent Successfully', 'success');
    closeEmailPopup();
  });

  // Month Card filter
  document.querySelectorAll('.month-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.month-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      showToast(`Filtered by ${card.textContent}`, 'info');
      renderTable();
    });
  });

  function renderTable() {
    const tbody = document.getElementById('payslipTableBody');
    const mockData = [
      { emp: 'John Doe', month: 'June 2026', total: '$5000', status: 'Generated', statusClass: 'status-success' },
      { emp: 'Jane Smith', month: 'June 2026', total: '$4500', status: 'Pending Email', statusClass: 'status-pending' }
    ];

    tbody.innerHTML = mockData.map(row => `
      <tr>
        <td><strong>${row.emp}</strong></td>
        <td>${row.month}</td>
        <td>${row.total}</td>
        <td><span class="status-badge ${row.statusClass}">${row.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn view-btn" title="View"><i class="fas fa-eye"></i></button>
            <button class="action-btn download-btn" title="Download"><i class="fas fa-download"></i></button>
            <button class="action-btn email-btn" title="Email"><i class="fas fa-envelope"></i></button>
            <button class="action-btn history-btn" title="History"><i class="fas fa-history"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', openViewDrawer));
    document.querySelectorAll('.email-btn').forEach(btn => btn.addEventListener('click', openEmailPopup));
    document.querySelectorAll('.download-btn').forEach(btn => btn.addEventListener('click', () => showToast('Downloading Payslip...', 'info')));
  }

  renderTable();
});
