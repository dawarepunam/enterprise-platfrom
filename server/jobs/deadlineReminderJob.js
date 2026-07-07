const Task = require("../models/Task");

async function runDeadlineReminderJob() {
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const tasks = await Task.find({
    deadline: { $lte: inThreeDays },
    status: { $nin: ["Completed", "Approved"] },
  }).lean();

  return {
    job: "deadline-reminders",
    executedAt: now,
    reminders: tasks.map((task) => ({
      taskId: task._id,
      title: task.title,
      assignee: task.assignee,
      deadline: task.deadline,
    })),
  };
}

module.exports = runDeadlineReminderJob;
