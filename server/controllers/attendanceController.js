// server/controllers/attendanceController.js
const AttendanceRecord = require("../models/AttendanceRecord");
const Attendance = require("../models/Attendance"); // legacy model – still used by admin pages
const User = require("../models/User");
const XLSX = require("xlsx");

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getIo(req) {
  return req?.app?.get?.("io") || null;
}

function formatTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── PUNCH IN ────────────────────────────────────────────────────────────────
async function punchIn(req, res) {
  try {
    const today = getTodayKey();
    const existing = await AttendanceRecord.findOne({ userId: req.user._id, date: today });

    if (existing?.punchInAt) {
      return res.status(409).json({ success: false, message: "Already punched in for today" });
    }

    let record;
    if (existing) {
      existing.punchInAt = new Date();
      existing.status = req.body.status || "Present";
      existing.location = req.body.location || existing.location;
      existing.selfieUrl = req.body.selfieUrl || existing.selfieUrl;
      existing.deviceInfo = req.body.deviceInfo || existing.deviceInfo;
      existing.note = req.body.note || existing.note;
      record = await existing.save();
    } else {
      record = await AttendanceRecord.create({
        userId: req.user._id,
        userName: req.user.name,
        employee: req.user.name,
        department: req.user.department || "",
        role: req.user.role || "",
        date: today,
        punchInAt: new Date(),
        status: req.body.status || "Present",
        location: req.body.location || {},
        selfieUrl: req.body.selfieUrl || "",
        deviceInfo: req.body.deviceInfo || "",
        note: req.body.note || "",
        checkIn: formatTime(new Date()),
        checkInAt: new Date().toISOString(),
      });
    }

    const io = getIo(req);
    if (io) io.to(`user_${req.user._id}`).emit("attendance_updated", record.toObject());

    res.status(201).json({ success: true, message: "Punched in successfully", data: record });
  } catch (err) {
    console.error("punchIn:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── PUNCH OUT ───────────────────────────────────────────────────────────────
async function punchOut(req, res) {
  try {
    const today = getTodayKey();
    const record = await AttendanceRecord.findOne({ userId: req.user._id, date: today });

    if (!record || !record.punchInAt) {
      return res.status(404).json({ success: false, message: "No punch-in record found for today" });
    }
    if (record.punchOutAt) {
      return res.status(409).json({ success: false, message: "Already punched out for today" });
    }

    // Close any open break
    const openBreak = record.breaks.find((b) => b.startAt && !b.endAt);
    if (openBreak) {
      openBreak.endAt = new Date();
    }

    record.punchOutAt = new Date();
    record.checkOut = formatTime(record.punchOutAt);
    record.checkOutAt = record.punchOutAt.toISOString();
    if (req.body.note) record.note = req.body.note;

    // hours auto-calculated by pre-save hook
    await record.save();

    const io = getIo(req);
    if (io) io.to(`user_${req.user._id}`).emit("attendance_updated", record.toObject());

    res.json({ success: true, message: "Punched out successfully", data: record });
  } catch (err) {
    console.error("punchOut:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── BREAK MANAGEMENT ────────────────────────────────────────────────────────
async function manageBreak(req, res) {
  try {
    const today = getTodayKey();
    const record = await AttendanceRecord.findOne({ userId: req.user._id, date: today });

    if (!record || !record.punchInAt) {
      return res.status(404).json({ success: false, message: "No punch-in record found for today" });
    }
    if (record.punchOutAt) {
      return res.status(409).json({ success: false, message: "Shift already ended" });
    }

    const { action } = req.body; // "start" or "end"
    const openBreak = record.breaks.find((b) => b.startAt && !b.endAt);

    if (action === "start") {
      if (openBreak) return res.status(409).json({ success: false, message: "Break already active" });
      record.breaks.push({ startAt: new Date() });
    } else if (action === "end") {
      if (!openBreak) return res.status(404).json({ success: false, message: "No active break found" });
      openBreak.endAt = new Date();
    } else {
      return res.status(400).json({ success: false, message: "action must be 'start' or 'end'" });
    }

    await record.save();

    const io = getIo(req);
    if (io) io.to(`user_${req.user._id}`).emit("attendance_updated", record.toObject());

    res.json({ success: true, message: action === "start" ? "Break started" : "Break ended", data: record });
  } catch (err) {
    console.error("manageBreak:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── TODAY STATUS ─────────────────────────────────────────────────────────────
async function getTodayStatus(req, res) {
  try {
    const today = getTodayKey();
    const record = await AttendanceRecord.findOne({ userId: req.user._id, date: today }).lean();
    res.json({ success: true, data: record || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── USER CALENDAR (Month View) ───────────────────────────────────────────────
async function getUserAttendance(req, res) {
  try {
    const userId = req.params.userId || req.user._id;

    // Restrict: non-admin can only see own records
    const callerRole = String(req.user?.role || "").toUpperCase();
    const isOwn = String(userId) === String(req.user._id);
    if (!isOwn && !["ADMIN", "HR", "MANAGER", "PROJECT_MANAGER", "TEAM_LEAD"].includes(callerRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { month, year } = req.query;
    const y = Number(year) || new Date().getFullYear();
    const m = month ? String(month).padStart(2, "0") : String(new Date().getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}`;

    const records = await AttendanceRecord.find({
      userId,
      date: { $regex: `^${prefix}` },
    })
      .sort({ date: 1 })
      .lean();

    const monthly = {
      present: 0, absent: 0, halfDay: 0, wfh: 0, leave: 0, holiday: 0,
      totalHours: 0, effectiveHours: 0,
    };
    records.forEach((r) => {
      if (r.status === "Present") monthly.present++;
      else if (r.status === "Absent") monthly.absent++;
      else if (r.status === "Half Day") monthly.halfDay++;
      else if (r.status === "WFH") monthly.wfh++;
      else if (r.status === "On Leave") monthly.leave++;
      else if (r.status === "Holiday") monthly.holiday++;
      monthly.totalHours += r.totalHours || 0;
      monthly.effectiveHours += r.effectiveHours || 0;
    });

    res.json({ success: true, data: records, summary: monthly });
  } catch (err) {
    console.error("getUserAttendance:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── ADMIN: LIST ALL ──────────────────────────────────────────────────────────
async function list(req, res) {
  try {
    const role = String(req.user?.role || "").toUpperCase();
    const query =
      role === "MEMBER"
        ? { $or: [{ userId: req.user._id }, { userName: req.user.name }, { employee: req.user.name }] }
        : {};

    // Try new model first, fall back to legacy
    let documents = await AttendanceRecord.find(query).sort({ date: -1, createdAt: -1 }).lean();
    if (!documents.length) {
      documents = await Attendance.find(query).sort({ date: -1, createdAt: -1 }).lean();
    }

    const users = await User.find({}, "name email department role designation profilePhoto");
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
      userMap[u.name.toLowerCase()] = u;
    });

    const enriched = documents.map((doc) => {
      const u = userMap[String(doc.userId)] || userMap[(doc.employee || doc.userName || "").toLowerCase()] || {};
      return {
        ...doc,
        profilePhoto: u.profilePhoto || "",
        department: u.department || doc.department || "IT",
        designation: u.designation || doc.role || u.role || "Employee",
        checkInFormatted: formatTime(doc.punchInAt || doc.checkInAt),
        checkOutFormatted: formatTime(doc.punchOutAt || doc.checkOutAt),
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("attendance list:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getById(req, res) {
  try {
    const doc =
      (await AttendanceRecord.findById(req.params.id).lean()) ||
      (await Attendance.findById(req.params.id).lean());
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── STATS / KPI SUMMARY (for employee frontend: /attendance/stats) ───
async function getStats(req, res) {
  try {
    const userId = req.user._id;
    const now = new Date();
    const year  = Number(req.query.year)  || now.getFullYear();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    const m = String(month).padStart(2, '0');

    const records = await AttendanceRecord.find({
      userId,
      date: { $regex: `^${year}-${m}` },
    }).lean();

    const workingDays = records.filter(r => !['holiday', 'weekend'].includes((r.status || '').toLowerCase())).length;
    const present     = records.filter(r => ['present', 'wfh'].includes((r.status || '').toLowerCase())).length;
    const absent      = records.filter(r => (r.status || '').toLowerCase() === 'absent').length;
    const late        = records.filter(r => r.isLate === true || (r.status || '').toLowerCase() === 'late').length;
    
    // Compute total hours dynamically if a record is still active
    const totalHours = records.reduce((s, r) => {
      let hrs = r.totalHours || r.effectiveHours || 0;
      if (r.punchInAt && !r.punchOutAt) {
        const diffMs = new Date().getTime() - new Date(r.punchInAt).getTime();
        let breakMs = 0;
        if (r.breaks && r.breaks.length) {
          r.breaks.forEach(br => {
            if (br.startAt) {
              const bEnd = br.endAt || new Date();
              breakMs += bEnd.getTime() - new Date(br.startAt).getTime();
            }
          });
        }
        hrs = Math.max(0, Math.round(((diffMs - breakMs) / 3600000) * 100) / 100);
      }
      return s + hrs;
    }, 0);
    
    const rate        = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

    res.json({
      success: true,
      data: {
        workingDays, presentDays: present, absentDays: absent,
        lateDays: late, totalHours: Math.round(totalHours * 100) / 100, attendancePercentage: rate
      }
    });
  } catch (err) {
    console.error('getStats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getById(req, res) {
  try {
    const doc =
      (await AttendanceRecord.findById(req.params.id).lean()) ||
      (await Attendance.findById(req.params.id).lean());
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function create(req, res) {
  // Admin marking attendance for a specific user
  const { user: userId, date, status, checkIn, checkOut } = req.body;

  // If no userId given, fall back to punchIn for self
  if (!userId) return punchIn(req, res);

  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const dateStr = date || new Date().toISOString().slice(0, 10);

    // Build punchIn/punchOut from time strings
    let punchInAt = null, punchOutAt = null;
    if (checkIn) {
      const [h, m] = checkIn.split(':');
      punchInAt = new Date(`${dateStr}T${h.padStart(2,'0')}:${m.padStart(2,'0')}:00`);
    }
    if (checkOut) {
      const [h, m] = checkOut.split(':');
      punchOutAt = new Date(`${dateStr}T${h.padStart(2,'0')}:${m.padStart(2,'0')}:00`);
    }

    // Upsert: find existing or create new
    let record = await AttendanceRecord.findOne({ userId, date: dateStr });
    if (record) {
      record.status = status || record.status;
      if (punchInAt) record.punchInAt = punchInAt;
      if (punchOutAt) record.punchOutAt = punchOutAt;
      if (checkIn) record.checkIn = checkIn;
      if (checkOut) record.checkOut = checkOut;
      await record.save();
    } else {
      record = await AttendanceRecord.create({
        userId,
        userName: targetUser.name,
        employee: targetUser.name,
        department: targetUser.department || '',
        role: targetUser.role || '',
        date: dateStr,
        status: status || 'Present',
        punchInAt,
        punchOutAt,
        checkIn: checkIn || '',
        checkOut: checkOut || '',
      });
    }

    res.status(201).json({ success: true, message: 'Attendance marked', data: record });
  } catch (err) {
    console.error('mark attendance:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function update(req, res) {
  try {
    let doc = await AttendanceRecord.findById(req.params.id);
    if (!doc) doc = await Attendance.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });
    Object.assign(doc, req.body);
    await doc.save();
    res.json({ success: true, message: "Updated", data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function remove(req, res) {
  try {
    const doc =
      (await AttendanceRecord.findByIdAndDelete(req.params.id)) ||
      (await Attendance.findByIdAndDelete(req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
async function exportAttendance(req, res) {
  try {
    const role = String(req.user?.role || "").toUpperCase();
    const query =
      role === "MEMBER"
        ? { $or: [{ userId: req.user._id }, { userName: req.user.name }, { employee: req.user.name }] }
        : {};

    const documents = await AttendanceRecord.find(query).sort({ date: -1 }).lean();
    const rows = documents.map((doc) => ({
      "Employee Name": doc.employee || doc.userName || "N/A",
      Department: doc.department || "N/A",
      Date: doc.date || "N/A",
      "Punch In": formatTime(doc.punchInAt) || doc.checkIn || "-",
      "Punch Out": formatTime(doc.punchOutAt) || doc.checkOut || "-",
      "Total Hours": doc.totalHours || doc.hours || 0,
      "Break Hours": doc.breakHours || 0,
      "Effective Hours": doc.effectiveHours || 0,
      Status: doc.status || "N/A",
      Note: doc.note || doc.remarks || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="Attendance_Report.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── LEGACY ALIASES ───────────────────────────────────────────────────────────
const checkIn  = punchIn;
const checkOut = punchOut;

// ─── BREAK CONVENIENCE WRAPPERS ──────────────────────────────────────────────
async function breakStart(req, res) {
  req.body = { ...req.body, action: 'start' };
  return manageBreak(req, res);
}
async function breakEnd(req, res) {
  req.body = { ...req.body, action: 'end' };
  return manageBreak(req, res);
}

// ─── HISTORY (for employee frontend: /attendance/history) ────────────────────
async function getHistory(req, res) {
  try {
    const userId = req.user._id;
    const { days, year, month, size = 100 } = req.query;

    let query = { userId };

    if (year && month) {
      const m = String(month).padStart(2, '0');
      query.date = { $regex: `^${year}-${m}` };
    } else if (days) {
      const since = new Date();
      since.setDate(since.getDate() - Number(days));
      query.date = { $gte: since.toISOString().slice(0, 10) };
    }

    const records = await AttendanceRecord.find(query)
      .sort({ date: -1 })
      .limit(Number(size))
      .lean();

    // Normalize field names for frontend
    const normalized = records.map(r => ({
      ...r,
      punchIn:        r.punchInAt  || r.checkInAt  || null,
      punchOut:       r.punchOutAt || r.checkOutAt || null,
      workingMinutes: r.effectiveHours ? Math.round(r.effectiveHours * 60)
                    : r.totalHours    ? Math.round(r.totalHours * 60)
                    : r.workingMinutes || 0,
      breakMinutes:   r.breakHours ? Math.round(r.breakHours * 60) : r.breakMinutes || 0,
      status:         (r.status || 'present').toLowerCase(),
    }));

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error('getHistory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─── STATS / KPI SUMMARY (for employee frontend: /attendance/stats) ──────────
async function getStats(req, res) {
  try {
    const userId = req.user._id;
    const now = new Date();
    const year  = Number(req.query.year)  || now.getFullYear();
    const month = Number(req.query.month) || (now.getMonth() + 1);
    const m = String(month).padStart(2, '0');

    const records = await AttendanceRecord.find({
      userId,
      date: { $regex: `^${year}-${m}` },
    }).lean();

    const workingDays = records.filter(r => !['holiday', 'weekend'].includes((r.status || '').toLowerCase())).length;
    const present     = records.filter(r => ['present', 'wfh'].includes((r.status || '').toLowerCase())).length;
    const absent      = records.filter(r => (r.status || '').toLowerCase() === 'absent').length;
    const late        = records.filter(r => r.isLate === true || (r.status || '').toLowerCase() === 'late').length;
    const totalHours  = records.reduce((s, r) => s + (r.totalHours || r.effectiveHours || 0), 0);
    const rate        = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

    res.json({
      success: true,
      data: {
        presentDays: present,
        absentDays:  absent,
        lateDays:    late,
        totalHours:  Math.round(totalHours * 10) / 10,
        attendancePercentage: rate,
        workingDays,
        month, year,
      },
    });
  } catch (err) {
    console.error('getStats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  list, getById, create, update, remove,
  punchIn, punchOut, manageBreak,
  breakStart, breakEnd,        // convenience wrappers for /break/start and /break/end
  getTodayStatus, getUserAttendance,
  getHistory, getStats,        // Phase 9 frontend endpoints
  exportAttendance,
  checkIn, checkOut,           // legacy compat
};
