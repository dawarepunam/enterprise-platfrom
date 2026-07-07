window.init_hr_holidays = async function() {
  document.getElementById('hrBreadcrumb').innerText = 'Dashboard > Workforce > Holiday Calendar';
};

if (window.UI) {
  window.UI.openHolidayDrawer = function(name, date, type) {
    document.getElementById('hdTitle').innerText = name;
    document.getElementById('hdDate').innerText = date;
    document.getElementById('hdType').innerText = type;

    const drawer = document.getElementById('hrHolidayDrawer');
    drawer.classList.remove('hidden');
    drawer.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      drawer.style.transform = 'translateX(0)';
    });
  };

  window.UI.closeHolidayDrawer = function() {
    const drawer = document.getElementById('hrHolidayDrawer');
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => drawer.classList.add('hidden'), 300);
  };

  window.UI.openAddHolidayModal = function() {
    document.getElementById('hrAddHolidayModal').classList.remove('hidden');
  };

  window.UI.closeAddHolidayModal = function() {
    document.getElementById('hrAddHolidayModal').classList.add('hidden');
  };

  window.UI.submitAddHoliday = function() {
    window.UI.closeAddHolidayModal();
    window.UI.toast('Holiday Added Successfully', 'success');
  };
}
