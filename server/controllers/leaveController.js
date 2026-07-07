// server/controllers/leaveController.js
const LeaveRequest = require("../models/LeaveRequest");
const LeaveBalance = require("../models/LeaveBalance");
const AttendanceRecord = require("../models/AttendanceRecord");
const Attendance = require("../models/Attendance"); // legacy
const User = require("../models/User");
const XLSX = require("xlsx");
const { dispatchWorkflow } = require("../services/workflowService");

function getIo(req) {
  return req?.app?.get?.("io") || null;
}

function getTodayYear() {
  return new Date().getFullYear();
}

// Calculate business days between two date strings (YYYY-MM-DD)
function calcBusinessDays(from, to) {
  if (!from || !to) return 1;
  const start = new Date(from);
  const end = new Date(to);
  if (isNaN(start) || isNaN(end)) return 1;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

// Auto-mark attendance as "On Leave" for approved leaves
async function autoMarkLeaveAttendance(leaveRecord) {
  try {
    const user = await User.findOne({
      $or: [{ _id: leaveRecord.userId }, { name: leaveRecord.employee }],
    });
    if (!user) return;

    const start = new Date(leaveRecord.fromDate);
    const end = new Date(leaveRecord.toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      const day = cur.getDay();
      // Skip weekends
      if (day !== 0 && day !== 6) {
        // Try new model first
        let record = await AttendanceRecord.findOne({ userId: user._id, date: dateStr });
        if (!record) {
          record = new AttendanceRecord({
            userId: user._id,
            userName: user.name,
            employee: user.name,
            role: user.role,
            department: user.department || "",
            date: dateStr,
          });
        }
        if (!record.punchInAt) {
          // Only mark if not already punched
          record.status = "On Leave";
          record.remarks = `Leave approved: ${leaveRecord.reason || leaveRecord.leaveType || "Approved"}`;
          record.hours = 0;
          record.totalHours = 0;
          record.effectiveHours = 0;
          await record.save();
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  } catch (err) {
    console.error("autoMarkLeaveAttendance:", err);
  }
}

// Get or create leave balance for current year
async function getOrCreateBalance(userId) {
  const year = getTodayYear();
  let bal = await LeaveBalance.findOne({ userId, year });
  if (!bal) {
    bal = await LeaveBalance.create({ userId, year });
  }
  return bal;
}

// ─── APPLY LEAVE ──────────────────────────────────────────────────────────────
async function apply(req, res) {
  try {
    const {
      leaveType, fromDate, toDate, reason, attachment, isEmergency,
      emergencyContact,
    } = req.body;

    if (!leaveType || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: "leaveType, fromDate and toDate are required" });
    }

    const totalDays = calcBusinessDays(fromDate, toDate);

    // Check balance
    const bal = await getOrCreateBalance(req.user._id);
    const available = bal.getAvailable(leaveType);
    if (leaveType !== "unpaid" && available < totalDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${leaveType} leave balance. Available: ${available} days, Requested: ${totalDays} days`,
      });
    }

    const leave = await LeaveRequest.create({
      userId: req.user._id,
      employee: req.user.name,
      department: req.user.department || "",
      role: req.user.role || "",
      leaveType,
      fromDate,
      toDate,
      totalDays,
      reason: reason || "",
      attachment: attachment || "",
      isEmergency: isEmergency || false,
      emergencyContact: emergencyContact || "",
      status: "Pending PM",
    });

    // Deduct from pending balance
    const mappedKey = bal.getMappedKey(leaveType);
    if (bal[mappedKey]) {
      bal[mappedKey].pending = (bal[mappedKey].pending || 0) + totalDays;
      await bal.save();
    }

    // Notify PM / Team Lead / Manager
    await dispatchWorkflow({
      req,
      module: "leave",
      event: "leave_applied",
      title: "Leave Request Pending Approval",
      message: `${req.user.name} applied for ${leaveType} leave from ${fromDate} to ${toDate} (${totalDays} day${totalDays > 1 ? "s" : ""}).`,
      priority: isEmergency ? "high" : "medium",
      actionUrl: `/employee/leave?id=${leave._id}`,
      entityType: "leave",
      entityId: leave._id,
      notificationRoles: ["PROJECT_MANAGER", "TEAM_LEAD", "MANAGER"],
      userRefs: [{ userId: req.user._id }],
      metadata: { leaveType, fromDate, toDate, totalDays, memberName: req.user.name },
    });

    // Notify via socket
    const io = getIo(req);
    if (io) {
      io.to(`user_${req.user._id}`).emit("leave_status_updated", leave.toObject());
      io.emit("pm_notification", { type: "leave_applied", leave: leave.toObject() });
    }

    res.status(201).json({ success: true, message: "Leave applied successfully", data: leave });
  } catch (err) {
    console.error("leave.apply:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PM ACTION ────────────────────────────────────────────────────────────────
async function pmAction(req, res) {
  try {
    const callerRole = String(req.user?.role || "").toUpperCase();
    if (!["ADMIN", "MANAGER", "PROJECT_MANAGER", "TEAM_LEAD"].includes(callerRole)) {
      return res.status(403).json({ success: false, message: "Only PM/Manager/Admin can perform this action" });
    }

    const { status, remarks } = req.body; // "Approved" | "Rejected"
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be Approved or Rejected" });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
    if (leave.status !== "Pending PM") {
      return res.status(409).json({ success: false, message: `Cannot take PM action on a leave with status: ${leave.status}` });
    }

    leave.pmAction = {
      actionBy: req.user._id,
      actionByName: req.user.name,
      actionAt: new Date(),
      status,
      remarks: remarks || "",
    };

    if (status === "Approved") {
      leave.status = "Pending HR";
    } else {
      leave.status = "Rejected";
      // Restore pending balance
      const bal = await getOrCreateBalance(leave.userId);
      const mappedKey = bal.getMappedKey(leave.leaveType);
      if (bal[mappedKey]) {
        bal[mappedKey].pending = Math.max(0, (bal[mappedKey].pending || 0) - leave.totalDays);
        await bal.save();
      }
    }
    await leave.save();

    // Notify employee
    await dispatchWorkflow({
      req,
      module: "leave",
      event: "leave_pm_action",
      title: `Leave ${status} by PM`,
      message: `Your leave request (${leave.leaveType}, ${leave.fromDate}–${leave.toDate}) was ${status.toLowerCase()} by ${req.user.name}${remarks ? `: "${remarks}"` : ""}.`,
      priority: "high",
      actionUrl: `/employee/leave`,
      entityType: "leave",
      entityId: leave._id,
      userRefs: [{ userId: leave.userId }],
      ...(status === "Approved"
        ? {
            notificationRoles: ["HR"],
            metadata: { action: "PM_APPROVED", leaveType: leave.leaveType },
          }
        : { metadata: { action: "PM_REJECTED", remarks } }),
    });

    const io = getIo(req);
    if (io) {
      io.to(`user_${leave.userId}`).emit("leave_status_updated", leave.toObject());
      if (status === "Approved") io.emit("hr_notification", { type: "leave_pending_hr", leave: leave.toObject() });
    }

    res.json({ success: true, message: `Leave ${status.toLowerCase()} by PM`, data: leave });
  } catch (err) {
    console.error("leave.pmAction:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── HR ACTION ────────────────────────────────────────────────────────────────
async function hrAction(req, res) {
  try {
    const callerRole = String(req.user?.role || "").toUpperCase();
    if (!["ADMIN", "HR"].includes(callerRole)) {
      return res.status(403).json({ success: false, message: "Only HR/Admin can perform this action" });
    }

    const { status, remarks } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be Approved or Rejected" });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
    if (leave.status !== "Pending HR") {
      return res.status(409).json({ success: false, message: `Cannot take HR action on a leave with status: ${leave.status}` });
    }

    leave.hrAction = {
      actionBy: req.user._id,
      actionByName: req.user.name,
      actionAt: new Date(),
      status,
      remarks: remarks || "",
    };
    leave.status = status; // "Approved" or "Rejected"
    await leave.save();

    // Update balance
    const bal = await getOrCreateBalance(leave.userId);
    const mappedKey = bal.getMappedKey(leave.leaveType);
    if (bal[mappedKey]) {
      bal[mappedKey].pending = Math.max(0, (bal[mappedKey].pending || 0) - leave.totalDays);
      if (status === "Approved") {
        bal[mappedKey].used = (bal[mappedKey].used || 0) + leave.totalDays;
      }
      await bal.save();
    }

    if (status === "Approved") {
      await autoMarkLeaveAttendance(leave);
    }

    // Notify employee
    await dispatchWorkflow({
      req,
      module: "leave",
      event: "leave_hr_action",
      title: `Leave ${status} by HR`,
      message: `Your leave request (${leave.leaveType}, ${leave.fromDate}–${leave.toDate}) was ${status.toLowerCase()} by HR${remarks ? `: "${remarks}"` : ""}.`,
      priority: "high",
      actionUrl: `/employee/leave`,
      entityType: "leave",
      entityId: leave._id,
      userRefs: [{ userId: leave.userId }],
      metadata: { action: `HR_${status.toUpperCase()}`, leaveType: leave.leaveType },
    });

    const io = getIo(req);
    if (io) io.to(`user_${leave.userId}`).emit("leave_status_updated", leave.toObject());

    res.json({ success: true, message: `Leave ${status.toLowerCase()} by HR`, data: leave });
  } catch (err) {
    console.error("leave.hrAction:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── CANCEL LEAVE ─────────────────────────────────────────────────────────────
async function cancel(req, res) {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    // Only the owner can cancel
    if (String(leave.userId) !== String(req.user._id) && !["ADMIN", "HR"].includes(String(req.user.role).toUpperCase())) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!["Pending PM", "Pending HR"].includes(leave.status)) {
      return res.status(409).json({ success: false, message: "Only pending leaves can be cancelled" });
    }

    // Restore balance
    const bal = await getOrCreateBalance(leave.userId);
    const mappedKey = bal.getMappedKey(leave.leaveType);
    if (bal[mappedKey]) {
      bal[mappedKey].pending = Math.max(0, (bal[mappedKey].pending || 0) - leave.totalDays);
      await bal.save();
    }

    leave.status = "Cancelled";
    leave.cancelledAt = new Date();
    leave.cancelReason = req.body.reason || "";
    await leave.save();

    const io = getIo(req);
    if (io) io.to(`user_${leave.userId}`).emit("leave_status_updated", leave.toObject());

    res.json({ success: true, message: "Leave cancelled", data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── USER LEAVES ──────────────────────────────────────────────────────────────
async function getUserLeaves(req, res) {
  try {
    const userId = req.user._id;
    const { status, year } = req.query;

    const query = { $or: [{ userId }, { employee: req.user.name }] };
    if (status) query.status = new RegExp(status, 'i');
    if (year) {
      const y = String(year);
      query.$and = [
        { $or: [
          { fromDate: { $regex: `^${y}` } },
          { from:     { $regex: `^${y}` } },
        ]},
      ];
    }

    const leaves = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();

    // Normalize to the field names the frontend expects
    const normalized = leaves.map(l => ({
      ...l,
      type:       l.leaveType  || l.type || 'Casual Leave',
      from:       l.fromDate   || l.from || l.startDate,
      to:         l.toDate     || l.to   || l.endDate,
      days:       l.totalDays  || l.days || 1,
      status:     l.status     || 'Pending',
      reason:     l.reason     || '',
      reviewedBy: l.hrAction?.actionBy
                    ? { name: l.hrAction.actionByName, _id: l.hrAction.actionBy }
                    : l.pmAction?.actionBy
                    ? { name: l.pmAction.actionByName, _id: l.pmAction.actionBy }
                    : null,
      reviewNote: l.hrAction?.remarks || l.pmAction?.remarks || '',
      reviewedAt: l.hrAction?.actionAt || l.pmAction?.actionAt || null,
    }));

    res.json({ success: true, data: normalized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getBalance(req, res) {
  try {
    const balance = await getOrCreateBalance(req.user._id);
    res.json({ success: true, data: balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── ADMIN: LIST ALL ──────────────────────────────────────────────────────────
async function list(req, res) {
  try {
    const role = String(req.user?.role || "").toUpperCase();
    const query =
      role === "MEMBER"
        ? { $or: [{ userId: req.user._id }, { employee: req.user.name }] }
        : {};
    const documents = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: documents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getById(req, res) {
  try {
    const doc = await LeaveRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Leave not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function create(req, res) {
  // Normalize field aliases so both admin and employee frontends work:
  //   frontend sends: { type, from, to, reason, halfDay, emergencyContact }
  //   apply() expects: { leaveType, fromDate, toDate, reason, emergencyContact }
  if (req.body.type && !req.body.leaveType)    req.body.leaveType = req.body.type;
  if (req.body.from && !req.body.fromDate)     req.body.fromDate  = req.body.from;
  if (req.body.to   && !req.body.toDate)       req.body.toDate    = req.body.to;
  if (req.body.halfDay)                        req.body.totalDays = 0.5;
  return apply(req, res);
}

async function update(req, res) {
  try {
    const doc = await LeaveRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Leave not found" });
    const prevStatus = doc.status;
    Object.assign(doc, req.body);
    await doc.save();
    if (req.body.status === "Approved" && prevStatus !== "Approved") {
      await autoMarkLeaveAttendance(doc);
    }
    res.json({ success: true, message: "Leave updated", data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function remove(req, res) {
  try {
    const doc = await LeaveRequest.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Leave not found" });
    res.json({ success: true, message: "Leave deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function exportLeaves(req, res) {
  try {
    const role = String(req.user?.role || "").toUpperCase();
    const query =
      role === "MEMBER" ? { $or: [{ userId: req.user._id }, { employee: req.user.name }] } : {};
    const docs = await LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
    const rows = docs.map((d) => ({
      "Employee": d.employee || "N/A",
      "Department": d.department || "N/A",
      "Leave Type": d.leaveType || "N/A",
      "From": d.fromDate || "N/A",
      "To": d.toDate || "N/A",
      "Days": d.totalDays || 1,
      "Status": d.status || "N/A",
      "PM Action": d.pmAction?.status || "-",
      "HR Action": d.hrAction?.status || "-",
      "Reason": d.reason || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaves");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", 'attachment; filename="Leaves_Report.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  list, getById, create, update, remove,
  apply, pmAction, hrAction, cancel,
  getUserLeaves, getBalance,
  exportLeaves,
};
