window.init_hr_designations = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Designations';
  const grid = document.getElementById('hrDesignationsGrid');
  
  try {
    setTimeout(() => {
      const roles = [
        { id: 'intern', name: 'Intern', count: 5, color: '#94A3B8' },
        { id: 'executive', name: 'Executive', count: 62, color: '#3B82F6' },
        { id: 'sr-executive', name: 'Sr. Executive', count: 45, color: '#8B5CF6' },
        { id: 'team-lead', name: 'Team Lead', count: 28, color: '#10B981' },
        { id: 'manager', name: 'Manager', count: 25, color: '#F59E0B' },
        { id: 'sr-manager', name: 'Sr. Manager', count: 12, color: '#EC4899' },
        { id: 'director', name: 'Director', count: 6, color: '#EF4444' }
      ];

      grid.innerHTML = roles.map(r => `
        <div class="hr-card hoverable" style="cursor:pointer; display:flex; flex-direction:column; padding:1.5rem;" onclick="window.App.navigate('/hr/designations/${r.id}')">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
            <div style="width:40px; height:40px; border-radius:10px; background:${r.color}20; color:${r.color}; display:flex; justify-content:center; align-items:center; font-size:1.25rem;">
              🏷️
            </div>
            <div style="font-size:1.5rem; font-weight:700;">${r.count}</div>
          </div>
          <h3 style="margin:0 0 0.5rem 0; color:var(--hr-text-main); font-size:1.1rem;">${r.name}</h3>
          <div style="color:var(--hr-text-muted); font-size:0.875rem;">Employees</div>
        </div>
      `).join('');
    }, 400);

  } catch (error) {
    grid.innerHTML = `<div style="color:red;">Failed to load designations.</div>`;
  }
};

window.init_hr_designation_details = async function() {
  const pathParts = window.location.pathname.split('/');
  const desigId = pathParts[pathParts.length - 1]; 
  
  // Title Case and replace dash
  const desigName = desigId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
  document.getElementById('hrBreadcrumb').innerText = `Dashboard > Designations > ${desigName}`;
  document.getElementById('desigTitle').innerText = desigName;

  setTimeout(() => {
    document.getElementById('desigEmpCount').innerText = desigId === 'manager' ? '25' : '12';

    const employees = [
      { id: 'EMP001', name: 'Rohan Mehta', dept: 'Marketing', date: '10 Mar 2025', status: 'Active' },
      { id: 'EMP012', name: 'Sneha Kulkarni', dept: 'HR', date: '12 Apr 2025', status: 'Active' },
      { id: 'EMP023', name: 'Devansh Singh', dept: 'Development', date: '15 May 2025', status: 'Active' }
    ];

    document.getElementById('desigEmployeeTable').innerHTML = employees.map(emp => {
      return `
        <tr class="hr-hover-row" style="border-bottom:1px solid var(--hr-border); cursor:pointer;" onclick="window.UI.toast('Opening profile for ${emp.name}')">
          <td style="padding:1rem 0;"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random" style="width:36px; height:36px; border-radius:50%;" /></td>
          <td>${emp.id}</td>
          <td><strong>${emp.name}</strong></td>
          <td>${emp.dept}</td>
          <td>${emp.date}</td>
          <td><span style="background:#D1FAE5; color:#065F46; padding:4px 8px; border-radius:12px; font-size:0.75rem;">${emp.status}</span></td>
        </tr>
      `;
    }).join('');
  }, 300);
};
