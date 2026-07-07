/* 
  JMKC Enterprise CRM - Projects Hub Logic
  Phase 5 – Full API + Favorites + Portfolio Analytics
*/

document.addEventListener("DOMContentLoaded", async() => {
    await loadComponents();
    await loadProjects();
});

const FAVORITES_KEY = "jmkc_project_favorites";
let allProjects = [];

async function loadComponents() {
    try {
        const [headerRes, sidebarRes] = await Promise.all([
            fetch("/components/header.html"),
            fetch("/components/sidebar.html"),
        ]);
        if (headerRes.ok) document.getElementById("header-container").innerHTML = await headerRes.text();
        if (sidebarRes.ok) document.getElementById("sidebar-container").innerHTML = await sidebarRes.text();
        setTimeout(() => {
            if (typeof initThemeToggle === "function") { initThemeToggle();
                initSearchModal();
                initDrawers();
                initPopups();
                initProfileData();
                initCommandPalette();
                initNotificationsAPI();
                initBookmarks();
                initRecentItems();
                initOfflineSync();
                initSocketGlobal(); }
        }, 50);
    } catch (error) { console.error("Component load failed", error); }
}

/* ==================== LOAD PROJECTS FROM API ==================== */
async function loadProjects() {
    try {
        const res = await apiRequest("/projects/employee");
        let rawProjects = extractArray(res);

        allProjects = rawProjects;

        if (allProjects.length === 0) {
            renderEmptyState();
            return;
        }

        // Track as recent
        if (typeof JMKC !== "undefined" && JMKC.trackRecentItem) {
            JMKC.trackRecentItem("Page", "Projects Hub", "/modules/employee/projects/index.html");
        }

        renderPortfolioSummary();
        renderHealthChart();
        renderFilteredProjects();
        bindFilters();
        bindExport();
        listenSocket();
    } catch (err) {
        document.getElementById("allProjectsContainer").innerHTML = renderError("Failed to load projects.", "loadProjects()");
    }
}

/* ==================== PORTFOLIO SUMMARY ==================== */
function renderPortfolioSummary() {
    const container = document.getElementById("portfolioSummary");
    if (!container) return;

    const total = allProjects.length;
    const active = allProjects.filter(p => getStatus(p) === "Active").length;
    const completed = allProjects.filter(p => getStatus(p) === "Completed").length;
    const critical = allProjects.filter(p => getStatus(p) === "Critical" || (p.riskLevel || "").toLowerCase() === "critical").length;

    container.innerHTML = [
        { label: "Total Projects", value: total, color: "var(--accent-color)", filter: "All" },
        { label: "Active", value: active, color: "var(--success-color)", filter: "Active" },
        { label: "Completed", value: completed, color: "#10b981", filter: "Completed" },
        { label: "Critical", value: critical, color: "var(--danger-color)", filter: "CriticalRisk" },
    ].map(s => `
    <div class="portfolio-card" style="cursor:pointer;" onclick="setProjectFilter('${s.filter}')">
      <div class="portfolio-value" style="color:${s.color}">${s.value}</div>
      <div class="portfolio-label">${s.label}</div>
    </div>
  `).join("");
}

window.setProjectFilter = function(filter) {
    const statusEl = document.getElementById("filterStatus");
    const riskEl = document.getElementById("filterRisk");
    if (filter === "CriticalRisk") {
        if (statusEl) statusEl.value = "All";
        if (riskEl) riskEl.value = "Critical";
    } else {
        if (statusEl) statusEl.value = filter;
        if (riskEl) riskEl.value = "All";
    }
    renderFilteredProjects();
};

/* ==================== PORTFOLIO HEALTH CHART ==================== */
function renderHealthChart() {
    const container = document.getElementById("healthChartContainer");
    if (!container) return;

    const healthy = allProjects.filter(p => getHealth(p) === "Good" || getHealth(p) === "Healthy").length;
    const atRisk = allProjects.filter(p => getHealth(p) === "At Risk" || getHealth(p) === "Needs Attention").length;
    const critical = allProjects.filter(p => getHealth(p) === "Critical" || getHealth(p) === "Poor").length;
    const total = Math.max(healthy + atRisk + critical, 1);

    container.innerHTML = `
    <div class="health-chart-header"><h3>Portfolio Health Overview</h3></div>
    <div class="health-bars">
      <div class="health-bar-row">
        <span class="health-label" style="color:var(--success-color)">✅ Healthy (${healthy})</span>
        <div class="health-bar-track"><div class="health-bar-fill" style="width:${(healthy/total)*100}%;background:var(--success-color)"></div></div>
      </div>
      <div class="health-bar-row">
        <span class="health-label" style="color:var(--warning-color)">⚠️ At Risk (${atRisk})</span>
        <div class="health-bar-track"><div class="health-bar-fill" style="width:${(atRisk/total)*100}%;background:var(--warning-color)"></div></div>
      </div>
      <div class="health-bar-row">
        <span class="health-label" style="color:var(--danger-color)">🔴 Critical (${critical})</span>
        <div class="health-bar-track"><div class="health-bar-fill" style="width:${(critical/total)*100}%;background:var(--danger-color)"></div></div>
      </div>
    </div>
  `;
}

/* ==================== FILTER & SORT ==================== */
function bindFilters() {
    document.getElementById("projectSearch") ? .addEventListener("input", renderFilteredProjects);
    document.getElementById("filterStatus") ? .addEventListener("change", renderFilteredProjects);
    document.getElementById("filterRisk") ? .addEventListener("change", renderFilteredProjects);
    document.getElementById("sortProjects") ? .addEventListener("change", renderFilteredProjects);
}

function renderFilteredProjects() {
    const search = (document.getElementById("projectSearch") ? .value || "").toLowerCase();
    const statusFilter = document.getElementById("filterStatus") ? .value || "All";
    const riskFilter = document.getElementById("filterRisk") ? .value || "All";
    const sortBy = document.getElementById("sortProjects") ? .value || "updated";

    let filtered = allProjects.filter(p => {
        const name = (p.name || p.projectName || "").toLowerCase();
        const client = (p.clientName || p.client ? .name || p.client || "").toLowerCase();
        const matchesSearch = name.includes(search) || client.includes(search);
        const matchesStatus = statusFilter === "All" || getStatus(p) === statusFilter;
        const matchesRisk = riskFilter === "All" || (p.riskLevel || "Low") === riskFilter;
        return matchesSearch && matchesStatus && matchesRisk;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case "deadline":
                return new Date(a.endDate || a.deadline || 0) - new Date(b.endDate || b.deadline || 0);
            case "priority":
                return priorityWeight(b.priority) - priorityWeight(a.priority);
            case "progress":
                return (b.progress || 0) - (a.progress || 0);
            default:
                return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        }
    });

    // Split pinned
    const favorites = getFavorites();
    const pinned = filtered.filter(p => favorites.includes(p._id || p.id));
    const unpinned = filtered.filter(p => !favorites.includes(p._id || p.id));

    const pinnedSection = document.getElementById("pinnedSection");
    if (pinned.length > 0) {
        pinnedSection.style.display = "block";
        renderProjectCards("pinnedProjectsContainer", pinned);
    } else {
        pinnedSection.style.display = "none";
    }

    document.getElementById("allProjectsTitle").textContent = `All Projects (${unpinned.length})`;
    renderProjectCards("allProjectsContainer", unpinned);
}

/* ==================== RENDER PROJECT CARDS ==================== */
function renderProjectCards(containerId, projects) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div><p>No projects found.</p><button class="btn btn-primary" style="margin-top:15px" onclick="window.location.href='/employee/chat'">Contact Project Manager</button></div>`;
        return;
    }

    const favorites = getFavorites();

    container.innerHTML = projects.map(p => {
        const id = p._id || p.id;
        const name = p.name || p.projectName || "Untitled";
        const client = p.clientName || p.client ? .name || p.client || "—";
        const progress = p.progress || 0;
        const priority = p.priority || "Medium";
        const status = getStatus(p);
        const health = getHealth(p);
        const risk = p.riskLevel || "Low";
        const deadline = p.endDate || p.deadline;
        const pm = p.projectManager ? .name || p.pmName || "—";
        const budget = p.budget || "—";
        const dept = p.department ? .name || p.departmentName || "—";
        const teamCount = p.members ? .length || p.teamSize || 0;
        const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—";
        const sprint = p.currentSprint || p.sprint || "—";
        const openTasks = p.openTasks || p.taskStats ? .open || "—";
        const completedTasks = p.completedTasks || p.taskStats ? .completed || "—";
        const filesCount = p.filesCount || "—";
        const meetingsCount = p.meetingsCount || "—";
        const isPinned = favorites.includes(id);

        return `
    <div class="proj-card" style="cursor:pointer;" onclick="window.location.href='/modules/employee/project-detail/index.html?id=${id}'">
      <div class="ribbon ${status.toLowerCase().replace(/\s/g,'-')}">${status}</div>
      <button class="btn-pin ${isPinned ? 'is-pinned' : ''}" title="${isPinned ? 'Unpin' : 'Pin'}" onclick="event.stopPropagation(); toggleFavorite('${id}')">★</button>

      <div class="proj-header">
        <div class="proj-title">${name}</div>
        <div class="proj-client">${client}</div>
      </div>

      <div class="proj-progress">
        <div class="progress-labels"><span>Progress</span><span>${progress}%</span></div>
        <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
      </div>

      <div class="proj-meta">
        <div class="meta-item">📅 ${deadline ? new Date(deadline).toLocaleDateString() : "—"}</div>
        <div class="meta-item">👤 ${pm}</div>
        <div class="meta-item health-badge health-${health.toLowerCase().replace(/\s/g,'-')}">● ${health}</div>
      </div>

      <div class="quick-stats">
        <div class="q-stat"><div class="q-stat-val">${openTasks}</div><div class="q-stat-label">Open</div></div>
        <div class="q-stat"><div class="q-stat-val">${completedTasks}</div><div class="q-stat-label">Done</div></div>
        <div class="q-stat"><div class="q-stat-val">${filesCount}</div><div class="q-stat-label">Files</div></div>
        <div class="q-stat"><div class="q-stat-val">${meetingsCount}</div><div class="q-stat-label">Meets</div></div>
      </div>

      <div class="proj-actions" onclick="event.stopPropagation();">
        <a href="/modules/employee/project-detail/index.html?id=${id}" class="btn-sm btn-view">View</a>
        <a href="/employee/tasks?project=${id}" class="btn-sm">Tasks</a>
        <a href="/employee/files?project=${id}" class="btn-sm">Files</a>
        <a href="/employee/meetings?project=${id}" class="btn-sm">Meet</a>
        <a href="/employee/chat?project=${id}" class="btn-sm">Chat</a>
      </div>

      <div class="hover-detail-popup">
        <div class="hd-row"><span>Budget</span><span>${budget}</span></div>
        <div class="hd-row"><span>Department</span><span>${dept}</span></div>
        <div class="hd-row"><span>Members</span><span>${teamCount}</span></div>
        <div class="hd-row"><span>Created</span><span>${created}</span></div>
        <div class="hd-row"><span>Sprint</span><span>${sprint}</span></div>
        <div class="hd-row"><span>Risk Level</span><span class="${risk === 'High' || risk === 'Critical' ? 'text-danger' : risk === 'Medium' ? 'text-warning' : 'text-success'}">${risk}</span></div>
        <div class="hd-section">
          <div class="hd-section-title">Timeline Preview</div>
          <div class="hd-row"><span>Sprint</span><span>${sprint}</span></div>
          <div class="hd-row"><span>Deadline</span><span>${deadline ? new Date(deadline).toLocaleDateString() : "—"}</span></div>
        </div>
      </div>
    </div>`;
    }).join("");
}

/* ==================== FAVORITES (API via Bookmarks) ==================== */
function getFavorites() {
    if (typeof JMKC === "undefined" || !JMKC.getBookmarks) return [];
    return JMKC.getBookmarks().filter(b => b.type === "Project").map(b => b.itemId);
}

window.toggleFavorite = async function(projectId) {
    if (typeof JMKC === "undefined") return;
    const proj = allProjects.find(p => (p._id || p.id) === projectId);
    if (!proj) return;

    const url = `/modules/employee/project-detail/index.html?id=${projectId}`;
    const isBookmarked = JMKC.isBookmarked(url);

    if (isBookmarked) {
        await JMKC.removeBookmark(url);
    } else {
        await JMKC.addBookmark("Project", proj.name || proj.projectName || "Project", url, projectId);
    }

    // Wait a little bit for the bookmark to sync then re-render
    setTimeout(() => renderFilteredProjects(), 200);
};

/* ==================== EXPORT ==================== */
function bindExport() {
    document.getElementById("exportProjectsBtn") ? .addEventListener("click", () => {
        const csv = ["Name,Client,Status,Progress,Priority,Deadline,PM"].concat(
            allProjects.map(p => `"${p.name || ""}","${p.clientName || p.client?.name || ""}","${getStatus(p)}","${p.progress || 0}%","${p.priority || ""}","${p.endDate || p.deadline || ""}","${p.projectManager?.name || ""}"`)
        ).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `projects_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    });
}

/* ==================== SOCKET EVENTS ==================== */
function listenSocket() {
    document.addEventListener("jmkc:project:updated", (e) => {
        const updated = e.detail;
        if (updated && updated._id) {
            const idx = allProjects.findIndex(p => (p._id || p.id) === updated._id);
            if (idx !== -1) { allProjects[idx] = {...allProjects[idx], ...updated }; }
            renderPortfolioSummary();
            renderHealthChart();
            renderFilteredProjects();
        }
    });
}

/* ==================== EMPTY STATE ==================== */
function renderEmptyState() {
    document.getElementById("portfolioSummary").innerHTML = "";
    document.getElementById("healthChartContainer").innerHTML = "";
    document.getElementById("allProjectsContainer").innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;padding:60px 20px;text-align:center">
      <div class="empty-icon" style="font-size:4rem;opacity:0.5;margin-bottom:20px">📁</div>
      <h3>No Projects Assigned</h3>
      <p style="color:var(--text-secondary);margin-top:10px">You currently have no projects. Contact your Project Manager for assignment.</p>
      <button class="btn btn-primary" style="margin-top:20px" onclick="window.location.href='/employee/chat'">Contact Project Manager</button>
    </div>
  `;
}

/* ==================== UTILITIES ==================== */
function extractArray(res) {
    if (Array.isArray(res)) return res;
    if (res ? .data && Array.isArray(res.data)) return res.data;
    if (res ? .projects && Array.isArray(res.projects)) return res.projects;
    return [];
}

function getStatus(p) {
    const s = (p.status || "Active").toLowerCase();
    if (s.includes("complet")) return "Completed";
    if (s.includes("hold")) return "On Hold";
    if (s.includes("archive")) return "Archived";
    if (s.includes("critical")) return "Critical";
    return "Active";
}

function getHealth(p) {
    const h = (p.healthScore || p.health || "Good").toLowerCase();
    if (h.includes("critical") || h.includes("poor")) return "Critical";
    if (h.includes("risk") || h.includes("attention")) return "At Risk";
    return "Good";
}

function priorityWeight(p) {
    const map = { critical: 4, high: 3, medium: 2, low: 1 };
    return map[(p || "medium").toLowerCase()] || 0;
}

function renderError(msg, retryFn) {
    return `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:40px"><p style="color:var(--danger-color)">${msg}</p><button onclick="${retryFn}" class="btn btn-primary" style="margin-top:10px">Retry</button></div>`;
}