const createCrudController = require("../utils/createCrudController");
const Task = require("../models/Task");
const Project = require("../models/Project");

const baseController = createCrudController("analytics");

baseController.getPmDashboardAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({}).lean();
    const projects = await Project.find({}).lean();

    const taskDistribution = {
      TODO: tasks.filter(t => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter(t => t.status === "IN_PROGRESS").length,
      IN_REVIEW: tasks.filter(t => t.status === "IN_REVIEW").length,
      DONE: tasks.filter(t => t.status === "DONE").length,
    };

    const projectHealth = projects.map(p => ({
      name: p.projectName || p.name || 'Unknown',
      health: Math.floor(Math.random() * 40) + 60
    }));

    res.json({
      success: true,
      data: { taskDistribution, projectHealth }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error generating analytics" });
  }
};

baseController.getWorkloadAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find({}).lean();
    const workloadMap = {};

    tasks.forEach(task => {
      const assignee = task.assignee || task.employee || 'Unassigned';
      if (!workloadMap[assignee]) {
        workloadMap[assignee] = { name: assignee, activeTasks: 0, completedTasks: 0, hoursEstimated: 0 };
      }
      if (["DONE","Completed","Approved","Done"].includes(task.status)) {
        workloadMap[assignee].completedTasks += 1;
      } else {
        workloadMap[assignee].activeTasks += 1;
        workloadMap[assignee].hoursEstimated += Number(task.hoursEstimated || task.estimatedHours || 0);
      }
    });

    res.json({ success: true, data: Object.values(workloadMap) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error generating workload" });
  }
};

baseController.getEmployeeSummary = async (req, res) => {
  try {
    const Meeting = require("../models/Meeting");
    const Timesheet = require("../models/Timesheet");

    const userId = req.user ? req.user._id : null;
    const userName = req.user ? req.user.name : "Unassigned";

    const taskQuery = userId ? { $or: [{ assignee: userName }, { employee: userName }, { userId: userId }] } : {};
    const tasks = await Task.find(taskQuery).lean();

    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let tasksDueToday = 0, overdueTasks = 0;
    tasks.forEach(t => {
      if (t.status === "DONE" || !t.deadline) return;
      const deadline = new Date(t.deadline);
      if (deadline < today) overdueTasks++;
      else if (deadline >= today && deadline < tomorrow) tasksDueToday++;
    });

    const meetingsQuery = userId ? { attendees: { $regex: userName, $options: "i" } } : {};
    const meetings = await Meeting.find(meetingsQuery).lean();
    let meetingsToday = 0;
    meetings.forEach(m => {
      if (!m.date) return;
      const mDate = new Date(m.date);
      if (mDate >= today && mDate < tomorrow) meetingsToday++;
    });

    const timesheets = await Timesheet.find(userId ? { userId } : {}).lean();
    const hoursLogged = timesheets.reduce((acc, ts) => acc + (Number(ts.hours) || 0), 0);

    res.json({
      success: true,
      data: { tasksDueToday, overdueTasks, meetingsToday, hoursLogged, leaveBalance: 12, currentSprint: "Sprint 42" }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error generating employee summary" });
  }
};

// ── Comprehensive Performance Analytics ─────────────────────────────────────
baseController.getPerformanceAnalytics = async (req, res) => {
  try {
    const User = require("../models/User");

    const [projects, allTasks, users] = await Promise.all([
      Project.find({}).lean(),
      Task.find({}).lean(),
      User.find({ role: { $ne: "CLIENT" }, status: "ACTIVE" })
        .select("_id name role department designation")
        .lean()
    ]);

    const completedStatuses = ["Completed", "Approved", "Done"];

    // --- Project Performance ---
    const projectPerformance = projects.map(proj => {
      const projTasks = allTasks.filter(t =>
        String(t.projectId) === String(proj._id) ||
        t.projectName === (proj.projectName || proj.name)
      );
      const completedCount = projTasks.filter(t => completedStatuses.includes(t.status)).length;
      const total = projTasks.length;
      const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        _id: proj._id,
        name: proj.projectName || proj.name || "Unnamed Project",
        status: proj.status || "Active",
        totalTasks: total,
        completedTasks: completedCount,
        completionRate
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    // --- Employee Performance ---
    const employeePerformance = users.map(user => {
      const userTasks = allTasks.filter(t =>
        String(t.assigneeId) === String(user._id) ||
        (t.assignee && t.assignee.toLowerCase() === user.name.toLowerCase()) ||
        (t.assignees && t.assignees.some(a => String(a.userId) === String(user._id)))
      );

      const completedCount = userTasks.filter(t => completedStatuses.includes(t.status)).length;
      const inProgressCount = userTasks.filter(t =>
        ["In Progress","Active","Accepted","In Review","Submitted for Review"].includes(t.status)
      ).length;

      const efficiency = userTasks.length > 0
        ? Math.round((completedCount / userTasks.length) * 100)
        : 0;

      // Month-wise trend (last 6 months)
      const monthMap = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        monthMap[key] = 0;
      }
      userTasks.forEach(t => {
        if (!completedStatuses.includes(t.status)) return;
        const date = t.updatedAt || t.endDate || t.createdAt;
        if (!date) return;
        const d = new Date(date);
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
        if (monthMap[key] !== undefined) monthMap[key]++;
      });

      return {
        _id: user._id,
        name: user.name,
        role: user.designation || user.role || "Contributor",
        totalTasks: userTasks.length,
        completed: completedCount,
        inProgress: inProgressCount,
        efficiency,
        monthlyTrend: monthMap
      };
    }).sort((a, b) => b.efficiency - a.efficiency);

    res.json({
      success: true,
      data: { projects: projectPerformance, employees: employeePerformance }
    });

  } catch (error) {
    console.error("Performance analytics error:", error);
    res.status(500).json({ success: false, message: "Server error generating performance data" });
  }
};

module.exports = baseController;
