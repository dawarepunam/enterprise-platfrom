const Asset = require("../../../models/Asset");
const Attendance = require("../../../models/Attendance");
const Document = require("../../../models/Document");
const Leave = require("../../../models/Leave");
const User = require("../../../models/User");

const employeeRoles = ["ADMIN", "MANAGER", "PROJECT_MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "CALLING", "SALES", "HR"];

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value = "") {
  return String(value || "").trim();
}

function toPlainUser(user) {
  return {
    _id: String(user._id),
    employeeId: user.employeeId || "",
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "MEMBER",
    department: user.department || "General",
    designation: user.designation || user.title || user.role || "Employee",
    manager: user.teamName || "HR Desk",
    joiningDate: user.joiningDate || user.createdAt,
    status: user.status || "ACTIVE",
    profilePhoto: user.profilePhoto || "/assets/images/default-avatar.png",
    skills: user.skills || [],
    microsoft: user.microsoft || {},
    createdAt: user.createdAt,
  };
}

async function listEmployees(query = {}) {
  const filter = { role: { $in: employeeRoles } };
  const search = normalize(query.search);
  const department = normalize(query.department);
  const designation = normalize(query.designation);
  const status = normalize(query.status);

  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { employeeId: rx }, { role: rx }, { department: rx }, { designation: rx }];
  }
  if (department) filter.department = new RegExp(`^${escapeRegex(department)}$`, "i");
  if (designation) filter.designation = new RegExp(escapeRegex(designation), "i");
  if (status) filter.status = status.toUpperCase();

  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  return users.map(toPlainUser);
}

async function getStats() {
  const employees = await listEmployees();
  const active = employees.filter((item) => item.status === "ACTIVE").length;
  const inactive = employees.filter((item) => item.status !== "ACTIVE").length;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [documentsPending, assetsAssigned, pendingLeaves] = await Promise.all([
    Document.countDocuments({ archived: { $ne: true }, $or: [{ status: /pending/i }, { status: { $exists: false } }] }).catch(() => 0),
    Asset.countDocuments({ status: "Assigned" }).catch(() => 0),
    Leave.countDocuments({ status: /pending/i }).catch(() => 0),
  ]);

  const departments = new Set(employees.map((item) => item.department || "General"));
  const managers = employees.filter((item) => ["ADMIN", "MANAGER", "PROJECT_MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "HR"].includes(item.role)).length;

  return {
    totalEmployees: employees.length,
    activeEmployees: active,
    inactiveEmployees: inactive,
    newJoiners: employees.filter((item) => new Date(item.joiningDate || item.createdAt) >= startOfMonth).length,
    documentsPending,
    assetsAssigned,
    departments: departments.size,
    managers,
    pendingLeaves,
  };
}

async function getDepartments() {
  const employees = await listEmployees();
  const byDepartment = new Map();
  employees.forEach((employee) => {
    const key = employee.department || "General";
    if (!byDepartment.has(key)) {
      byDepartment.set(key, { name: key, employeeCount: 0, activeCount: 0, manager: "Not assigned", roles: new Set() });
    }
    const row = byDepartment.get(key);
    row.employeeCount += 1;
    if (employee.status === "ACTIVE") row.activeCount += 1;
    if (["MANAGER", "PROJECT_MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "HR", "ADMIN"].includes(employee.role) && row.manager === "Not assigned") {
      row.manager = employee.name;
    }
    row.roles.add(employee.role);
  });

  return Array.from(byDepartment.values()).map((item) => ({
    ...item,
    roles: Array.from(item.roles),
  })).sort((a, b) => b.employeeCount - a.employeeCount);
}

async function getEmployeeProfile(id) {
  const user = await User.findById(id).lean();
  if (!user) return null;
  const employee = toPlainUser(user);
  const nameRx = new RegExp(`^${escapeRegex(employee.name)}$`, "i");
  const [attendance, leaves, assets, documents] = await Promise.all([
    Attendance.find({ $or: [{ userId: user._id }, { userName: nameRx }, { employee: nameRx }] }).sort({ date: -1, createdAt: -1 }).limit(30).lean().catch(() => []),
    Leave.find({ $or: [{ userId: user._id }, { employee: nameRx }] }).sort({ createdAt: -1 }).limit(30).lean().catch(() => []),
    Asset.find({ assignedTo: user._id }).sort({ updatedAt: -1 }).lean().catch(() => []),
    Document.find({ $or: [{ uploadedBy: user._id }, { "metadata.employeeId": String(user._id) }, { tags: employee.employeeId }] }).sort({ createdAt: -1 }).lean().catch(() => []),
  ]);

  const present = attendance.filter((item) => /present|late|half/i.test(String(item.status || ""))).length;
  return {
    employee,
    stats: {
      attendancePercent: attendance.length ? Math.round((present / attendance.length) * 100) : 0,
      leaves: leaves.length,
      assets: assets.length,
      documents: documents.length,
    },
    attendance,
    leaves,
    assets,
    documents,
    timeline: [
      { title: "Joined Company", date: employee.joiningDate, by: "Admin", comments: `${employee.role} profile created in HR.` },
      { title: "Department", date: employee.createdAt, by: "HR", comments: `${employee.department} department mapped.` },
      { title: "Current Role", date: new Date(), by: "System", comments: `${employee.designation} (${employee.role}).` },
    ],
  };
}

async function getDocuments() {
  return Document.find({ archived: { $ne: true } }).sort({ createdAt: -1 }).limit(100).lean().catch(() => []);
}

async function getAssets() {
  return Asset.find({}).populate("assignedTo", "name email department role employeeId").sort({ updatedAt: -1 }).limit(100).lean().catch(() => []);
}

async function getOverview() {
  const [stats, employees, departments, documents, assets] = await Promise.all([
    getStats(),
    listEmployees(),
    getDepartments(),
    getDocuments(),
    getAssets(),
  ]);

  return {
    stats,
    employees: employees.slice(0, 8),
    departments,
    documents: documents.slice(0, 8),
    assets: assets.slice(0, 8),
    notifications: [
      { title: "Pending Leave Requests", count: stats.pendingLeaves, href: "/hr/leaves.html" },
      { title: "New Joiners", count: stats.newJoiners, href: "/hr/proerp/employees/index.html?status=ACTIVE" },
      { title: "Documents Pending", count: stats.documentsPending, href: "/hr/proerp/documents/index.html" },
      { title: "Assets Assigned", count: stats.assetsAssigned, href: "/hr/proerp/assets/index.html" },
    ],
  };
}

async function createEmployee(payload = {}) {
  const employee = await User.create({
    name: normalize(payload.name),
    email: normalize(payload.email).toLowerCase(),
    phone: normalize(payload.phone),
    password: payload.password || "Welcome@123",
    role: normalize(payload.role || "MEMBER").toUpperCase(),
    department: normalize(payload.department || "General"),
    designation: normalize(payload.designation || payload.role || "Employee"),
    title: normalize(payload.designation || payload.role || "Employee"),
    status: normalize(payload.status || "ACTIVE").toUpperCase(),
    joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : new Date(),
    profilePhoto: normalize(payload.profilePhoto),
    username: normalize(payload.username || payload.email || payload.name),
  });
  return toPlainUser(employee);
}

module.exports = {
  createEmployee,
  getAssets,
  getDepartments,
  getDocuments,
  getEmployeeProfile,
  getOverview,
  listEmployees,
};
