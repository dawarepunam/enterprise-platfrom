document.addEventListener('DOMContentLoaded', () => {
  // Set current month
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = monthNames[new Date().getMonth()] + ' ' + new Date().getFullYear();
  document.getElementById('currentMonthText').textContent = 'Month: ' + currentMonth;

  // Initialize Socket.io
  const socket = io();
  
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('payslipGenerated', (data) => {
    showToast(`Payslips generated for ${data.department}`, 'success');
    fetchDashboardStats();
  });

  // Drawer functions
  const drawer = document.getElementById('salaryDrawer');
  const overlay = document.getElementById('salaryDrawerOverlay');
  const closeBtn = document.getElementById('closeSalaryDrawer');

  function openDrawer(employeeId) {
    drawer.classList.add('active');
    overlay.classList.add('active');
    // In real app, fetch salary details for employeeId
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
  }

  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Fetch mock stats and table
  function fetchDashboardStats() {
    // Mock Data
    document.getElementById('processedCount').textContent = '150';
    document.getElementById('pendingCount').textContent = '12';
    document.getElementById('totalSalary').textContent = '$125,000';
    
    document.getElementById('cardProcessedCount').textContent = '150';
    document.getElementById('cardPendingCount').textContent = '12';
  }

  function renderTable() {
    const tbody = document.getElementById('payrollTableBody');
    const mockData = [
      { emp: 'John Doe', dept: 'Engineering', net: '$5000', pf: '$200', tax: '$500', status: 'Processed', statusClass: 'status-success' },
      { emp: 'Jane Smith', dept: 'Marketing', net: '$4500', pf: '$180', tax: '$400', status: 'Pending', statusClass: 'status-pending' },
      { emp: 'Mike Johnson', dept: 'HR', net: '$4000', pf: '$150', tax: '$300', status: 'Processed', statusClass: 'status-success' }
    ];

    tbody.innerHTML = mockData.map(row => `
      <tr>
        <td>${row.emp}</td>
        <td>${row.dept}</td>
        <td>${row.net}</td>
        <td>${row.pf}</td>
        <td>${row.tax}</td>
        <td><span class="status-badge ${row.statusClass}">${row.status}</span></td>
        <td>
          <div class="action-btns">
            <button class="action-btn view-salary-btn" title="View Salary"><i class="fas fa-eye"></i></button>
            <button class="action-btn" title="Generate Payslip" onclick="showToast('Payslip Generating...', 'info')"><i class="fas fa-file-invoice"></i></button>
            <button class="action-btn" title="History"><i class="fas fa-history"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach events to dynamic buttons
    document.querySelectorAll('.view-salary-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDrawer();
      });
    });
  }

  fetchDashboardStats();
  renderTable();
  
  // Simulate loading delay for better UX
  setTimeout(() => showToast('Dashboard loaded successfully', 'success'), 500);
});
