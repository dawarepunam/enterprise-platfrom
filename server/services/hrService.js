const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const File = require("../models/File");
const Team = require("../models/Team");
const Meeting = require("../models/Meeting");
const Project = require("../models/Project");
const Notification = require("../models/Notification");
const PayrollRecord = require("../models/PayrollRecord");
const Interview = require("../models/Interview");
const RecruitmentJob = require("../models/RecruitmentJob");
const CandidateApplication = require("../models/CandidateApplication");
const OfferLetter = require("../models/OfferLetter");

const EMPLOYEE_ROLES = ["HR", "MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "SALES"];
const CANDIDATE_STAGES = ["Applied", "Screening", "Interview", "Technical Round", "Offer Sent", "Hired", "Rejected"];

function monthKeyFromDate(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function employeeCode(user) {
  return `EMP${String(user?._id || "").slice(-5).toUpperCase()}`;
}

function interviewCandidateInitials(name = "") {
  return String(name)
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function serializeEmployee(user) {
  const plain = typeof user.toJSON === "function" ? user.toJSON() : user;
  return {
    _id: plain._id,
    employeeId: employeeCode(plain),
    name: plain.name || "",
    email: plain.email || "",
    phone: plain.phone || "",
    role: plain.role || "",
    department: plain.department || "",
    designation: plain.designation || plain.title || "",
    joiningDate: plain.joiningDate || plain.createdAt || null,
    status: plain.status || "ACTIVE",
    profilePhoto: plain.profilePhoto || "",
    microsoft: plain.microsoft || {},
    preferences: plain.preferences || {},
  };
}

async function ensurePayrollRecords(users = [], monthKey = monthKeyFromDate()) {
  if (!users.length) return [];

  const existing = await PayrollRecord.find({
    userId: { $in: users.map((user) => user._id) },
    monthKey,
  });

  const byUserId = new Map(existing.map((record) => [String(record.userId), record]));
  const missing = users.filter((user) => !byUserId.has(String(user._id)));

  if (!missing.length) {
    return existing;
  }

  const created = [];
  for (const user of missing) {
    const baseSalary = Number(user.preferences?.salary?.base || 45000);
    const allowances = Number(user.preferences?.salary?.allowances || Math.round(baseSalary * 0.14));
    const deductions = Number(user.preferences?.salary?.deductions || Math.round(baseSalary * 0.08));
    const bonuses = Number(user.preferences?.salary?.bonuses || 0);
    const reimbursements = Number(user.preferences?.salary?.reimbursements || 0);
    const netSalary = baseSalary + allowances + bonuses + reimbursements - deductions;

    created.push(await PayrollRecord.create({
      userId: user._id,
      employeeName: user.name,
      department: user.department || "",
      designation: user.designation || user.title || "",
      monthKey,
      baseSalary,
      allowances,
      deductions,
      bonuses,
      reimbursements,
      netSalary,
      status: "PROCESSED",
    }));
  }

  return existing.concat(created);
}

async function getEmployeeCollection({ search = "", department = "", status = "", page = 1, limit = 12 } = {}) {
  const baseQuery = { role: { $in: EMPLOYEE_ROLES } };
  const query = { ...baseQuery };

  if (department) {
    query.department = department;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    query.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { department: regex },
      { designation: regex },
      { title: regex },
    ];
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  const [total, users, departments, allEmployees] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    User.distinct("department", { role: { $in: EMPLOYEE_ROLES }, department: { $ne: "" } }),
    User.find(baseQuery).select("status joiningDate createdAt"),
  ]);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return {
    items: users.map(serializeEmployee),
    summary: {
      totalEmployees: allEmployees.length,
      activeEmployees: allEmployees.filter((item) => item.status === "ACTIVE").length,
      inactiveEmployees: allEmployees.filter((item) => item.status && item.status !== "ACTIVE").length,
      newJoiners: allEmployees.filter((item) => new Date(item.joiningDate || item.createdAt) >= monthStart).length,
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    filters: {
      departments: departments.sort(),
    },
  };
}

async function resolveEmployeeByIdentifier(id) {
  const users = await User.find({ role: { $in: EMPLOYEE_ROLES } });
  return users.find((user) => String(user._id) === String(id) || employeeCode(user) === String(id).toUpperCase()) || null;
}

async function getEmployeeProfile(id) {
  const user = await resolveEmployeeByIdentifier(id);
  if (!user) return null;

  const [attendance, leaves, files, projects, teams, meetings, payroll] = await Promise.all([
    Attendance.find({
      $or: [{ userId: user._id }, { userName: user.name }, { employee: user.name }],
    }).sort({ createdAt: -1 }).limit(40),
    Leave.find({
      $or: [{ userId: user._id }, { employee: user.name }],
    }).sort({ createdAt: -1 }).limit(20),
    File.find({
      $or: [
        { entityId: String(user._id) },
        { "metadata.employeeId": String(user._id) },
        { "metadata.employeeEmail": user.email },
      ],
    }).sort({ createdAt: -1 }).limit(25),
    Project.find({
      $or: [
        { managerId: user._id },
        { teamLeadId: user._id },
        { teamMemberIds: user._id },
      ],
    }).sort({ updatedAt: -1 }).limit(12),
    Team.find({
      $or: [{ managerId: user._id }, { teamLeadId: user._id }, { memberIds: user._id }],
    }).sort({ updatedAt: -1 }).limit(12),
    Meeting.find({
      "participants.userId": user._id,
    }).sort({ scheduledFor: -1, startTime: -1 }).limit(12),
    PayrollRecord.find({ userId: user._id }).sort({ monthKey: -1 }).limit(12),
  ]);

  const attendanceTrend = attendance
    .slice()
    .reverse()
    .map((item) => ({
      date: item.date || new Date(item.createdAt).toISOString().slice(0, 10),
      hours: Number(item.hours || 0),
      status: item.status || "Present",
    }));

  const totals = attendance.reduce(
    (acc, item) => {
      acc.hours += Number(item.hours || 0);
      if (String(item.status || "").toLowerCase().includes("late")) acc.late += 1;
      if (item.checkInAt) acc.present += 1;
      return acc;
    },
    { hours: 0, late: 0, present: 0 },
  );

  return {
    employee: serializeEmployee(user),
    overview: {
      activeProjects: projects.filter((project) => ["Assigned", "Active", "Planning"].includes(project.status)).length,
      activeTeams: teams.filter((team) => team.status !== "Completed").length,
      documents: files.length,
      upcomingMeetings: meetings.filter((meeting) => new Date(meeting.scheduledFor || meeting.startTime || 0) >= new Date()).length,
    },
    attendance: {
      summary: {
        totalHours: Number(totals.hours.toFixed(1)),
        lateEntries: totals.late,
        presentDays: totals.present,
      },
      graph: attendanceTrend,
      logs: attendance,
    },
    leaves,
    projects,
    payroll,
    documents: files,
    meetings,
    teams,
    performance: projects.map((project) => ({
      projectName: project.projectName,
      status: project.status,
      progress: project.progress || 0,
      priority: project.priority || "Medium",
    })),
  };
}

async function getDashboardData() {
  const [employees, attendanceRecords, leaves, notifications, interviews, projects, meetings] = await Promise.all([
    User.find({ role: { $in: EMPLOYEE_ROLES } }).sort({ createdAt: -1 }),
    Attendance.find({}).sort({ createdAt: -1 }).limit(300),
    Leave.find({}).sort({ createdAt: -1 }).limit(200),
    Notification.find({ role: "HR" }).sort({ createdAt: -1 }).limit(12),
    Interview.find({}).sort({ scheduledAt: 1 }).limit(12),
    Project.find({}).sort({ updatedAt: -1 }).limit(40),
    Meeting.find({}).sort({ scheduledFor: -1, startTime: -1 }).limit(20),
  ]);

  const [payrollRecords, recruitmentJobs, candidates, offers] = await Promise.all([
    ensurePayrollRecords(employees),
    RecruitmentJob.find({}).sort({ createdAt: -1 }).limit(40),
    CandidateApplication.find({}).sort({ createdAt: -1 }).limit(120),
    OfferLetter.find({}).sort({ createdAt: -1 }).limit(80),
  ]);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const thisMonth = monthKeyFromDate(now);
  const previousMonth = monthKeyFromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const activeEmployees = employees.filter((user) => user.status === "ACTIVE").length;
  const lateArrivals = attendanceRecords.filter((item) => String(item.status || "").toLowerCase().includes("late")).length;
  const pendingLeaves = leaves.filter((item) => /pending/i.test(String(item.status || ""))).length;
  const todayInterviews = interviews.filter((item) => new Date(item.scheduledAt) >= todayStart && new Date(item.scheduledAt) <= todayEnd).length;
  const presentRecords = attendanceRecords.filter((item) => item.checkInAt);
  const attendancePct = employees.length ? Math.round((presentRecords.length / employees.length) * 100) : 0;
  const payrollCost = payrollRecords
    .filter((item) => item.monthKey === thisMonth)
    .reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
  const activeProjects = projects.filter((item) => ["Assigned", "Active", "Planning", "In Progress"].includes(String(item.status || ""))).length;
  const teamsMeetings = meetings.filter((item) => {
    const title = `${item.platform || ""} ${item.provider || ""} ${item.title || ""}`.toLowerCase();
    return title.includes("teams") || item.meetingLink;
  }).length;

  const currentMonthGrowth = employees.filter((user) => monthKeyFromDate(user.createdAt) === thisMonth).length;
  const previousMonthGrowth = employees.filter((user) => monthKeyFromDate(user.createdAt) === previousMonth).length;
  const growthDelta = currentMonthGrowth - previousMonthGrowth;
  const newJoiners = employees.filter((user) => new Date(user.joiningDate || user.createdAt) >= new Date(now.getFullYear(), now.getMonth(), 1)).length;

  const byDepartment = employees.reduce((acc, user) => {
    const key = user.department || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const attendanceTrendMap = new Map();
  attendanceRecords.forEach((item) => {
    const key = item.date || new Date(item.createdAt).toISOString().slice(0, 10);
    const current = attendanceTrendMap.get(key) || { date: key, present: 0, hours: 0 };
    current.present += item.checkInAt ? 1 : 0;
    current.hours += Number(item.hours || 0);
    attendanceTrendMap.set(key, current);
  });

  const leaveTrend = leaves.reduce((acc, item) => {
    const key = item.fromDate || new Date(item.createdAt).toISOString().slice(0, 10);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leaveBreakdown = leaves.reduce((acc, item) => {
    const key = String(item.status || "Pending");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const payrollByDepartment = payrollRecords
    .filter((item) => item.monthKey === thisMonth)
    .reduce((acc, item) => {
      const key = item.department || "Unassigned";
      acc[key] = (acc[key] || 0) + Number(item.netSalary || 0);
      return acc;
    }, {});

  const performanceOverview = {
    avgProjectProgress: activeProjects
      ? Math.round(
        projects
          .filter((item) => ["Assigned", "Active", "Planning", "In Progress"].includes(String(item.status || "")))
          .reduce((sum, item) => sum + Number(item.progress || 0), 0) / activeProjects,
      )
      : 0,
    completionRate: projects.length
      ? Math.round((projects.filter((item) => /complete/i.test(String(item.status || ""))).length / projects.length) * 100)
      : 0,
    microsoftReadiness: employees.length
      ? Math.round((employees.filter((item) => item.microsoft?.teamsReady || item.microsoft?.outlookReady).length / employees.length) * 100)
      : 0,
  };

  const activity = [
    ...notifications.slice(0, 5).map((item) => ({
      title: item.title || item.type || "Notification",
      meta: item.message || "",
      time: item.createdAt,
      type: item.priority || item.type || "info",
    })),
    ...meetings.slice(0, 3).map((item) => ({
      title: item.title || "Meeting",
      meta: item.agenda || item.description || "Upcoming collaboration event",
      time: item.scheduledFor || item.startTime || item.createdAt,
      type: "meeting",
    })),
    ...projects.slice(0, 3).map((item) => ({
      title: item.projectName || "Project",
      meta: `${item.status || "Active"} project`,
      time: item.updatedAt || item.createdAt,
      type: "project",
    })),
  ]
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 10);

  return {
    employeeStats: {
      totalEmployees: employees.length,
      activeEmployees,
      inactiveEmployees: employees.filter((user) => user.status !== "ACTIVE").length,
      employeeGrowth: growthDelta,
      departments: Object.keys(byDepartment).length,
      newJoiners,
    },
    attendanceStats: {
      lateArrivals,
      attendancePercentage: attendancePct,
    },
    leaveStats: {
      pendingLeaves,
      approvedLeaves: leaves.filter((item) => /approved/i.test(String(item.status || ""))).length,
    },
    payrollStats: {
      monthKey: thisMonth,
      payrollCost,
      processedCount: payrollRecords.filter((item) => item.monthKey === thisMonth).length,
    },
    notifications,
    interviews,
    projects: projects.slice(0, 8),
    meetings: meetings.slice(0, 6),
    activity,
    spotlight: {
      activeProjects,
      teamsMeetings,
    },
    recruitment: {
      openJobs: recruitmentJobs.filter((item) => item.status === "Open").length,
      candidates: candidates.length,
      interviewsScheduled: interviews.filter((item) => ["SCHEDULED", "RESCHEDULED"].includes(String(item.status || "").toUpperCase())).length,
      offersPending: offers.filter((item) => ["Draft", "Sent"].includes(item.status)).length,
      hired: candidates.filter((item) => item.status === "Hired").length,
    },
    charts: {
      departmentBreakdown: Object.entries(byDepartment).map(([label, value]) => ({ label, value })),
      attendanceTrend: Array.from(attendanceTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-10),
      leaveTrend: Object.entries(leaveTrend)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-10),
      leaveBreakdown: Object.entries(leaveBreakdown).map(([label, value]) => ({ label, value })),
      payrollByDepartment: Object.entries(payrollByDepartment).map(([label, value]) => ({ label, value })),
      payrollTrend: payrollRecords
        .reduce((acc, item) => {
          acc[item.monthKey] = (acc[item.monthKey] || 0) + Number(item.netSalary || 0);
          return acc;
        }, {}),
      performanceOverview,
    },
  };
}

async function getAttendanceWorkspace() {
  const employees = await User.find({ role: { $in: EMPLOYEE_ROLES } });
  const records = await Attendance.find({}).sort({ createdAt: -1 }).limit(500);
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const lateEntries = records.filter((item) => String(item.status || "").toLowerCase().includes("late")).length;
  const totalHours = records.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const normalizeLog = (item) => {
    const breakHours = Number(item.breakHours || item.break || item.metadata?.breakHours || Math.min(1.5, Number(item.hours || 0) * 0.12));
    const overtimeHours = Number(item.overtimeHours || item.overtime || item.metadata?.overtimeHours || Math.max(0, Number(item.hours || 0) - 8));
    const productiveHours = Number(item.productiveHours || item.metadata?.productiveHours || Math.max(0, Number(item.hours || 0) - breakHours));
    return {
      ...item.toJSON?.() || item,
      breakHours: Number(breakHours.toFixed(1)),
      overtimeHours: Number(overtimeHours.toFixed(1)),
      productiveHours: Number(productiveHours.toFixed(1)),
      lateMinutes: Number(item.lateMinutes || item.metadata?.lateMinutes || (String(item.status || "").toLowerCase().includes("late") ? 15 : 0)),
    };
  };
  const normalizedLogs = records.map(normalizeLog);
  const todayHours = normalizedLogs
    .filter((item) => (item.date || "").slice(0, 10) === todayKey || new Date(item.createdAt).toISOString().slice(0, 10) === todayKey)
    .reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const weeklyHours = normalizedLogs
    .filter((item) => new Date(item.date || item.createdAt) >= weekStart)
    .reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const monthlyHours = normalizedLogs
    .filter((item) => new Date(item.date || item.createdAt) >= monthStart)
    .reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const productiveHours = normalizedLogs.reduce((sum, item) => sum + Number(item.productiveHours || 0), 0);
  const breakHours = normalizedLogs.reduce((sum, item) => sum + Number(item.breakHours || 0), 0);
  const overtimeHours = normalizedLogs.reduce((sum, item) => sum + Number(item.overtimeHours || 0), 0);
  const monthly = records
    .reduce((acc, item) => {
      const dateKey = item.date || new Date(item.createdAt).toISOString().slice(0, 10);
      acc[dateKey] = (acc[dateKey] || 0) + Number(item.hours || 0);
      return acc;
    }, {});

  const weeklyBreakdown = records.reduce((acc, item) => {
    const date = new Date(item.date || item.createdAt);
    const label = date.toLocaleDateString("en-IN", { weekday: "short" });
    acc[label] = (acc[label] || 0) + Number(item.hours || 0);
    return acc;
  }, {});

  const employeeDensity = records.reduce((acc, item) => {
    const key = item.employee || item.userName || "Unknown";
    acc[key] = (acc[key] || 0) + Number(item.hours || 0);
    return acc;
  }, {});

  return {
    cards: {
      employeesTracked: employees.length,
      records: records.length,
      lateEntries,
      totalHours: Number(totalHours.toFixed(1)),
      totalHoursToday: Number(todayHours.toFixed(1)),
      weeklyHours: Number(weeklyHours.toFixed(1)),
      monthlyHours: Number(monthlyHours.toFixed(1)),
      productiveHours: Number(productiveHours.toFixed(1)),
      breakHours: Number(breakHours.toFixed(1)),
      overtimeHours: Number(overtimeHours.toFixed(1)),
    },
    trend: Object.entries(monthly)
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
    weeklyBreakdown: Object.entries(weeklyBreakdown).map(([label, hours]) => ({ label, hours })),
    employeeDensity: Object.entries(employeeDensity)
      .map(([label, hours]) => ({ label, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8),
    logs: normalizedLogs.slice(0, 100),
  };
}

async function getLeavesWorkspace() {
  const leaves = await Leave.find({}).sort({ createdAt: -1 }).limit(200);
  const byType = leaves.reduce((acc, item) => {
    const key = item.leaveType || item.category || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    cards: {
      total: leaves.length,
      pending: leaves.filter((item) => /pending/i.test(String(item.status || ""))).length,
      approved: leaves.filter((item) => /approved/i.test(String(item.status || ""))).length,
      rejected: leaves.filter((item) => /rejected/i.test(String(item.status || ""))).length,
      onHold: leaves.filter((item) => /hold/i.test(String(item.status || ""))).length,
    },
    leaveTypes: Object.entries(byType).map(([label, value]) => ({ label, value })),
    items: leaves,
  };
}

async function getPayrollWorkspace() {
  const employees = await User.find({ role: { $in: EMPLOYEE_ROLES } });
  const records = await ensurePayrollRecords(employees);
  const monthKey = monthKeyFromDate();

  return {
    cards: {
      totalCost: records.filter((item) => item.monthKey === monthKey).reduce((sum, item) => sum + item.netSalary, 0),
      processed: records.filter((item) => item.monthKey === monthKey).length,
      paid: records.filter((item) => item.monthKey === monthKey && item.status === "PAID").length,
      onHold: records.filter((item) => item.status === "HOLD").length,
    },
    records: records.sort((a, b) => b.monthKey.localeCompare(a.monthKey)).slice(0, 100),
  };
}

async function getReportsWorkspace() {
  const [employees, attendance, payroll, leaves, projects] = await Promise.all([
    User.find({ role: { $in: EMPLOYEE_ROLES } }),
    Attendance.find({}).sort({ createdAt: -1 }).limit(400),
    PayrollRecord.find({}).sort({ monthKey: -1 }).limit(300),
    Leave.find({}).sort({ createdAt: -1 }).limit(300),
    Project.find({}).sort({ updatedAt: -1 }).limit(100),
  ]);

  const departments = employees.reduce((acc, item) => {
    const key = item.department || "Unassigned";
    acc[key] = acc[key] || { department: key, employees: 0, projects: 0, payroll: 0 };
    acc[key].employees += 1;
    return acc;
  }, {});

  payroll.forEach((item) => {
    const key = item.department || "Unassigned";
    departments[key] = departments[key] || { department: key, employees: 0, projects: 0, payroll: 0 };
    departments[key].payroll += Number(item.netSalary || 0);
  });

  projects.forEach((item) => {
    const key = item.department || "Unassigned";
    departments[key] = departments[key] || { department: key, employees: 0, projects: 0, payroll: 0 };
    departments[key].projects += 1;
  });

  return {
    employeeGrowth: employees.map((item) => ({
      name: item.name,
      month: monthKeyFromDate(item.createdAt),
    })),
    attendanceAnalytics: attendance.slice(0, 120),
    payrollCharts: payroll.slice(0, 120),
    lateArrivalAnalytics: attendance.filter((item) => String(item.status || "").toLowerCase().includes("late")),
    departmentPerformance: Object.values(departments),
    exports: {
      employees: employees.map(serializeEmployee),
      attendance,
      payroll,
      leaves,
    },
  };
}

async function getInterviewsWorkspace() {
  const interviews = await Interview.find({}).sort({ scheduledAt: 1 }).limit(100);
  return {
    cards: {
      total: interviews.length,
      today: interviews.filter((item) => {
        const when = new Date(item.scheduledAt);
        const now = new Date();
        return when >= startOfDay(now) && when <= endOfDay(now);
      }).length,
      scheduled: interviews.filter((item) => item.status === "SCHEDULED").length,
      completed: interviews.filter((item) => item.status === "COMPLETED").length,
    },
    interviews,
  };
}

async function ensureRecruitmentSeed() {
  const hasJobs = await RecruitmentJob.exists({});
  if (!hasJobs) {
    await RecruitmentJob.insertMany([
      {
        title: "Frontend Developer",
        department: "Development",
        location: "Pune",
        description: "Own modern UI delivery, responsive dashboards, and SaaS workflow polish.",
        deadline: new Date(Date.now() + 14 * 86400000),
        status: "Open",
        hiringManagerName: "Delivery Lead",
        openings: 2,
        shortlistedCount: 2,
      },
      {
        title: "Backend Developer",
        department: "Development",
        location: "Mumbai",
        description: "API design, auth, data integrations, and realtime workflow services.",
        deadline: new Date(Date.now() + 21 * 86400000),
        status: "Open",
        hiringManagerName: "Engineering Manager",
        openings: 3,
        shortlistedCount: 4,
      },
      {
        title: "HR Executive",
        department: "HR",
        location: "Pune",
        description: "People operations, leave desk, interview coordination, and policy workflow.",
        deadline: new Date(Date.now() + 25 * 86400000),
        status: "Open",
        hiringManagerName: "HR Lead",
        openings: 1,
        shortlistedCount: 1,
      },
    ]);
  }

  const hasCandidates = await CandidateApplication.exists({});
  if (!hasCandidates) {
    const jobs = await RecruitmentJob.find({}).sort({ createdAt: 1 });
    const byTitle = new Map(jobs.map((job) => [job.title, job]));
    await CandidateApplication.insertMany([
      {
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        phone: "9876543210",
        position: "Frontend Developer",
        department: "Development",
        status: "Applied",
        experience: 3,
        skills: ["React", "Tailwind", "Figma"],
        location: "Mumbai",
        education: "B.Tech",
        expectedSalary: "INR 8.5 LPA",
        notes: "Strong React portfolio with dashboard work.",
        resume: { fileName: "Rahul_Sharma_Resume.pdf", fileUrl: "" },
        jobId: byTitle.get("Frontend Developer")?._id || null,
      },
      {
        name: "Sneha Patil",
        email: "sneha.patil@example.com",
        phone: "9876500011",
        position: "Backend Developer",
        department: "Development",
        status: "Screening",
        experience: 4,
        skills: ["Node.js", "MongoDB", "JWT"],
        location: "Pune",
        education: "MCA",
        expectedSalary: "INR 10 LPA",
        notes: "API-heavy background with auth and integrations.",
        resume: { fileName: "Sneha_Patil_Resume.pdf", fileUrl: "" },
        jobId: byTitle.get("Backend Developer")?._id || null,
      },
      {
        name: "Amit Joshi",
        email: "amit.joshi@example.com",
        phone: "9876500012",
        position: "Frontend Developer",
        department: "Development",
        status: "Interview",
        experience: 5,
        skills: ["Vue", "Design Systems", "A11y"],
        location: "Nashik",
        education: "B.E.",
        expectedSalary: "INR 11 LPA",
        notes: "Enterprise UX with component library experience.",
        resume: { fileName: "Amit_Joshi_Resume.pdf", fileUrl: "" },
        jobId: byTitle.get("Frontend Developer")?._id || null,
      },
      {
        name: "Pooja Kale",
        email: "pooja.kale@example.com",
        phone: "9876500013",
        position: "HR Executive",
        department: "HR",
        status: "Technical Round",
        experience: 2,
        skills: ["Recruitment", "Policy", "Onboarding"],
        location: "Pune",
        education: "MBA HR",
        expectedSalary: "INR 6 LPA",
        notes: "Handled interviews, hiring drives, and employee records.",
        resume: { fileName: "Pooja_Kale_Resume.pdf", fileUrl: "" },
        jobId: byTitle.get("HR Executive")?._id || null,
      },
      {
        name: "Nikhil Deshmukh",
        email: "nikhil.d@example.com",
        phone: "9876500014",
        position: "Backend Developer",
        department: "Development",
        status: "Offer Sent",
        experience: 6,
        skills: ["Express", "PostgreSQL", "Redis"],
        location: "Mumbai",
        education: "B.Tech",
        expectedSalary: "INR 14 LPA",
        notes: "Platform engineering and API scale exposure.",
        resume: { fileName: "Nikhil_Deshmukh_Resume.pdf", fileUrl: "" },
        jobId: byTitle.get("Backend Developer")?._id || null,
      },
      {
        name: "Megha Shah",
        email: "megha.shah@example.com",
        phone: "9876500015",
        position: "HR Executive",
        department: "HR",
        status: "Hired",
        experience: 3,
        skills: ["Payroll", "Compliance", "Documentation"],
        location: "Pune",
        education: "MBA HR",
        expectedSalary: "INR 7 LPA",
        notes: "Operational HR with strong employee lifecycle experience.",
        resume: { fileName: "Megha_Shah_Resume.pdf", fileUrl: "" },
        jobId: byTitle.get("HR Executive")?._id || null,
      },
    ]);
  }
}

async function getRecruitmentWorkspace() {
  await ensureRecruitmentSeed();

  const [jobs, candidates, interviews, offers, employees] = await Promise.all([
    RecruitmentJob.find({}).sort({ createdAt: -1 }),
    CandidateApplication.find({}).sort({ createdAt: -1 }),
    Interview.find({}).sort({ scheduledAt: 1 }).limit(100),
    OfferLetter.find({}).sort({ createdAt: -1 }),
    User.find({ role: { $in: EMPLOYEE_ROLES } }).sort({ createdAt: -1 }).limit(60),
  ]);

  const candidatesByJob = candidates.reduce((acc, candidate) => {
    const key = String(candidate.jobId || "");
    acc[key] = acc[key] || [];
    acc[key].push(candidate);
    return acc;
  }, {});

  const normalizedJobs = jobs.map((job) => {
    const linkedCandidates = candidatesByJob[String(job._id)] || candidates.filter((candidate) => candidate.position === job.title);
    return {
      id: String(job._id),
      title: job.title,
      department: job.department,
      location: job.location,
      description: job.description,
      deadline: job.deadline,
      deadlineLabel: job.deadline ? new Date(job.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Open",
      status: job.status,
      manager: job.hiringManagerName || "HR Team",
      openings: job.openings || 1,
      applicants: linkedCandidates.length,
      shortlisted: linkedCandidates.filter((candidate) => ["Screening", "Interview", "Technical Round", "Offer Sent", "Hired"].includes(candidate.status)).length,
    };
  });

  const normalizedCandidates = candidates.map((candidate) => ({
    id: String(candidate._id),
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    department: candidate.department,
    status: candidate.status,
    experience: candidate.experience,
    skills: candidate.skills || [],
    location: candidate.location,
    education: candidate.education,
    expectedSalary: candidate.expectedSalary,
    notes: candidate.notes,
    resume: candidate.resume?.fileName || "",
    resumeUrl: candidate.resume?.fileUrl || "",
    appliedDate: candidate.appliedDate,
    interviewId: candidate.interviewId ? String(candidate.interviewId) : "",
    jobId: candidate.jobId ? String(candidate.jobId) : "",
    initials: interviewCandidateInitials(candidate.name),
    hiredUserId: candidate.hiredUserId ? String(candidate.hiredUserId) : "",
  }));

  const normalizedOffers = offers.map((offer) => ({
    id: String(offer._id),
    candidateId: String(offer.candidateId),
    candidateName: offer.candidateName,
    email: offer.email,
    designation: offer.designation,
    department: offer.department,
    manager: offer.manager,
    salary: offer.salary,
    joiningDate: offer.joiningDate,
    status: offer.status,
  }));

  const departmentCounts = normalizedCandidates.reduce((acc, candidate) => {
    acc[candidate.department || "General"] = (acc[candidate.department || "General"] || 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(...Object.values(departmentCounts), 1);

  return {
    metrics: {
      totalEmployees: employees.length,
      newJoiners: employees.filter((employee) => new Date(employee.joiningDate || employee.createdAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length,
      openJobs: normalizedJobs.filter((job) => job.status === "Open").length,
      interviewsScheduled: interviews.filter((item) => ["SCHEDULED", "RESCHEDULED"].includes(String(item.status || "").toUpperCase())).length,
      presentEmployees: employees.filter((employee) => employee.status === "ACTIVE").length,
      leaveRequests: await Leave.countDocuments({ status: /pending/i }),
      payrollPending: await PayrollRecord.countDocuments({ status: { $ne: "PAID" } }),
      hiringProgress: normalizedCandidates.length ? Math.round((normalizedCandidates.filter((candidate) => ["Offer Sent", "Hired"].includes(candidate.status)).length / normalizedCandidates.length) * 100) : 0,
      applications: normalizedCandidates.length,
      selected: normalizedCandidates.filter((candidate) => ["Offer Sent", "Hired"].includes(candidate.status)).length,
      rejected: normalizedCandidates.filter((candidate) => candidate.status === "Rejected").length,
      pending: normalizedCandidates.filter((candidate) => !["Hired", "Rejected"].includes(candidate.status)).length,
    },
    jobs: normalizedJobs,
    candidates: normalizedCandidates,
    interviews,
    offers: normalizedOffers,
    departmentHiring: Object.entries(departmentCounts).map(([label, value]) => ({
      label,
      value,
      percentage: Math.round((value / maxCount) * 100),
    })),
    calendar: [
      ...interviews.slice(0, 5).map((interview) => ({
        id: `int-${interview._id}`,
        title: `${interview.candidateName} interview`,
        when: interview.scheduledAt,
        type: "Interview",
        copy: interview.position || "Interview schedule",
      })),
      ...normalizedOffers.slice(0, 3).map((offer) => ({
        id: `off-${offer.id}`,
        title: `${offer.candidateName} offer`,
        when: offer.joiningDate,
        type: "Offer",
        copy: `${offer.designation} | ${offer.salary}`,
      })),
    ].sort((a, b) => new Date(a.when || 0) - new Date(b.when || 0)).slice(0, 10),
    pipelineStages: CANDIDATE_STAGES,
  };
}

module.exports = {
  CANDIDATE_STAGES,
  EMPLOYEE_ROLES,
  employeeCode,
  ensurePayrollRecords,
  ensureRecruitmentSeed,
  getAttendanceWorkspace,
  getDashboardData,
  getEmployeeCollection,
  getEmployeeProfile,
  getInterviewsWorkspace,
  getLeavesWorkspace,
  getPayrollWorkspace,
  getRecruitmentWorkspace,
  getReportsWorkspace,
  monthKeyFromDate,
  serializeEmployee,
};
