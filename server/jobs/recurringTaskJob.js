const Task = require("../models/Task");

async function runRecurringTaskJob() {
  const recurringCandidates = await Task.find({
    status: "Completed",
  })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  return {
    job: "recurring-tasks",
    executedAt: new Date(),
    candidates: recurringCandidates.map((task) => ({
      taskId: task._id,
      title: task.title,
      projectName: task.projectName,
    })),
  };
}

module.exports = runRecurringTaskJob;
