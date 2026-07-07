window.init_hr_directory = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Employees > Directory';
  
  try {
    // In a real scenario, fetch from HRAPI.getEmployees()
    // For now, use mock data to populate the table for visual confirmation
    const employees = [
      { id: 'EMP001', name: 'Rahul Sharma', email: 'rahul.s@jmkc.com', phone: '+91 9876543210', dept: 'Development', role: 'Developer', manager: 'Amit Verma', joinDate: '10 May 2026', status: 'Active' },
      { id: 'EMP002', name: 'Priya Mehta', email: 'priya.m@jmkc.com', phone: '+91 9876543211', dept: 'Marketing', role: 'Executive', manager: 'Neha Patil', joinDate: '12 May 2026', status: 'Active' },
      { id: 'EMP003', name: 'Amit Verma', email: 'amit.v@jmkc.com', phone: '+91 9876543212', dept: 'Sales', role: 'Sales Executive', manager: 'Rahul Sharma', joinDate: '14 May 2026', status: 'Active' },
      { id: 'EMP004', name: 'Neha Patil', email: 'neha.p@jmkc.com', phone: '+91 9876543213', dept: 'HR', role: 'HR Executive', manager: 'Priya Mehta', joinDate: '16 May 2026', status: 'On Leave' },
      { id: 'EMP006', name: 'Anjali Desai', email: 'anjali.d@jmkc.com', phone: '+91 9876543215', dept: 'Product', role: 'Product Manager', manager: 'Amit Verma', joinDate: '22 May 2026', status: 'Inactive' }
    ];
    
    renderEmployeeTable(employees);
  } catch (error) {
    console.error("Failed to load employees", error);
  }
};

function renderEmployeeTable(employees) {
  const tbody = document.getElementById('hrEmployeeTableBody');
  if (!employees || employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem;">No employees found.</td></tr>';
    return;
  }

  tbody.innerHTML = employees.map(emp => {
    let statusStyle = 'background:#D1FAE5; color:#065F46;'; // Active green
    if(emp.status === 'Inactive') statusStyle = 'background:#FEE2E2; color:#B91C1C;'; // Red
    if(emp.status === 'On Leave' || emp.status === 'Notice Period') statusStyle = 'background:#FEF3C7; color:#B45309;'; // Yellow

    return `
      <tr class="hr-hover-row" style="border-bottom:1px solid var(--hr-border); cursor:pointer;" onclick="window.UI.openEmployeeDrawer('${emp.id}')">
        <td style="padding:1rem 0;"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random" style="width:36px; height:36px; border-radius:50%;" /></td>
        <td>${emp.id}</td>
        <td><strong>${emp.name}</strong></td>
        <td>${emp.dept}</td>
        <td>${emp.role}</td>
        <td>${emp.manager}</td>
        <td>${emp.joinDate}</td>
        <td><span style="${statusStyle} padding:4px 8px; border-radius:12px; font-size:0.75rem;">${emp.status}</span></td>
        <td onclick="event.stopPropagation();">
           <button class="hr-icon-btn" title="View" onclick="window.UI.openEmployeeDrawer('${emp.id}')">👁️</button>
           <button class="hr-icon-btn" title="Edit">✏️</button>
           <button class="hr-icon-btn" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Extend UIManager for Directory specific actions
if(window.UI) {
  window.UI.openEmployeeDrawer = function(empId) {
    const drawer = document.getElementById('hrEmployeeDrawer');
    
    // In real app, fetch employee details based on empId
    // Mock update:
    document.getElementById('drawerEmpName').innerText = 'Loading...';
    setTimeout(() => {
      document.getElementById('drawerEmpName').innerText = 'Employee Name'; // Mocked
      document.getElementById('drawerEmpEmail').innerText = 'employee@jmkc.com';
      document.getElementById('drawerEmpPhone').innerText = '+91 9876543210';
      document.getElementById('drawerEmpMeta').innerText = `${empId} - Developer`;
    }, 200);

    drawer.classList.remove('hidden');
    setTimeout(() => drawer.style.transform = 'translateX(0)', 10);
  };

  window.UI.closeEmployeeDrawer = function() {
    const drawer = document.getElementById('hrEmployeeDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => drawer.classList.add('hidden'), 300);
  };

  window.UI.switchDrawerTab = function(tabName) {
    // Reset all tabs
    document.querySelectorAll('.hr-tab').forEach(t => {
      t.style.color = 'var(--hr-text-muted)';
      t.style.borderBottom = 'none';
      t.style.fontWeight = 'normal';
    });
    
    document.querySelectorAll('.hr-tab-pane').forEach(p => p.classList.add('hidden'));
    
    // Activate target tab
    const activeTab = Array.from(document.querySelectorAll('.hr-tab')).find(t => t.innerText.toLowerCase().includes(tabName));
    if(activeTab) {
      activeTab.style.color = 'var(--hr-primary)';
      activeTab.style.borderBottom = '2px solid var(--hr-primary)';
      activeTab.style.fontWeight = '500';
    }
    
    const targetPane = document.getElementById('tab-' + tabName);
    if(targetPane) targetPane.classList.remove('hidden');
  };
}
