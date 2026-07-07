const backupService = require("../services/backupService");

async function runBackupJob() {
  const result = await backupService.runBackup();
  return {
    job: "backup",
    executedAt: new Date(),
    result,
  };
}

module.exports = runBackupJob;
