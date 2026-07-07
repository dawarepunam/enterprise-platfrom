/* utils.js */
// Simple function to load HTML fragments (header, sidebar, footer) into placeholders
function loadFragment(id, url) {
  fetch(url)
    .then((res) => res.text())
    .then((html) => {
      const container = document.getElementById(id);
      if (container) container.innerHTML = html;
    })
    .catch((err) => console.error('Failed to load fragment', url, err));
}

// Load common UI components on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFragment('header-container', '/modules/common/header.html');
  loadFragment('sidebar-container', '/modules/common/sidebar.html');
  loadFragment('footer-container', '/modules/common/footer.html');
});

// Simple toast implementation (already styled in CSS)
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

export { loadFragment, showToast };
