document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Toggle
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Sidebar Menu Accordion
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // If it has a submenu
      if (item.nextElementSibling && item.nextElementSibling.classList.contains('submenu')) {
        e.preventDefault();
        item.classList.toggle('open');
      } else {
        // Set active state for regular links
        menuItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });

  // Back Button Logic
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.history.back();
    });
  }

  // Drawer Logic (for pages that have right drawers)
  const drawer = document.getElementById('rightDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const closeDrawerBtn = document.getElementById('closeDrawer');
  const openDrawerBtns = document.querySelectorAll('.open-drawer-btn');

  function openDrawer() {
    if(drawer && overlay) {
      drawer.classList.add('open');
      overlay.classList.add('open');
    }
  }

  function closeDrawer() {
    if(drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  
  openDrawerBtns.forEach(btn => {
    btn.addEventListener('click', openDrawer);
  });
});
