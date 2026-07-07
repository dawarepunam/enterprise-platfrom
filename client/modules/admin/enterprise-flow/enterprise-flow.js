const ENTERPRISE_MODULES = {
  roles: {
    navKey: "roles",
    title: "Roles & Permissions",
    eyebrow: "Organization Security",
    description: "Shape access, approval power and workflow visibility with one clean governance table.",
    collectionKey: "roles",
    singular: "Role",
    boardTitle: "Permission lanes",
    insightTitle: "Access posture",
    secondaryLink: "../users/users.html",
    secondaryLabel: "Open Users",
    statusField: "status",
    statusOptions: ["All", "Active", "Draft", "Paused"],
    fields: [
      { id: "name", label: "Role Name", required: true },
      { id: "code", label: "System Code", required: true },
      { id: "scope", label: "Scope", required: true },
      { id: "members", label: "Members", type: "number", required: true },
      { id: "status", label: "Status", type: "select", options: ["Active", "Draft", "Paused"], required: true },
      { id: "permissions", label: "Permissions", type: "textarea", full: true, placeholder: "users.manage, projects.manage" },
    ],
    columns: [
      { key: "name", label: "Role" },
      { key: "scope", label: "Scope" },
      { key: "members", label: "Members" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Total Roles", value: items.length, note: "Access blueprints" },
      { label: "Active", value: items.filter((item) => item.status === "Active").length, note: "Ready for allocation" },
      { label: "Permission Sets", value: items.reduce((sum, item) => sum + toArray(item.permissions).length, 0), note: "Mapped capabilities" },
      { label: "Members Covered", value: items.reduce((sum, item) => sum + Number(item.members || 0), 0), note: "Users under RBAC" },
    ],
    board: (items) => [
      buildLane("Coverage", `${items.filter((item) => item.status === "Active").length} active roles are governing daily work.`, items.map((item) => item.code || item.name).slice(0, 3)),
      buildLane("Risk Watch", `${items.filter((item) => item.status !== "Active").length} roles need review or alignment.`, items.filter((item) => item.status !== "Active").map((item) => item.name).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Strongest spread", items[0]?.name || "Admin", "Use modular permission packs instead of oversized broad roles."),
      buildInsight("Approval pressure", `${items.filter((item) => String(item.scope).toLowerCase().includes("delivery")).length} delivery roles`, "Delivery-heavy roles should get clear approval boundaries."),
    ],
  },
  designations: {
    navKey: "designations",
    title: "Designations",
    eyebrow: "Org Design",
    description: "Standardize titles, levels and reporting lines so onboarding and appraisal stay consistent.",
    collectionKey: "designations",
    singular: "Designation",
    boardTitle: "Workforce lanes",
    insightTitle: "Title architecture",
    secondaryLink: "../users/users.html",
    secondaryLabel: "Map Users",
    statusField: "status",
    statusOptions: ["All", "Active", "Hiring", "Paused"],
    fields: [
      { id: "title", label: "Designation Title", required: true },
      { id: "level", label: "Level", required: true },
      { id: "department", label: "Department", required: true },
      { id: "reportingTo", label: "Reporting To", required: true },
      { id: "openings", label: "Openings", type: "number", required: true },
      { id: "status", label: "Status", type: "select", options: ["Active", "Hiring", "Paused"], required: true },
    ],
    columns: [
      { key: "title", label: "Designation" },
      { key: "department", label: "Department" },
      { key: "level", label: "Level" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Titles", value: items.length, note: "Role ladders tracked" },
      { label: "Openings", value: items.reduce((sum, item) => sum + Number(item.openings || 0), 0), note: "Positions still open" },
      { label: "Departments", value: new Set(items.map((item) => item.department)).size, note: "Teams covered" },
      { label: "Hiring", value: items.filter((item) => item.status === "Hiring").length, note: "Recruitment-active titles" },
    ],
    board: (items) => [
      buildLane("Leadership spine", `${items.filter((item) => /^L[34]/i.test(item.level || "")).length} senior designations anchor reporting.`, items.map((item) => item.reportingTo).slice(0, 3)),
      buildLane("Hiring pulse", `${items.filter((item) => item.status === "Hiring").length} designations are open.`, items.filter((item) => item.status === "Hiring").map((item) => item.title).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Layer balance", `${new Set(items.map((item) => item.level)).size} levels`, "Keep every level mapped to at least one active owner."),
      buildInsight("Reporting clarity", items[0]?.reportingTo || "Admin", "Well-defined reporting lines reduce approval ambiguity."),
    ],
  },
  branches: {
    navKey: "branches",
    title: "Branches",
    eyebrow: "Multi-Location Ops",
    description: "Track branch owners, city coverage and department presence before the org scales wider.",
    collectionKey: "branches",
    singular: "Branch",
    boardTitle: "Expansion lanes",
    insightTitle: "Footprint pulse",
    secondaryLink: "../departments/departments.html",
    secondaryLabel: "Open Departments",
    statusField: "status",
    statusOptions: ["All", "Operational", "Scaling", "Planned"],
    fields: [
      { id: "name", label: "Branch Name", required: true },
      { id: "code", label: "Branch Code", required: true },
      { id: "city", label: "City", required: true },
      { id: "timezone", label: "Timezone", required: true },
      { id: "manager", label: "Branch Manager", required: true },
      { id: "departments", label: "Departments", type: "number", required: true },
      { id: "status", label: "Status", type: "select", options: ["Operational", "Scaling", "Planned"], required: true },
    ],
    columns: [
      { key: "name", label: "Branch" },
      { key: "city", label: "City" },
      { key: "manager", label: "Manager" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Branches", value: items.length, note: "Locations tracked" },
      { label: "Operational", value: items.filter((item) => item.status === "Operational").length, note: "Fully active sites" },
      { label: "Department Reach", value: items.reduce((sum, item) => sum + Number(item.departments || 0), 0), note: "Local org units" },
      { label: "Cities", value: new Set(items.map((item) => item.city)).size, note: "Geo spread" },
    ],
    board: (items) => [
      buildLane("Scale-ready", `${items.filter((item) => item.status !== "Planned").length} branches are already moving.`, items.map((item) => item.city).slice(0, 3)),
      buildLane("Leadership coverage", `${new Set(items.map((item) => item.manager)).size} branch leads assigned.`, items.map((item) => item.manager).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Closest growth node", items.find((item) => item.status === "Scaling")?.name || "Pune HQ", "Scaling branches are best candidates for process templates."),
      buildInsight("Timezone spread", `${new Set(items.map((item) => item.timezone)).size} active timezone bands`, "Timezone-aware approvals matter once coverage broadens."),
    ],
  },
  holidays: {
    navKey: "holidays",
    title: "Holidays",
    eyebrow: "Calendar Governance",
    description: "Publish holiday calendars that protect staffing, attendance and client expectation management.",
    collectionKey: "holidays",
    singular: "Holiday",
    boardTitle: "Calendar lanes",
    insightTitle: "Attendance impact",
    secondaryLink: "../attendance/attendance.html",
    secondaryLabel: "Open Attendance",
    statusField: "status",
    statusOptions: ["All", "Published", "Draft", "Archived"],
    fields: [
      { id: "title", label: "Holiday Title", required: true },
      { id: "date", label: "Date", type: "date", required: true },
      { id: "branch", label: "Branch", required: true },
      { id: "type", label: "Type", required: true },
      { id: "impact", label: "Impact", type: "select", options: ["Low", "Medium", "High"], required: true },
      { id: "status", label: "Status", type: "select", options: ["Published", "Draft", "Archived"], required: true },
    ],
    columns: [
      { key: "title", label: "Holiday" },
      { key: "date", label: "Date", type: "date" },
      { key: "branch", label: "Branch" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Holiday Events", value: items.length, note: "Calendar entries" },
      { label: "Published", value: items.filter((item) => item.status === "Published").length, note: "Visible to teams" },
      { label: "High Impact", value: items.filter((item) => item.impact === "High").length, note: "Delivery-sensitive days" },
      { label: "Branches", value: new Set(items.map((item) => item.branch)).size, note: "Coverage footprint" },
    ],
    board: (items) => [
      buildLane("Upcoming schedule", `${items.filter((item) => item.status === "Published").length} published holidays are visible to teams.`, items.map((item) => item.date).slice(0, 3)),
      buildLane("Impact watch", `${items.filter((item) => item.impact === "High").length} dates need client comms planning.`, items.filter((item) => item.impact === "High").map((item) => item.title).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Calendar confidence", items.find((item) => item.status === "Published")?.title || "No published holiday yet", "Publishing early prevents timesheet and leave confusion."),
      buildInsight("Local coverage", `${new Set(items.map((item) => item.branch)).size} branch calendars`, "Local holidays should roll into branch-wise staffing views."),
    ],
  },
  "project-templates": {
    navKey: "templates",
    title: "Project Templates",
    eyebrow: "Repeatable Delivery",
    description: "Turn winning execution patterns into reusable blueprints for faster launches.",
    collectionKey: "templates",
    singular: "Template",
    boardTitle: "Template lanes",
    insightTitle: "Reuse pulse",
    secondaryLink: "../projects/projects.html",
    secondaryLabel: "Open Projects",
    statusField: "status",
    statusOptions: ["All", "Ready", "Draft", "Archived"],
    fields: [
      { id: "name", label: "Template Name", required: true },
      { id: "category", label: "Category", required: true },
      { id: "basedOn", label: "Based On", required: true },
      { id: "owner", label: "Owner", required: true },
      { id: "usageCount", label: "Usage Count", type: "number", required: true },
      { id: "status", label: "Status", type: "select", options: ["Ready", "Draft", "Archived"], required: true },
    ],
    columns: [
      { key: "name", label: "Template" },
      { key: "category", label: "Category" },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Templates", value: items.length, note: "Reusable packs" },
      { label: "Ready", value: items.filter((item) => item.status === "Ready").length, note: "Deployable now" },
      { label: "Reuse Count", value: items.reduce((sum, item) => sum + Number(item.usageCount || 0), 0), note: "Times re-used" },
      { label: "Categories", value: new Set(items.map((item) => item.category)).size, note: "Delivery streams" },
    ],
    board: (items) => [
      buildLane("Most reusable", `${items.sort((a, b) => Number(b.usageCount || 0) - Number(a.usageCount || 0))[0]?.name || "No template"} leads reuse.`, items.map((item) => item.category).slice(0, 3)),
      buildLane("Draft queue", `${items.filter((item) => item.status === "Draft").length} templates are still being refined.`, items.filter((item) => item.status === "Draft").map((item) => item.name).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Standardization gain", `${items.reduce((sum, item) => sum + Number(item.usageCount || 0), 0)} total launches`, "High reuse means faster kickoff and more predictable delivery."),
      buildInsight("Anchor source", items[0]?.basedOn || "No source yet", "Templates work best when tied to proven successful projects."),
    ],
  },
  "project-archive": {
    navKey: "archive",
    title: "Project Archive",
    eyebrow: "Closed Delivery Vault",
    description: "Keep completed work discoverable without cluttering live operational dashboards.",
    collectionKey: "archive",
    singular: "Archive Record",
    boardTitle: "Archive lanes",
    insightTitle: "Historical discipline",
    secondaryLink: "../reports/reports.html",
    secondaryLabel: "Open Reports",
    statusField: "status",
    statusOptions: ["All", "Archived", "Pending Review"],
    fields: [
      { id: "name", label: "Record Name", required: true },
      { id: "category", label: "Category", required: true },
      { id: "archivedOn", label: "Archived On", type: "date", required: true },
      { id: "owner", label: "Owner", required: true },
      { id: "reason", label: "Reason", full: true, type: "textarea" },
      { id: "status", label: "Status", type: "select", options: ["Archived", "Pending Review"], required: true },
    ],
    columns: [
      { key: "name", label: "Archived Item" },
      { key: "category", label: "Category" },
      { key: "archivedOn", label: "Archived On", type: "date" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Archived Items", value: items.length, note: "Historical records" },
      { label: "Ready Vault", value: items.filter((item) => item.status === "Archived").length, note: "Fully closed" },
      { label: "Categories", value: new Set(items.map((item) => item.category)).size, note: "Record spread" },
      { label: "Owners", value: new Set(items.map((item) => item.owner)).size, note: "Responsible closers" },
    ],
    board: (items) => [
      buildLane("Archive hygiene", `${items.filter((item) => item.status === "Archived").length} items are cleanly parked.`, items.map((item) => item.category).slice(0, 3)),
      buildLane("Pending review", `${items.filter((item) => item.status !== "Archived").length} items still need closure review.`, items.filter((item) => item.status !== "Archived").map((item) => item.name).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Knowledge retention", items[0]?.name || "Archive empty", "Archived records should still be searchable for replay and estimation."),
      buildInsight("Closure signal", `${items.filter((item) => item.status === "Archived").length}/${items.length || 1} finalized`, "A disciplined archive protects live dashboards from noise."),
    ],
  },
  "project-clone": {
    navKey: "clone",
    title: "Project Clone",
    eyebrow: "Fast Start Engine",
    description: "Duplicate proven structures so repeat work starts with fewer setup gaps and better momentum.",
    collectionKey: "clones",
    singular: "Clone Pack",
    boardTitle: "Clone lanes",
    insightTitle: "Replication pulse",
    secondaryLink: "../projects/projects.html",
    secondaryLabel: "Launch Projects",
    statusField: "status",
    statusOptions: ["All", "Prepared", "In Use", "Paused"],
    fields: [
      { id: "name", label: "Clone Name", required: true },
      { id: "source", label: "Source Template / Project", required: true },
      { id: "owner", label: "Owner", required: true },
      { id: "targetDepartment", label: "Target Department", required: true },
      { id: "status", label: "Status", type: "select", options: ["Prepared", "In Use", "Paused"], required: true },
    ],
    columns: [
      { key: "name", label: "Clone" },
      { key: "source", label: "Source" },
      { key: "targetDepartment", label: "Target Department" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Clone Packs", value: items.length, note: "Prepared launches" },
      { label: "Live Use", value: items.filter((item) => item.status === "In Use").length, note: "Already active" },
      { label: "Departments", value: new Set(items.map((item) => item.targetDepartment)).size, note: "Teams covered" },
      { label: "Sources", value: new Set(items.map((item) => item.source)).size, note: "Reusable origins" },
    ],
    board: (items) => [
      buildLane("Prepared queue", `${items.filter((item) => item.status === "Prepared").length} clones are ready to launch.`, items.filter((item) => item.status === "Prepared").map((item) => item.name).slice(0, 3)),
      buildLane("Live replication", `${items.filter((item) => item.status === "In Use").length} structures are already active.`, items.filter((item) => item.status === "In Use").map((item) => item.source).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Best source", items[0]?.source || "No source yet", "Clone packs should come from stable and well-documented delivery patterns."),
      buildInsight("Speed promise", `${items.length} launch accelerators`, "Cloning is most effective when paired with role and milestone defaults."),
    ],
  },
  "backup-restore": {
    navKey: "backup",
    title: "Backup & Restore",
    eyebrow: "Resilience Control",
    description: "Track backup jobs, retention windows and recovery confidence without leaving the admin workspace.",
    collectionKey: "backups",
    singular: "Backup Job",
    boardTitle: "Resilience lanes",
    insightTitle: "Recovery pulse",
    secondaryLink: "../settings/settings.html",
    secondaryLabel: "Open Settings",
    statusField: "status",
    statusOptions: ["All", "Healthy", "Queued", "Failed"],
    fields: [
      { id: "name", label: "Backup Job", required: true },
      { id: "frequency", label: "Frequency", required: true },
      { id: "lastRun", label: "Last Run", type: "datetime-local", required: true },
      { id: "retention", label: "Retention", required: true },
      { id: "status", label: "Status", type: "select", options: ["Healthy", "Queued", "Failed"], required: true },
    ],
    columns: [
      { key: "name", label: "Backup Job" },
      { key: "frequency", label: "Frequency" },
      { key: "lastRun", label: "Last Run", type: "dateTime" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Backup Jobs", value: items.length, note: "Tracked schedules" },
      { label: "Healthy", value: items.filter((item) => item.status === "Healthy").length, note: "Recovery-safe jobs" },
      { label: "Queued", value: items.filter((item) => item.status === "Queued").length, note: "Awaiting execution" },
      { label: "Risk Jobs", value: items.filter((item) => item.status === "Failed").length, note: "Need intervention" },
    ],
    board: (items) => [
      buildLane("Protected", `${items.filter((item) => item.status === "Healthy").length} jobs are protecting data.`, items.map((item) => item.retention).slice(0, 3)),
      buildLane("Attention needed", `${items.filter((item) => item.status !== "Healthy").length} jobs are not fully green.`, items.filter((item) => item.status !== "Healthy").map((item) => item.name).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Recovery confidence", items.find((item) => item.status === "Healthy")?.name || "No healthy backup yet", "Healthy recurring snapshots are the base for safe enterprise changes."),
      buildInsight("Retention spread", `${new Set(items.map((item) => item.retention)).size} retention policies`, "Mix short and long retention to balance speed and compliance."),
    ],
  },
  "import-export": {
    navKey: "import-export",
    title: "Import / Export",
    eyebrow: "Data Movement",
    description: "Manage repeatable file operations for clients, reports and migration-heavy business workflows.",
    collectionKey: "importExports",
    singular: "Transfer Job",
    boardTitle: "Transfer lanes",
    insightTitle: "Flow reliability",
    secondaryLink: "../reports/reports.html",
    secondaryLabel: "Open Reports",
    statusField: "status",
    statusOptions: ["All", "Completed", "Queued", "Failed"],
    fields: [
      { id: "name", label: "Job Name", required: true },
      { id: "type", label: "Type", type: "select", options: ["Import", "Export"], required: true },
      { id: "format", label: "Format", required: true },
      { id: "owner", label: "Owner", required: true },
      { id: "lastRun", label: "Last Run", type: "datetime-local", required: true },
      { id: "status", label: "Status", type: "select", options: ["Completed", "Queued", "Failed"], required: true },
    ],
    columns: [
      { key: "name", label: "Transfer Job" },
      { key: "type", label: "Type" },
      { key: "format", label: "Format" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Transfer Jobs", value: items.length, note: "Import/export steps" },
      { label: "Completed", value: items.filter((item) => item.status === "Completed").length, note: "Delivered cleanly" },
      { label: "Formats", value: new Set(items.map((item) => item.format)).size, note: "File types supported" },
      { label: "Queued", value: items.filter((item) => item.status === "Queued").length, note: "Pending run" },
    ],
    board: (items) => [
      buildLane("Import side", `${items.filter((item) => item.type === "Import").length} inbound jobs are available.`, items.filter((item) => item.type === "Import").map((item) => item.format).slice(0, 3)),
      buildLane("Export side", `${items.filter((item) => item.type === "Export").length} outbound jobs support reporting.`, items.filter((item) => item.type === "Export").map((item) => item.name).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Format readiness", `${new Set(items.map((item) => item.format)).size} formats mapped`, "Standardizing import/export shapes reduces cleanup effort."),
      buildInsight("Owner discipline", `${new Set(items.map((item) => item.owner)).size} owners`, "Clear job ownership makes failures easier to resolve."),
    ],
  },
  "recycle-bin": {
    navKey: "recycle-bin",
    title: "Recycle Bin",
    eyebrow: "Safe Delete Buffer",
    description: "Recover deleted admin artifacts before they disappear for good and keep governance defensible.",
    collectionKey: "recycleBin",
    singular: "Recovery Item",
    boardTitle: "Recovery lanes",
    insightTitle: "Deletion safety",
    secondaryLink: "../audit-logs/audit-logs.html",
    secondaryLabel: "Open Audit Logs",
    statusField: "status",
    statusOptions: ["All", "Recoverable", "Expired"],
    fields: [
      { id: "name", label: "Item Name", required: true },
      { id: "category", label: "Category", required: true },
      { id: "deletedOn", label: "Deleted On", type: "datetime-local", required: true },
      { id: "deletedBy", label: "Deleted By", required: true },
      { id: "recoverableUntil", label: "Recoverable Until", type: "date", required: true },
      { id: "status", label: "Status", type: "select", options: ["Recoverable", "Expired"], required: true },
    ],
    columns: [
      { key: "name", label: "Deleted Item" },
      { key: "category", label: "Category" },
      { key: "recoverableUntil", label: "Recoverable Until", type: "date" },
      { key: "status", label: "Status", type: "status" },
    ],
    metrics: (items) => [
      { label: "Bin Items", value: items.length, note: "Soft-deleted records" },
      { label: "Recoverable", value: items.filter((item) => item.status === "Recoverable").length, note: "Can be restored" },
      { label: "Expired", value: items.filter((item) => item.status === "Expired").length, note: "Past restore window" },
      { label: "Categories", value: new Set(items.map((item) => item.category)).size, note: "Record types affected" },
    ],
    board: (items) => [
      buildLane("Safe to restore", `${items.filter((item) => item.status === "Recoverable").length} items are still protected.`, items.filter((item) => item.status === "Recoverable").map((item) => item.name).slice(0, 3)),
      buildLane("Expiry watch", `${items.filter((item) => item.status === "Expired").length} items already lost their recovery window.`, items.filter((item) => item.status === "Expired").map((item) => item.name).slice(0, 3)),
    ],
    insights: (items) => [
      buildInsight("Deletion hygiene", `${items.filter((item) => item.status === "Recoverable").length} protected items`, "Soft delete is strongest when paired with audit logs and expiry policy."),
      buildInsight("Governance owner", items[0]?.deletedBy || "No deletion owner", "Track who removed records so recovery decisions stay accountable."),
    ],
  },
};

const DEFAULT_MODULE_KEY = "roles";

let activeModule = null;
let activeItems = [];
let editingId = "";

document.addEventListener("DOMContentLoaded", async () => {
  activeModule = getActiveModule();
  const gate = await bootAdminPage({
    moduleKey: activeModule.navKey,
    pageTitle: activeModule.title,
    pageDescription: "Enterprise Utilities",
  });

  if (!gate?.allowed) return;

  bindWorkspaceEvents();
  renderWorkspaceChrome();
  loadModuleRecords();
});

function getActiveModule() {
  const key = new URLSearchParams(window.location.search).get("module") || DEFAULT_MODULE_KEY;
  return ENTERPRISE_MODULES[key] || ENTERPRISE_MODULES[DEFAULT_MODULE_KEY];
}

function bindWorkspaceEvents() {
  document.getElementById("openCreateModal").addEventListener("click", openCreateModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  document.getElementById("recordForm").addEventListener("submit", handleSaveRecord);
  document.getElementById("searchInput").addEventListener("input", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);
}

function renderWorkspaceChrome() {
  setText("moduleEyebrow", activeModule.eyebrow);
  setText("moduleTitle", activeModule.title);
  setText("moduleDescription", activeModule.description);
  setText("boardTitle", activeModule.boardTitle);
  setText("insightTitle", activeModule.insightTitle);
  setText("directoryTitle", `${activeModule.title} Directory`);
  setText("modalEyebrow", `${activeModule.singular} Form`);

  const secondaryLink = document.getElementById("heroSecondaryLink");
  secondaryLink.href = activeModule.secondaryLink;
  secondaryLink.textContent = activeModule.secondaryLabel;

  renderStatusFilter();
  renderDynamicForm();
  renderQuickLinks();
  renderTableHead();
}

function loadModuleRecords() {
  activeItems = getStoreGetter(activeModule.collectionKey)();
  renderAll();
}

function renderAll() {
  renderSummary();
  renderBoard();
  renderInsights();
  renderTable();
  updateHeadline();
}

function renderSummary() {
  const metrics = activeModule.metrics(activeItems);
  document.getElementById("summaryGrid").innerHTML = metrics
    .map(
      (metric) => `
        <article class="summary-card">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(String(metric.value))}</strong>
          <small>${escapeHtml(metric.note)}</small>
        </article>
      `,
    )
    .join("");
}

function renderBoard() {
  const cards = activeModule.board(activeItems);
  document.getElementById("priorityBoard").innerHTML = cards
    .map(
      (card) => `
        <article class="lane-card">
          <span class="section-eyebrow">${escapeHtml(card.title)}</span>
          <strong>${escapeHtml(card.summary)}</strong>
          <p>${escapeHtml(card.body)}</p>
          <div class="pill-row">${card.pills.map((pill) => `<span class="meta-pill">${escapeHtml(pill)}</span>`).join("")}</div>
        </article>
      `,
    )
    .join("");
}

function renderInsights() {
  const insights = activeModule.insights(activeItems);
  document.getElementById("insightStack").innerHTML = insights
    .map(
      (item) => `
        <article class="insight-card">
          <span class="section-eyebrow">${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <p>${escapeHtml(item.copy)}</p>
        </article>
      `,
    )
    .join("");
}

function renderQuickLinks() {
  const links = [
    { href: "../dashboard/dashboard.html", title: "Dashboard", copy: "Executive progress and health overview." },
    { href: "../settings/settings.html", title: "Settings", copy: "System policies, automation and resilience controls." },
    { href: "../reports/reports.html", title: "Reports", copy: "Export-worthy performance and business analysis." },
    { href: "../crm/crm.html", title: "Clients", copy: "Customer-facing records and delivery context." },
  ];

  document.getElementById("quickLinks").innerHTML = links
    .map(
      (link) => `
        <a class="quick-link-card" href="${link.href}">
          <strong>${escapeHtml(link.title)}</strong>
          <span>${escapeHtml(link.copy)}</span>
        </a>
      `,
    )
    .join("");
}

function renderStatusFilter() {
  const filter = document.getElementById("statusFilter");
  filter.innerHTML = activeModule.statusOptions
    .map((item) => `<option value="${escapeHtml(item === "All" ? "" : item)}">${escapeHtml(item)}</option>`)
    .join("");
}

function renderTableHead() {
  document.getElementById("tableHeadRow").innerHTML = [
    ...activeModule.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`),
    "<th>Actions</th>",
  ].join("");
}

function renderTable() {
  const tbody = document.getElementById("tableBody");
  const items = getFilteredItems();

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="${activeModule.columns.length + 1}" class="empty-state">No ${activeModule.singular.toLowerCase()} records match the current search.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => `
        <tr>
          ${activeModule.columns.map((column, index) => `<td>${renderCell(item, column, index === 0)}</td>`).join("")}
          <td>
            <div class="row-actions">
              <button class="btn-inline edit" type="button" onclick="editEnterpriseRecord('${escapeHtml(String(item._id))}')">Edit</button>
              <button class="btn-inline delete" type="button" onclick="deleteEnterpriseRecord('${escapeHtml(String(item._id))}')">Delete</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderCell(item, column, isLeadColumn = false) {
  const value = item[column.key];

  if (column.type === "status") {
    return `<span class="status-pill ${getToneClass(value)}">${escapeHtml(String(value || "Draft"))}</span>`;
  }

  if (column.type === "date") {
    return escapeHtml(formatDateValue(value));
  }

  if (column.type === "dateTime") {
    return escapeHtml(formatDateTimeValue(value));
  }

  if (isLeadColumn) {
    const caption = getLeadCaption(item);
    return `
      <div class="record-title">
        <strong>${escapeHtml(String(value || "-"))}</strong>
        <span>${escapeHtml(caption)}</span>
      </div>
    `;
  }

  return escapeHtml(String(value ?? "-"));
}

function renderDynamicForm() {
  const target = document.getElementById("dynamicFormGrid");
  target.innerHTML = activeModule.fields
    .map((field) => {
      const wrapperClass = field.full ? "form-group full" : "form-group";

      if (field.type === "select") {
        return `
          <div class="${wrapperClass}">
            <label for="${field.id}">${escapeHtml(field.label)}</label>
            <select id="${field.id}" ${field.required ? "required" : ""}>
              ${field.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}
            </select>
          </div>
        `;
      }

      if (field.type === "textarea") {
        return `
          <div class="${wrapperClass}">
            <label for="${field.id}">${escapeHtml(field.label)}</label>
            <textarea id="${field.id}" rows="4" placeholder="${escapeHtml(field.placeholder || "")}" ${field.required ? "required" : ""}></textarea>
          </div>
        `;
      }

      return `
        <div class="${wrapperClass}">
          <label for="${field.id}">${escapeHtml(field.label)}</label>
          <input id="${field.id}" type="${escapeHtml(field.type || "text")}" placeholder="${escapeHtml(field.placeholder || "")}" ${field.required ? "required" : ""} />
        </div>
      `;
    })
    .join("");
}

function openCreateModal() {
  editingId = "";
  document.getElementById("recordForm").reset();
  document.getElementById("recordId").value = "";
  setText("modalTitle", `Create ${activeModule.singular}`);
  document.getElementById("recordModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("recordModal").classList.add("hidden");
}

function editEnterpriseRecord(id) {
  const item = activeItems.find((entry) => String(entry._id) === String(id));
  if (!item) return;

  editingId = String(id);
  document.getElementById("recordId").value = editingId;
  setText("modalTitle", `Edit ${activeModule.singular}`);

  activeModule.fields.forEach((field) => {
    const element = document.getElementById(field.id);
    if (!element) return;

    const value = item[field.id];
    if (field.type === "textarea") {
      element.value = Array.isArray(value) ? value.join(", ") : value || "";
      return;
    }

    if (field.type === "datetime-local") {
      element.value = toDateTimeLocalValue(value);
      return;
    }

    element.value = value ?? "";
  });

  document.getElementById("recordModal").classList.remove("hidden");
}

function handleSaveRecord(event) {
  event.preventDefault();

  const payload = { _id: editingId || undefined };
  activeModule.fields.forEach((field) => {
    const element = document.getElementById(field.id);
    if (!element) return;

    if (field.type === "number") {
      payload[field.id] = Number(element.value || 0);
      return;
    }

    if (field.id === "permissions") {
      payload[field.id] = String(element.value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return;
    }

    payload[field.id] = element.value.trim();
  });

  getStoreUpsert(activeModule.collectionKey)(payload);
  loadModuleRecords();
  closeModal();

  if (typeof showToast === "function") {
    showToast(`${activeModule.singular} saved successfully.`, "success", { title: activeModule.title });
  }
}

function deleteEnterpriseRecord(id) {
  if (!confirm(`Delete this ${activeModule.singular.toLowerCase()} record?`)) return;

  getStoreDelete(activeModule.collectionKey)(id);
  loadModuleRecords();

  if (typeof showToast === "function") {
    showToast(`${activeModule.singular} removed successfully.`, "success", { title: activeModule.title });
  }
}

function getFilteredItems() {
  const keyword = String(document.getElementById("searchInput").value || "").trim().toLowerCase();
  const selectedStatus = document.getElementById("statusFilter").value;

  return activeItems.filter((item) => {
    const haystack = activeModule.fields
      .map((field) => item[field.id])
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .join(" ")
      .toLowerCase();

    const keywordMatch = !keyword || haystack.includes(keyword);
    const statusMatch = !selectedStatus || String(item[activeModule.statusField] || "") === selectedStatus;
    return keywordMatch && statusMatch;
  });
}

function updateHeadline() {
  const metrics = activeModule.metrics(activeItems);
  setText("moduleHeadlineMetric", metrics[0]?.value ?? activeItems.length);
  setText("moduleHeadlineCopy", metrics[0]?.note || `${activeModule.singular} records ready`);
  setText("workspaceHealth", "Live Mirror");
  setText("workspaceHealthCopy", "Local-first enterprise data is active and ready for backend sync.");
}

function getLeadCaption(item) {
  const captions = [item.code, item.owner, item.department, item.category, item.branch, item.source, item.type]
    .filter(Boolean)
    .slice(0, 2);
  return captions.join(" · ") || activeModule.title;
}

function buildLane(title, summary, pills) {
  return {
    title,
    summary,
    body: `${activeModule.title} stays clearer when these signals are visible at the top of the workspace.`,
    pills: pills.length ? pills : ["No items yet"],
  };
}

function buildInsight(label, value, copy) {
  return { label, value: String(value), copy };
}

function getStoreGetter(collectionKey) {
  return window.enterpriseStore[`get${capitalize(collectionKey)}`].bind(window.enterpriseStore);
}

function getStoreUpsert(collectionKey) {
  if (collectionKey === "importExports") return window.enterpriseStore.upsertImportExport.bind(window.enterpriseStore);
  if (collectionKey === "recycleBin") return window.enterpriseStore.upsertRecycleBinItem.bind(window.enterpriseStore);
  return window.enterpriseStore[`upsert${getSingularName(collectionKey)}`].bind(window.enterpriseStore);
}

function getStoreDelete(collectionKey) {
  if (collectionKey === "importExports") return window.enterpriseStore.deleteImportExport.bind(window.enterpriseStore);
  if (collectionKey === "recycleBin") return window.enterpriseStore.deleteRecycleBinItem.bind(window.enterpriseStore);
  return window.enterpriseStore[`delete${getSingularName(collectionKey)}`].bind(window.enterpriseStore);
}

function getSingularName(collectionKey) {
  const map = {
    roles: "Role",
    designations: "Designation",
    branches: "Branch",
    holidays: "Holiday",
    templates: "Template",
    archive: "Archive",
    clones: "Clone",
    backups: "Backup",
    importExports: "ImportExport",
    recycleBin: "RecycleBinItem",
  };
  return map[collectionKey];
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function getToneClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (["active", "ready", "healthy", "completed", "published", "operational", "recoverable", "archived", "prepared"].includes(normalized)) {
    return "tone-good";
  }

  if (["queued", "draft", "scaling", "hiring", "paused", "planned"].includes(normalized)) {
    return "tone-warn";
  }

  if (["failed", "expired"].includes(normalized)) {
    return "tone-danger";
  }

  return "tone-info";
}

function formatDateValue(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTimeValue(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

window.editEnterpriseRecord = editEnterpriseRecord;
window.deleteEnterpriseRecord = deleteEnterpriseRecord;
