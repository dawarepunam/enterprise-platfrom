const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");

async function getTasksReport(req, res) {
  try {
    const { start, end } = req.query;
    const query = { assignees: req.user.id };
    if (start && end) {
      query.createdAt = { $gte: new Date(start), $lte: new Date(end) };
    }
    const tasks = await Task.find(query).select('title status dueDate priority').lean();
    
    const reportData = tasks.map(t => ({
      ID: t._id.toString().slice(-4),
      Title: t.title,
      Status: t.status,
      Priority: t.priority,
      Date: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'
    }));

    res.json({ success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching task report" });
  }
}

async function getAttendanceReport(req, res) {
  try {
    const { start, end } = req.query;
    const query = { user: req.user.id };
    if (start && end) {
      query.date = { $gte: new Date(start), $lte: new Date(end) };
    }
    const atts = await Attendance.find(query).lean();
    
    const reportData = atts.map(a => ({
      Date: new Date(a.date).toLocaleDateString(),
      CheckIn: a.firstPunchIn ? new Date(a.firstPunchIn).toLocaleTimeString() : 'Missed',
      CheckOut: a.lastPunchOut ? new Date(a.lastPunchOut).toLocaleTimeString() : 'Missed',
      Status: a.status || 'Present',
      TotalHours: a.totalHoursWorked ? a.totalHoursWorked.toFixed(2) : 0
    }));

    res.json({ success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching attendance report" });
  }
}

async function getLeavesReport(req, res) {
  try {
    const { start, end } = req.query;
    const query = { employee: req.user.id };
    if (start && end) {
      query.startDate = { $gte: new Date(start) };
    }
    const leaves = await Leave.find(query).lean();
    
    const reportData = leaves.map(l => ({
      Type: l.leaveType,
      StartDate: new Date(l.startDate).toLocaleDateString(),
      EndDate: new Date(l.endDate).toLocaleDateString(),
      Status: l.status,
      Reason: l.reason
    }));

    res.json({ success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching leave report" });
  }
}

async function getPerformanceReport(req, res) {
  try {
    const totalTasks = await Task.countDocuments({ assignees: req.user.id });
    const completedTasks = await Task.countDocuments({ assignees: req.user.id, status: "Completed" });
    const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    res.json({ success: true, data: [{
      Metric: 'Tasks Completed', Value: completedTasks
    }, {
      Metric: 'Productivity Score', Value: productivity + '%'
    }]});
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching performance report" });
  }
}

async function getTimesheetsReport(req, res) {
  res.json({ success: true, data: [{
    Date: new Date().toLocaleDateString(), Project: 'CRM Platform', Hours: '8.0'
  }]});
}

// Preserve existing generic CRUD if needed, but for employee reports use specifics
const createCrudController = require("../utils/createCrudController");
const genericCrud = createCrudController("reports");

module.exports = {
  ...genericCrud,
  getTasksReport,
  getAttendanceReport,
  getLeavesReport,
  getPerformanceReport,
  getTimesheetsReport
};
