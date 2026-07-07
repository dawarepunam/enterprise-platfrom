window.init_hr_profile = async function() {
  const urlParams = new URLSearchParams(window.location.search);
  const empId = urlParams.get('id') || 'EMP001';
  
  document.getElementById('hrBreadcrumb').innerText = `Dashboard > Employees > ${empId}`;
  
  try {
    // In a real scenario, fetch employee data: HRAPI.getEmployee(empId)
    // Mock Data Update
    document.getElementById('profileName').innerText = empId === 'EMP001' ? 'Rahul Sharma' : 'Employee Name';
    document.getElementById('profileDesignation').innerText = 'Software Engineer';
    document.getElementById('profileId').innerText = empId;
    document.getElementById('profileDept').innerText = 'Development';
    document.getElementById('profileEmail').innerText = 'rahul.s@jmkc.com';
    document.getElementById('profilePhone').innerText = '+91 9876543210';
    document.getElementById('profileJoinDate').innerText = '10 May 2026';
    
    document.getElementById('profilePhoto').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('profileName').innerText)}&background=random`;
    
  } catch (error) {
    console.error("Failed to load profile", error);
  }
};

// Extend UIManager for Profile specific actions
if(window.UI) {
  window.UI.switchProfileTab = function(tabName) {
    // Reset tabs
    document.querySelectorAll('.hr-profile-tab').forEach(t => {
      t.classList.remove('active');
      t.style.color = 'var(--hr-text-muted)';
      t.style.borderBottom = 'none';
    });
    
    // Hide all panes
    document.querySelectorAll('.hr-profile-pane').forEach(p => p.classList.add('hidden'));
    
    // Activate target
    const activeTab = Array.from(document.querySelectorAll('.hr-profile-tab')).find(t => t.innerText.toLowerCase().includes(tabName));
    if(activeTab) {
      activeTab.classList.add('active');
      activeTab.style.color = 'var(--hr-primary)';
      activeTab.style.borderBottom = '2px solid var(--hr-primary)';
    }
    
    const targetPane = document.getElementById('profile-tab-' + tabName);
    if(targetPane) targetPane.classList.remove('hidden');
  };
}
