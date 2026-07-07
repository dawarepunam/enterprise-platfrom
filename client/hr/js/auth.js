// auth.js
// Handles authentication and role-based logic

const API_BASE = 'http://localhost:5003/api';

async function loginUser(email, password) {
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.user.role || 'EMPLOYEE');
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showToast('Login Successful!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (err) {
        console.error('Login error', err);
        showToast('Network error, please try again.', 'error');
    }
}

function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function applyRoleBasedUI() {
    const role = localStorage.getItem('role') || 'EMPLOYEE';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Update User Profile Image and Name if available
    const profileImg = document.querySelector('.user-profile img');
    if (profileImg && user.name) {
        profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff`;
    }

    // Role specific logic
    if (role !== 'ADMIN' && role !== 'HR') {
        // Hide Admin only elements
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        
        // Hide settings and recruitment from employee sidebar
        const sidebarMenus = document.querySelectorAll('.sidebar-menu .menu-item span');
        sidebarMenus.forEach(span => {
            if (span.innerText === 'Settings' || span.innerText === 'Recruitment') {
                span.closest('li').style.display = 'none';
            }
        });
    } else {
        // Show admin elements
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block'); // Or inline/flex depending on element
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Only apply role UI if we are not on login page
    if (!window.location.href.includes('login.html')) {
        applyRoleBasedUI();
    }
});
