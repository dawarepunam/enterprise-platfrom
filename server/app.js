const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const path = require("path");

// Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve static frontend client
app.use(express.static(path.join(__dirname, "../client")));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/subtasks", require("./routes/subtaskRoutes"));
app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/task-updates", require("./routes/taskUpdateRoutes"));
app.use("/api/leads", require("./routes/leadRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));
app.use("/api/sales", require("./routes/salesDealRoutes"));
app.use("/api/quotations", require("./routes/quotationRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/timesheets", require("./routes/timesheetRoutes"));
app.use("/api/daily-updates", require("./routes/dailyUpdateRoutes"));
app.use("/api/meetings", require("./routes/meetingRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));

app.use("/api/performance", require("./routes/performanceRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/payroll", require("./routes/payrollRoutes"));
app.use("/api/salary-structure", require("./routes/salaryStructureRoutes"));
app.use("/api/payslips", require("./routes/payslipRoutes"));
app.use("/api/claims-benefits", require("./routes/claimsAndBenefitsRoutes"));
app.use("/api/recruitment", require("./routes/recruitmentRoutes"));
app.use("/api/lifecycle", require("./routes/lifecycleRoutes"));

app.use("/api/manager", require("./routes/managerRoutes"));
app.use("/api/gantt", require("./routes/ganttRoutes"));
app.use("/api/task-comments", require("./routes/taskCommentRoutes"));
app.use("/api/channels", require("./routes/channelRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));
app.use("/api/hr", require("./routes/hrRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/settings", require("./routes/userSettingsRoutes"));
app.use("/api/hr/proerp", require("./modules/hr/proerp/proerpRoutes"));
// Basic health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running" });
});

const fs = require('fs');

// Dynamic frontend mapping for admin modules
app.get("/admin/:module", (req, res, next) => {
  let mod = req.params.module;
  if (mod === 'leaves') mod = 'leave';
  if (mod === 'clients') mod = 'crm';
  const filePath = path.join(__dirname, `../client/modules/admin/${mod}/${mod}.html`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// Admin detail pages
app.get(["/admin/departments/:id/edit", "/departments/:id/edit"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/departments/dept-edit.html"));
});

app.get("/admin/departments/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/departments/department-detail.html"));
});

app.get("/admin/projects/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/projects/project-detail.html"));
});

app.get("/admin/project-managers/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/project-managers/pm-detail.html"));
});

app.get(["/admin/users/:id", "/admin/clients/:id"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/users/user-profile.html"));
});

// Dynamic frontend mapping for project manager modules
app.get("/project-manager/:module", (req, res, next) => {
  const mod = req.params.module;
  const fp1 = path.join(__dirname, `../client/modules/project-manager/${mod}/index.html`);
  if (fs.existsSync(fp1)) return res.sendFile(fp1);
  const fp2 = path.join(__dirname, `../client/modules/project-manager/${mod}/${mod}.html`);
  if (fs.existsSync(fp2)) return res.sendFile(fp2);
  next();
});

// PM Module Detail Pages
app.get(["/project-manager/projects/:id"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/project-manager/project-detail/index.html"));
});

app.get(["/project-manager/tasks/:id"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/project-manager/task-detail/index.html"));
});

app.get(["/project-manager/teams/:id"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/project-manager/team-detail/index.html"));
});

// HR dashboard redirect (login lands here via redirectByRole)
app.get(["/dashboard/hr", "/dashboard/HR"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/hr/dashboard.html"));
});

// Dynamic mapping for role dashboards
app.get("/dashboard/:role", (req, res, next) => {
  const role = req.params.role;
  const fp = path.join(__dirname, `../client/modules/${role}/dashboard/dashboard.html`);
  if (fs.existsSync(fp)) return res.sendFile(fp);
  const fp2 = path.join(__dirname, `../client/modules/${role}/dashboard.html`);
  if (fs.existsSync(fp2)) return res.sendFile(fp2);
  next();
});

// Login / Register pages
app.get(['/login', '/auth/login'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/login.html'));
});
app.get(['/register', '/auth/register'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/register.html'));
});
app.get(['/forgot-password', '/auth/forgot-password'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/forgot-password.html'));
});
app.get(['/verify-otp', '/auth/verify-otp'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/verify-otp.html'));
});
app.get(['/reset-password', '/auth/reset-password'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/reset-password.html'));
});

// Dynamic route for NEW HR Module (Replacing legacy modules/hr)
app.get("/hr/:page", (req, res, next) => {
  let page = req.params.page;
  if (!page.endsWith('.html')) page += '.html';
  const fp = path.join(__dirname, `../client/hr/${page}`);
  if (fs.existsSync(fp)) return res.sendFile(fp);
  next();
});

app.get(["/hr", "/hr/"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/hr/dashboard.html"));
});

// Dynamic mapping for employee modules
app.get("/employee/daily-updates/detail", (req, res) => {
  const fp = path.join(__dirname, "../client/modules/employee/daily-updates/detail.html");
  if (fs.existsSync(fp)) return res.sendFile(fp);
  res.sendFile(path.join(__dirname, "../client/modules/employee/daily-updates/index.html"));
});

app.get("/employee/:module", (req, res, next) => {
  const mod = req.params.module;
  const fp1 = path.join(__dirname, `../client/modules/employee/${mod}/index.html`);
  if (fs.existsSync(fp1)) return res.sendFile(fp1);
  const fp2 = path.join(__dirname, `../client/modules/employee/${mod}/${mod}.html`);
  if (fs.existsSync(fp2)) return res.sendFile(fp2);
  next();
});

// Employee dashboard
app.get(["/employee", "/employee/"], (req, res) => {
  const fp = path.join(__dirname, "../client/modules/employee/dashboard/index.html");
  if (fs.existsSync(fp)) return res.sendFile(fp);
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Global SPA Catch-all
app.get(/^.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Error handling middleware
app.use(require("./middlewares/errorHandler"));

module.exports = app;
