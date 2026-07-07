const User = require("../models/User");
const Department = require("../models/Department");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const Quotation = require("../models/Quotation");
const Team = require("../models/Team");
const Subtask = require("../models/Subtask");
const TaskUpdate = require("../models/TaskUpdate");
const Campaign = require("../models/Campaign");
const SalesDeal = require("../models/SalesDeal");

async function getOverview(req, res) {
  const [users, departments, projects, tasks, leads, quotations, teams, subtasks, taskUpdates, campaigns, salesDeals] =
    await Promise.all([
      User.find().sort({ createdAt: -1 }).lean(),
      Department.find().sort({ createdAt: -1 }).lean(),
      Project.find().sort({ createdAt: -1 }).lean(),
      Task.find().sort({ createdAt: -1 }).lean(),
      Lead.find().sort({ createdAt: -1 }).lean(),
      Quotation.find().sort({ createdAt: -1 }).lean(),
      Team.find().sort({ createdAt: -1 }).lean(),
      Subtask.find().sort({ createdAt: -1 }).lean(),
      TaskUpdate.find().sort({ createdAt: -1 }).lean(),
      Campaign.find().sort({ createdAt: -1 }).lean(),
      SalesDeal.find().sort({ createdAt: -1 }).lean(),
    ]);

  const revenue = salesDeals.reduce((sum, item) => sum + Number(item.closedValue || 0), 0);
  const projectedPipeline = leads.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const activeProjects = projects.filter((item) => item.status === "Active").length;
  const delayedTasks = tasks.filter((item) => ["Pending", "On Hold", "Rejected"].includes(item.status)).length;

  res.json({
    success: true,
    data: {
      summary: {
        totalUsers: users.length,
        totalDepartments: departments.length,
        totalProjects: projects.length,
        activeProjects,
        totalTasks: tasks.length,
        delayedTasks,
        totalLeads: leads.length,
        totalCampaigns: campaigns.length,
        totalSalesDeals: salesDeals.length,
        totalTeams: teams.length,
        totalSubtasks: subtasks.length,
        totalTaskUpdates: taskUpdates.length,
        pendingQuotations: quotations.filter((item) => item.status === "Pending").length,
        revenue,
        projectedPipeline,
      },
      flow: [
        {
          role: "ADMIN",
          responsibility: "Creates departments, users, projects and governance settings.",
          handoff: "Project and ownership move to the manager.",
        },
        {
          role: "MANAGER",
          responsibility: "Breaks projects into tasks, creates teams and distributes work.",
          handoff: "Execution planning moves to the team lead.",
        },
        {
          role: "TEAM_LEAD",
          responsibility: "Converts tasks into subtasks, assigns members and reviews submissions.",
          handoff: "Implementation work moves to team members.",
        },
        {
          role: "MEMBER",
          responsibility: "Executes tasks, uploads work, and submits progress updates.",
          handoff: "Work returns to the lead and manager for review.",
        },
        {
          role: "MARKETING",
          responsibility: "Runs campaigns and generates qualified leads.",
          handoff: "Leads move to the sales pipeline.",
        },
        {
          role: "SALES",
          responsibility: "Manages calling, negotiation, quotation and conversion.",
          handoff: "Converted work and approvals move to the client.",
        },
        {
          role: "CLIENT",
          responsibility: "Tracks project progress and approves quotations or deliverables.",
          handoff: "Status returns to admin analytics and delivery reporting.",
        },
      ],
      collections: {
        users,
        departments,
        projects,
        tasks,
        leads,
        quotations,
        teams,
        subtasks,
        taskUpdates,
        campaigns,
        salesDeals,
      },
    },
  });
}

function getCapabilities(req, res) {
  res.json({
    success: true,
    data: {
      status: "PARTIALLY_COMPLETE",
      implemented: [
        "Authentication with JWT and password hashing",
        "Role-based access for admin, manager, team lead, member and client",
        "Project, task, subtask and daily update flows",
        "Departments, teams and user management",
        "Attendance, leave, timesheets and expenses APIs",
        "Lead, campaign, sales and quotation APIs",
        "Client portal APIs",
        "Real-time team chat, meeting signals and call logs",
        "Notifications, analytics, audit logs and AI insight resources",
        "File uploads and email template infrastructure",
      ],
      addedInThisPass: [
        "Marketing, sales and HR roles enabled in the core auth model",
        "Password reset token flow with email preview support",
        "Device tracking metadata on login",
        "Notification persistence in MongoDB plus realtime emit",
        "Capability endpoint for feature-gap verification",
      ],
      partialOrPending: [
        "Two-factor authentication is modeled as a toggle but challenge verification is not implemented yet",
        "Voice and video use socket signaling and logging, but full media orchestration depends on frontend WebRTC flows",
        "Advanced session management and device revocation UI are not implemented yet",
        "Push notifications, backup automation destinations and cloud storage hardening need deployment-specific setup",
        "Dedicated HR and marketing frontend workspaces are not yet separated like admin or manager modules",
      ],
    },
  });
}

module.exports = { getOverview, getCapabilities };
