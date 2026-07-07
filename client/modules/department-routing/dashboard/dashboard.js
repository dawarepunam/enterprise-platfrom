const ROUTING_ROUTE_MAP = {
  dashboard: "/department-routing",
  pending: "/department-routing/pending-routing",
  queue: "/department-routing/department-queue",
  assigned: "/department-routing/assigned-departments",
  priority: "/department-routing/priority-leads",
  history: "/department-routing/routing-history",
  reports: "/department-routing/reports",
  settings: "/department-routing/settings",
};

const ROUTING_PATH_MAP = Object.fromEntries(Object.entries(ROUTING_ROUTE_MAP).map(([key, value]) => [value, key]));

const state = {
  user: null,
  data: null,
  activeSection: "dashboard",
  activeLeadId: "",
  activeQueueDepartment: "",
  activeHistoryId: "",
  charts: {},
};

document.addEventListener("DOMContentLoaded", initRoutingWorkspace);

async function initRoutingWorkspace() {
  requireAuth();
  state.user = getCurrentUser();
  if (!state.user || !["SALES", "MANAGER", "ADMIN", "MARKETING"].includes(normalizeRole(state.user.role))) {
    window.location.href = "/pages/unauthorized.html";
    return;
  }

  state.activeSection = ROUTING_PATH_MAP[window.location.pathname] || "dashboard";
  bindUI();
  hydrateProfile();
  switchSection(state.activeSection, false);
  await loadRoutingData();
  setupRealtime();
}

function bindUI() {
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchSection(button.dataset.section)));
  document.getElementById("sidebarToggle")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
  document.getElementById("themeButton")?.addEventListener("click", () => document.body.classList.toggle("light-theme"));
  document.getElementById("profileButton")?.addEventListener("click", logout);
  document.getElementById("notificationButton")?.addEventListener("click", () => toggleDrawer("notificationDrawer", true));
  document.getElementById("alertButton")?.addEventListener("click", () => toggleDrawer("alertDrawer", true));
  document.querySelectorAll("[data-close-drawer]").forEach((button) => button.addEventListener("click", () => toggleDrawer(button.dataset.closeDrawer, false)));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  document.getElementById("modalBackdrop")?.addEventListener("click", (event) => { if (event.target.id === "modalBackdrop") closeModal(); });
  document.getElementById("globalSearch")?.addEventListener("input", renderGlobalSearch);
  document.getElementById("menuSearch")?.addEventListener("input", filterMenu);
  document.getElementById("leadSearch")?.addEventListener("input", renderLeadTables);
  document.getElementById("leadFilter")?.addEventListener("change", renderLeadTables);
  document.getElementById("saveRouteButton")?.addEventListener("click", saveRouting);
  document.getElementById("saveSettingsButton")?.addEventListener("click", saveSettings);
}

async function loadRoutingData() {
  const result = await apiRequest("/routing/dashboard");
  state.data = result.data;
  state.activeLeadId = state.activeLeadId || state.data.unroutedLeads?.[0]?._id || "";
  state.activeQueueDepartment = state.activeQueueDepartment || state.data.departmentLoad?.[0]?.name || "";
  state.activeHistoryId = state.activeHistoryId || state.data.history?.[0]?._id || "";
  renderAll();
}

function setupRealtime() {
  connectSocket();
  ["leadRouted", "departmentChanged", "newPriorityLead", "pmAssigned", "notification"].forEach((eventName) => {
    onSocket(eventName, async () => {
      await loadRoutingData();
    });
  });
}

function switchSection(sectionName, push = true) {
  state.activeSection = sectionName;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.section === sectionName));
  document.querySelectorAll(".workspace-section").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === sectionName));
  document.body.classList.remove("sidebar-open");
  if (push) window.history.replaceState({}, "", ROUTING_ROUTE_MAP[sectionName] || ROUTING_ROUTE_MAP.dashboard);
}

function hydrateProfile() {
  document.getElementById("profileMeta").innerHTML = `<strong>${escapeHtml(state.user.name || "Routing User")}</strong><small>${escapeHtml(state.user.email || "")}</small><small>${escapeHtml(state.user.department || state.user.role || "")}</small>`;
}

function renderAll() {
  renderKpis();
  renderLeadTables();
  renderQuickView();
  renderActivities();
  renderQueuePreview();
  renderQueueSection();
  renderAssignedDepartments();
  renderPriorityLeads();
  renderHistory();
  renderReports();
  renderNotifications();
  renderAlerts();
  hydrateRouteFormOptions();
}

function getUnroutedLeads() {
  return Array.isArray(state.data?.unroutedLeads) ? state.data.unroutedLeads : [];
}

function getFilteredLeads() {
  const query = String(document.getElementById("leadSearch")?.value || "").trim().toLowerCase();
  const filter = String(document.getElementById("leadFilter")?.value || "").trim().toLowerCase();
  return getUnroutedLeads().filter((lead) => {
    const haystack = `${lead.name} ${lead.company} ${lead.requirement} ${lead.aiSuggestion?.department || ""}`.toLowerCase();
    const searchOk = !query || haystack.includes(query);
    if (!searchOk) return false;
    if (filter === "ai") return (lead.aiSuggestion?.confidence || 0) >= 85;
    if (filter === "website") return /website/i.test(lead.requirement || "");
    if (filter === "hrms") return /hrms|payroll|attendance/i.test(lead.requirement || "");
    if (filter === "erp") return /erp|school/i.test(lead.requirement || "");
    if (filter === "mobile") return /mobile|app|android|ios/i.test(lead.requirement || "");
    if (filter === "budget") return Number(lead.budget || 0) >= 200000;
    if (filter === "urgent") return ["High", "Critical"].includes(lead.priority || "");
    return true;
  });
}

function renderKpis() {
  const kpis = state.data?.kpis || {};
  const cards = [
    ["Pending Routing", kpis.pendingRouting || 0, "pending"],
    ["Assigned Departments", kpis.assignedDepartments || 0, "assigned"],
    ["High Priority Leads", kpis.highPriorityLeads || 0, "priority"],
    ["Today's Routed Leads", kpis.todaysRoutedLeads || 0, "history"],
    ["Department Load", state.data?.departmentLoad?.reduce((max, item) => Math.max(max, item.count), 0) || 0, "queue"],
    ["AI Suggested Routing", kpis.aiSuggestedRouting || 0, "dashboard"],
  ];
  document.getElementById("kpiGrid").innerHTML = cards.map(([label, value, section]) => `<button class="panel kpi-card" type="button" data-kpi-jump="${section}"><p class="eyebrow">${label}</p><strong>${Number(value).toLocaleString("en-IN")}</strong></button>`).join("");
  document.querySelectorAll("[data-kpi-jump]").forEach((button) => button.addEventListener("click", () => switchSection(button.dataset.kpiJump)));
}

function renderLeadTables() {
  const leads = getFilteredLeads();
  const tableRows = leads.length
    ? leads.map((lead) => buildLeadRow(lead)).join("")
    : `<tr><td colspan="8">No pending routing leads.</td></tr>`;
  const cards = leads.length
    ? leads.map((lead) => buildLeadCard(lead)).join("")
    : `<article class="mobile-card"><p>No pending routing leads.</p></article>`;
  document.getElementById("leadRows").innerHTML = tableRows;
  document.getElementById("pendingRows").innerHTML = tableRows;
  document.getElementById("leadCards").innerHTML = cards;
  document.getElementById("pendingCards").innerHTML = cards;
  bindLeadActions();
}

function buildLeadRow(lead) {
  return `
    <tr>
      <td>${escapeHtml(lead.name)}</td>
      <td>${escapeHtml(lead.company || "-")}</td>
      <td>${escapeHtml(lead.requirement || "-")}</td>
      <td>${formatCurrency(lead.budget || 0)}</td>
      <td>${escapeHtml(lead.aiSuggestion?.department || "-")}</td>
      <td><span class="priority-pill ${slug(lead.priority || "Medium")}">${escapeHtml(lead.priority || "Medium")}</span></td>
      <td>${escapeHtml(lead.routingStatus || "Pending")}</td>
      <td><div class="inline-actions"><button class="ghost-button" type="button" data-view-lead="${lead._id}">Quick View</button><button class="primary-button" type="button" data-route-lead="${lead._id}">Route Lead</button></div></td>
    </tr>
  `;
}

function buildLeadCard(lead) {
  return `
    <article class="mobile-card">
      <p>${escapeHtml(lead.name)}</p>
      <small>${escapeHtml(lead.company || "-")} | ${formatCurrency(lead.budget || 0)}</small>
      <small>${escapeHtml(lead.aiSuggestion?.department || "-")} | ${escapeHtml(lead.requirement || "-")}</small>
      <div class="inline-actions"><button class="ghost-button" type="button" data-view-lead="${lead._id}">Quick View</button><button class="primary-button" type="button" data-route-lead="${lead._id}">Route Lead</button></div>
    </article>
  `;
}

function bindLeadActions() {
  document.querySelectorAll("[data-view-lead]").forEach((button) => button.addEventListener("click", () => {
    state.activeLeadId = button.dataset.viewLead;
    renderQuickView();
    switchSection("dashboard");
  }));
  document.querySelectorAll("[data-route-lead]").forEach((button) => button.addEventListener("click", () => {
    state.activeLeadId = button.dataset.routeLead;
    openRouteModal();
  }));
}

function getActiveLead() {
  return getUnroutedLeads().find((lead) => String(lead._id) === String(state.activeLeadId)) || getUnroutedLeads()[0] || null;
}

function renderQuickView() {
  const lead = getActiveLead();
  const panel = document.getElementById("quickViewPanel");
  if (!lead) {
    panel.innerHTML = `<p>No lead selected.</p>`;
    return;
  }
  const timeline = (lead.timeline || []).slice().reverse().slice(0, 6).map((item) => `<article class="timeline-item"><p>${escapeHtml(item.title || "Update")}</p><small>${escapeHtml(item.description || "")}</small><small>${formatDateTime(item.at)}</small></article>`).join("");
  panel.innerHTML = `
    <div class="panel-head"><div><p class="eyebrow">Quick View</p><h3>${escapeHtml(lead.name)}</h3><small>${escapeHtml(lead.company || "-")}</small></div><span class="priority-pill ${slug(lead.priority || "Medium")}">${escapeHtml(lead.priority || "Medium")}</span></div>
    <div class="summary-card">
      <p>Requirement</p><small>${escapeHtml(lead.requirement || "-")}</small>
      <p>Budget</p><small>${formatCurrency(lead.budget || 0)}</small>
      <p>AI Suggestion</p><small>${escapeHtml(lead.aiSuggestion?.department || "-")} | ${lead.aiSuggestion?.confidence || 0}% confidence</small>
    </div>
    ${timeline || `<article class="timeline-item"><p>No timeline yet.</p></article>`}
  `;
}

function renderActivities() {
  const history = state.data?.history || [];
  document.getElementById("activityList").innerHTML = history.slice(0, 6).map((item) => `<article class="feed-item"><p>${escapeHtml(item.action)}</p><small>${escapeHtml(item.leadName)} routed to ${escapeHtml(item.newDepartment || "-")}</small><small>${formatDateTime(item.createdAt)}</small></article>`).join("") || `<article class="feed-item"><p>No routing activity yet.</p></article>`;
}

function renderQueuePreview() {
  const load = state.data?.departmentLoad || [];
  document.getElementById("queuePreview").innerHTML = load.map((item) => `<article class="queue-card"><p>${escapeHtml(item.name)}</p><small>${item.count} Leads | High Priority ${item.highPriority}</small></article>`).join("") || `<article class="queue-card"><p>No queue data</p></article>`;
}

function renderQueueSection() {
  const load = state.data?.departmentLoad || [];
  document.getElementById("departmentQueueCards").innerHTML = load.map((item) => `<button class="queue-card" type="button" data-queue-dept="${escapeHtml(item.name)}"><p>${escapeHtml(item.name)}</p><small>${item.count} Leads</small><small>High Priority ${item.highPriority}</small></button>`).join("") || `<article class="queue-card"><p>No queue data</p></article>`;
  document.querySelectorAll("[data-queue-dept]").forEach((button) => button.addEventListener("click", () => { state.activeQueueDepartment = button.dataset.queueDept; renderQueueDetail(); }));
  renderQueueDetail();
}

function renderQueueDetail() {
  const department = state.activeQueueDepartment;
  const queue = (state.data?.queue || []).filter((item) => item.department === department);
  document.getElementById("queueDetailTitle").textContent = department || "Select a department";
  document.getElementById("queueDetailRows").innerHTML = queue.length ? queue.map((item) => `<tr><td>${escapeHtml(item.leadName)}</td><td>${formatCurrency(item.budget || 0)}</td><td><span class="priority-pill ${slug(item.priority || "Medium")}">${escapeHtml(item.priority || "Medium")}</span></td><td>${escapeHtml(item.assignedProductManagerName || "-")}</td><td>${formatShortDate(item.deadline)}</td><td>${escapeHtml(item.status || "New")}</td></tr>`).join("") : `<tr><td colspan="6">No routed leads for this department.</td></tr>`;
}

function renderAssignedDepartments() {
  const load = state.data?.departmentLoad || [];
  document.getElementById("assignedDepartmentCards").innerHTML = load.map((item) => `<article class="panel"><p class="eyebrow">${escapeHtml(item.code || "DEPT")}</p><h3>${escapeHtml(item.name)}</h3><small>${item.count} routed leads</small><small>${item.highPriority} high priority</small></article>`).join("") || `<article class="panel"><p>No department assignments yet.</p></article>`;
}

function renderPriorityLeads() {
  const items = state.data?.priorityLeads || [];
  document.getElementById("priorityRows").innerHTML = items.length ? items.map((item) => `<tr><td>${escapeHtml(item.leadName)}</td><td>${escapeHtml(item.company || "-")}</td><td>${formatCurrency(item.budget || 0)}</td><td>${escapeHtml(item.department || "-")}</td><td>${formatShortDate(item.deadline)}</td><td><span class="priority-pill ${slug(item.priority || "High")}">${escapeHtml(item.priority || "High")}</span></td></tr>`).join("") : `<tr><td colspan="6">No priority leads yet.</td></tr>`;
  document.getElementById("priorityCards").innerHTML = items.length ? items.map((item) => `<article class="mobile-card"><p>${escapeHtml(item.leadName)}</p><small>${escapeHtml(item.department || "-")} | ${formatShortDate(item.deadline)}</small><small><span class="priority-pill ${slug(item.priority || "High")}">${escapeHtml(item.priority || "High")}</span></small></article>`).join("") : `<article class="mobile-card"><p>No priority leads yet.</p></article>`;
}

function renderHistory() {
  const items = state.data?.history || [];
  const active = items.find((item) => String(item._id) === String(state.activeHistoryId)) || items[0] || null;
  document.getElementById("historyTimeline").innerHTML = items.length ? items.map((item) => `<button class="timeline-item" type="button" data-history-id="${item._id}"><p>${escapeHtml(item.leadName)}</p><small>${escapeHtml(item.action)} | ${escapeHtml(item.newDepartment || "-")}</small><small>${formatDateTime(item.createdAt)}</small></button>`).join("") : `<article class="timeline-item"><p>No routing history yet.</p></article>`;
  document.querySelectorAll("[data-history-id]").forEach((button) => button.addEventListener("click", () => { state.activeHistoryId = button.dataset.historyId; renderHistory(); }));
  document.getElementById("historyDetailPanel").innerHTML = active ? `
    <div class="panel-head"><div><p class="eyebrow">History Detail</p><h3>${escapeHtml(active.leadName)}</h3></div></div>
    <div class="summary-card">
      <p>Routed By</p><small>${escapeHtml(active.actorName || "-")}</small>
      <p>Department</p><small>${escapeHtml(active.newDepartment || "-")}</small>
      <p>Priority</p><small>${escapeHtml(active.newPriority || "-")}</small>
      <p>Product Manager</p><small>${escapeHtml(active.newProductManager || "-")}</small>
      <p>Deadline</p><small>${formatShortDate(active.newDeadline)}</small>
      <p>Notes</p><small>${escapeHtml(active.notes || "-")}</small>
    </div>
  ` : `<p>No history item selected.</p>`;
}

function renderReports() {
  if (typeof Chart === "undefined") return;
  renderChart("distributionChart", "doughnut", (state.data?.analytics?.distribution || []).map((item) => item._id), (state.data?.analytics?.distribution || []).map((item) => item.total), "#22d3ee");
  renderChart("speedChart", "line", (state.data?.analytics?.routingSpeed || []).map((item) => item._id), (state.data?.analytics?.routingSpeed || []).map((item) => item.total), "#38bdf8");
  renderChart("loadChart", "bar", (state.data?.analytics?.load || []).map((item) => item._id), (state.data?.analytics?.load || []).map((item) => item.total), "#8b5cf6");
}

function renderChart(canvasId, type, labels, values, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(canvas, { type, data: { labels, datasets: [{ label: "Leads", data: values, borderColor: color, backgroundColor: `${color}66`, fill: type === "line", tension: .35 }] }, options: { responsive: true, maintainAspectRatio: false } });
}

function renderNotifications() {
  document.getElementById("notificationList").innerHTML = (state.data?.history || []).slice(0, 6).map((item) => `<article class="feed-item"><p>New Lead Routed</p><small>${escapeHtml(item.leadName)} routed to ${escapeHtml(item.newDepartment || "-")}</small></article>`).join("") || `<article class="feed-item"><p>No notifications yet.</p></article>`;
}

function renderAlerts() {
  const overloaded = (state.data?.departmentLoad || []).filter((item) => item.count >= 5);
  document.getElementById("alertList").innerHTML = overloaded.length ? overloaded.map((item) => `<article class="feed-item"><p>${escapeHtml(item.name)}</p><small>${item.count} leads | High Priority ${item.highPriority}</small></article>`).join("") : `<article class="feed-item"><p>No department overload alerts.</p></article>`;
}

function hydrateRouteFormOptions() {
  const departments = state.data?.departments || [];
  const managers = state.data?.managers || [];
  document.getElementById("routeDepartment").innerHTML = departments.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  document.getElementById("routeManager").innerHTML = `<option value="">Select Product Manager</option>${managers.map((item) => `<option value="${item._id}">${escapeHtml(item.name)}</option>`).join("")}`;
}

function openRouteModal() {
  const lead = getActiveLead();
  if (!lead) {
    toast("Select a pending routing lead first.");
    return;
  }
  document.getElementById("routeLeadSummary").innerHTML = `<p>${escapeHtml(lead.name)}</p><small>${escapeHtml(lead.company || "-")}</small><small>${escapeHtml(lead.requirement || "-")}</small>`;
  document.getElementById("routeDepartment").value = lead.aiSuggestion?.department || "";
  document.getElementById("routePriority").value = lead.priority || "Medium";
  document.getElementById("routeBudget").value = lead.budget || 0;
  document.getElementById("routeDeadline").value = "";
  document.getElementById("routeNotes").value = "";
  document.getElementById("aiSuggestionBox").innerHTML = `<p>Recommended Department</p><small>${escapeHtml(lead.aiSuggestion?.department || "-")} | ${lead.aiSuggestion?.confidence || 0}% confidence</small><small>Suggested Timeline: ${escapeHtml(lead.aiSuggestion?.timeline || "-")}</small>`;
  document.getElementById("modalBackdrop").classList.remove("hidden");
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.add("hidden"));
  document.getElementById("routeModal").classList.remove("hidden");
}

async function saveRouting() {
  const lead = getActiveLead();
  if (!lead) return;
  await apiRequest("/routing/assign", "POST", {
    leadId: lead._id,
    department: document.getElementById("routeDepartment").value,
    priority: document.getElementById("routePriority").value,
    expectedBudget: document.getElementById("routeBudget").value,
    deadline: document.getElementById("routeDeadline").value,
    productManagerId: document.getElementById("routeManager").value,
    notes: document.getElementById("routeNotes").value,
  });
  closeModal();
  toast("Lead routed successfully");
  await loadRoutingData();
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.add("hidden"));
}

function toggleDrawer(id, open) {
  document.getElementById(id).classList.toggle("hidden", !open);
}

function renderGlobalSearch(event) {
  const query = String(event.target.value || "").trim().toLowerCase();
  const panel = document.getElementById("globalSearchPanel");
  if (!query) {
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }
  const results = [
    ...getUnroutedLeads().map((lead) => ({ label: lead.name, copy: `${lead.requirement || "-"} | ${lead.aiSuggestion?.department || "-"}`, leadId: lead._id })),
    ...(state.data?.departmentLoad || []).map((department) => ({ label: department.name, copy: `${department.count} leads`, section: "queue", department: department.name })),
  ].filter((item) => `${item.label} ${item.copy}`.toLowerCase().includes(query)).slice(0, 8);
  panel.innerHTML = results.length ? results.map((item) => `<button class="search-result ghost-button" type="button" data-search-lead="${item.leadId || ""}" data-search-section="${item.section || ""}" data-search-department="${item.department || ""}"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.copy)}</small></button>`).join("") : `<article class="search-result"><span>No matches</span></article>`;
  panel.classList.remove("hidden");
  document.querySelectorAll("[data-search-lead]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.searchLead) {
      state.activeLeadId = button.dataset.searchLead;
      renderQuickView();
      switchSection("dashboard");
    } else if (button.dataset.searchDepartment) {
      state.activeQueueDepartment = button.dataset.searchDepartment;
      renderQueueDetail();
      switchSection("queue");
    } else if (button.dataset.searchSection) {
      switchSection(button.dataset.searchSection);
    }
    panel.classList.add("hidden");
  }));
}

function filterMenu(event) {
  const query = String(event.target.value || "").trim().toLowerCase();
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("hidden", Boolean(query) && !item.textContent.toLowerCase().includes(query)));
}

function saveSettings() {
  localStorage.setItem("routingAiEnabled", document.getElementById("enableAi").value);
  localStorage.setItem("routingNotifyDepartment", document.getElementById("notifyDepartment").value);
  localStorage.setItem("routingEmailNotifications", document.getElementById("emailNotifications").value);
  toast("Routing settings saved");
}

function normalizeRole(role = "") {
  return String(role || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function slug(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.getElementById("toastStack").appendChild(node);
  setTimeout(() => node.remove(), 3200);
}
