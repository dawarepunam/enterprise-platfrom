$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Write-File([string]$path, [string]$content) {
  Ensure-Dir (Split-Path $path)
  Set-Content -Path $path -Value $content -Encoding UTF8
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-File (Join-Path $root "package.json") @'
{
  "name": "smart-enterprise-platform",
  "version": "1.0.0",
  "private": true,
  "description": "AI-powered enterprise project, CRM, HR, collaboration and analytics platform.",
  "main": "server/server.js",
  "scripts": {
    "start": "node server/server.js",
    "dev": "nodemon server/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cloudinary": "^2.5.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.6.1",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.15",
    "socket.io": "^4.8.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
'@

Write-File (Join-Path $root ".env.example") @'
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart-enterprise-platform
JWT_SECRET=replace_this_with_a_secure_secret
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
CLIENT_URL=http://127.0.0.1:5000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=Smart Enterprise <noreply@example.com>
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=demo
CLOUDINARY_API_SECRET=demo
'@

$cssFiles = @{
  "client/assets/css/components.css" = @'
.component-card, .panel-card, .widget-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.section-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}
'@
  "client/assets/css/modal.css" = @'
.modal-backdrop,
.modal {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  z-index: 1000;
}

.modal.is-open,
.modal-backdrop.is-open {
  display: flex;
}

.modal-panel,
.modal-content {
  width: min(720px, 92vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}
'@
  "client/assets/css/responsive.css" = @'
@media (max-width: 1024px) {
  .layout,
  .layout-shell,
  .settings-shell,
  .section-shell {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 768px) {
  .page-header,
  .hero-actions,
  .header-actions {
    display: grid !important;
    grid-template-columns: 1fr;
  }

  .grid-2,
  .settings-grid,
  .section-grid,
  .metric-grid,
  .info-grid,
  .toggle-grid,
  .quick-links,
  .quick-action-grid,
  .profile-nav-grid,
  .hero-highlights,
  .module-grid {
    grid-template-columns: 1fr !important;
  }
}
'@
}
$cssFiles.GetEnumerator() | ForEach-Object { Write-File (Join-Path $root $_.Key) $_.Value }

$jsFiles = @{
  "client/assets/js/permissions.js" = @'
function hasRole(allowedRoles = []) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

function requireRole(allowedRoles = []) {
  if (!hasRole(allowedRoles)) {
    window.location.href = "/pages/unauthorized.html";
  }
}
'@
  "client/assets/js/modal.js" = @'
function openModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("is-open");
}

function closeModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("is-open");
}
'@
  "client/assets/js/file-upload.js" = @'
async function uploadFile(file, folder = "enterprise-platform") {
  return {
    url: URL.createObjectURL(file),
    name: file.name,
    folder,
    provider: "local-preview",
  };
}
'@
  "client/assets/js/sidebar.js" = @'
document.addEventListener("DOMContentLoaded", () => {
  const sidebarToggle = document.getElementById("sidebarToggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
    });
  }
});
'@
}
$jsFiles.GetEnumerator() | ForEach-Object { Write-File (Join-Path $root $_.Key) $_.Value }

Write-File (Join-Path $root "client/components/loaders.html") @'
<div class="loader-stack">
  <div class="loader-spinner"></div>
  <p>Loading enterprise workspace...</p>
</div>
'@

Ensure-Dir (Join-Path $root "client/modules/auth")
$authPages = @(
  @{ Name = "login"; Title = "Login"; FormId = "loginForm"; Extra = '<a href="forgot-password.html">Forgot Password?</a>' },
  @{ Name = "register"; Title = "Register"; FormId = "registerForm"; Extra = '<a href="login.html">Already have an account?</a>' },
  @{ Name = "forgot-password"; Title = "Forgot Password"; FormId = "forgotPasswordForm"; Extra = '<a href="login.html">Back to login</a>' },
  @{ Name = "reset-password"; Title = "Reset Password"; FormId = "resetPasswordForm"; Extra = '<a href="login.html">Return to login</a>' }
)

foreach ($page in $authPages) {
  Write-File (Join-Path $root "client/modules/auth/$($page.Name).html") @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$($page.Title) - Smart Enterprise</title>
    <link rel="stylesheet" href="../../assets/css/variables.css" />
    <link rel="stylesheet" href="../../assets/css/global.css" />
    <link rel="stylesheet" href="../../assets/css/forms.css" />
</head>
<body>
    <div class="auth-container">
        <div class="auth-card">
            <h1>$($page.Title)</h1>
            <p>Secure access for the Smart Enterprise Platform.</p>
            <form id="$($page.FormId)">
                <div class="form-group">
                    <label>Email</label>
                    <input id="email" type="email" placeholder="Enter your email" required />
                </div>
                <div class="form-group" id="nameWrap" style="display:none;">
                    <label>Full Name</label>
                    <input id="name" type="text" placeholder="Enter your full name" />
                </div>
                <div class="form-group" id="passwordWrap">
                    <label>Password</label>
                    <input id="password" type="password" placeholder="Enter your password" />
                </div>
                <div class="form-group" id="confirmPasswordWrap" style="display:none;">
                    <label>Confirm Password</label>
                    <input id="confirmPassword" type="password" placeholder="Confirm password" />
                </div>
                <button class="btn btn-primary btn-full" type="submit">$($page.Title)</button>
            </form>
            <div class="auth-links">$($page.Extra)</div>
        </div>
    </div>
    <script>
      if (location.pathname.includes("register")) {
        document.getElementById("confirmPasswordWrap").style.display = "block";
        document.getElementById("nameWrap").style.display = "block";
      }
      if (location.pathname.includes("reset-password")) {
        document.getElementById("confirmPasswordWrap").style.display = "block";
      }
      if (location.pathname.includes("forgot-password")) {
        document.getElementById("passwordWrap").style.display = "none";
      }
    </script>
    <script src="../../assets/js/api.js"></script>
    <script src="../../assets/js/auth.js"></script>
</body>
</html>
"@
  Write-File (Join-Path $root "client/modules/auth/$($page.Name).css") "/* Module-specific auth styles can extend shared auth UI here. */"
  Write-File (Join-Path $root "client/modules/auth/$($page.Name).js") "// Auth logic uses shared assets/js/auth.js for now."
}

function New-ModulePage([string]$baseDir, [string]$pageName, [string]$title, [string]$description, [bool]$needsSidebar) {
  Ensure-Dir $baseDir
  $relativePrefix = "../../../"
  $layoutStart = if ($needsSidebar) {
@"
    <div id="navbar"></div>
    <div class="generated-layout">
        <div id="sidebar"></div>
        <main class="generated-page">
"@
  }
  else {
@"
    <div id="navbar"></div>
    <main class="generated-page standalone-page">
"@
  }

  $layoutEnd = if ($needsSidebar) { "        </main>`n    </div>" } else { "    </main>" }
  $script = if ($needsSidebar) {
@"
const moduleConfig = {
  title: "$title",
  description: "$description",
};

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireAuth === "function") {
    requireAuth();
  }

  await loadComponent("navbar", "${relativePrefix}components/navbar.html");
  await loadComponent("sidebar", "${relativePrefix}components/sidebar.html");
  renderModuleShell();
});

function renderModuleShell() {
  const now = new Date().toLocaleString("en-IN");
  document.getElementById("moduleTitle").textContent = moduleConfig.title;
  document.getElementById("moduleDescription").textContent = moduleConfig.description;
  document.getElementById("moduleTimestamp").textContent = now;
}

async function loadComponent(elementId, filePath) {
  const response = await fetch(filePath);
  const html = await response.text();
  document.getElementById(elementId).innerHTML = html;
}
"@
  }
  else {
@"
document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("navbar", "${relativePrefix}components/navbar.html");
  document.getElementById("moduleTimestamp").textContent = new Date().toLocaleString("en-IN");
});

async function loadComponent(elementId, filePath) {
  const response = await fetch(filePath);
  const html = await response.text();
  document.getElementById(elementId).innerHTML = html;
}
"@
  }

  Write-File (Join-Path $baseDir "$pageName.html") @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$title</title>
    <link rel="stylesheet" href="${relativePrefix}assets/css/variables.css" />
    <link rel="stylesheet" href="${relativePrefix}assets/css/global.css" />
    <link rel="stylesheet" href="${relativePrefix}assets/css/forms.css" />
    <link rel="stylesheet" href="${relativePrefix}assets/css/components.css" />
    <link rel="stylesheet" href="${relativePrefix}assets/css/responsive.css" />
    <link rel="stylesheet" href="$pageName.css" />
</head>
<body>
$layoutStart
            <section class="module-hero component-card">
                <div>
                    <p class="section-eyebrow">Enterprise Module</p>
                    <h1 id="moduleTitle">$title</h1>
                    <p id="moduleDescription">$description</p>
                </div>
                <span class="module-badge">Updated <span id="moduleTimestamp">--</span></span>
            </section>

            <section class="module-grid">
                <article class="component-card module-card">
                    <h2>Flow Ready</h2>
                    <p>This page now follows the shared professional layout and is ready for API wiring.</p>
                </article>
                <article class="component-card module-card">
                    <h2>Next Integration</h2>
                    <p>Connect forms, tables, charts and role-specific business logic in this module.</p>
                </article>
            </section>
$layoutEnd
    <script src="${relativePrefix}assets/js/api.js"></script>
    <script src="${relativePrefix}assets/js/auth.js"></script>
    <script src="${relativePrefix}assets/js/sidebar.js"></script>
    <script src="$pageName.js"></script>
</body>
</html>
"@

  Write-File (Join-Path $baseDir "$pageName.css") @'
.generated-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.generated-page {
  padding: 24px;
  display: grid;
  gap: 24px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef5ff 100%);
}

.standalone-page {
  max-width: 1200px;
  margin: 0 auto;
}

.module-hero,
.module-card {
  padding: 24px;
}

.module-hero {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 20px;
}

.module-hero h1,
.module-hero p,
.module-card h2,
.module-card p {
  margin: 0;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.module-badge {
  padding: 10px 14px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}
'@

  Write-File (Join-Path $baseDir "$pageName.js") $script
}

$clientModules = @(
  @{ Dir = "client/modules/admin/crm"; Page = "crm"; Title = "Admin CRM"; Desc = "Lead monitoring, assignment, conversion visibility and pipeline governance."; Sidebar = $true },
  @{ Dir = "client/modules/manager/tasks"; Page = "tasks"; Title = "Manager Tasks"; Desc = "Track team workloads, assignments, blockers and task delivery."; Sidebar = $true },
  @{ Dir = "client/modules/manager/reports"; Page = "reports"; Title = "Manager Reports"; Desc = "Generate delivery, utilization and team performance reports."; Sidebar = $true },
  @{ Dir = "client/modules/team-lead/dashboard"; Page = "dashboard"; Title = "Team Lead Dashboard"; Desc = "Lead task planning, reviews, approvals and team coordination."; Sidebar = $true },
  @{ Dir = "client/modules/team-lead/task-planning"; Page = "task-planning"; Title = "Task Planning"; Desc = "Break projects into tasks, dependencies, proof requirements and deadlines."; Sidebar = $true },
  @{ Dir = "client/modules/team-lead/approvals"; Page = "approvals"; Title = "Team Lead Approvals"; Desc = "Review member submissions and approve or reject work items."; Sidebar = $true },
  @{ Dir = "client/modules/team-lead/team-chat"; Page = "team-chat"; Title = "Team Chat"; Desc = "Collaborate with managers, members and stakeholders in one place."; Sidebar = $true },
  @{ Dir = "client/modules/team-lead/profile"; Page = "profile"; Title = "Team Lead Profile"; Desc = "Manage profile, productivity, documents and role settings."; Sidebar = $true },
  @{ Dir = "client/modules/team-lead/settings"; Page = "settings"; Title = "Team Lead Settings"; Desc = "Control notifications, security, privacy and preferences."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/dashboard"; Page = "dashboard"; Title = "Team Member Dashboard"; Desc = "Review today's tasks, progress, attendance and notifications."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/my-tasks"; Page = "my-tasks"; Title = "My Tasks"; Desc = "Work on assigned tasks with proof uploads and progress tracking."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/daily-updates"; Page = "daily-updates"; Title = "Daily Updates"; Desc = "Submit work summary, hours and completion percentage."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/attendance"; Page = "attendance"; Title = "Attendance"; Desc = "Track check-in, check-out, breaks and total productive hours."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/expenses"; Page = "expenses"; Title = "Expenses"; Desc = "Submit and track expense reimbursement requests."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/profile"; Page = "profile"; Title = "Team Member Profile"; Desc = "Manage personal profile, performance records and documents."; Sidebar = $true },
  @{ Dir = "client/modules/team-member/settings"; Page = "settings"; Title = "Team Member Settings"; Desc = "Manage account preferences, privacy and active sessions."; Sidebar = $true },
  @{ Dir = "client/modules/marketing/dashboard"; Page = "dashboard"; Title = "Marketing Dashboard"; Desc = "Campaign performance, leads, CPL, ROI and execution visibility."; Sidebar = $true },
  @{ Dir = "client/modules/marketing/campaigns"; Page = "campaigns"; Title = "Campaigns"; Desc = "Plan and track digital campaigns, creatives and spend."; Sidebar = $true },
  @{ Dir = "client/modules/marketing/roi"; Page = "roi"; Title = "Marketing ROI"; Desc = "Compare spend, leads, conversions and revenue impact."; Sidebar = $true },
  @{ Dir = "client/modules/marketing/reports"; Page = "reports"; Title = "Marketing Reports"; Desc = "Generate performance summaries for stakeholders and admin."; Sidebar = $true },
  @{ Dir = "client/modules/sales/dashboard"; Page = "dashboard"; Title = "Sales Dashboard"; Desc = "View calling activity, follow-ups, conversion and closed revenue."; Sidebar = $true },
  @{ Dir = "client/modules/sales/calling"; Page = "calling"; Title = "Calling Management"; Desc = "Manage outreach queues, call logs and next follow-up actions."; Sidebar = $true },
  @{ Dir = "client/modules/sales/conversions"; Page = "conversions"; Title = "Sales Conversions"; Desc = "Track pipeline stages from contacted to converted or lost."; Sidebar = $true },
  @{ Dir = "client/modules/sales/leaderboard"; Page = "leaderboard"; Title = "Sales Leaderboard"; Desc = "Benchmark team productivity, closures and response quality."; Sidebar = $true },
  @{ Dir = "client/modules/collaboration/chat"; Page = "chat"; Title = "Collaboration Chat"; Desc = "Private and group chat with shared documents and history."; Sidebar = $true },
  @{ Dir = "client/modules/collaboration/meetings"; Page = "meetings"; Title = "Meetings"; Desc = "Schedule voice and video meetings with agendas and recordings."; Sidebar = $true },
  @{ Dir = "client/modules/collaboration/calls"; Page = "calls"; Title = "Calls"; Desc = "Voice call coordination and communication logs across teams."; Sidebar = $true },
  @{ Dir = "client/modules/notifications"; Page = "notifications"; Title = "Notifications"; Desc = "Unified notification inbox for alerts, reminders and approvals."; Sidebar = $false },
  @{ Dir = "client/modules/calendar"; Page = "calendar"; Title = "Enterprise Calendar"; Desc = "Manage deadlines, meetings, leave and recurring schedules."; Sidebar = $false },
  @{ Dir = "client/modules/leave"; Page = "leave"; Title = "Leave Management"; Desc = "Apply, review and monitor leave balances and approvals."; Sidebar = $false },
  @{ Dir = "client/modules/timesheets"; Page = "timesheets"; Title = "Timesheets"; Desc = "Track logged hours by project, task and employee."; Sidebar = $false },
  @{ Dir = "client/modules/expenses"; Page = "expenses"; Title = "Expense Management"; Desc = "Track submitted, approved and reimbursed expenses."; Sidebar = $false }
)

foreach ($module in $clientModules) {
  $pagePath = Join-Path $root "$($module.Dir)/$($module.Page).html"
  if (-not (Test-Path $pagePath)) {
    New-ModulePage -baseDir (Join-Path $root $module.Dir) -pageName $module.Page -title $module.Title -description $module.Desc -needsSidebar $module.Sidebar
  }
}

if (-not (Test-Path (Join-Path $root "client/modules/admin/quotations/quotation.html"))) {
  Write-File (Join-Path $root "client/modules/admin/quotations/quotation.html") "<script>window.location.href='quotations.html';</script>"
  Write-File (Join-Path $root "client/modules/admin/quotations/quotation.css") "/* Redirect helper file kept for requested structure compatibility. */"
  Write-File (Join-Path $root "client/modules/admin/quotations/quotation.js") "window.location.href='quotations.html';"
}

Write-File (Join-Path $root "client/README.md") @'
# Client Structure

This client contains role-based modules for admin, manager, team lead, team member, marketing, sales, collaboration and client-facing workflows.

Each module follows the `page.html`, `page.css`, `page.js` convention and consumes shared utilities from `client/assets`.
'@

Write-File (Join-Path $root "README.md") @'
# Smart Enterprise Platform

Production-oriented scaffold for an AI-powered enterprise platform that combines project management, CRM, HRMS, quotations, collaboration, analytics and client portal workflows.

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js, MongoDB, Mongoose
- Auth: JWT + role-based access control
- Integrations: Cloudinary, Nodemailer, Socket.IO

## Structure
- `client/`: role-based frontend modules and shared components
- `server/`: Express app, routes, controllers, models, services and utilities

## Run
1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Start server with `npm run dev`
'@

$backendFiles = @{
  "server/config/constants.js" = @'
module.exports = {
  ROLES: {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    TEAM_LEAD: "TEAM_LEAD",
    MEMBER: "MEMBER",
    CLIENT: "CLIENT",
  },
  TASK_STATUSES: [
    "Draft",
    "Assigned",
    "Accepted",
    "In Progress",
    "Paused",
    "Submitted for Review",
    "Approved",
    "Rejected",
    "Completed",
    "Archived",
  ],
};
'@
  "server/config/db.js" = @'
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart-enterprise-platform";
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = connectDB;
'@
  "server/config/cloudinary.js" = @'
function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  };
}

module.exports = { getCloudinaryConfig };
'@
  "server/config/nodemailer.js" = @'
function getMailTransportConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  };
}

module.exports = { getMailTransportConfig };
'@
  "server/config/multer.js" = @'
function getUploadConfig() {
  return {
    limits: { fileSize: 10 * 1024 * 1024 },
  };
}

module.exports = { getUploadConfig };
'@
  "server/config/socket.js" = @'
function initializeSocket(io) {
  io.on("connection", (socket) => {
    socket.emit("connected", { message: "Realtime channel ready" });
  });
}

module.exports = initializeSocket;
'@
  "server/utils/generateToken.js" = @'
const jwt = require("jsonwebtoken");

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

module.exports = generateToken;
'@
  "server/utils/generateOTP.js" = @'
function generateOTP(length = 6) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

module.exports = generateOTP;
'@
  "server/utils/formatDate.js" = @'
function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
}

module.exports = formatDate;
'@
  "server/utils/calculateAttendance.js" = @'
function calculateAttendance(presentDays = 0, totalDays = 0) {
  if (!totalDays) return 0;
  return Math.round((presentDays / totalDays) * 100);
}

module.exports = calculateAttendance;
'@
  "server/utils/calculateProductivity.js" = @'
function calculateProductivity(completedTasks = 0, plannedTasks = 0) {
  if (!plannedTasks) return 0;
  return Math.round((completedTasks / plannedTasks) * 100);
}

module.exports = calculateProductivity;
'@
  "server/utils/calculateROI.js" = @'
function calculateROI(revenue = 0, spend = 0) {
  if (!spend) return 0;
  return Number((((revenue - spend) / spend) * 100).toFixed(2));
}

module.exports = calculateROI;
'@
  "server/utils/logger.js" = @'
function logger(message, meta = {}) {
  console.log(`[Enterprise] ${message}`, meta);
}

module.exports = logger;
'@
  "server/utils/permissions.js" = @'
function hasPermission(userRole, allowedRoles = []) {
  return allowedRoles.includes(userRole);
}

module.exports = { hasPermission };
'@
  "server/utils/createResourceModel.js" = @'
const mongoose = require("mongoose");

function createResourceModel(modelName) {
  const schema = new mongoose.Schema(
    {
      title: { type: String, trim: true },
      name: { type: String, trim: true },
      status: { type: String, default: "ACTIVE" },
      description: { type: String, trim: true },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      owner: { type: String, trim: true },
      createdByRole: { type: String, trim: true },
    },
    { timestamps: true },
  );

  return mongoose.models[modelName] || mongoose.model(modelName, schema);
}

module.exports = createResourceModel;
'@
  "server/utils/createCrudController.js" = @'
function createCrudController(resourceName) {
  return {
    list: async (req, res) => {
      res.json({ success: true, resource: resourceName, data: [] });
    },
    getById: async (req, res) => {
      res.json({ success: true, resource: resourceName, data: { id: req.params.id } });
    },
    create: async (req, res) => {
      res.status(201).json({ success: true, resource: resourceName, message: `${resourceName} created`, data: req.body });
    },
    update: async (req, res) => {
      res.json({ success: true, resource: resourceName, message: `${resourceName} updated`, data: { id: req.params.id, ...req.body } });
    },
    remove: async (req, res) => {
      res.json({ success: true, resource: resourceName, message: `${resourceName} deleted`, id: req.params.id });
    },
  };
}

module.exports = createCrudController;
'@
  "server/utils/createCrudRouter.js" = @'
const express = require("express");

function createCrudRouter(controller) {
  const router = express.Router();
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}

module.exports = createCrudRouter;
'@
  "server/middleware/authMiddleware.js" = @'
function authMiddleware(req, res, next) {
  req.user = { role: "ADMIN", id: "demo-user" };
  next();
}

module.exports = authMiddleware;
'@
  "server/middleware/roleMiddleware.js" = @'
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = roleMiddleware;
'@
  "server/middleware/errorMiddleware.js" = @'
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: error.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  });
}

module.exports = { notFound, errorHandler };
'@
  "server/middleware/rateLimitMiddleware.js" = "module.exports = (req, res, next) => next();"
  "server/middleware/uploadMiddleware.js" = "module.exports = (req, res, next) => next();"
  "server/middleware/validationMiddleware.js" = "module.exports = (req, res, next) => next();"
  "server/middleware/auditMiddleware.js" = "module.exports = (req, res, next) => next();"
  "server/services/emailService.js" = "async function sendEmail(payload) { return { delivered: false, payload }; }`nmodule.exports = { sendEmail };"
  "server/services/smsService.js" = "async function sendSMS(payload) { return { delivered: false, payload }; }`nmodule.exports = { sendSMS };"
  "server/services/cloudinaryService.js" = "async function uploadToCloudinary(file) { return { url: '', file }; }`nmodule.exports = { uploadToCloudinary };"
  "server/services/notificationService.js" = "async function createNotification(payload) { return { queued: true, payload }; }`nmodule.exports = { createNotification };"
  "server/services/reportService.js" = "async function buildReport(payload) { return { ready: true, payload }; }`nmodule.exports = { buildReport };"
  "server/services/calendarService.js" = "async function syncCalendar(payload) { return { synced: false, payload }; }`nmodule.exports = { syncCalendar };"
  "server/services/backupService.js" = "async function runBackup() { return { completed: false }; }`nmodule.exports = { runBackup };"
  "server/services/aiService.js" = "async function generateInsights(payload) { return { summary: 'AI insights placeholder', payload }; }`nmodule.exports = { generateInsights };"
  "server/services/fileService.js" = "async function storeFile(payload) { return { stored: true, payload }; }`nmodule.exports = { storeFile };"
  "server/services/payrollService.js" = "async function processPayroll(payload) { return { processed: false, payload }; }`nmodule.exports = { processPayroll };"
  "server/services/taskAssignmentService.js" = "async function assignTask(payload) { return { assigned: true, payload }; }`nmodule.exports = { assignTask };"
}
$backendFiles.GetEnumerator() | ForEach-Object { Write-File (Join-Path $root $_.Key) $_.Value }

$modelNames = @("User", "Profile", "Project", "Task", "TaskComment", "Settings", "Quotation", "Notification", "Message", "Meeting", "Leave", "Lead", "File", "Expense", "Department", "DailyUpdate", "CommunicationLog", "Client", "ChatRoom", "CalendarEvent", "AuditLog", "Attendance", "AIInsight", "Timesheet")
foreach ($model in $modelNames) {
  Write-File (Join-Path $root "server/models/$model.js") @"
const createResourceModel = require("../utils/createResourceModel");

module.exports = createResourceModel("$model");
"@
}

$controllerMap = @{
  "authController" = "auth"
  "userController" = "users"
  "taskController" = "tasks"
  "projectController" = "projects"
  "leadController" = "leads"
  "quotationController" = "quotations"
  "profileController" = "profile"
  "settingsController" = "settings"
  "departmentController" = "departments"
  "analyticsController" = "analytics"
  "auditLogController" = "audit-logs"
  "attendanceController" = "attendance"
  "dailyUpdateController" = "daily-updates"
  "notificationController" = "notifications"
  "meetingController" = "meetings"
  "expenseController" = "expenses"
  "leaveController" = "leave"
  "timesheetController" = "timesheets"
  "chatController" = "chat"
  "clientPortalController" = "client-portal"
  "uploadController" = "uploads"
  "aiController" = "ai"
}
foreach ($entry in $controllerMap.GetEnumerator()) {
  Write-File (Join-Path $root "server/controllers/$($entry.Key).js") @"
const createCrudController = require("../utils/createCrudController");

module.exports = createCrudController("$($entry.Value)");
"@
}

$routeMap = @{
  "authRoutes" = "authController"
  "userRoutes" = "userController"
  "projectRoutes" = "projectController"
  "taskRoutes" = "taskController"
  "leadRoutes" = "leadController"
  "quotationRoutes" = "quotationController"
  "profileRoutes" = "profileController"
  "settingsRoutes" = "settingsController"
  "departmentRoutes" = "departmentController"
  "analyticsRoutes" = "analyticsController"
  "auditLogRoutes" = "auditLogController"
  "attendanceRoutes" = "attendanceController"
  "dailyUpdateRoutes" = "dailyUpdateController"
  "notificationRoutes" = "notificationController"
  "meetingRoutes" = "meetingController"
  "expenseRoutes" = "expenseController"
  "leaveRoutes" = "leaveController"
  "timesheetRoutes" = "timesheetController"
  "chatRoutes" = "chatController"
  "clientPortalRoutes" = "clientPortalController"
  "uploadRoutes" = "uploadController"
  "aiRoutes" = "aiController"
}
foreach ($entry in $routeMap.GetEnumerator()) {
  Write-File (Join-Path $root "server/routes/$($entry.Key).js") @"
const createCrudRouter = require("../utils/createCrudRouter");
const controller = require("../controllers/$($entry.Value)");

module.exports = createCrudRouter(controller);
"@
}

Write-File (Join-Path $root "server/app.js") @'
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Smart Enterprise API healthy" });
});

const routeTable = [
  ["/api/auth", "./routes/authRoutes"],
  ["/api/users", "./routes/userRoutes"],
  ["/api/projects", "./routes/projectRoutes"],
  ["/api/tasks", "./routes/taskRoutes"],
  ["/api/leads", "./routes/leadRoutes"],
  ["/api/quotations", "./routes/quotationRoutes"],
  ["/api/profile", "./routes/profileRoutes"],
  ["/api/settings", "./routes/settingsRoutes"],
  ["/api/departments", "./routes/departmentRoutes"],
  ["/api/analytics", "./routes/analyticsRoutes"],
  ["/api/audit-logs", "./routes/auditLogRoutes"],
  ["/api/attendance", "./routes/attendanceRoutes"],
  ["/api/daily-updates", "./routes/dailyUpdateRoutes"],
  ["/api/notifications", "./routes/notificationRoutes"],
  ["/api/meetings", "./routes/meetingRoutes"],
  ["/api/expenses", "./routes/expenseRoutes"],
  ["/api/leave", "./routes/leaveRoutes"],
  ["/api/timesheets", "./routes/timesheetRoutes"],
  ["/api/chat", "./routes/chatRoutes"],
  ["/api/client-portal", "./routes/clientPortalRoutes"],
  ["/api/uploads", "./routes/uploadRoutes"],
  ["/api/ai", "./routes/aiRoutes"]
];

routeTable.forEach(([path, modulePath]) => {
  app.use(path, require(modulePath));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
'@

Write-File (Join-Path $root "server/server.js") @'
require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await connectDB();
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Smart Enterprise server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
'@
