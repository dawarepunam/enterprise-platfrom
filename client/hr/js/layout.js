// layout.js — Global Layout Manager

// --- Inject sidebar.js IMMEDIATELY ---
(function () {
    if (!document.querySelector('script[src*="sidebar.js"]')) {
        const s = document.createElement('script');
        s.src = 'js/sidebar.js';
        document.head.appendChild(s);
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // --- Auth & Role Check ---
    const token = localStorage.getItem('token') || localStorage.getItem('jmkc_token');
    if (!token && !window.location.href.includes('login')) {
        window.location.href = '/login';
        return;
    }

    // --- Sidebar Toggle (hamburger) ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // --- Sidebar Submenus — re-attach AFTER sidebar.js rebuilds HTML ---
    function attachSubmenuListeners() {
        const menuItems = document.querySelectorAll('.sidebar-menu > li');
        menuItems.forEach(item => {
            const mainLink = item.querySelector('.menu-item');
            if (item.querySelector('.submenu') && mainLink) {
                mainLink.addEventListener('click', (e) => {
                    if (mainLink.getAttribute('href') === '#' || !mainLink.getAttribute('href')) {
                        e.preventDefault();
                    }
                    item.classList.toggle('expanded');
                    const chevron = mainLink.querySelector('.chevron');
                    if (chevron) {
                        if (item.classList.contains('expanded')) {
                            chevron.classList.replace('fa-chevron-down', 'fa-chevron-up');
                        } else {
                            chevron.classList.replace('fa-chevron-up', 'fa-chevron-down');
                        }
                    }
                });
            }
        });
    }
    // Give sidebar.js 200ms to finish building, then attach listeners
    setTimeout(attachSubmenuListeners, 200);

    // --- Global Search Shortcut (Ctrl + K) ---
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    // --- Back Button Logic ---
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/hr/dashboard.html';
            }
        });
    }

    // --- Unified Footer Injection ---
    const mainWrapper = document.querySelector('.main-wrapper');
    if (mainWrapper) {
        const existingFooter = mainWrapper.querySelector('.footer');
        if (existingFooter) existingFooter.remove();

        mainWrapper.insertAdjacentHTML('beforeend', `
        <footer class="footer">
            <div>© 2026 JMKC Group India Pvt. Ltd. All Rights Reserved.</div>
            <div class="server-status">
                <i class="fa-solid fa-circle"></i> Connected to JMKC Server
            </div>
            <div>Version 2.0 | Powered by ProERP</div>
        </footer>`);
    }

    // --- Update header profile pic from stored user ---
    try {
        const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || 'null');
        const profileContainer = document.querySelector('.user-profile');
        if (user && profileContainer) {
            const profileImg = profileContainer.querySelector('img');
            const userName = user.name || 'HR Manager';
            if (profileImg) {
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2563EB&color=fff`;
                profileImg.title = userName;
            }
            // Add name if not exists
            if (!profileContainer.querySelector('.header-user-name')) {
                const nameSpan = document.createElement('span');
                nameSpan.className = 'header-user-name';
                nameSpan.style.fontWeight = '500';
                nameSpan.style.color = 'var(--dark-navy)';
                nameSpan.style.fontSize = '0.9rem';
                nameSpan.textContent = userName;
                profileContainer.appendChild(nameSpan);
            }
        }
    } catch(e) {}

});
