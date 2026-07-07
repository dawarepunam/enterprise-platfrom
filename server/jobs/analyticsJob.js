const Project = require("../models/Project");
const Task = require("../models/Task");
const Lead = require("../models/Lead");

async function runAnalyticsJob() {
  const [projects, tasks, leads] = await Promise.all([
    Project.countDocuments(),
    Task.countDocuments(),
    Lead.countDocuments(),
  ]);

  return {
    job: "analytics",
    generatedAt: new Date(),
    summary: { projects, tasks, leads },
  };
}

module.exports = runAnalyticsJob;
