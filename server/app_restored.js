const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const authProjectManager = require("./middleware/authProjectManager");
const authMiddleware = require("./middleware/authMiddleware");
const statusControl = require("./middleware/statusControl");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../client")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Smart Enterprise API healthy" });
});

const routeTable = [
  ["/api/auth", "./routes/authRoutes"],
  ["/api/users", "./routes/userRoutes"],
  ["/api/projects", "./routes/projectRoutes"],
  ["/api/manager", "./routes/managerRoutes"],
  ["/api/tasks", "./routes/taskRoutes"],
  ["/api/gantt", "./routes/ganttRoutes"],
  ["/api/task-comments", "./routes/taskCommentRoutes"],
  ["/api/subtasks", "./routes/subtaskRoutes"],
  ["/api/teams", "./routes/teamRoutes"],
  ["/api/channels", "./routes/channelRoutes"],
  ["/api/messages", "./routes/messageRoutes"],
  ["/api/files", "./routes/fileRoutes"],
  ["/api/hr", "./routes/hrRoutes"],
  ["/api/employees", "./routes/employeeRoutes"],
  ["/api/task-updates", "./routes/taskUpda
  
  if (validModules.includes(mod)) {
    return res.sendFile(path.join(__dirname, `../client/modules/admin/${mod}/${mod}.html`));
  }
  next();
});

// Department detail page
app.get(["/admin/departments/:id/edit", "/departments/:id/edit"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/departments/dept-edit.html"));
});

// Project detail page
app.get(["/admin/projects/:id", "/admin/projects/:id/*"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/projects/project-detail.html"));
});

// Project Manager detail page
app.get(["/admin/project-managers/:id", "/admin/project-managers/:id/*"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/project-managers/pm-detail.html"));
});

// User profile/detail page
app.get(["/admin/users/:id"], (req, res) => {
  res.sendFile(path.join(__dirname, "../client/modules/admin/users/user-profile.html"));
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

// app.use(notFound);
// app.use(errorHandler);

module.exports = app;
