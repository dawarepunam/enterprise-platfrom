// sidebar.js — Global Sidebar Injector
// This file auto-builds the complete navigation sidebar on ALL HR pages.
// To add/remove menu items, edit ONLY this file.

(function () {
    const SIDEBAR_NAV = [
        {
            label: 'Dashboard', icon: 'fa-chart-pie', href: '/hr/dashboard.html'
        },
        {
            label: 'People', icon: 'fa-users', children: [
                { label: 'Employee Directory', href: '/hr/employees.html' },
                { label: 'Departments',        href: '/hr/departments.html' },
                { label: 'Designations',       href: '/hr/designations.html' },
                { label: 'Documents',          href: '/hr/documents.html' },
                { label: 'Assets',             href: '/hr/assets.html' },
            ]
        },
        {
            label: 'Workforce', icon: 'fa-calendar-check', children: [
                { label: 'Attendance',         href: '/hr/attendance.html' },
                { label: 'Leave Management',   href: '/hr/leaves.html' },
                { label: 'Shifts & Rosters',   href: '/hr/shifts.html' },
                { label: 'Timesheets',         href: '/hr/timesheets.html' },
                { label: 'Holidays',           href: '/hr/holidays.html' },
            ]
        },
        {
            label: 'Payroll', icon: 'fa-indian-rupee-sign', children: [
                { label: 'Run Payroll',        href: '/hr/run-payroll.html' },
                { label: 'Salary Structures',  href: '/hr/salary-structures.html' },
                { label: 'Payslips',           href: '/hr/payslips.html' },
                { label: 'Claims / Expenses',  href: '/hr/claims.html' },
            ]
        },
        {
            label: 'Recruitment', icon: 'fa-briefcase', children: [
                { label: 'Job Postings',       href: '/hr/jobs.html' },
                { label: 'Applications',       href: '/hr/applications.html' },
                { label: 'Interviews',         href: '/hr/interviews.html' },
                { label: 'Offer Letters',      href: '/hr/offers.html' },
                { label: 'Onboarding',         href: '/hr/onboarding.html' },
            ]
        },
        {
            label: 'Talent', icon: 'fa-bullseye', children: [
                { label: 'Goals & OKRs',       href: '/hr/goals.html' },
                { label: 'Appraisals',         href: '/hr/appraisals.html' },
                { label: 'Learning & Training',href: '/hr/training.html' },
            ]
        },
        {
            label: 'Engagement', icon: 'fa-bullhorn', children: [
                { label: 'Announcements',      href: '/hr/announcements.html' },
                { label: 'IT & HR Helpdesk',   href: '/hr/helpdesk.html' },
            ]
        },
        {
            label: 'Travel', icon: 'fa-plane', children: [
                { label: 'Travel Requests',    href: '/hr/travel.html' },
                { label: 'Cash Advances',      href: '/hr/advances.html' },
            ]
        },
        {
            label: 'Exit', icon: 'fa-door-open', children: [
                { label: 'Resignations',       href: '/hr/resignations.html' },
                { label: 'Exit Interviews',    href: '/hr/exit-interviews.html' },
                { label: 'F&F Settlement',     href: '/hr/fnf.html' },
            ]
        },
        {
            label: 'My Team (MSS)', icon: 'fa-user-tie', children: [
                { label: 'Team Dashboard',     href: '/hr/mss-dashboard.html' },
                { label: 'Approvals Inbox',    href: '/hr/approvals.html' },
            ]
        },
        {
            label: 'Settings', icon: 'fa-gear', children: [
                { label: 'Analytics & Reports',href: '/hr/reports.html' },
                { label: 'System Settings',    href: '/hr/settings.html' },
                { label: 'Roles & Permissions',href: '/hr/roles-permissions.html' },
            ]
        },
    ];

    function currentPath() {
        return window.location.pathname.replace(/\/$/, '');
    }

    function isActive(href) {
        const cp = currentPath();
        const lp = new URL(href, window.location.origin).pathname.replace(/\/$/, '');
        return cp === lp;
    }

    function buildSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        // Get logged-in user info
        let user = null;
        try { user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || 'null'); } catch(e){}
        const userName = user?.name || 'HR Manager';
        const userRole = user?.role || 'HR';
        const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);

        let menuHtml = '';
        SIDEBAR_NAV.forEach((item, idx) => {
            if (!item.children) {
                // Single item
                const active = isActive(item.href) ? 'active' : '';
                menuHtml += `
                <li>
                    <a href="${item.href}" class="menu-item ${active}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                </li>`;
            } else {
                // Check if any child is active
                const anyChildActive = item.children.some(c => isActive(c.href));
                const expandedClass = anyChildActive ? 'expanded' : '';
                const chevronIcon = anyChildActive ? 'fa-chevron-up' : 'fa-chevron-down';
                const parentActive = anyChildActive ? 'active' : '';

                const childrenHtml = item.children.map(child => {
                    const ca = isActive(child.href) ? 'active' : '';
                    return `<a href="${child.href}" class="submenu-item ${ca}">${child.label}</a>`;
                }).join('');

                menuHtml += `
                <li class="${expandedClass}">
                    <a href="#" class="menu-item ${parentActive}">
                        <i class="fa-solid ${item.icon}"></i>
                        <span>${item.label}</span>
                        <i class="fa-solid ${chevronIcon} chevron" style="margin-left:auto; font-size:0.8rem;"></i>
                    </a>
                    <div class="submenu">${childrenHtml}</div>
                </li>`;
            }
        });

        sidebar.innerHTML = `
        <div class="sidebar-header">
            <i class="fa-solid fa-building" style="color:var(--primary-blue); font-size:1.3rem;"></i>
            <h2>JMKC HR</h2>
        </div>

        <div class="sidebar-menu-wrapper">
            <ul class="sidebar-menu">
                ${menuHtml}
            </ul>
        </div>

        <div style="padding:16px; border-top:1px solid var(--border-gray); margin-top:auto;">
            <button onclick="logoutHR()" style="width:100%;padding:10px;border:1px solid var(--border-gray);border-radius:8px;background:transparent;color:var(--text-gray);cursor:pointer;display:flex;align-items:center;gap:8px;font-size:.85rem;font-family:var(--font-body);">
                <i class="fa-solid fa-right-from-bracket" style="color:var(--danger-red);"></i> Logout
            </button>
        </div>`;

        // Make sidebar flex column so logout sticks to bottom
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
    }

    function logoutHR() {
        localStorage.removeItem('token');
        localStorage.removeItem('jmkc_token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('jmkc_user');
        localStorage.removeItem('role');
        window.location.href = '/login';
    }
    window.logoutHR = logoutHR;

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildSidebar);
    } else {
        buildSidebar();
    }
})();
