window.init_hr_attendance_policies = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Attendance Policies';
};

if (window.UI) {
  window.UI.openPolicyDrawer = function(title) {
    document.getElementById('plcTitle').innerText = `Edit ${title}`;
    const drawer = document.getElementById('hrPolicyDrawer');
    drawer.classList.remove('hidden');
    drawer.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      drawer.style.transform = 'translateX(0)';
    });
  };

  window.UI.closePolicyDrawer = function() {
    const drawer = document.getElementById('hrPolicyDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => drawer.classList.add('hidden'), 300);
  };

  window.UI.submitPolicy = function() {
    window.UI.closePolicyDrawer();
    window.UI.toast('Policy Updated Successfully', 'success');
  };
}
