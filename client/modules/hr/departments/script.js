window.init_hr_departments = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Departments';
  const grid = document.getElementById('hrDepartmentsGrid');
  
  try {
    // Simulated API call with loading skeleton delay
    setTimeout(() => {
      const depts = [
        { id: 'hr', name: 'HR', count: 25, manager: 'Punam', color: '#3B82F6' },
        { id: 'marketing', name: 'Marketing', count: 38, manager: 'Amit Verma', color: '#8B5CF6' },
        { id: 'sales', name: 'Sales', count: 35, manager: 'Neha Patil', color: '#10B981' },
        { id: 'calling', name: 'Calling', count: 22, manager: 'Priya Mehta', color: '#F59E0B' },
        { id: 'development', name: 'Development', count: 48, manager: 'Rahul Sharma', color: '#EC4899' },
        { id: 'finance', name: 'Finance', count: 20, manager: 'Sanjay Rao', color: '#14B8A6' },
        { id: 'support', name: 'Support', count: 29, manager: 'Kiran Desai', color: '#6366F1' }
      ];

      grid.innerHTML = depts.map(d => `
        <div class="hr-card hoverable" style="cursor:pointer; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:2rem;" onclick="window.App.navigate('/hr/departments/${d.id}')">
          <div style="width:60px; height:60px; border-radius:15px; background:${d.color}20; color:${d.color}; display:flex; justify-content:center; align-items:center; font-size:2rem; margin-bottom:1rem;">
            🏢
          </div>
          <h3 style="margin:0 0 0.5rem 0; color:var(--hr-text-main);">${d.name}</h3>
          <div style="color:var(--hr-text-muted); margin-bottom:1rem;">${d.count} Employees</div>
          <div style="font-size:0.875rem; border-top:1px solid var(--hr-border); width:100%; padding-top:1rem; color:var(--hr-text-muted);">
            Manager: <strong>${d.manager}</strong>
          </div>
        </div>
      `).join('');
    }, 500); // skeleton display time

  } catch (error) {
    grid.innerHTML = `<div style="color:red;">Failed to load departments.</div>`;
  }
};

window.init_hr_department_details = async function() {
  const pathParts = window.location.pathname.split('/');
  const deptId = pathParts[pathParts.length - 1]; // e.g. 'marketing'
  
  // Title Case
  const deptName = deptId.charAt(0).toUpperCase() + deptId.slice(1);
  
  document.getElementById('hrBreadcrumb').innerText = `Dashboard > Departments > ${deptName}`;
  document.getElementById('deptTitle').innerText = `${deptName} Department`;

  // Mock data population
  setTimeout(() => {
    document.getElementById('deptEmpCount').innerText = deptId === 'marketing' ? '38' : '25';
    document.getElementById('deptManager').innerText = deptId === 'marketing' ? 'Amit Verma' : 'Punam';
    document.getElementById('deptPerformance').innerText = '89%';
    
    document.getElementById('deptManagerName').innerText = deptId === 'marketing' ? 'Amit Verma' : 'Punam';
    document.getElementById('deptManagerEmail').innerText = `${deptId === 'marketing' ? 'amit' : 'punam'}@jmkc.com`;
    document.getElementById('deptManagerPhone').innerText = '+91 9000000000';
    document.getElementById('deptManagerPhoto').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('deptManagerName').innerText)}&background=random`;

    const employees = [
      { name: 'Rohan Mehta', role: 'Executive', status: 'Active' },
      { name: 'Sneha Kulkarni', role: 'Sr. Executive', status: 'Active' },
      { name: 'Vikram Joshi', role: 'Executive', status: 'On Leave' }
    ];

    document.getElementById('deptEmployeeTable').innerHTML = employees.map(emp => {
      let statusStyle = 'background:#D1FAE5; color:#065F46;';
      if(emp.status === 'On Leave') statusStyle = 'background:#FEF3C7; color:#B45309;';
      return `
        <tr class="hr-hover-row" style="border-bottom:1px solid var(--hr-border); cursor:pointer;" onclick="window.UI.toast('Opening drawer for ${emp.name}')">
          <td style="padding:1rem 0;"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random" style="width:36px; height:36px; border-radius:50%;" /></td>
          <td><strong>${emp.name}</strong></td>
          <td>${emp.role}</td>
          <td><span style="${statusStyle} padding:4px 8px; border-radius:12px; font-size:0.75rem;">${emp.status}</span></td>
        </tr>
      `;
    }).join('');
  }, 300);
};
