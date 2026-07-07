function calculateProductivity(completedTasks = 0, plannedTasks = 0) {
  if (!plannedTasks) return 0;
  return Math.round((completedTasks / plannedTasks) * 100);
}

module.exports = calculateProductivity;
