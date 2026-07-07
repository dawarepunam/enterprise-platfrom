const SECTION_ROUTE_MAP = {
  dashboard: "/marketing/dashboard",
  import: "/marketing/import-leads",
  campaigns: "/marketing/campaigns",
  sources: "/marketing/lead-sources",
  generated: "/marketing/generated-leads",
  audience: "/marketing/audience",
  planner: "/marketing/content-planner",
  calendar: "/marketing/calendar",
  database: "/marketing/lead-database",
  assignment: "/marketing/lead-assignment",
  email: "/marketing/email-campaign",
  whatsapp: "/marketing/whatsapp-campaign",
  analytics: "/marketing/analytics",
  reports: "/marketing/reports",
  settings: "/marketing/settings",
};

const ROUTE_SECTION_MAP = Object.fromEntries(Object.entries(SECTION_ROUTE_MAP).map(([key, value]) => [value, key]));

const state = {
  user: null,
  dashboard: null,
  leads: [],
  campaigns: [],
  assignments: [],
  imports: [],
  users: [],
  notifications: [],
  selectedLeadIds: new Set(),
  selectedDrawerLeadId: "",
  selectedCampaignId: "",
  selectedAudienceName: "",
  charts: {},
  currentPage: 1,
  totalPages: 1,
  filters: {
    search: "",
    filter: "",
  },
  importRows: [],
  importHeaders: [],
  importFile: null,
  workspaceName: "Marketing Workspace",
  activeSection: "dashboard",
  aiMessages: [],
};

const emailTemplates = [
  {
    label: "Demo Follow-up",
    subject: "Hi {{lead_name}}, here is your CRM walkthrough",
    body:
      "Hi {{lead_name}},\n\nWe built a quick plan for {{company}} based on your CRM requirement. Reply with a good time and we will schedule a walkthrough.\n\nRegards,\nMarketing Team",
  },
  {
    label: "Offer Push",
    subject: "Special launch offer for {{company}}",
    body:
      "Hello {{lead_name}},\n\nWe have a campaign-ready offer for teams exploring CRM, automation and WhatsApp journeys.\n\nRegards,\nMarketing Team",
  },
];

const whatsappTemplates = [
  "Hi {{lead_name}}, we noticed your interest in CRM automation. Can we share a quick demo slot?",
  "Hello {{lead_name}}, your requirement is with our marketing team. Reply YES and we will connect today.",
];

document.addEventListener("DOMContentLoaded", initMarketingWorkspace);

async function initMarketingWorkspace() {
  requireAuth();
  state.user = getCurrentUser();
  if (!state.user || !["MARKETING", "ADMIN", "MANAGER"].includes(normalizeRole(state.user.role))) {
    window.location.href = "/pages/unauthorized.html";
    return;
  }

  state.activeSection = resolveSectionFromPath();
  hydrateChrome();
  bindUI();
  renderTemplateLibraries();
  restoreDrafts();
  switchSection(state.activeSection, false);

  await Promise.all([
    loadDashboard(),
    loadLeads(),
    loadCampaigns(),
    loadAssignments(),
    loadUsers(),
    loadNotifications(),
    refreshImports(),
  ]);
  
  initCharts();
  renderActivities();
  setupRealtime();
}

function bindUI() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchSection(button.dataset.section));
  });

  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  document.getElementById("themeButton")?.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
  });

  document.getElementById("notificationButton")?.addEventListener("click", () => toggleDrawer("notificationDrawer", true));
  document.getElementById("messageButton")?.addEventListener("click", () => switchSection("email"));
  document.getElementById("profileButton")?.addEventListener("click", logout);

  document.getElementById("createButton")?.addEventListener("click", () => {
    document.getElementById("createMenu").classList.toggle("hidden");
  });

  document.querySelectorAll("[data-create-action]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("createMenu").classList.add("hidden");
      const action = button.dataset.createAction;
      if (action === "lead") openModal("lead");
      if (action === "campaign") openModal("campaign");
      if (action === "import") switchSection("import");
      if (action === "assign") openModal("assign");
      if (action === "send") switchSection("email");
    });
  });

  document.querySelectorAll("[data-close-drawer]").forEach((button) => {
    button.addEventListener("click", () => toggleDrawer(button.dataset.closeDrawer, false));
  });

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.openModal));
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.getElementById("modalBackdrop")?.addEventListener("click", (event) => {
    if (event.target.id === "modalBackdrop") closeModal();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".topbar-menu-anchor")) {
      document.getElementById("createMenu")?.classList.add("hidden");
    }
    if (!event.target.closest(".search-stack")) {
      document.getElementById("globalSearchResults")?.classList.add("hidden");
    }
  });

  document.getElementById("refreshDashboard")?.addEventListener("click", async () => {
    await refreshWorkspace();
    toast("Dashboard refreshed");
  });

  document.getElementById("globalSearch")?.addEventListener("input", renderGlobalSearch);
  document.getElementById("workspaceSearch")?.addEventListener("input", filterSidebarItems);
  document.getElementById("leadSearch")?.addEventListener("input", async (event) => {
    state.filters.search = event.target.value.trim();
    state.currentPage = 1;
    await loadLeads();
  });
  document.getElementById("leadFilter")?.addEventListener("change", async (event) => {
    state.filters.filter = event.target.value;
    state.currentPage = 1;
    await loadLeads();
  });
  document.getElementById("assignmentSearch")?.addEventListener("input", async (event) => {
    state.filters.search = event.target.value.trim();
    state.currentPage = 1;
    await loadLeads();
  });
  document.getElementById("assignmentFilter")?.addEventListener("change", async (event) => {
    const value = event.target.value === "high" ? "" : event.target.value;
    state.filters.filter = value;
    state.currentPage = 1;
    await loadLeads();
    if (event.target.value === "high") {
      renderLeadTables();
    }
  });

  document.getElementById("previousPage")?.addEventListener("click", async () => {
    if (state.currentPage <= 1) return;
    state.currentPage -= 1;
    await loadLeads();
  });
  document.getElementById("nextPage")?.addEventListener("click", async () => {
    if (state.currentPage >= state.totalPages) return;
    state.currentPage += 1;
    await loadLeads();
  });

  document.getElementById("selectAllLeads")?.addEventListener("change", (event) => {
    const checked = event.target.checked;
    getAssignmentFilteredLeads().forEach((lead) => {
      if (checked) state.selectedLeadIds.add(String(lead._id));
      else state.selectedLeadIds.delete(String(lead._id));
    });
    renderLeadTables();
    renderBulkBar();
  });

  document.getElementById("leadForm")?.addEventListener("submit", submitLeadForm);
  document.getElementById("campaignForm")?.addEventListener("submit", submitCampaignForm);
  document.getElementById("assignForm")?.addEventListener("submit", submitAssignForm);

  document.getElementById("bulkAssignButton")?.addEventListener("click", () => openModal("assign"));
  document.getElementById("openAssignModalButton")?.addEventListener("click", () => openModal("assign"));
  document.getElementById("mobileAssignButton")?.addEventListener("click", () => openModal("assign"));
  document.getElementById("bulkEmailButton")?.addEventListener("click", () => switchSection("email"));
  document.getElementById("bulkWhatsappButton")?.addEventListener("click", () => switchSection("whatsapp"));
  document.getElementById("bulkExportButton")?.addEventListener("click", exportSelectedLeads);
  document.getElementById("bulkDeleteButton")?.addEventListener("click", bulkDeleteLeads);
  document.getElementById("bulkPriorityButton")?.addEventListener("click", bulkChangePriority);

  document.getElementById("sendEmailButton")?.addEventListener("click", () => sendEmailCampaign(false));
  document.getElementById("scheduleEmailButton")?.addEventListener("click", () => sendEmailCampaign(true));
  document.getElementById("sendWhatsappButton")?.addEventListener("click", () => sendWhatsappCampaign(false));
  document.getElementById("scheduleWhatsappButton")?.addEventListener("click", () => sendWhatsappCampaign(true));
  document.getElementById("saveEmailDraftButton")?.addEventListener("click", saveDraft);
  document.getElementById("saveSettingsButton")?.addEventListener("click", saveSettings);
  document.getElementById("addPlannerItemButton")?.addEventListener("click", () => openModal("campaign"));
  document.getElementById("aiLauncher")?.addEventListener("click", () => toggleAiPanel(true));
  document.getElementById("closeAiPanel")?.addEventListener("click", () => toggleAiPanel(false));
  document.getElementById("aiForm")?.addEventListener("submit", submitAiPrompt);

  document.querySelectorAll("[data-generated-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-generated-view]").forEach((item) => item.classList.toggle("active", item === button));
      renderGeneratedLeads(button.dataset.generatedView);
    });
  });

  document.querySelectorAll("[data-ai-prompt]").forEach((button) => {
    button.addEventListener("click", () => runAiPrompt(button.dataset.aiPrompt));
  });

  document.getElementById("drawerAssignButton")?.addEventListener("click", () => {
    if (!state.selectedDrawerLeadId) return;
    state.selectedLeadIds = new Set([state.selectedDrawerLeadId]);
    renderBulkBar();
    openModal("assign");
  });
  document.getElementById("drawerWhatsappButton")?.addEventListener("click", () => {
    if (!state.selectedDrawerLeadId) return;
    state.selectedLeadIds = new Set([state.selectedDrawerLeadId]);
    renderBulkBar();
    switchSection("whatsapp");
  });
  document.getElementById("drawerFollowupButton")?.addEventListener("click", async () => {
    if (!state.selectedDrawerLeadId) return;
    const followup = prompt("Enter follow-up date in YYYY-MM-DD format");
    if (!followup) return;
    await updateLead(state.selectedDrawerLeadId, { followUpDate: followup });
    toast("Follow-up date updated");
    await refreshWorkspace();
  });

  bindImportUI();
}

function bindImportUI() {
  const fileInput = document.getElementById("importFile");
  const dropzone = document.getElementById("uploadDropzone");

  document.getElementById("browseImportButton")?.addEventListener("click", () => fileInput.click());
  fileInput?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    await previewImportFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragging");
    });
  });

  dropzone?.addEventListener("drop", async (event) => {
    const [file] = event.dataTransfer.files || [];
    if (!file) return;
    await previewImportFile(file);
  });

  document.getElementById("downloadSampleButton")?.addEventListener("click", downloadSampleCsv);
  document.getElementById("loadImportHistoryButton")?.addEventListener("click", renderImportHistory);
  document.getElementById("importSubmitButton")?.addEventListener("click", submitImport);
}

function hydrateChrome() {
  const name = state.user?.name || "Marketing User";
  const email = state.user?.email || "";
  state.workspaceName = localStorage.getItem("marketingWorkspaceName") || "Marketing Workspace";
  document.getElementById("settingsWorkspaceName").value = state.workspaceName;
  document.getElementById("sidebarUserMeta").innerHTML = `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(email)}</small>`;
  document.getElementById("profileAvatar").src = resolveWorkspaceImageSrc(state.user?.profilePhoto);
}

async function refreshWorkspace() {
  await Promise.all([loadDashboard(), loadLeads(), loadCampaigns(), loadAssignments(), loadNotifications(), refreshImports()]);
}

async function loadDashboard() {
  const result = await apiRequest("/marketing/dashboard");
  state.dashboard = result.data;
  state.imports = result.data.recentImports || [];
  state.notifications = result.data.notifications || [];
  updateMarketingHealth();
  renderKpis();
  renderAssignmentKpis();
  renderActivities();
  renderNotifications();
  renderReports();
  renderSegments();
  renderLeadSources();
  renderAudience();
  renderPlanner();
  renderCalendar();
  renderGeneratedLeads();
  renderAiChat();
  renderCharts();
  renderImportHistory();
  renderAssignmentTimeline();
  renderRecommendation();
}

async function loadLeads() {
  const query = new URLSearchParams({
    page: String(state.currentPage),
    limit: localStorage.getItem("marketingItemsPerPage") || "8",
  });
  if (state.filters.search) query.set("search", state.filters.search);
  if (state.filters.filter) query.set("filter", state.filters.filter);
  const result = await apiRequest(`/leads?${query.toString()}`);
  state.leads = result.data.items || [];
  state.totalPages = result.data.pagination?.totalPages || 1;
  document.getElementById("paginationText").textContent = `Page ${state.currentPage} of ${state.totalPages}`;
  document.getElementById("leadSearch").value = state.filters.search;
  document.getElementById("assignmentSearch").value = state.filters.search;
  renderLeadTables();
  renderGeneratedLeads();
  renderLeadSources();
  renderAudience();
  renderPlanner();
  renderCalendar();
  renderBulkBar();
}

async function loadCampaigns() {
  const result = await apiRequest("/campaigns");
  state.campaigns = result.data || [];
  renderCampaigns();
  renderPlanner();
  renderCalendar();
  renderWhatsappRecent();
}

async function loadAssignments() {
  const result = await apiRequest("/leads/assignments");
  state.assignments = result.data || [];
  renderAssignments();
  renderAssignmentTimeline();
  renderRecommendation();
}

async function loadUsers() {
  try {
    const result = await apiRequest("/users");
    state.users = Array.isArray(result.data) ? result.data : result.data?.items || [];
  } catch (error) {
    state.users = [];
  }

  const select = document.getElementById("assignUserSelect");
  const assignableUsers = getAssignableUsers();
  select.innerHTML =
    assignableUsers
      .map(
        (user) =>
          `<option value="${user._id}">${escapeHtml(user.name)} | ${escapeHtml(user.role)}${user.department ? ` | ${escapeHtml(user.department)}` : ""}</option>`,
      )
      .join("") || `<option value="">No users available</option>`;
}

async function loadNotifications() {
  const result = await apiRequest("/notifications");
  state.notifications = result.data || [];
  renderNotifications();
}

function setupRealtime() {
  connectSocket();
  ["marketing:new-lead", "marketing:import-completed", "marketing:lead-assigned", "leadAssigned", "notification"].forEach((eventName) => {
    onSocket(eventName, async () => {
      await refreshWorkspace();
    });
  });
}

function switchSection(sectionName, pushRoute = true) {
  state.activeSection = sectionName;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.section === sectionName));
  document.querySelectorAll(".workspace-section").forEach((section) => {
    section.classList.toggle("active", section.dataset.sectionPanel === sectionName);
  });
  document.body.classList.remove("sidebar-open");
  if (pushRoute) {
    const route = SECTION_ROUTE_MAP[sectionName] || SECTION_ROUTE_MAP.dashboard;
    window.history.replaceState({}, "", route);
  }
}

function renderKpis() {
  const kpis = state.dashboard?.kpis || {};
  const campaignCount = (state.campaigns || []).filter((campaign) => !["Completed", "Draft"].includes(campaign.status)).length;
  
  const roi = kpis.roi || 324; 
  const revenue = kpis.revenue || 1450000;
  const totalLeads = kpis.totalLeads || 1250;
  
  const cards = [
    ["Total Leads", totalLeads, "+12.5% this month", "blue", "generated", "users"],
    ["Active Campaigns", campaignCount, "4 completing soon", "purple", "campaigns", "bullhorn"],
    ["Conversion Rate", "14.2%", "+2.1% from last month", "green", "analytics", "chart-line"],
    ["Pipeline Value", `₹${(revenue/100000).toFixed(1)}L`, "+₹2.4L this week", "orange", "reports", "rupee-sign"],
  ];

  document.getElementById("kpiGrid").innerHTML = cards
    .map(
      ([label, value, meta, color, section, icon]) => `
        <div class="kpi-card kpi-card-${color}" style="cursor:pointer;" onclick="switchSection('${section}')">
          <div class="kpi-icon kpi-icon-${color}" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-bottom: 12px; font-weight: bold;">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="kpi-value" style="font-size: 24px; font-weight: 800; color: #1e293b; line-height: 1.2;">${value}</div>
          <div class="kpi-label" style="font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500;">${label}</div>
          <div class="kpi-footer" style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e0e6ed; font-size: 11px; color: #64748b;">
            <span>${meta}</span>
          </div>
        </div>
      `,
    )
    .join("");

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => switchSection(button.dataset.jump));
  });
}

function renderAssignmentKpis() {
  const todayAssignments = state.assignments.filter((item) => isToday(item.createdAt)).length;
  const leads = getAssignmentFilteredLeads();
  const pending = leads.filter((lead) => lead.assignmentStatus !== "Assigned").length;
  const followups = leads.filter((lead) => lead.followUpDate && new Date(lead.followUpDate) <= new Date()).length;
  const hot = leads.filter((lead) => lead.quality === "Hot").length;

  const cards = [
    ["Pending Assignment Leads", pending, "+12.5%", "", "assignment"],
    ["Assigned Today", todayAssignments, "+8.2%", "", "assignment"],
    ["Unassigned Leads", pending, "+5.4%", "hot", "database"],
    ["Follow-up Pending", followups, "+3.6%", "", "assignment"],
    ["Hot Leads", hot, "+18.7%", "hot", "assignment"],
  ];

  document.getElementById("assignmentKpiGrid").innerHTML = cards
    .map(
      ([label, value, meta, extraClass, section]) => `
        <button class="kpi-card ${extraClass}" type="button" data-jump="${section}">
          <p class="eyebrow">${label}</p>
          <div class="kpi-value">${Number(value).toLocaleString("en-IN")}</div>
          <div class="kpi-meta">${meta}</div>
        </button>
      `,
    )
    .join("");
}

function renderLeadTables() {
  const leads = getAssignmentFilteredLeads();
  document.getElementById("dashboardLeadRows").innerHTML = leads.length
    ? leads.map((lead) => buildLeadRow(lead, true)).join("")
    : `<tr><td colspan="8">No leads found.</td></tr>`;

  document.getElementById("databaseLeadRows").innerHTML = leads.length
    ? leads.map((lead) => buildLeadRow(lead, false)).join("")
    : `<tr><td colspan="7">No leads found.</td></tr>`;

  document.getElementById("dashboardLeadCards").innerHTML = leads.length
    ? leads.map((lead) => buildMobileLeadCard(lead)).join("")
    : `<article class="mobile-lead-card"><p>No leads found.</p></article>`;

  document.getElementById("assignmentLeadCards").innerHTML = leads.length
    ? leads.map((lead) => buildAssignmentMobileCard(lead)).join("")
    : `<article class="mobile-lead-card"><p>No assignment leads found.</p></article>`;

  document.querySelectorAll("[data-lead-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const leadId = event.target.dataset.leadSelect;
      if (event.target.checked) state.selectedLeadIds.add(leadId);
      else state.selectedLeadIds.delete(leadId);
      renderBulkBar();
    });
  });

  document.querySelectorAll("[data-lead-view]").forEach((button) => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.leadView));
  });
  document.querySelectorAll("[data-lead-email]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLeadIds = new Set([button.dataset.leadEmail]);
      renderBulkBar();
      switchSection("email");
    });
  });
  document.querySelectorAll("[data-lead-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLeadIds = new Set([button.dataset.leadWhatsapp]);
      renderBulkBar();
      switchSection("whatsapp");
    });
  });
  document.querySelectorAll("[data-lead-assign]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLeadIds = new Set([button.dataset.leadAssign]);
      renderBulkBar();
      openModal("assign");
    });
  });
  document.querySelectorAll("[data-lead-call]").forEach((button) => {
    button.addEventListener("click", () => {
      const phone = button.dataset.leadCall;
      if (phone) window.location.href = `tel:${phone}`;
    });
  });
}

function buildLeadRow(lead, withCheckbox) {
  const checked = state.selectedLeadIds.has(String(lead._id)) ? "checked" : "";
  if (withCheckbox) {
    return `
      <tr style="cursor: pointer; transition: background 0.2s;" onclick="if(event.target.tagName !== 'INPUT' && event.target.tagName !== 'BUTTON') openLeadDrawer('${lead._id}')" class="hover-row">
        <td onclick="event.stopPropagation()"><input data-lead-select="${lead._id}" type="checkbox" ${checked} /></td>
        <td style="font-weight: 500; color: var(--primary);">${escapeHtml(lead.name)}</td>
        <td>${escapeHtml(lead.company || "-")}</td>
        <td>${escapeHtml(lead.phone || "-")}</td>
        <td>${escapeHtml(lead.requirement || "-")}</td>
        <td><span class="source-pill">${escapeHtml(lead.source || "Manual")}</span></td>
        <td><span class="status-pill ${slug(lead.assignmentStatus || lead.status)}">${escapeHtml(lead.assignmentStatus || lead.status || "New")}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="action-cluster">
            <button class="text-button" data-lead-assign="${lead._id}" type="button">Assign</button>
            <button class="text-button" data-lead-whatsapp="${lead._id}" type="button">WhatsApp</button>
            <button class="text-button" data-lead-call="${escapeHtml(lead.phone || "")}" type="button">Call</button>
          </div>
        </td>
      </tr>
    `;
  }

  return `
    <tr style="cursor: pointer; transition: background 0.2s;" onclick="if(event.target.tagName !== 'INPUT' && event.target.tagName !== 'BUTTON') openLeadDrawer('${lead._id}')" class="hover-row">
      <td style="font-weight: 500; color: var(--primary);">${escapeHtml(lead.name)}</td>
      <td>${escapeHtml(lead.company || "-")}</td>
      <td>${escapeHtml(lead.phone || "-")}</td>
      <td><span class="source-pill">${escapeHtml(lead.source || "Manual")}</span></td>
      <td><span class="status-pill ${slug(lead.status)}">${escapeHtml(lead.status || "New")}</span></td>
      <td>${escapeHtml(lead.assignedToName || "Pending")}</td>
      <td onclick="event.stopPropagation()"><button class="text-button" data-lead-view="${lead._id}" type="button">Timeline</button></td>
    </tr>
  `;
}

function buildMobileLeadCard(lead) {
  const checked = state.selectedLeadIds.has(String(lead._id)) ? "checked" : "";
  return `
    <article class="mobile-lead-card">
      <div class="summary-line">
        <p>${escapeHtml(lead.name)}</p>
        <input data-lead-select="${lead._id}" type="checkbox" ${checked} />
      </div>
      <small>${escapeHtml(lead.company || "-")} | ${escapeHtml(lead.phone || "-")}</small>
      <small>${escapeHtml(lead.source || "Manual")} | ${escapeHtml(lead.priority || "Medium")}</small>
      <div class="inline-actions">
        <button class="ghost-button" data-lead-view="${lead._id}" type="button">Quick View</button>
        <button class="ghost-button" data-lead-assign="${lead._id}" type="button">Assign</button>
      </div>
    </article>
  `;
}

function buildAssignmentMobileCard(lead) {
  return `
    <article class="mobile-lead-card">
      <div class="summary-line">
        <p>${escapeHtml(lead.name)}</p>
        <span class="status-pill ${slug(lead.assignmentStatus || lead.status)}">${escapeHtml(lead.assignmentStatus || lead.status || "New")}</span>
      </div>
      <small>${escapeHtml(lead.company || "-")} | ${escapeHtml(lead.phone || "-")}</small>
      <small>Assigned To: ${escapeHtml(lead.assignedToName || "Pending")}</small>
      <div class="inline-actions">
        <button class="ghost-button" data-lead-view="${lead._id}" type="button">Timeline</button>
        <button class="primary-button" data-lead-assign="${lead._id}" type="button">Assign</button>
      </div>
    </article>
  `;
}

function renderBulkBar() {
  const count = state.selectedLeadIds.size;
  document.getElementById("bulkSelectionText").textContent = `${count} selected`;
  document.getElementById("bulkBar").classList.toggle("hidden", count === 0);
  document.getElementById("mobileAssignBar").classList.toggle("hidden", count === 0);
}

function renderActivities() {
  const items = state.dashboard?.activities || [];
  document.getElementById("activityList").innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="activity-item">
              <p>${escapeHtml(item.title)}</p>
              <small>${escapeHtml(item.description)}</small>
            </article>
          `,
        )
        .join("")
    : `<article class="activity-item"><p>No activity yet</p></article>`;
}

function renderCampaigns() {
  document.getElementById("campaignGrid").innerHTML =
    (state.campaigns || [])
      .map(
        (campaign) => `
          <article class="glass-panel campaign-card" data-campaign-card="${campaign._id}">
            <div class="campaign-cover ${slug(campaign.channel || campaign.platform || "mixed")}">
              <strong>${escapeHtml((campaign.channel || campaign.platform || "MK").slice(0, 2).toUpperCase())}</strong>
              <span>${escapeHtml(campaign.channel || campaign.platform || "Mixed")}</span>
            </div>
            <div class="panel-head">
              <div>
                <p class="eyebrow">${escapeHtml(campaign.channel || "Mixed")}</p>
                <h3>${escapeHtml(campaign.name)}</h3>
              </div>
              <span class="status-pill ${slug(campaign.status)}">${escapeHtml(campaign.status || "Active")}</span>
            </div>
            <div class="summary-stack">
              <div class="summary-line"><span>Budget</span><strong>${formatCurrency(campaign.budget || 0)}</strong></div>
              <div class="summary-line"><span>Leads Generated</span><strong>${Number(campaign.generatedLeads || 0).toLocaleString("en-IN")}</strong></div>
              <div class="summary-line"><span>Conversion Rate</span><strong>${Number(campaign.conversionRate || 0).toFixed(1)}%</strong></div>
            </div>
            <div class="card-hover-actions">
              <button class="ghost-button" type="button" data-campaign-view="${campaign._id}">View Analytics</button>
              <button class="ghost-button" type="button" data-campaign-pause="${campaign._id}">${campaign.status === "Paused" ? "Resume" : "Pause"}</button>
              <button class="ghost-button" type="button" data-campaign-duplicate="${campaign._id}">Duplicate</button>
            </div>
          </article>
        `,
      )
      .join("") || `<article class="glass-panel">No campaigns yet.</article>`;

  document.querySelectorAll("[data-campaign-view]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openCampaignDrawer(button.dataset.campaignView);
    });
  });
  document.querySelectorAll("[data-campaign-card]").forEach((card) => {
    card.addEventListener("click", () => openCampaignDrawer(card.dataset.campaignCard));
  });
  document.querySelectorAll("[data-campaign-pause]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await updateCampaignStatus(button.dataset.campaignPause);
    });
  });
  document.querySelectorAll("[data-campaign-duplicate]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await duplicateCampaign(button.dataset.campaignDuplicate);
    });
  });
}

function renderLeadSources() {
  const sourceBuckets = state.dashboard?.analytics?.leadSources || [];
  const total = sourceBuckets.reduce((sum, item) => sum + Number(item.total || 0), 0) || 1;
  const cards = sourceBuckets.length ? sourceBuckets : [
    { _id: "Facebook", total: 0 },
    { _id: "Google", total: 0 },
    { _id: "Website", total: 0 },
    { _id: "WhatsApp", total: 0 },
    { _id: "Referral", total: 0 },
  ];

  const target = document.getElementById("leadSourceGrid");
  if (!target) return;
  target.innerHTML = cards
    .map((item) => {
      const count = Number(item.total || 0);
      const qualified = state.leads.filter((lead) => normalizeLoose(lead.source) === normalizeLoose(item._id) && ["Hot", "Warm"].includes(lead.quality)).length;
      const roi = Math.max(80, Math.round((count / total) * 300));
      return `
        <button class="source-card" type="button" data-source-filter="${escapeHtml(item._id || "Unknown")}">
          <span class="source-icon">${escapeHtml(String(item._id || "?").slice(0, 2).toUpperCase())}</span>
          <strong>${escapeHtml(item._id || "Unknown")}</strong>
          <div class="summary-line"><span>Total Leads</span><b>${count}</b></div>
          <div class="summary-line"><span>Qualified</span><b>${qualified}</b></div>
          <div class="summary-line"><span>ROI</span><b>${roi}%</b></div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll("[data-source-filter]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.filters.filter = normalizeLoose(button.dataset.sourceFilter);
      switchSection("generated");
      renderGeneratedLeads();
    });
  });
}

function renderGeneratedLeads(view = document.querySelector("[data-generated-view].active")?.dataset.generatedView || "table") {
  const target = document.getElementById("generatedLeadsView");
  if (!target) return;
  const leads = getAssignmentFilteredLeads();

  if (view === "kanban") {
    const columns = ["New", "Verified", "Qualified", "Assigned", "Converted"];
    target.innerHTML = `<div class="kanban-board">${columns.map((status) => `
      <section class="kanban-column">
        <h3>${status}</h3>
        ${leads.filter((lead) => normalizeLoose(lead.status || lead.assignmentStatus).includes(normalizeLoose(status))).map(buildLeadMiniCard).join("") || '<p class="empty-copy">No leads</p>'}
      </section>
    `).join("")}</div>`;
    bindMiniLeadCards();
    return;
  }

  if (view === "pipeline") {
    const stages = [
      ["Generated", leads.length],
      ["Verified", leads.filter((lead) => /verified|qualified|assigned|converted/i.test(`${lead.status} ${lead.assignmentStatus}`)).length],
      ["Scored", leads.filter((lead) => Number(lead.aiScore || 0) >= 60 || ["Hot", "Warm"].includes(lead.quality)).length],
      ["Assigned", leads.filter((lead) => lead.assignmentStatus === "Assigned").length],
      ["Calling Queue", leads.filter((lead) => lead.assignedToName).length],
    ];
    target.innerHTML = `<div class="pipeline-flow">${stages.map(([label, count]) => `
      <article class="pipeline-step"><strong>${count}</strong><span>${label}</span></article>
    `).join("")}</div>`;
    return;
  }

  target.innerHTML = `
    <div class="table-wrap generated-table-wrap">
      <table class="lead-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Source</th><th>Score</th><th>Status</th><th>Assigned To</th><th>Action</th></tr></thead>
        <tbody>${leads.length ? leads.map((lead) => `
          <tr>
            <td>${escapeHtml(lead.name || "-")}</td>
            <td>${escapeHtml(lead.phone || "-")}</td>
            <td>${escapeHtml(lead.email || "-")}</td>
            <td><span class="source-pill">${escapeHtml(lead.source || "Manual")}</span></td>
            <td>${Number(lead.aiScore || 0)}</td>
            <td><span class="status-pill ${slug(lead.assignmentStatus || lead.status)}">${escapeHtml(lead.assignmentStatus || lead.status || "New")}</span></td>
            <td>${escapeHtml(lead.assignedToName || "-")}</td>
            <td><button class="text-button" data-mini-lead="${lead._id}" type="button">Open</button></td>
          </tr>
        `).join("") : '<tr><td colspan="8">No generated leads found.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="mobile-lead-list generated-mobile-list">${leads.map(buildMobileLeadCard).join("")}</div>
  `;
  bindMiniLeadCards();
}

function buildLeadMiniCard(lead) {
  return `
    <button class="mini-item lead-mini-card" type="button" data-mini-lead="${lead._id}">
      <p>${escapeHtml(lead.name || "-")}</p>
      <small>${escapeHtml(lead.source || "Manual")} | Score ${Number(lead.aiScore || 0)}</small>
      <small>${escapeHtml(lead.assignedToName || "Unassigned")}</small>
    </button>
  `;
}

function bindMiniLeadCards() {
  document.querySelectorAll("[data-mini-lead]").forEach((button) => {
    button.addEventListener("click", () => openLeadDrawer(button.dataset.miniLead));
  });
}

function renderAudience() {
  const segmentRules = [
    ["Students", /student|college|training|course/i],
    ["Businesses", /business|crm|automation|erp/i],
    ["Startups", /startup|founder|saas/i],
    ["Manufacturing", /manufacturing|factory|plant/i],
    ["IT Companies", /software|it|technology|app|web/i],
  ];
  const target = document.getElementById("audienceGrid");
  if (!target) return;
  target.innerHTML = segmentRules.map(([name, rule]) => {
    const segmentLeads = state.leads.filter((lead) => rule.test(`${lead.company} ${lead.requirement} ${lead.source} ${lead.notes}`));
    const size = segmentLeads.length;
    const conversion = size ? Math.round((segmentLeads.filter((lead) => /converted|qualified/i.test(`${lead.status} ${lead.quality}`)).length / size) * 100) : 0;
    return `
      <button class="audience-card" type="button" data-audience="${name}">
        <strong>${name}</strong>
        <span>${size} audience size</span>
        <span>${Math.max(1, Math.ceil(size / 8))} campaigns</span>
        <span>${conversion}% conversion</span>
      </button>
    `;
  }).join("");

  document.querySelectorAll("[data-audience]").forEach((button) => {
    button.addEventListener("click", () => openAudienceDrawer(button.dataset.audience));
  });
}

function renderPlanner() {
  const target = document.getElementById("plannerBoard");
  if (!target) return;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const items = buildPlannerItems();
  target.innerHTML = days.map((day) => `
    <section class="planner-day">
      <h3>${day}</h3>
      ${items.filter((item) => item.day === day).map((item) => `
        <button class="planner-item ${slug(item.type)}" type="button" data-planner-item="${escapeHtml(item.title)}">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.time)}</span>
        </button>
      `).join("") || '<p class="empty-copy">No content</p>'}
    </section>
  `).join("");
}

function renderCalendar() {
  const target = document.getElementById("marketingCalendar");
  if (!target) return;
  const days = Array.from({ length: 28 }, (_, index) => index + 1);
  const items = buildPlannerItems();
  target.innerHTML = days.map((day) => {
    const dayItems = items.filter((_, index) => (index * 4 + 3) % 28 === day % 28);
    return `
      <article class="calendar-cell">
        <strong>${day}</strong>
        ${dayItems.map((item) => `<span class="calendar-chip ${slug(item.type)}">${escapeHtml(item.title)}</span>`).join("")}
      </article>
    `;
  }).join("");
}

function renderAssignments() {
  document.getElementById("assignmentRows").innerHTML = state.assignments.length
    ? state.assignments
        .map(
          (item) => `
            <tr>
              <td>${item.leadIds.length}</td>
              <td>${escapeHtml(item.assignedToName || "-")}</td>
              <td>${escapeHtml(item.department || "-")}</td>
              <td>${escapeHtml(item.priority || "-")}</td>
              <td>${formatShortDate(item.followUpDate)}</td>
              <td><span class="status-pill ${slug(item.status)}">${escapeHtml(item.status || "Assigned")}</span></td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6">No assignments yet.</td></tr>`;
}

function renderNotifications() {
  document.getElementById("notificationList").innerHTML = state.notifications.length
    ? state.notifications
        .map(
          (item) => `
            <article class="notification-item">
              <p>${escapeHtml(item.title || "Update")}</p>
              <small>${escapeHtml(item.message || "")}</small>
            </article>
          `,
        )
        .join("")
    : `<article class="notification-item"><p>No notifications</p></article>`;
}

function renderImportHistory() {
  document.getElementById("importHistoryList").innerHTML = state.imports.length
    ? state.imports
        .map(
          (item) => `
            <article class="mini-item">
              <p>${escapeHtml(item.fileName || "Import")}</p>
              <small>${item.validRows || 0} valid | ${formatShortDate(item.createdAt)}</small>
            </article>
          `,
        )
        .join("")
    : `<article class="mini-item"><p>No import history yet</p></article>`;
}

function renderReports() {
  const kpis = state.dashboard?.kpis || {};
  const cards = [
    ["Lead Report", `${Number(kpis.totalLeads || 0).toLocaleString("en-IN")} total`, "Download CSV"],
    ["Campaign Report", `${Number((state.campaigns || []).length).toLocaleString("en-IN")} total`, "Download CSV"],
    ["Source Report", `${Number((state.dashboard?.sources || []).length).toLocaleString("en-IN")} sources`, "Download CSV"],
    ["Conversion Report", `${Number(kpis.hotLeads || 0).toLocaleString("en-IN")} hot leads`, "Download CSV"],
  ];
  document.getElementById("reportGrid").innerHTML = cards
    .map(
      ([title, copy, action]) => `
        <article class="report-card">
          <p>${title}</p>
          <small>${copy}</small>
          <div class="inline-actions compact"><button class="primary-button" type="button">${action}</button></div>
        </article>
      `,
    )
    .join("");
}

function renderSegments() {
  const items = [
    `All Leads | ${state.dashboard?.kpis?.totalLeads || 0}`,
    `Hot Leads | ${state.dashboard?.kpis?.hotLeads || 0}`,
    `Pending Leads | ${state.dashboard?.kpis?.pendingLeads || 0}`,
  ];
  document.getElementById("emailSegments").innerHTML = items.map((item) => `<article class="mini-item"><p>${item}</p></article>`).join("");
}

function renderWhatsappRecent() {
  document.getElementById("whatsappRecentList").innerHTML =
    (state.campaigns || [])
      .slice(0, 5)
      .map(
        (campaign) =>
          `<article class="mini-item"><p>${escapeHtml(campaign.name)}</p><small>${escapeHtml(campaign.channel || "WhatsApp")}</small></article>`,
      )
      .join("") || `<article class="mini-item"><p>No recent campaigns</p></article>`;
}

function renderTemplateLibraries() {
  document.getElementById("emailTemplateList").innerHTML = emailTemplates
    .map(
      (template, index) => `
        <button class="template-item" type="button" data-email-template="${index}">
          <p>${escapeHtml(template.label)}</p>
          <small>${escapeHtml(template.subject)}</small>
        </button>
      `,
    )
    .join("");

  document.getElementById("whatsappTemplateList").innerHTML = whatsappTemplates
    .map(
      (template, index) => `
        <button class="template-item" type="button" data-whatsapp-template="${index}">
          <p>Template ${index + 1}</p>
          <small>${escapeHtml(template)}</small>
        </button>
      `,
    )
    .join("");

  document.querySelectorAll("[data-email-template]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = emailTemplates[Number(button.dataset.emailTemplate)];
      document.getElementById("emailSubject").value = template.subject;
      document.getElementById("emailHtml").value = template.body;
    });
  });

  document.querySelectorAll("[data-whatsapp-template]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("whatsappMessage").value = whatsappTemplates[Number(button.dataset.whatsappTemplate)];
    });
  });
}

function renderAssignmentTimeline() {
  document.getElementById("assignmentTimeline").innerHTML = state.assignments.length
    ? state.assignments
        .slice(0, 8)
        .map(
          (item) => `
            <article class="activity-item">
              <p>Lead Assigned</p>
              <small>By: ${escapeHtml(item.assignedBy || "Marketing User")} | To: ${escapeHtml(item.assignedToName || "-")}</small>
              <small>${formatDateTime(item.createdAt)}</small>
            </article>
          `,
        )
        .join("")
    : `<article class="activity-item"><p>No assignment activity yet.</p></article>`;
}

function renderRecommendation() {
  const assignableUsers = getAssignableUsers();
  if (!assignableUsers.length) {
    document.getElementById("assignmentRecommendation").innerHTML = `<article class="mini-item"><p>No executive available</p></article>`;
    return;
  }

  const recommendation = buildAssignmentRecommendation();
  document.getElementById("assignmentRecommendation").innerHTML = `
    <article class="mini-item">
      <p>${escapeHtml(recommendation.user.name)}</p>
      <small>${escapeHtml(recommendation.user.department || recommendation.user.role)}</small>
      <small>${recommendation.match}% match | ${recommendation.reason}</small>
      <div class="inline-actions compact">
        <button class="primary-button" type="button" id="recommendAssignButton">Assign to ${escapeHtml(recommendation.user.name)}</button>
      </div>
    </article>
  `;

  document.getElementById("recommendAssignButton")?.addEventListener("click", () => {
    document.getElementById("assignUserSelect").value = recommendation.user._id;
    openModal("assign");
  });
}

function renderCharts() {
  renderChart("overviewTrendChart", "line", state.dashboard?.analytics?.leadTrend || [], "#2563eb");
  renderChart("trendChart", "line", state.dashboard?.analytics?.leadTrend || [], "#38bdf8");
  renderChart("statusChart", "bar", state.dashboard?.analytics?.leadStatus || [], "#60a5fa");
  renderChart("sourceChart", "doughnut", state.dashboard?.analytics?.leadSources || [], "#8b5cf6");
  renderChart("analyticsTrendChart", "line", state.dashboard?.analytics?.leadTrend || [], "#22c55e");
  renderChart("analyticsSourceChart", "doughnut", state.dashboard?.analytics?.leadSources || [], "#f59e0b");
  renderChart("analyticsStatusChart", "bar", state.dashboard?.analytics?.leadStatus || [], "#ef4444");
}

function updateMarketingHealth() {
  const kpis = state.dashboard?.kpis || {};
  const total = Number(kpis.totalLeads || 0);
  const hot = Number(kpis.hotLeads || 0);
  const assigned = Number(kpis.assignedLeads || 0);
  const score = total ? Math.min(98, Math.max(62, Math.round(((hot * 1.4 + assigned) / total) * 100))) : 92;
  const ring = document.getElementById("healthRing");
  const scoreLabel = document.getElementById("healthScore");
  const healthLabel = document.getElementById("healthLabel");
  if (ring) ring.style.setProperty("--score", `${score}%`);
  if (scoreLabel) scoreLabel.textContent = `${score}%`;
  if (healthLabel) healthLabel.textContent = score >= 85 ? "Excellent Performance" : score >= 70 ? "Strong Growth" : "Needs Attention";
  const greeting = document.getElementById("dashboardGreeting");
  if (greeting) greeting.textContent = `${buildGreeting()}, ${state.user?.name || "Marketing Team"}`;
}

function buildMarketingRoi() {
  const campaigns = state.campaigns || [];
  if (!campaigns.length) return 245;
  const average = campaigns.reduce((sum, item) => sum + Number(item.roi || item.conversionRate || 0), 0) / campaigns.length;
  return Math.max(120, Math.round(average || 245));
}

function calculateMarketingRevenue() {
  const leadRevenue = (state.leads || []).reduce((sum, lead) => {
    const qualified = /qualified|converted|assigned/i.test(`${lead.status} ${lead.quality} ${lead.assignmentStatus}`);
    return sum + (qualified ? Number(lead.budget || 0) : 0);
  }, 0);
  return leadRevenue || 850000;
}

function openCampaignDrawer(id) {
  const campaign = state.campaigns.find((item) => String(item._id) === String(id));
  if (!campaign) return;
  const sourceLeads = state.leads.filter((lead) => normalizeLoose(lead.source).includes(normalizeLoose(campaign.channel || campaign.platform || "")));
  document.getElementById("campaignDrawerContent").innerHTML = `
    <div class="drawer-tabs">
      <span class="active">Overview</span><span>Leads</span><span>Analytics</span><span>Budget</span><span>Activity</span>
    </div>
    <article class="mini-item">
      <p>${escapeHtml(campaign.name || "Campaign")}</p>
      <small>${escapeHtml(campaign.channel || campaign.platform || "Mixed")} | ${escapeHtml(campaign.status || "Active")}</small>
    </article>
    <div class="admin-profile-grid">
      <article class="admin-profile-card"><span>Budget</span><strong>${formatCurrency(campaign.budget || 0)}</strong></article>
      <article class="admin-profile-card"><span>Spent</span><strong>${formatCurrency((campaign.budget || 0) * 0.42)}</strong></article>
      <article class="admin-profile-card"><span>Remaining</span><strong>${formatCurrency((campaign.budget || 0) * 0.58)}</strong></article>
      <article class="admin-profile-card"><span>Leads</span><strong>${sourceLeads.length || campaign.generatedLeads || 0}</strong></article>
      <article class="admin-profile-card"><span>Conversion</span><strong>${Number(campaign.conversionRate || 18).toFixed(1)}%</strong></article>
      <article class="admin-profile-card"><span>ROI</span><strong>${Number(campaign.roi || 240).toFixed(0)}%</strong></article>
    </div>
    <div class="mini-list">
      ${sourceLeads.slice(0, 6).map(buildLeadMiniCard).join("") || '<article class="mini-item"><p>No linked leads yet.</p></article>'}
    </div>
  `;
  bindMiniLeadCards();
  toggleDrawer("campaignDrawer", true);
}

function openAudienceDrawer(name) {
  const leads = state.leads.filter((lead) => `${lead.company} ${lead.requirement} ${lead.source} ${lead.notes}`.toLowerCase().includes(String(name).toLowerCase().split(" ")[0]));
  document.getElementById("audienceDrawerContent").innerHTML = `
    <article class="mini-item">
      <p>${escapeHtml(name)}</p>
      <small>${leads.length} leads | ${Math.max(1, Math.ceil(leads.length / 8))} recommended campaigns</small>
    </article>
    <div class="admin-profile-grid">
      <article class="admin-profile-card"><span>Campaigns</span><strong>${Math.max(1, Math.ceil(leads.length / 8))}</strong></article>
      <article class="admin-profile-card"><span>Leads</span><strong>${leads.length}</strong></article>
      <article class="admin-profile-card"><span>Revenue</span><strong>${formatCurrency(leads.reduce((sum, lead) => sum + Number(lead.budget || 0), 0))}</strong></article>
    </div>
    <div class="mini-list">${leads.slice(0, 8).map(buildLeadMiniCard).join("") || '<article class="mini-item"><p>No matching leads yet.</p></article>'}</div>
  `;
  bindMiniLeadCards();
  toggleDrawer("audienceDrawer", true);
}

async function updateCampaignStatus(id) {
  const campaign = state.campaigns.find((item) => String(item._id) === String(id));
  if (!campaign) return;
  const nextStatus = campaign.status === "Paused" ? "Running" : "Paused";
  try {
    await apiRequest(`/campaigns/${id}`, "PUT", { status: nextStatus });
    toast(`Campaign ${nextStatus.toLowerCase()}`);
    await loadCampaigns();
  } catch (error) {
    campaign.status = nextStatus;
    renderCampaigns();
    toast("Campaign status updated locally. Backend update route is unavailable.");
  }
}

async function duplicateCampaign(id) {
  const campaign = state.campaigns.find((item) => String(item._id) === String(id));
  if (!campaign) return;
  try {
    await apiRequest("/campaigns/create", "POST", {
      ...campaign,
      name: `${campaign.name || "Campaign"} Copy`,
      status: "Draft",
    });
    toast("Campaign duplicated");
    await loadCampaigns();
  } catch (error) {
    toast(error.message || "Campaign duplicate failed");
  }
}

function buildPlannerItems() {
  const campaignItems = (state.campaigns || []).slice(0, 6).map((campaign, index) => ({
    title: campaign.name || "Campaign Launch",
    type: campaign.channel || "Campaign",
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index % 6],
    time: campaign.startDate ? formatShortDate(campaign.startDate) : `${10 + index}:00 AM`,
  }));
  const defaults = [
    { title: "Instagram Post", type: "Content", day: "Mon", time: "10:00 AM" },
    { title: "Facebook Post", type: "Content", day: "Tue", time: "11:00 AM" },
    { title: "Email Campaign", type: "Email", day: "Fri", time: "02:00 PM" },
    { title: "Blog Post", type: "Content", day: "Thu", time: "09:00 AM" },
    { title: "YouTube Video", type: "Event", day: "Sat", time: "03:00 PM" },
  ];
  return [...campaignItems, ...defaults];
}

function toggleAiPanel(open) {
  document.getElementById("aiPanel")?.classList.toggle("hidden", !open);
  if (open) renderAiChat();
}

function submitAiPrompt(event) {
  event.preventDefault();
  const input = document.getElementById("aiInput");
  const value = input.value.trim();
  if (!value) return;
  input.value = "";
  runAiPrompt(value);
}

function runAiPrompt(promptText) {
  const answer = buildAiAnswer(promptText);
  state.aiMessages.push({ from: "user", text: promptText }, { from: "ai", text: answer });
  renderAiChat();
}

function renderAiChat() {
  const chat = document.getElementById("aiChat");
  if (!chat) return;
  if (!state.aiMessages.length) {
    state.aiMessages = [{ from: "ai", text: "Hello. I can summarize campaigns, identify weak sources, suggest audiences, and prepare a quick marketing report." }];
  }
  chat.innerHTML = state.aiMessages.map((item) => `<article class="ai-message ${item.from}">${escapeHtml(item.text)}</article>`).join("");
  chat.scrollTop = chat.scrollHeight;
}

function buildAiAnswer(promptText) {
  const prompt = String(promptText || "").toLowerCase();
  const bestCampaign = [...(state.campaigns || [])].sort((left, right) => Number(right.roi || right.conversionRate || 0) - Number(left.roi || left.conversionRate || 0))[0];
  const sources = state.dashboard?.analytics?.leadSources || [];
  const weakestSource = [...sources].sort((left, right) => Number(left.total || 0) - Number(right.total || 0))[0];
  if (prompt.includes("best")) return bestCampaign ? `${bestCampaign.name} is currently strongest with ${Number(bestCampaign.roi || bestCampaign.conversionRate || 0).toFixed(0)}% performance signal.` : "No campaign data is available yet. Create a campaign first.";
  if (prompt.includes("low")) return weakestSource ? `${weakestSource._id} is the lowest source right now with ${weakestSource.total} lead(s). Review targeting and budget.` : "No source data is available yet.";
  if (prompt.includes("audience")) return "Suggested audience: businesses with CRM, automation, website, or WhatsApp requirements. They show the clearest conversion pattern in current leads.";
  if (prompt.includes("report")) return `Report: ${state.dashboard?.kpis?.totalLeads || 0} total leads, ${state.dashboard?.kpis?.assignedLeads || 0} assigned, ${state.dashboard?.kpis?.hotLeads || 0} hot leads, ROI ${buildMarketingRoi()}%.`;
  return "I checked current leads, campaigns, and sources. Use Best Campaign, Low Performing Ads, Suggest Audience, or Campaign Report for a focused answer.";
}

function buildGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function normalizeLoose(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function renderChart(canvasId, type, buckets, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  if (state.charts[canvasId]) state.charts[canvasId].destroy();

  const labels = buckets.map((item) => item._id || "Unknown");
  const values = buckets.map((item) => item.total || 0);

  state.charts[canvasId] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: "Leads",
          data: values,
          borderColor: color,
          backgroundColor: `${color}55`,
          fill: type === "line",
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.body).getPropertyValue("--text"),
          },
        },
      },
      scales:
        type === "doughnut"
          ? {}
          : {
              x: { ticks: { color: getComputedStyle(document.body).getPropertyValue("--muted") } },
              y: { ticks: { color: getComputedStyle(document.body).getPropertyValue("--muted") } },
            },
    },
  });
}

async function previewImportFile(file) {
  state.importFile = file;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    state.importRows = [];
    state.importHeaders = [];
    toast("CSV preview is available right now. XLSX import still uploads through backend.");
    renderImportPreview();
    return;
  }

  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseCsvLine(line));

  state.importHeaders = rows[0] || [];
  state.importRows = rows.slice(1).map((values) =>
    state.importHeaders.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {}),
  );
  renderImportPreview();
}

function renderImportPreview() {
  const headers = state.importHeaders;
  document.getElementById("previewHead").innerHTML = headers.length
    ? `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`
    : `<tr><th>Preview unavailable until a CSV is chosen</th></tr>`;

  document.getElementById("previewBody").innerHTML = state.importRows.length
    ? state.importRows
        .slice(0, 8)
        .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] || "")}</td>`).join("")}</tr>`)
        .join("")
    : `<tr><td>${state.importFile ? "Upload ready. Submit to import." : "No file selected."}</td></tr>`;

  const mappingFields = ["name", "phone", "email", "company", "requirement", "budget", "source"];
  document.getElementById("mappingGrid").innerHTML = mappingFields
    .map((field) => {
      const options = headers.map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`).join("");
      return `
        <label class="mapping-row">
          <span>${field}</span>
          <span>to</span>
          <select data-mapping-field="${field}">
            <option value="">Auto</option>
            ${options}
          </select>
        </label>
      `;
    })
    .join("");

  document.getElementById("summaryTotalRows").textContent = String(state.importRows.length);
  document.getElementById("summaryValidRows").textContent = String(
    state.importRows.filter((row) => (row.Name || row.name) && (row.Phone || row.phone || row.Mobile || row.mobile)).length,
  );
  document.getElementById("summaryDuplicateRows").textContent = "Pending";
  document.getElementById("summaryErrorRows").textContent = "Pending";
}

async function submitImport() {
  if (!state.importFile) {
    toast("Choose a file before importing");
    return;
  }

  const formData = new FormData();
  formData.append("file", state.importFile);
  formData.append("source", "Imported Leads");
  const mapping = {};
  document.querySelectorAll("[data-mapping-field]").forEach((select) => {
    if (select.value) mapping[select.dataset.mappingField] = select.value;
  });
  formData.append("mapping", JSON.stringify(mapping));

  try {
    const result = await apiRequest("/leads/import", "POST", formData, true);
    document.getElementById("summaryDuplicateRows").textContent = String(result.data.duplicateRows || 0);
    document.getElementById("summaryErrorRows").textContent = String(result.data.errorRows || 0);
    document.getElementById("importErrorList").innerHTML = (result.data.errors || [])
      .map((error) => `<article class="mini-item"><small>${escapeHtml(error)}</small></article>`)
      .join("");
    toast("Lead import completed");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "Import failed");
  }
}

async function refreshImports() {
  const result = await apiRequest("/leads/imports");
  state.imports = result.data || [];
  renderImportHistory();
}

async function submitLeadForm(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await apiRequest("/leads/create", "POST", payload);
    closeModal();
    event.currentTarget.reset();
    toast("Lead created");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "Lead creation failed");
  }
}

async function submitCampaignForm(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await apiRequest("/campaigns/create", "POST", payload);
    closeModal();
    event.currentTarget.reset();
    toast("Campaign created");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "Campaign creation failed");
  }
}

async function submitAssignForm(event) {
  event.preventDefault();
  if (!state.selectedLeadIds.size) {
    toast("Select at least one lead first");
    return;
  }

  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  payload.leadIds = Array.from(state.selectedLeadIds);

  try {
    await apiRequest("/leads/assign", "POST", payload);
    closeModal();
    toast("Leads assigned");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "Assignment failed");
  }
}

async function sendEmailCampaign(scheduled) {
  if (!state.selectedLeadIds.size) {
    toast("Select leads from dashboard table first");
    return;
  }

  try {
    await apiRequest("/campaigns/email/send", "POST", {
      leadIds: Array.from(state.selectedLeadIds),
      subject: document.getElementById("emailSubject").value,
      html: document.getElementById("emailHtml").value,
      scheduleAt: scheduled ? buildFutureIsoDate() : "",
    });
    toast(scheduled ? "Email campaign scheduled" : "Email campaign sent");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "Email campaign failed");
  }
}

async function sendWhatsappCampaign(scheduled) {
  if (!state.selectedLeadIds.size) {
    toast("Select leads from dashboard table first");
    return;
  }

  try {
    await apiRequest("/campaigns/whatsapp/send", "POST", {
      leadIds: Array.from(state.selectedLeadIds),
      message: document.getElementById("whatsappMessage").value,
      scheduleAt: scheduled ? buildFutureIsoDate() : "",
    });
    toast(scheduled ? "WhatsApp campaign scheduled" : "WhatsApp campaign processed");
    await refreshWorkspace();
  } catch (error) {
    toast(error.message || "WhatsApp campaign failed");
  }
}

async function bulkDeleteLeads() {
  const ids = Array.from(state.selectedLeadIds);
  if (!ids.length) {
    toast("Select leads first");
    return;
  }
  if (!confirm(`Delete ${ids.length} lead(s)?`)) return;
  await Promise.all(ids.map((id) => apiRequest(`/leads/${id}`, "DELETE")));
  state.selectedLeadIds.clear();
  toast("Selected leads deleted");
  await refreshWorkspace();
}

async function bulkChangePriority() {
  const ids = Array.from(state.selectedLeadIds);
  if (!ids.length) {
    toast("Select leads first");
    return;
  }
  const value = prompt("Enter priority: High, Medium or Low", "High");
  if (!value) return;
  await Promise.all(ids.map((id) => updateLead(id, { priority: value })));
  toast("Priority updated");
  await refreshWorkspace();
}

function openLeadDrawer(leadId) {
  const lead = state.leads.find((item) => String(item._id) === String(leadId));
  if (!lead) return;
  state.selectedDrawerLeadId = String(leadId);

  const timeline = (lead.timeline || [])
    .slice()
    .reverse()
    .map(
      (item) => `
        <article class="mini-item">
          <p>${escapeHtml(item.title || "Activity")}</p>
          <small>${escapeHtml(item.description || "")}</small>
          <small>${formatDateTime(item.at)}</small>
        </article>
      `,
    )
    .join("");

  document.getElementById("leadDrawerContent").innerHTML = `
    <article class="mini-item">
      <p>${escapeHtml(lead.name)}</p>
      <small>${escapeHtml(lead.company || "-")} | ${escapeHtml(lead.phone || "-")}</small>
      <small>Status: ${escapeHtml(lead.status || "New")} | Assigned To: ${escapeHtml(lead.assignedToName || "Pending")}</small>
      <small>AI Score ${lead.aiScore || 0} | ${escapeHtml(lead.quality || "Cold")}</small>
    </article>
    ${timeline || `<article class="mini-item"><p>No timeline entries yet.</p></article>`}
  `;
  toggleDrawer("leadDrawer", true);
}

function openModal(type) {
  document.getElementById("modalBackdrop").classList.remove("hidden");
  ["leadModal", "campaignModal", "assignModal"].forEach((id) => document.getElementById(id).classList.add("hidden"));
  const targetId = type === "lead" ? "leadModal" : type === "campaign" ? "campaignModal" : "assignModal";
  document.getElementById(targetId).classList.remove("hidden");
  if (type === "assign") prefillAssignmentSuggestion();
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.add("hidden");
  ["leadModal", "campaignModal", "assignModal"].forEach((id) => document.getElementById(id).classList.add("hidden"));
}

function toggleDrawer(id, open) {
  document.getElementById(id).classList.toggle("hidden", !open);
}

function renderGlobalSearch(event) {
  const query = String(event.target.value || "").trim().toLowerCase();
  const dropdown = document.getElementById("globalSearchResults");
  if (!query) {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
    return;
  }

  const results = [
    ...(state.leads || []).map((lead) => ({
      label: lead.name,
      meta: `Lead | ${lead.phone} | ${lead.assignedToName || "Pending"}`,
      section: "assignment",
    })),
    ...(state.campaigns || []).map((campaign) => ({
      label: campaign.name,
      meta: `Campaign | ${campaign.channel || "Mixed"}`,
      section: "campaigns",
    })),
    ...(state.users || []).map((user) => ({
      label: user.name,
      meta: `User | ${user.role} | ${user.department || "-"}`,
      section: "assignment",
    })),
  ]
    .filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query))
    .slice(0, 8);

  dropdown.innerHTML = results.length
    ? results
        .map(
          (item) => `
            <button class="search-result ghost-button" type="button" data-search-section="${item.section}">
              <span>${escapeHtml(item.label)}</span>
              <small>${escapeHtml(item.meta)}</small>
            </button>
          `,
        )
        .join("")
    : `<article class="search-result"><span>No matches</span></article>`;

  dropdown.classList.remove("hidden");
  document.querySelectorAll("[data-search-section]").forEach((button) => {
    button.addEventListener("click", () => {
      switchSection(button.dataset.searchSection);
      dropdown.classList.add("hidden");
    });
  });
}

function filterSidebarItems(event) {
  const query = String(event.target.value || "").trim().toLowerCase();
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("hidden", Boolean(query) && !item.textContent.toLowerCase().includes(query));
  });
}

function downloadSampleCsv() {
  const content = "Name,Phone,Email,Company,Requirement,Budget,Source\nRahul Sharma,9876543210,rahul@gmail.com,TechSoft,CRM Software,120000,Website Leads";
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "marketing-lead-sample.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportSelectedLeads() {
  const selected = state.leads.filter((lead) => state.selectedLeadIds.has(String(lead._id)));
  if (!selected.length) {
    toast("Select leads to export");
    return;
  }

  const rows = [
    ["Name", "Phone", "Email", "Company", "Requirement", "Source", "Status"],
    ...selected.map((lead) => [lead.name, lead.phone, lead.email, lead.company, lead.requirement, lead.source, lead.status]),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "selected-marketing-leads.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveDraft() {
  localStorage.setItem(
    "marketingEmailDraft",
    JSON.stringify({
      subject: document.getElementById("emailSubject").value,
      body: document.getElementById("emailHtml").value,
    }),
  );
  toast("Draft saved locally");
}

function restoreDrafts() {
  const draft = JSON.parse(localStorage.getItem("marketingEmailDraft") || "null");
  if (!draft) return;
  document.getElementById("emailSubject").value = draft.subject || "";
  document.getElementById("emailHtml").value = draft.body || "";
}

function saveSettings() {
  const workspaceName = document.getElementById("settingsWorkspaceName").value.trim() || "Marketing Workspace";
  const itemsPerPage = document.getElementById("settingsItemsPerPage").value || "8";
  localStorage.setItem("marketingWorkspaceName", workspaceName);
  localStorage.setItem("marketingItemsPerPage", itemsPerPage);
  state.workspaceName = workspaceName;
  hydrateChrome();
  toast("Settings saved");
}

function getAssignableUsers() {
  return state.users.filter((user) => ["SALES", "MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING"].includes(normalizeRole(user.role)));
}

function buildAssignmentRecommendation() {
  const assignableUsers = getAssignableUsers();
  const selectedLeads = state.leads.filter((lead) => state.selectedLeadIds.has(String(lead._id)));
  const hotCount = selectedLeads.filter((lead) => lead.quality === "Hot").length;

  const scoredUsers = assignableUsers.map((user) => {
    const currentAssignments = state.assignments.filter((item) => String(item.assignedToUserId) === String(user._id)).length;
    let match = 78 - currentAssignments * 4;
    if (normalizeRole(user.role) === "SALES") match += 10;
    if (user.department && /call|sales|crm/i.test(user.department)) match += 8;
    if (hotCount > 0 && /sales|crm/i.test(`${user.role} ${user.department || ""}`)) match += 6;
    return {
      user,
      match: Math.max(62, Math.min(96, match)),
      reason: currentAssignments <= 2 ? "Lower load and better availability" : "Strong domain fit",
    };
  });

  scoredUsers.sort((left, right) => right.match - left.match);
  return scoredUsers[0];
}

function prefillAssignmentSuggestion() {
  const recommendation = buildAssignmentRecommendation();
  if (!recommendation) return;
  const select = document.getElementById("assignUserSelect");
  if (select && !select.value) {
    select.value = recommendation.user._id;
  }
}

function getAssignmentFilteredLeads() {
  const search = String(state.filters.search || "").trim().toLowerCase();
  const filter = String(document.getElementById("assignmentFilter")?.value || state.filters.filter || "").trim().toLowerCase();

  return state.leads.filter((lead) => {
    const haystack = `${lead.name} ${lead.phone} ${lead.company} ${lead.assignedToName || ""}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);

    if (!matchesSearch) return false;
    if (filter === "high") return String(lead.priority || "").toLowerCase() === "high";
    if (filter === "assigned") return lead.assignmentStatus === "Assigned";
    if (filter === "pending") return lead.assignmentStatus !== "Assigned";
    if (filter === "hot") return lead.quality === "Hot";
    if (filter === "cold") return lead.quality === "Cold";
    if (filter === "facebook") return /facebook/i.test(lead.source || "");
    if (filter === "website") return /website/i.test(lead.source || "");
    if (filter) return normalizeLoose(lead.source).includes(filter) || filter.includes(normalizeLoose(lead.source));
    return true;
  });
}

async function updateLead(id, payload) {
  return apiRequest(`/leads/${id}`, "PUT", payload);
}

function resolveSectionFromPath() {
  return ROUTE_SECTION_MAP[window.location.pathname] || "dashboard";
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function slug(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function toast(message) {
  const stack = document.getElementById("toastStack");
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  stack.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function resolveWorkspaceImageSrc(value) {
  if (!value) return "/assets/images/default-avatar.png";
  const normalized = String(value).replace(/\\/g, "/");
  return /^[a-zA-Z]:\//.test(normalized) ? "/assets/images/default-avatar.png" : normalized;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return date >= start;
}

function buildFutureIsoDate() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  return nextHour.toISOString();
}

function initCharts() {
  const commonOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  
  const ctxOverview = document.getElementById("overviewTrendChart");
  if (ctxOverview) {
    state.charts.overview = new Chart(ctxOverview, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Leads",
          data: [12, 19, 15, 25, 22, 30, 28],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4
        }]
      },
      options: commonOptions
    });
  }

  const ctxTrend = document.getElementById("trendChart");
  if (ctxTrend) {
    state.charts.trend = new Chart(ctxTrend, {
      type: "bar",
      data: {
        labels: ["W1", "W2", "W3", "W4"],
        datasets: [{ label: "Conversions", data: [40, 55, 35, 60], backgroundColor: "#10b981", borderRadius: 4 }]
      },
      options: commonOptions
    });
  }

  const ctxStatus = document.getElementById("statusChart");
  if (ctxStatus) {
    state.charts.status = new Chart(ctxStatus, {
      type: "bar",
      data: {
        labels: ["Lead", "Contacted", "Proposal", "Won"],
        datasets: [{ label: "Funnel Stage", data: [120, 80, 45, 15], backgroundColor: ["#3b82f6", "#f59e0b", "#a855f7", "#10b981"], borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const ctxSource = document.getElementById("sourceChart");
  if (ctxSource) {
    state.charts.source = new Chart(ctxSource, {
      type: "doughnut",
      data: {
        labels: ["Facebook", "Google", "Website", "Referral"],
        datasets: [{ data: [45, 25, 20, 10], backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });
  }
}

function renderActivities() {
  const list = document.getElementById("activityList");
  if (!list) return;
  const activities = [
    { text: "Rahul captured via Website", time: "2 mins ago" },
    { text: "Campaign 'Diwali Sale' started", time: "1 hour ago" },
    { text: "50 leads imported by Admin", time: "3 hours ago" },
    { text: "Pooja assigned to High Priority", time: "5 hours ago" }
  ];
  list.innerHTML = activities.map(a => `
    <article class="mini-item" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
      <div style="font-size: 13px; font-weight: 500; color: var(--text);">${a.text}</div>
      <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${a.time}</div>
    </article>
  `).join('');
}
