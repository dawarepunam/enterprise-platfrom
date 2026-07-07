const Task = require("../models/Task");
const User = require("../models/User");
const { dispatchWorkflow } = require("../services/workflowService");

const DEFAULT_INTERVAL_MS = Number(process.env.AUTOMATION_SWEEP_INTERVAL_MS || 60 * 60 * 1000);
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

async function processUpcomingTaskReminders(app) {
  const now = new Date();
  const threshold = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const tasks = await Task.find({
    deadline: { $gte: now, $lte: threshold },
    status: { $nin: ["Completed", "Approved", "Archived"] },
    $or: [{ lastReminderSentAt: null }, { lastReminderSentAt: { $lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } }],
  });

  const systemUser = await User.findOne({ email: (process.env.ADMIN_EMAIL || "").toLowerCase() });
  const req = { app, user: systemUser || { name: "Automation Bot", role: "SYSTEM" } };

  for (const task of tasks) {
    await dispatchWorkflow({
      req,
      module: "tasks",
      event: "TASK_DEADLINE_REMINDER",
      title: "Task deadline reminder",
      message: `${task.title} is due within the next 24 hours.`,
      priority: task.priority === "Critical" ? "high" : "medium",
      actionUrl: `/modules/teamlead/team-tasks/team-tasks.html?taskId=${task._id}`,
      entityType: "task",
      entityId: task._id,
      userRefs: [
        { userId: task.assigneeId },
        { email: task.assigneeEmail },
        { name: task.assignee },
        { userId: task.leadId },
        { email: task.leadEmail },
        { name: task.lead },
        { userId: task.managerId },
        { email: task.managerEmail },
        { name: task.manager },
      ],
      email: {
        subject: `Deadline reminder: ${task.title}`,
        template: "generic",
        variables: {
          title: "Task deadline reminder",
          taskTitle: task.title,
          projectName: task.projectName || "General Workspace",
          deadline: task.deadline ? new Date(task.deadline).toLocaleString() : "Not set",
          priority: task.priority,
          currentStatus: task.status,
          actionLabel: "Open Task",
        },
      },
      metadata: {
        projectName: task.projectName,
        taskTitle: task.title,
        taskStatus: task.status,
      },
    });

    task.lastReminderSentAt = now;
    await task.save();
  }
}

async function processOverdueTaskAlerts(app) {
  const now = new Date();
  const tasks = await Task.find({
    deadline: { $lt: now },
    status: { $nin: ["Completed", "Approved", "Archived"] },
    $or: [{ lastDelayAlertSentAt: null }, { lastDelayAlertSentAt: { $lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } }],
  });

  const systemUser = await User.findOne({ email: (process.env.ADMIN_EMAIL || "").toLowerCase() });
  const req = { app, user: systemUser || { name: "Automation Bot", role: "SYSTEM" } };

  for (const task of tasks) {
    await dispatchWorkflow({
      req,
      module: "tasks",
      event: "TASK_DELAY_ALERT",
      title: "Task delay alert",
      message: `${task.title} is overdue and needs immediate attention.`,
      priority: task.priority === "Critical" ? "high" : "medium",
      actionUrl: `/modules/teamlead/team-tasks/team-tasks.html?taskId=${task._id}`,
      entityType: "task",
      entityId: task._id,
      userRefs: [
        { userId: task.assigneeId },
        { email: task.assigneeEmail },
        { name: task.assignee },
        { userId: task.leadId },
        { email: task.leadEmail },
        { name: task.lead },
        { userId: task.managerId },
        { email: task.managerEmail },
        { name: task.manager },
        { role: "ADMIN" },
      ],
      email: {
        subject: `Delay alert: ${task.title}`,
        template: "generic",
        variables: {
          title: "Task delay alert",
          taskTitle: task.title,
          projectName: task.projectName || "General Workspace",
          deadline: task.deadline ? new Date(task.deadline).toLocaleString() : "Not set",
          priority: task.priority,
          currentStatus: task.status,
          actionLabel: "Review Task",
        },
      },
      metadata: {
        projectName: task.projectName,
        taskTitle: task.title,
        taskStatus: task.status,
      },
    });

    task.lastDelayAlertSentAt = now;
    await task.save();
  }
}

function startAutomationScheduler(app) {
  const runSweep = async () => {
    try {
      await processUpcomingTaskReminders(app);
      await processOverdueTaskAlerts(app);
    } catch (error) {
      console.error("Automation scheduler failed", error);
    }
  };

  runSweep();
  return setInterval(runSweep, DEFAULT_INTERVAL_MS);
}

module.exports = startAutomationScheduler;
