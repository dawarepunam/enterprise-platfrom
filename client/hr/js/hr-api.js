// hr-api.js  —  Real-world API integration for JMKC HR Module
// Connects all HR pages to the existing Node.js + MongoDB backend

const HR_API = (() => {
    const BASE = '';  // Same origin — served by the Express server

    function getToken() {
        return localStorage.getItem('token') || localStorage.getItem('jmkc_token') || '';
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || 'null');
        } catch (e) { return null; }
    }

    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        };
    }

    async function request(method, path, body = null) {
        const opts = { method, headers: getHeaders() };
        if (body) opts.body = JSON.stringify(body);
        try {
            const res = await fetch(BASE + path, opts);
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || `API Error: ${res.status}`);
            return data;
        } catch (err) {
            console.error(`[HR-API] ${method} ${path}`, err.message);
            throw err;
        }
    }

    // ── USERS / EMPLOYEES ────────────────────────────────────────────────────
    async function getEmployees(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/users${q ? '?' + q : ''}`);
    }

    async function getEmployee(id) {
        return request('GET', `/api/users/${id}`);
    }

    async function addEmployee(payload) {
        return request('POST', `/api/users/register`, payload);
    }

    async function updateEmployee(id, payload) {
        return request('PUT', `/api/users/${id}`, payload);
    }

    // ── DEPARTMENTS ──────────────────────────────────────────────────────────
    async function getDepartments() {
        return request('GET', '/api/departments');
    }

    // ── ATTENDANCE ───────────────────────────────────────────────────────────
    async function getAttendance(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/attendance${q ? '?' + q : ''}`);
    }

    async function markAttendance(payload) {
        return request('POST', '/api/attendance', payload);
    }

    // ── LEAVES ───────────────────────────────────────────────────────────────
    async function getLeaves(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/leave${q ? '?' + q : ''}`);
    }

    async function applyLeave(payload) {
        return request('POST', '/api/leave', payload);
    }

    async function updateLeaveStatus(id, status) {
        return request('PATCH', `/api/leave/${id}/status`, { status });
    }

    // ── PAYROLL ──────────────────────────────────────────────────────────────
    async function getPayroll(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/payroll${q ? '?' + q : ''}`);
    }

    async function getPayslips(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/payslips${q ? '?' + q : ''}`);
    }

    // ── RECRUITMENT ──────────────────────────────────────────────────────────
    async function getRecruitmentJobs() {
        return request('GET', '/api/hr/recruitment');
    }

    async function createJob(payload) {
        return request('POST', '/api/hr/recruitment/jobs', payload);
    }

    async function getCandidates() {
        return request('GET', '/api/hr/recruitment');
    }

    // ── EXPENSES ──────────────────────────────────────────────────────────────
    async function getExpenses(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/expenses${q ? '?' + q : ''}`);
    }

    async function addExpense(payload) {
        return request('POST', '/api/expenses', payload);
    }

    // ── ANALYTICS / REPORTS ───────────────────────────────────────────────────
    async function getAnalytics() {
        return request('GET', '/api/analytics');
    }

    // ── TRAVEL ────────────────────────────────────────────────────────────────
    async function getTravelRequests(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/hr/proerp/travel-requests${q ? '?' + q : ''}`);
    }

    async function addTravelRequest(payload) {
        return request('POST', '/api/hr/proerp/travel-requests', payload);
    }

    // ── PERFORMANCE ───────────────────────────────────────────────────────────
    async function getPerformance(params = {}) {
        const q = new URLSearchParams(params).toString();
        return request('GET', `/api/performance${q ? '?' + q : ''}`);
    }

    // ── DASHBOARD SUMMARY ─────────────────────────────────────────────────────
    async function getDashboardStats() {
        const [empRes, leaveRes, attendRes] = await Promise.allSettled([
            getEmployees({ limit: 1 }),
            getLeaves({ status: 'pending', limit: 1 }),
            getAttendance({ today: true, limit: 1 }),
        ]);

        return {
            employees: empRes.status === 'fulfilled' ? (empRes.value?.total || empRes.value?.count || empRes.value?.data?.length || 0) : '--',
            pendingLeaves: leaveRes.status === 'fulfilled' ? (leaveRes.value?.total || leaveRes.value?.count || leaveRes.value?.data?.length || 0) : '--',
            attendanceToday: attendRes.status === 'fulfilled' ? (attendRes.value?.total || attendRes.value?.count || attendRes.value?.data?.length || 0) : '--',
        };
    }

    // ── HELPER RENDERERS ──────────────────────────────────────────────────────
    function getAvatarUrl(name, bg = '2563EB') {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff`;
    }

    function getRoleBadge(role) {
        const map = {
            'ADMIN': ['bg-red', 'Admin'],
            'HR': ['bg-purple', 'HR'],
            'PROJECT_MANAGER': ['bg-blue', 'Project Manager'],
            'MANAGER': ['bg-blue', 'Manager'],
            'PRODUCT_MANAGER': ['bg-indigo', 'Product Manager'],
            'MEMBER': ['bg-green', 'Employee'],
            'MARKETING': ['bg-orange', 'Marketing'],
            'SALES': ['bg-teal', 'Sales'],
            'CALLING': ['bg-gray', 'Calling'],
        };
        const [cls, label] = map[role] || ['bg-gray', role];
        return `<span class="badge badge-primary">${label}</span>`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '--';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ── DEPARTMENTS CRUD (public shortcuts) ──────────────────────────────────
    async function createDepartment(payload) {
        return request('POST', '/api/departments', payload);
    }

    async function updateDepartment(id, payload) {
        return request('PUT', `/api/departments/${id}`, payload);
    }

    async function deleteDepartment(id) {
        return request('DELETE', `/api/departments/${id}`);
    }

    // ── PUBLIC API ────────────────────────────────────────────────────────────
    return {
        request,   // expose raw request for ad-hoc calls
        getUser, getToken,
        getEmployees, getEmployee, addEmployee, updateEmployee,
        getDepartments, createDepartment, updateDepartment, deleteDepartment,
        getAttendance, markAttendance,
        getLeaves, applyLeave, updateLeaveStatus,
        getPayroll, getPayslips,
        getRecruitmentJobs, createJob, getCandidates,
        getExpenses, addExpense,
        getAnalytics,
        getTravelRequests, addTravelRequest,
        getPerformance,
        getDashboardStats,
        getAvatarUrl, getRoleBadge, formatDate,
    };
})();

window.HR_API = HR_API;
