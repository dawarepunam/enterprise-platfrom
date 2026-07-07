(function () {
  const ROUTE_ALIAS = {
    "/product": "dashboard",
    "/product/dashboard": "dashboard",
    "/product/leads": "leads",
    "/product/requirements": "requirements",
    "/product/projects": "projects",
    "/product/approvals": "approvals",
    "/product/change-requests": "changes",
    "/product/meetings": "meetings",
    "/product/reports": "reports",
    "/product/knowledge": "knowledge",
    "/product/settings": "settings",
    "/product-manager": "dashboard",
    "/product-manager/dashboard": "dashboard",
    "/product-manager/leads": "leads",
    "/product-manager/requirements": "requirements",
    "/product-manager/projects": "projects",
    "/product-manager/approvals": "approvals",
    "/product-manager/change-requests": "changes",
    "/product-manager/meetings": "meetings",
    "/product-manager/reports": "reports",
    "/product-manager/knowledge": "knowledge",
    "/product-manager/settings": "settings",
  };

  const ROUTE_PATH = {
    dashboard: "/product-manager/dashboard",
    leads: "/product-manager/leads",
    requirements: "/product-manager/requirements",
    projects: "/product-manager/projects",
    approvals: "/product-manager/approvals",
    changes: "/product-manager/change-requests",
    meetings: "/product-manager/meetings",
    reports: "/product-manager/reports",
    knowledge: "/product-manager/knowledge",
    settings: "/product-manager/settings",
  };

  const state = {
    user: null,
    route: ROUTE_ALIAS[window.location.pathname] || "dashboard",
    requirements: [],
    projects: [],
    meetings: [],
    managers: [],
    stackOptions: { frontend: [], backend: [], database: [] },
    selectedId: "",
    search: "",
    source: "live",
  };

  const demo = {
    requirements: [
      {
        _id: "req-1001",
        clientName: "Vikram Singh",
        company: "ABC Pvt Ltd",
        industry: "IT Services",
        phone: "9876543210",
        email: "vikram@abc.example",
        budget: 2500000,
        deadline: "2026-09-30",
        projectType: "CRM Projects",
        requirement: "Custom CRM with lead management, pipeline tracking, reports, and team collaboration.",
        projectOverview: "A complete CRM lifecycle flow from marketing lead to client approval and project delivery.",
        keyFeatures: ["Lead Management", "Pipeline Management", "Reports & Analytics", "User Role Management"],
        painPoints: ["Manual follow-ups", "No approval visibility", "Scattered client notes"],
        businessGoals: ["Centralize sales operations", "Improve conversion", "Create delivery handoff"],
        priority: "High",
        assignedTeam: "Product Team",
        status: "In Review",
        source: "Sales Team",
        suggestedModules: ["Admin", "Marketing", "Calling", "Sales", "Client Portal", "Manager"],
        recommendedStack: { frontend: "React.js", backend: "Node.js", database: "MongoDB" },
        estimatedTimelineWeeks: 16,
        estimatedBudget: 2550000,
        notes: "Client wants BRD and project plan this week.",
        features: [
          { name: "Lead Funnel", description: "Track New, Qualified, Meeting, Proposal, Won.", estimatedHours: 40, priority: "High", group: "Core Features" },
          { name: "BRD Generator", description: "Generate business requirement documents from notes.", estimatedHours: 28, priority: "High", group: "AI Features" },
          { name: "Client Approval", description: "Client portal approval and e-signature workflow.", estimatedHours: 32, priority: "Medium", group: "Client Features" },
        ],
      },
      {
        _id: "req-1002",
        clientName: "Neha Joshi",
        company: "XYZ Solutions",
        industry: "Operations",
        phone: "8765432109",
        email: "neha@xyz.example",
        budget: 1800000,
        deadline: "2026-10-15",
        projectType: "ERP Projects",
        requirement: "ERP dashboard with inventory, finance approvals, and role-based reporting.",
        projectOverview: "ERP control center for operational visibility.",
        keyFeatures: ["Inventory", "Finance Approvals", "Reports", "Audit Trail"],
        painPoints: ["Delayed approval", "Manual stock review"],
        businessGoals: ["Faster operations", "Better financial control"],
        priority: "Medium",
        assignedTeam: "Product Team",
        status: "Pending",
        source: "Calling Team",
        suggestedModules: ["Admin", "Finance", "Client Portal", "Reports"],
        recommendedStack: { frontend: "Next.js", backend: "NestJS", database: "PostgreSQL" },
        estimatedTimelineWeeks: 12,
        estimatedBudget: 1900000,
        features: [],
      },
    ],
    projects: [
      { _id: "proj-1", projectName: "ABC CRM System", clientName: "ABC Pvt Ltd", manager: "Amit Verma", progress: 45, priority: "High", status: "Active", budget: 2500000, deadline: "2026-09-30" },
      { _id: "proj-2", projectName: "XYZ Website", clientName: "XYZ Solutions", manager: "Neha Patel", progress: 67, priority: "Medium", status: "At Risk", budget: 950000, deadline: "2026-08-15" },
      { _id: "proj-3", projectName: "Mobile App", clientName: "SoftTech", manager: "Rahul Sharma", progress: 28, priority: "Critical", status: "On Hold", budget: 1800000, deadline: "2026-10-20" },
    ],
    meetings: [
      { _id: "meet-1", title: "Requirement Discussion", scheduledFor: "2026-06-04T11:00:00.000Z", platform: "Microsoft Teams", status: "Scheduled", attendees: ["Vikram Singh", "Product Manager"] },
      { _id: "meet-2", title: "BRD Review", scheduledFor: "2026-06-05T15:30:00.000Z", platform: "Microsoft Teams", status: "Draft", attendees: ["ABC Pvt Ltd"] },
    ],
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    state.user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (!state.user) {
      window.location.href = "/login.html?role=PRODUCT_MANAGER";
      return;
    }

    const role = typeof normalizeRole === "function" ? normalizeRole(state.user.role) : String(state.user.role || "").toUpperCase();
    if (!["PRODUCT_MANAGER", "ADMIN"].includes(role)) {
      window.location.href = "/pages/unauthorized.html";
      return;
    }

    bindChrome();
    renderSidebar();
    hydrateProfile();
    await loadData();
    render();
  }

  function bindChrome() {
    document.getElementById("sidebarToggle")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    document.getElementById("globalSearch")?.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
    });
    document.getElementById("fabButton")?.addEventListener("click", () => document.getElementById("fabMenu")?.classList.toggle("open"));
    document.getElementById("drawerClose")?.addEventListener("click", closeDrawer);
    document.getElementById("modalClose")?.addEventListener("click", closeModal);
    document.getElementById("pmModal")?.addEventListener("click", (event) => {
      if (event.target.id === "pmModal") closeModal();
    });
    document.body.addEventListener("click", (event) => {
      const actionTarget = event.target.closest("[data-action]");
      if (!actionTarget) return;
      handleAction(actionTarget.dataset.action, actionTarget.dataset.id || "");
    });
  }

  async function loadData() {
    try {
      const [requirementsRes, projectsRes, usersRes] = await Promise.all([
        API.get("/requirements"),
        API.get("/projects").catch(() => ({ data: [] })),
        API.get("/users").catch(() => ({ data: [] })),
      ]);

      const requirementPayload = requirementsRes?.data || {};
      state.requirements = Array.isArray(requirementPayload.requirements) ? requirementPayload.requirements : [];
      state.meetings = Array.isArray(requirementPayload.meetings) ? requirementPayload.meetings : [];
      state.stackOptions = requirementPayload.stackOptions || state.stackOptions;
      state.projects = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
      state.managers = (Array.isArray(usersRes?.data) ? usersRes.data : []).filter((user) => String(user.role || "").toUpperCase() === "MANAGER");
      state.source = "live";
    } catch (error) {
      state.requirements = demo.requirements;
      state.projects = demo.projects;
      state.meetings = demo.meetings;
      state.managers = [
        { _id: "amit", name: "Amit Verma", email: "amit@jmkc.example" },
        { _id: "neha", name: "Neha Patel", email: "neha@jmkc.example" },
      ];
      state.stackOptions = { frontend: ["React.js", "Next.js", "Vue.js"], backend: ["Node.js", "NestJS", "Laravel"], database: ["MongoDB", "PostgreSQL", "MySQL"] };
      state.source = "demo";
      toast("Live backend unavailable, showing Product Manager demo data.", "warning");
    }

    if (!state.selectedId && state.requirements.length) state.selectedId = state.requirements[0]._id;
  }

  function render() {
    renderHeader();
    renderSidebar();
    const host = document.getElementById("pageHost");
    const map = {
      dashboard: renderDashboard,
      leads: renderLeads,
      requirements: renderRequirements,
      projects: renderProjects,
      approvals: renderApprovals,
      changes: renderChangeRequests,
      meetings: renderMeetings,
      reports: renderReports,
      knowledge: renderKnowledge,
      settings: renderSettings,
    };
    host.innerHTML = (map[state.route] || renderDashboard)();
  }

  function renderHeader() {
    const titleMap = {
      dashboard: "Product Manager Dashboard",
      leads: "Lead Workspace",
      requirements: "Requirement Gathering",
      projects: "Project Portfolio",
      approvals: "Approval Center",
      changes: "Change Request Center",
      meetings: "Client Meetings",
      reports: "Reports & Analytics",
      knowledge: "Knowledge Hub",
      settings: "Product Settings",
    };
    document.getElementById("pageTitle").textContent = titleMap[state.route] || titleMap.dashboard;
    document.getElementById("breadcrumb").textContent = `Dashboard > Product Manager > ${titleMap[state.route] || "Dashboard"}`;
  }

  function hydrateProfile() {
    const pill = document.getElementById("profilePill");
    const name = state.user?.name || "Product Manager";
    if (pill) pill.innerHTML = `<span>${escapeHtml(firstName(name))}</span><small>PM</small>`;
  }

  function renderSidebar() {
    const sidebar = document.getElementById("pmSidebar");
    if (!sidebar) return;
    const links = [
      ["dashboard", "Dashboard", "Overview"],
      ["leads", "Leads", "Client intake"],
      ["requirements", "Requirements", "BRD and scope"],
      ["projects", "Projects", "Portfolio"],
      ["approvals", "Approvals", "Client decisions"],
      ["changes", "Change Requests", "Scope control"],
      ["meetings", "Meetings", "Teams sync"],
      ["reports", "Reports", "Revenue and risk"],
      ["knowledge", "Knowledge Hub", "BRD, proposal, SOP"],
      ["settings", "Settings", "Workspace setup"],
    ];

    sidebar.innerHTML = `
      <div class="pm-brand">
        <img src="/assets/images/logo.png" alt="" />
        <div><strong>JMKC CRM</strong><span>Product Manager</span></div>
      </div>
      <nav class="pm-nav">
        ${links.map(([key, label, note]) => `
          <a class="${state.route === key ? "active" : ""}" href="${ROUTE_PATH[key]}">
            <span>${escapeHtml(label)}</span>
            <small>${escapeHtml(note)}</small>
          </a>
        `).join("")}
      </nav>
      <div class="pm-side-note">
        <strong>Complete flow</strong>
        <p>Lead -> Requirement -> BRD -> Project -> Project Manager</p>
      </div>
    `;
  }

  function renderDashboard() {
    const name = firstName(state.user?.name || "Product Manager");
    const reqs = filteredRequirements();
    const pending = reqs.filter((item) => ["Pending", "In Review"].includes(item.status)).length;
    const approved = state.requirements.filter((item) => item.status === "Approved").length;
    const changes = state.requirements.filter((item) => item.status === "Changes Requested").length;
    const pipeline = state.requirements.reduce((sum, item) => sum + Number(item.estimatedBudget || item.budget || 0), 0);

    return `
      <section class="pm-welcome">
        <div>
          <span class="pm-eyebrow">Smart Welcome</span>
          <h2>Good Morning, ${escapeHtml(name)}</h2>
          <p>Today you have ${pending} requirement items, ${state.meetings.length} meetings, ${approved} approved projects, and ${formatCurrency(pipeline)} pipeline value.</p>
        </div>
        <div class="pm-welcome-actions">
          <button class="pm-btn primary" data-action="createRequirement" type="button">Create Requirement</button>
          <button class="pm-btn" data-action="scheduleMeeting" type="button">Schedule Meeting</button>
        </div>
      </section>
      <section class="pm-kpi-grid">
        ${kpi("Leads Waiting", pending + 8, "Open Lead Queue", "blue", "leads")}
        ${kpi("Requirement Gathering", pending, "Open Requirements", "violet", "requirements")}
        ${kpi("Active Projects", activeProjects().length, "Open Portfolio", "green", "projects")}
        ${kpi("Pending Approvals", approved + 3, "Open Approvals", "orange", "approvals")}
        ${kpi("Change Requests", changes + 2, "Open Requests", "red", "changes")}
        ${kpi("Revenue Pipeline", formatShortCurrency(pipeline), "View Forecast", "indigo", "reports")}
      </section>
      <section class="pm-grid dashboard-grid">
        ${panel("Lead Conversion Funnel", renderFunnel(), "span-4")}
        ${panel("Revenue Forecast", renderRevenueForecast(), "span-4")}
        ${panel("Project Health", renderHealth(), "span-4")}
        ${panel("Recent Activities", renderActivity(), "span-5")}
        ${panel("Requirement Queue", renderRequirementTable(reqs.slice(0, 5)), "span-7")}
        ${panel("Resource Heatmap", renderHeatmap(), "span-12")}
      </section>
    `;
  }

  function renderLeads() {
    const items = filteredRequirements();
    return `
      <section class="pm-toolbar">
        <div><span class="pm-eyebrow">Lead Management</span><h2>Client and lead workspace</h2></div>
        <button class="pm-btn primary" data-action="createRequirement" type="button">Add Lead Requirement</button>
      </section>
      <section class="pm-view-tabs">${["Table", "Kanban", "Pipeline", "Timeline"].map((tab, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</section>
      <section class="pm-grid">
        <div class="pm-panel span-8">${renderRequirementTable(items)}</div>
        <div class="pm-panel span-4">${renderClient360(selectedRequirement())}</div>
      </section>
    `;
  }

  function renderRequirements() {
    const current = selectedRequirement();
    return `
      <section class="pm-toolbar">
        <div><span class="pm-eyebrow">Requirement Gathering</span><h2>Business, technical, timeline, documents and BRD</h2></div>
        <div class="pm-toolbar-actions">
          <button class="pm-btn" data-action="analyzeRequirement" data-id="${escapeHtml(current?._id)}" type="button">Analyze Requirement</button>
          <button class="pm-btn primary" data-action="generateBRD" data-id="${escapeHtml(current?._id)}" type="button">Generate BRD</button>
        </div>
      </section>
      <section class="pm-grid">
        <div class="pm-panel span-4">${renderRequirementSummary(current)}</div>
        <div class="pm-panel span-8">${renderRequirementWorkspace(current)}</div>
      </section>
    `;
  }

  function renderProjects() {
    const items = activeProjects();
    return `
      <section class="pm-toolbar">
        <div><span class="pm-eyebrow">Project Portfolio</span><h2>Approved and assigned project monitoring</h2></div>
        <button class="pm-btn primary" data-action="createProject" type="button">Create Project</button>
      </section>
      <section class="pm-kpi-grid compact">
        ${kpi("Total Projects", items.length, "Portfolio", "blue", "projects")}
        ${kpi("At Risk", items.filter((item) => /risk/i.test(item.status || "")).length, "Risk Review", "orange", "reports")}
        ${kpi("Managers", new Set(items.map((item) => item.manager).filter(Boolean)).size, "Assignments", "green", "projects")}
        ${kpi("Avg Progress", `${average(items.map((item) => item.progress || 0))}%`, "Progress", "violet", "projects")}
      </section>
      <section class="pm-panel">${renderProjectTable(items)}</section>
    `;
  }

  function renderApprovals() {
    const items = state.requirements.filter((item) => ["Pending", "In Review", "Approved"].includes(item.status));
    return `
      <section class="pm-toolbar"><div><span class="pm-eyebrow">Approval Center</span><h2>Budget, project, timeline and change approvals</h2></div></section>
      <section class="pm-grid">
        ${items.map((item) => `
          <article class="pm-card approval-card">
            <span class="pm-status ${slug(item.status)}">${escapeHtml(item.status || "Pending")}</span>
            <h3>${escapeHtml(item.company || item.clientName)}</h3>
            <p>${escapeHtml(item.requirement)}</p>
            <div class="pm-card-actions">
              <button class="pm-btn primary" data-action="approveProject" data-id="${escapeHtml(item._id)}" type="button">Approve</button>
              <button class="pm-btn danger" data-action="rejectProject" data-id="${escapeHtml(item._id)}" type="button">Reject</button>
            </div>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderChangeRequests() {
    const items = state.requirements.filter((item) => item.status === "Changes Requested" || item.notes);
    return `
      <section class="pm-toolbar">
        <div><span class="pm-eyebrow">Change Request Center</span><h2>Client -> Product Manager -> Project Manager -> Development</h2></div>
        <button class="pm-btn primary" data-action="createChangeRequest" type="button">Create Change Request</button>
      </section>
      <section class="pm-grid">
        ${(items.length ? items : state.requirements.slice(0, 3)).map((item) => `
          <article class="pm-card change-card">
            <span class="pm-status ${slug(item.priority)}">${escapeHtml(item.priority || "Medium")}</span>
            <h3>${escapeHtml(item.company || item.clientName)}</h3>
            <p>${escapeHtml(item.notes || "No additional analytics dashboard requested yet.")}</p>
            <button class="pm-btn" data-action="requestChanges" data-id="${escapeHtml(item._id)}" type="button">Update Request</button>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderMeetings() {
    return `
      <section class="pm-toolbar">
        <div><span class="pm-eyebrow">Microsoft Teams Integration</span><h2>Client meetings, notes and action items</h2></div>
        <button class="pm-btn primary" data-action="scheduleMeeting" type="button">Schedule Meeting</button>
      </section>
      <section class="pm-grid">
        ${state.meetings.map((item) => `
          <article class="pm-card meeting-card">
            <span class="pm-status scheduled">${escapeHtml(item.status || "Scheduled")}</span>
            <h3>${escapeHtml(item.title || "Product Meeting")}</h3>
            <p>${formatDateTime(item.scheduledFor)} | ${escapeHtml(item.platform || "Microsoft Teams")}</p>
            <div class="pm-card-actions">
              <button class="pm-btn" type="button" data-action="meetingNotes" data-id="${escapeHtml(item._id)}">Notes</button>
              <button class="pm-btn primary" type="button">Join Teams</button>
            </div>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderReports() {
    const pipeline = state.requirements.reduce((sum, item) => sum + Number(item.estimatedBudget || item.budget || 0), 0);
    return `
      <section class="pm-toolbar"><div><span class="pm-eyebrow">Reports & Analytics</span><h2>Revenue, risk, SLA and audit trail</h2></div></section>
      <section class="pm-kpi-grid">
        ${kpi("Expected Revenue", formatShortCurrency(pipeline), "Pipeline", "indigo", "reports")}
        ${kpi("Closed Revenue", formatShortCurrency(pipeline * 0.38), "Won", "green", "reports")}
        ${kpi("Pending Revenue", formatShortCurrency(pipeline * 0.44), "Follow-up", "orange", "reports")}
        ${kpi("Risk Prediction", "18%", "AI risk", "red", "reports")}
      </section>
      <section class="pm-grid">
        ${panel("Deal Pipeline", renderFunnel(), "span-6")}
        ${panel("Audit Trail", renderAudit(), "span-6")}
      </section>
    `;
  }

  function renderKnowledge() {
    const docs = ["BRD - ABC CRM System", "Proposal V2 - XYZ ERP", "Meeting Notes - Client Discovery", "SOP - Approval Flow", "Template - CRM Scope"];
    return `
      <section class="pm-toolbar"><div><span class="pm-eyebrow">Knowledge Hub</span><h2>BRD, proposals, templates, SOP and meeting notes</h2></div><button class="pm-btn primary" data-action="generateProposal" type="button">Generate Proposal</button></section>
      <section class="pm-grid">${docs.map((doc) => `<article class="pm-card doc-card"><h3>${escapeHtml(doc)}</h3><p>Searchable product document with owner, version and export actions.</p><button class="pm-btn" type="button">Open</button></article>`).join("")}</section>
    `;
  }

  function renderSettings() {
    return `
      <section class="pm-toolbar"><div><span class="pm-eyebrow">Settings</span><h2>Light workspace, routing and integrations</h2></div></section>
      <section class="pm-panel">
        ${["Microsoft Teams connected", "Product Manager light theme locked", "Lead to project routing enabled", "BRD and proposal templates enabled", "Notification popups enabled"].map((item) => `<div class="pm-setting"><strong>${escapeHtml(item)}</strong><span>Active</span></div>`).join("")}
      </section>
    `;
  }

  function renderRequirementTable(items) {
    return `
      <div class="pm-table-wrap">
        <table class="pm-table">
          <thead><tr><th>Lead</th><th>Company</th><th>Budget</th><th>Source</th><th>Status</th><th>Score</th><th>Actions</th></tr></thead>
          <tbody>
            ${items.length ? items.map((item, index) => `
              <tr>
                <td><button class="pm-link-btn" data-action="openClient" data-id="${escapeHtml(item._id)}" type="button">${escapeHtml(item.clientName || "Client")}</button></td>
                <td>${escapeHtml(item.company || "-")}</td>
                <td>${formatCurrency(item.estimatedBudget || item.budget || 0)}</td>
                <td>${escapeHtml(item.source || "Sales")}</td>
                <td><span class="pm-status ${slug(item.status)}">${escapeHtml(item.status || "Pending")}</span></td>
                <td>${86 - index * 8}</td>
                <td>
                  <div class="pm-inline-actions">
                    <button data-tooltip="Open client 360 drawer" data-action="openClient" data-id="${escapeHtml(item._id)}" type="button">Open</button>
                    <button data-tooltip="Create or update requirement" data-action="editRequirement" data-id="${escapeHtml(item._id)}" type="button">Requirement</button>
                    <button data-tooltip="Generate BRD from requirement" data-action="generateBRD" data-id="${escapeHtml(item._id)}" type="button">BRD</button>
                  </div>
                </td>
              </tr>
            `).join("") : `<tr><td colspan="7">No records found.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRequirementSummary(item) {
    if (!item) return `<div class="pm-empty">No requirement selected.</div>`;
    return `
      <span class="pm-eyebrow">Requirement - ${escapeHtml(item._id || "New")}</span>
      <h3>${escapeHtml(item.company || item.clientName)}</h3>
      <p>${escapeHtml(item.requirement)}</p>
      <div class="pm-meta-grid">
        ${meta("Client", item.clientName)}
        ${meta("Budget", formatCurrency(item.estimatedBudget || item.budget || 0))}
        ${meta("Deadline", formatDate(item.deadline))}
        ${meta("Priority", item.priority)}
      </div>
    `;
  }

  function renderRequirementWorkspace(item) {
    if (!item) return `<div class="pm-empty">Create a requirement to start workspace.</div>`;
    const tabs = [
      ["Summary", item.projectOverview || item.requirement],
      ["Documents", "BRD, proposal, quotation and meeting documents will be stored here."],
      ["Meetings", "Teams meeting notes, transcript, AI summary and action items."],
      ["Notes", item.notes || "No internal notes yet."],
      ["BRD", buildBRDText(item)],
    ];
    return `
      <div class="pm-tabs">${tabs.map(([label], index) => `<button class="${index === 0 ? "active" : ""}" type="button">${label}</button>`).join("")}</div>
      <div class="pm-workspace-card">
        <h3>Key Features</h3>
        <div class="pm-chip-row">${(item.keyFeatures || []).map((feature) => `<span>${escapeHtml(feature)}</span>`).join("") || "<span>Lead Management</span><span>Reports</span>"}</div>
      </div>
      <div class="pm-grid two">
        ${tabs.map(([label, copy]) => `<article class="pm-mini-card"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(copy)}</p></article>`).join("")}
      </div>
    `;
  }

  function renderClient360(item) {
    if (!item) return `<div class="pm-empty">Select a client.</div>`;
    return `
      <span class="pm-eyebrow">Client 360 View</span>
      <h3>${escapeHtml(item.clientName)}</h3>
      <p>${escapeHtml(item.company)} | ${escapeHtml(item.industry || "General")}</p>
      <div class="pm-meta-grid">
        ${meta("Phone", item.phone || "-")}
        ${meta("Email", item.email || "-")}
        ${meta("Projects", "2")}
        ${meta("Approvals", "3 Pending")}
      </div>
      <div class="pm-card-actions">
        <button class="pm-btn" data-action="openClient" data-id="${escapeHtml(item._id)}" type="button">Open Drawer</button>
        <button class="pm-btn primary" data-action="scheduleMeeting" data-id="${escapeHtml(item._id)}" type="button">Meeting</button>
      </div>
    `;
  }

  function renderProjectTable(items) {
    return `
      <div class="pm-table-wrap">
        <table class="pm-table">
          <thead><tr><th>Project</th><th>Manager</th><th>Progress</th><th>Risk</th><th>Deadline</th><th>Action</th></tr></thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.projectName || item.name)}</strong><br><small>${escapeHtml(item.clientName || "-")}</small></td>
                <td>${escapeHtml(item.manager || "Unassigned")}</td>
                <td><div class="pm-progress"><span style="width:${Number(item.progress || 0)}%"></span></div></td>
                <td><span class="pm-status ${slug(item.priority || item.status)}">${escapeHtml(item.priority || item.status || "Medium")}</span></td>
                <td>${formatDate(item.deadline || item.dueDate)}</td>
                <td><button class="pm-btn" data-action="assignProject" data-id="${escapeHtml(item._id)}" type="button">Assign</button></td>
              </tr>
            `).join("") || `<tr><td colspan="6">No projects found.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  function kpi(label, value, hover, tone, route) {
    return `
      <button class="pm-kpi ${tone}" data-action="navigate" data-id="${route}" data-tooltip="${escapeHtml(hover)}" type="button">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(hover)}</small>
      </button>
    `;
  }

  function panel(title, body, className = "") {
    return `<article class="pm-panel ${className}"><div class="pm-panel-head"><h3>${escapeHtml(title)}</h3></div>${body}</article>`;
  }

  function meta(label, value) {
    return `<div class="pm-meta"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
  }

  function renderFunnel() {
    const stages = [["Total Leads", 1522], ["Qualified", 542], ["Interested", 235], ["Meeting", 98], ["Converted", 24]];
    return `<div class="pm-funnel">${stages.map(([label, value], index) => `<button style="--w:${100 - index * 14}%" data-action="navigate" data-id="leads" type="button"><span>${label}</span><strong>${value}</strong></button>`).join("")}</div>`;
  }

  function renderRevenueForecast() {
    const pipeline = state.requirements.reduce((sum, item) => sum + Number(item.estimatedBudget || item.budget || 0), 0);
    return `<div class="pm-revenue">${meta("Expected", formatCurrency(pipeline))}${meta("Closed", formatCurrency(pipeline * 0.38))}${meta("Pending", formatCurrency(pipeline * 0.44))}<button class="pm-link-btn" data-action="navigate" data-id="reports" type="button">View Details</button></div>`;
  }

  function renderHealth() {
    return `<div class="pm-health"><div class="pm-ring"><span>${activeProjects().length}</span></div>${["Healthy 16", "At Risk 4", "Critical 2"].map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>`;
  }

  function renderActivity() {
    const items = ["New lead assigned to Product", "Client approved proposal", "Project created for ABC Ltd", "Meeting scheduled with client"];
    return `<div class="pm-list">${items.map((item, index) => `<div><span>${escapeHtml(item)}</span><small>${10 + index * 25} min ago</small></div>`).join("")}</div>`;
  }

  function renderHeatmap() {
    return `<div class="pm-heatmap">${["Frontend Team", "Backend Team", "Testing Team", "Design Team", "DevOps", "Support"].map((team, index) => `<div class="${["ok", "warn", "bad", "ok", "warn", "ok"][index]}"><strong>${team}</strong><span>${58 + index * 7}% utilization</span></div>`).join("")}</div>`;
  }

  function renderAudit() {
    return `<div class="pm-list">${["Requirement created", "BRD generated", "Proposal exported", "Project assigned"].map((item) => `<div><span>${item}</span><small>${firstName(state.user?.name)} | ${new Date().toLocaleDateString("en-IN")}</small></div>`).join("")}</div>`;
  }

  function handleAction(action, id) {
    if (action === "closeModal") return closeModal();
    if (action === "navigate") return navigate(id);
    if (action === "profile") return openDrawer("Profile", "Product Manager", renderProfileDrawer());
    if (action === "notifications") return openDrawer("Notifications", "Realtime alerts", renderActivity());
    if (action === "openClient") return openClientDrawer(id);
    if (action === "createRequirement" || action === "editRequirement") return openRequirementModal(id);
    if (action === "scheduleMeeting") return openMeetingModal(id);
    if (action === "generateProposal") return openGeneratedDoc("Proposal Builder", "Proposal", selectedRequirement(id));
    if (action === "generateBRD") return openGeneratedDoc("BRD Generator", "BRD", selectedRequirement(id));
    if (action === "analyzeRequirement") return openAnalysisDrawer(selectedRequirement(id));
    if (action === "createProject" || action === "approveProject") return openApproveModal(id || state.selectedId);
    if (action === "rejectProject") return openRejectModal(id);
    if (action === "createChangeRequest" || action === "requestChanges") return openChangeModal(id || state.selectedId);
    if (action === "assignProject") return openAssignProjectModal(id);
    if (action === "meetingNotes") return openDrawer("Meeting Notes", "AI summary", "<p>Transcript, meeting notes, AI summary and action items will be stored after the meeting.</p>");
  }

  function navigate(route) {
    if (!ROUTE_PATH[route]) return;
    window.history.pushState({}, "", ROUTE_PATH[route]);
    state.route = route;
    render();
  }

  function openClientDrawer(id) {
    const item = selectedRequirement(id);
    if (!item) return;
    openDrawer("Client 360 View", item.clientName, `
      ${renderClient360(item)}
      <div class="pm-workspace-card"><h3>All Activity</h3><p>Projects, meetings, calls, emails, invoices, approvals, change requests, files and contracts are visible here without redirect.</p></div>
    `);
  }

  function openAnalysisDrawer(item) {
    item = item || selectedRequirement();
    if (!item) return;
    openDrawer("AI Requirement Analyzer", item.company || item.clientName, `
      ${meta("Scope", item.projectType || "CRM")}
      ${meta("Risk", item.priority === "Critical" ? "High" : "Medium")}
      ${meta("Estimated Team", "Frontend, Backend, QA, DevOps")}
      ${meta("Timeline", `${Number(item.estimatedTimelineWeeks || 8)} weeks`)}
      ${meta("Budget", formatCurrency(item.estimatedBudget || item.budget || 0))}
    `);
  }

  function openGeneratedDoc(title, type, item) {
    item = item || selectedRequirement();
    if (!item) return;
    openDrawer(title, `${type} generated`, `
      <div class="pm-doc-preview">
        <h3>${escapeHtml(type)} - ${escapeHtml(item.company || item.clientName)}</h3>
        <p>${escapeHtml(type === "BRD" ? buildBRDText(item) : buildProposalText(item))}</p>
        <div class="pm-card-actions"><button class="pm-btn primary" type="button">Export PDF</button><button class="pm-btn" type="button">Export DOCX</button></div>
      </div>
    `);
    toast(`${type} generated successfully.`);
  }

  function openRequirementModal(id) {
    const item = selectedRequirement(id) || {};
    openModal("Requirement Gathering", "Create or update requirement", `
      ${field("Client Name", "clientName", item.clientName || "", true)}
      ${field("Company", "company", item.company || "", true)}
      ${field("Phone", "phone", item.phone || "")}
      ${field("Email", "email", item.email || "")}
      ${selectField("Business Type", "industry", ["IT Services", "Manufacturing", "Healthcare", "Education", "Retail"], item.industry)}
      ${selectField("Project Type", "projectType", ["CRM Projects", "ERP Projects", "Website Projects", "Mobile Apps", "AI Projects"], item.projectType)}
      ${field("Target Users", "targetUsers", "50-100 Users")}
      ${field("Budget", "budget", item.budget || item.estimatedBudget || 500000, true, "number")}
      ${field("Deadline", "deadline", toDateInput(item.deadline), true, "date")}
      ${selectField("Priority", "priority", ["High", "Medium", "Low", "Critical"], item.priority || "High")}
      ${textareaField("Requirement", "requirement", item.requirement || "", true)}
      ${textareaField("Features", "keyFeatures", (item.keyFeatures || []).join(", "))}
      ${textareaField("Integrations", "integrations", "Microsoft Teams, Outlook, Client Portal")}
      <div class="full pm-form-actions"><button class="pm-btn" type="button" data-action="closeModal">Cancel</button><button class="pm-btn primary" type="submit">Save Requirement</button></div>
    `, async (form) => {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.budget = Number(payload.budget || 0);
      payload.estimatedBudget = payload.budget;
      payload.keyFeatures = splitList(payload.keyFeatures);
      payload.suggestedModules = ["Admin", "Marketing", "Calling", "Sales", "Client Portal", "Manager"];
      payload.businessGoals = ["Clear scope", "Faster approval", "Smooth project handoff"];
      payload.painPoints = ["Manual tracking", "Approval delays"];
      try {
        const response = await API.post("/requirements/create", payload);
        if (response?.data && state.source === "demo") state.requirements.unshift(response.data);
      } catch (error) {
        const localRequirement = {
          ...payload,
          _id: `req-${Date.now()}`,
          status: "Pending",
          recommendedStack: { frontend: "React.js", backend: "Node.js", database: "MongoDB" },
          estimatedTimelineWeeks: 8,
          features: [],
        };
        state.requirements.unshift(localRequirement);
      }
      toast("Requirement created successfully.");
      closeModal();
      await loadData();
      state.route = "requirements";
      render();
    });
  }

  function openMeetingModal(id) {
    const item = selectedRequirement(id) || selectedRequirement();
    openModal("Client Meeting", "Microsoft Teams integration", `
      ${field("Title", "title", item ? `${item.company} Requirement Discussion` : "Requirement Discussion", true)}
      ${field("Date", "date", "", true, "date")}
      ${field("Time", "time", "11:00", true, "time")}
      ${field("Attendees", "attendees", item?.email || "")}
      ${selectField("Platform", "platform", ["Microsoft Teams", "Google Meet", "Phone Call"], "Microsoft Teams")}
      <div class="pm-meeting-preview full"><strong>Teams link will be generated</strong><span>Outlook invite and calendar event will be stored.</span></div>
      <div class="full pm-form-actions"><button class="pm-btn primary" type="submit">Schedule Meeting</button></div>
    `, async (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      state.meetings.unshift({ _id: `meet-${Date.now()}`, title: data.title, scheduledFor: `${data.date}T${data.time || "11:00"}:00`, platform: data.platform, status: "Scheduled", attendees: splitList(data.attendees) });
      toast("Meeting scheduled successfully.");
      closeModal();
      render();
    });
  }

  function openApproveModal(id) {
    const item = selectedRequirement(id);
    if (!item) return;
    openModal("Create Project & Assign", "Product approval handoff", `
      ${field("Project Name", "projectName", `${item.company || item.clientName} ${item.projectType || "Project"}`, true)}
      ${field("Final Budget", "finalBudget", item.estimatedBudget || item.budget || 0, true, "number")}
      ${field("Timeline Weeks", "weeks", item.estimatedTimelineWeeks || 8, true, "number")}
      ${selectField("Project Manager", "assignedPM", managerOptions(), state.managers[0]?._id || state.managers[0]?.name || "")}
      ${selectField("Priority", "priority", ["High", "Medium", "Low", "Critical"], item.priority || "High")}
      ${textareaField("Notes", "notes", `Important ${item.projectType || "project"} for ${item.company || item.clientName}.`)}
      <div class="full pm-form-actions"><button class="pm-btn primary" type="submit">Approve & Assign Project</button></div>
    `, async (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await API.post("/projects/approve", {
          requirementId: item._id,
          finalBudget: Number(data.finalBudget || 0),
          timeline: { weeks: Number(data.weeks || 0), deadline: item.deadline },
          assignedPM: data.assignedPM,
          notes: data.notes,
          modules: item.suggestedModules || [],
          selectedStack: item.recommendedStack || {},
        });
      } catch (error) {
        item.status = "Approved";
        state.projects.unshift({
          _id: `proj-${Date.now()}`,
          projectName: data.projectName,
          clientName: item.clientName,
          manager: state.managers.find((manager) => String(manager._id) === String(data.assignedPM))?.name || data.assignedPM,
          progress: 0,
          priority: data.priority,
          status: "Assigned",
          budget: Number(data.finalBudget || 0),
          deadline: item.deadline,
        });
      }
      toast("Project created and assigned successfully.");
      closeModal();
      await loadData();
      state.route = "projects";
      render();
    });
  }

  function openRejectModal(id) {
    const item = selectedRequirement(id);
    if (!item) return;
    openModal("Reject Requirement", "Decision log", `
      ${field("Reason", "reason", "Scope not clear", true)}
      ${textareaField("Notes", "notes", "")}
      ${textareaField("Alternative Suggestion", "alternativeSuggestion", "Request more business details from client.")}
      <div class="full pm-form-actions"><button class="pm-btn danger" type="submit">Reject Requirement</button></div>
    `, async (form) => {
      try {
        await API.post("/projects/reject", { requirementId: item._id, ...Object.fromEntries(new FormData(form).entries()) });
      } catch (error) {
        item.status = "Rejected";
      }
      toast("Requirement rejected.");
      closeModal();
      await loadData();
      render();
    });
  }

  function openChangeModal(id) {
    const item = selectedRequirement(id);
    openModal("Create Change Request", "Scope, cost and timeline impact", `
      ${textareaField("Description", "notes", "Need additional analytics dashboard.", true)}
      ${selectField("Priority", "priority", ["High", "Medium", "Low", "Critical"], "High")}
      ${field("Cost Impact", "costImpact", 75000, false, "number")}
      ${field("Timeline Impact", "timelineImpact", "10 Days")}
      ${textareaField("Reason", "reason", "Client requested during review.")}
      <div class="full pm-form-actions"><button class="pm-btn primary" type="submit">Submit Request</button></div>
    `, async (form) => {
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        if (item?._id) {
          await API.post("/requirements/request-changes", { requirementId: item._id, notes: `${data.notes} | Cost: ${data.costImpact} | Timeline: ${data.timelineImpact} | ${data.reason}` });
        }
      } catch (error) {
        if (item) {
          item.status = "Changes Requested";
          item.notes = `${data.notes} | Cost: ${data.costImpact} | Timeline: ${data.timelineImpact} | ${data.reason}`;
        }
      }
      toast("Change request submitted.");
      closeModal();
      await loadData();
      state.route = "changes";
      render();
    });
  }

  function openAssignProjectModal(projectId) {
    openModal("Assign Project", "Project manager handoff", `
      ${selectField("Project Manager", "assignedPM", managerOptions(), state.managers[0]?._id || state.managers[0]?.name || "")}
      ${selectField("Priority", "priority", ["High", "Medium", "Low", "Critical"], "High")}
      ${field("Expected Delivery", "deadline", "", false, "date")}
      ${textareaField("Notes", "notes", "Project assigned from Product Manager portfolio.")}
      <div class="full pm-form-actions"><button class="pm-btn primary" type="submit">Assign Project</button></div>
    `, async () => {
      toast("Project assignment notification sent.");
      closeModal();
    });
  }

  function openModal(title, eyebrow, markup, onSubmit) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalEyebrow").textContent = eyebrow;
    const form = document.getElementById("modalForm");
    form.innerHTML = markup;
    form.onsubmit = async (event) => {
      event.preventDefault();
      try {
        await onSubmit(form);
      } catch (error) {
        toast(error.message || "Action failed.", "error");
      }
    };
    document.getElementById("pmModal").classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("pmModal").classList.add("hidden");
    document.getElementById("modalForm").innerHTML = "";
  }

  function openDrawer(title, eyebrow, markup) {
    document.getElementById("drawerTitle").textContent = title;
    document.getElementById("drawerEyebrow").textContent = eyebrow;
    document.getElementById("drawerBody").innerHTML = markup;
    document.getElementById("pmDrawer").classList.remove("hidden");
  }

  function closeDrawer() {
    document.getElementById("pmDrawer").classList.add("hidden");
  }

  function field(label, name, value = "", required = false, type = "text") {
    return `<label class="pm-field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""} /></label>`;
  }

  function textareaField(label, name, value = "", required = false) {
    return `<label class="pm-field full"><span>${label}</span><textarea name="${name}" rows="4" ${required ? "required" : ""}>${escapeHtml(value)}</textarea></label>`;
  }

  function selectField(label, name, options, selected = "") {
    return `<label class="pm-field"><span>${label}</span><select name="${name}">${options.map((option) => {
      const value = typeof option === "object" ? option.value : option;
      const text = typeof option === "object" ? option.text : option;
      return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(text)}</option>`;
    }).join("")}</select></label>`;
  }

  function managerOptions() {
    return state.managers.length
      ? state.managers.map((item) => ({ value: item._id || item.email || item.name, text: item.name || item.email }))
      : [{ value: "Amit Verma", text: "Amit Verma" }, { value: "Neha Patel", text: "Neha Patel" }];
  }

  function selectedRequirement(id = "") {
    const target = id || state.selectedId;
    return state.requirements.find((item) => String(item._id) === String(target)) || state.requirements[0] || null;
  }

  function filteredRequirements() {
    const query = String(state.search || "").trim().toLowerCase();
    if (!query) return state.requirements;
    return state.requirements.filter((item) => [item.clientName, item.company, item.requirement, item.projectType, item.status, item.source].join(" ").toLowerCase().includes(query));
  }

  function activeProjects() {
    if (state.projects.length) return state.projects;
    return demo.projects;
  }

  function renderProfileDrawer() {
    return `${meta("Name", state.user?.name || "Product Manager")}${meta("Role", state.user?.role || "PRODUCT_MANAGER")}${meta("Email", state.user?.email || "-")}${meta("Theme", "Light only")}`;
  }

  function buildBRDText(item) {
    return `Business Objectives: ${(item.businessGoals || []).join(", ") || "Improve workflow"}. Functional Requirements: ${(item.keyFeatures || []).join(", ") || item.requirement}. Timeline: ${item.estimatedTimelineWeeks || 8} weeks. Risks: scope changes and approval delays.`;
  }

  function buildProposalText(item) {
    return `Company Intro, Project Scope for ${item.company || item.clientName}, timeline of ${item.estimatedTimelineWeeks || 8} weeks, deliverables, cost ${formatCurrency(item.estimatedBudget || item.budget || 0)}, and approval terms.`;
  }

  function toast(message, type = "success") {
    if (typeof showToast === "function" && type !== "warning") {
      showToast(message, type);
    }
    const stack = document.getElementById("toastStack");
    const node = document.createElement("div");
    node.className = `pm-toast ${type}`;
    node.textContent = message;
    stack.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function firstName(value) {
    return String(value || "Product Manager").trim().split(/\s+/)[0] || "Product";
  }

  function splitList(value) {
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  }

  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function formatShortCurrency(value) {
    const amount = Number(value || 0);
    if (amount >= 10000000) return `₹${Math.round(amount / 100000) / 100} Cr`;
    if (amount >= 100000) return `₹${Math.round(amount / 10000) / 10} L`;
    return formatCurrency(amount);
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function toDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function average(values) {
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, item) => sum + Number(item || 0), 0) / values.length);
  }
})();
