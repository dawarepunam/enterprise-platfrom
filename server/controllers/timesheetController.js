const Timesheet = require("../models/Timesheet");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { dispatchWorkflow } = require("../services/workflowService");

async function autoMarkTimesheetAttendance(timesheetRecord) {
    try {
        if (!timesheetRecord.hours || timesheetRecord.hours < 8) return;

        const user = await User.findOne({
            $or: [{ _id: timesheetRecord.userId }, { name: timesheetRecord.employee }]
        });
        if (!user) return;

        const dateStr = timesheetRecord.date || new Date(timesheetRecord.createdAt).toISOString().slice(0, 10);

        let record = await Attendance.findOne({
            date: dateStr,
            $or: [{ userId: user._id }, { userName: user.name }, { employee: user.name }]
        });

        if (!record) {
            record = new Attendance({
                userId: user._id,
                userName: user.name,
                employee: user.name,
                role: user.role,
                date: dateStr,
            });
        }

        if (record.status !== "Present" && record.status !== "Late" && record.status !== "Half Day") {
            record.status = "Present";
            record.remarks = `Auto marked from Timesheet log: ${timesheetRecord.taskTitle || "Work log"}`;
            record.hours = timesheetRecord.hours;
            record.checkIn = "09:00 AM";
            record.checkOut = "05:00 PM";
            await record.save();
        }
    } catch (err) {
        console.error("Error auto marking timesheet attendance:", err);
    }
}

async function list(req, res) {
    const role = String(req.user?.role || "").toUpperCase();
    const query = role === "MEMBER" ? { $or: [{ userId: req.user._id }, { employee: req.user.name }] } : {};
    const documents = await Timesheet.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: documents });
}

async function getById(req, res) {
    const document = await Timesheet.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "timesheet record not found" });
    }

    res.json({ success: true, data: document });
}

async function create(req, res) {
    const payload = {
        ...req.body,
        userId: req.user._id,
        employee: req.user.name,
        role: req.user.role,
        status: req.body.status || "Pending",
    };
    const document = await Timesheet.create(payload);

    await dispatchWorkflow({
        req,
        module: "timesheets",
        event: "TIMESHEET_SUBMITTED",
        title: "Timesheet submitted",
        message: `${req.user.name} submitted ${payload.hours || 0} hours for ${payload.taskTitle || "assigned work"}.`,
        priority: "medium",
        actionUrl: "/employee/tasks",
        entityType: "timesheet",
        entityId: document._id,
    });

    res.status(201).json({ success: true, message: "timesheet created", data: document });
}

async function update(req, res) {
    const document = await Timesheet.findById(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "timesheet record not found" });
    }

    Object.assign(document, req.body);
    await document.save();
    res.json({ success: true, message: "timesheet updated", data: document });
}

async function remove(req, res) {
    const document = await Timesheet.findByIdAndDelete(req.params.id);
    if (!document) {
        return res.status(404).json({ success: false, message: "timesheet record not found" });
    }

    res.json({ success: true, message: "timesheet deleted", id: req.params.id });
}

module.exports = { autoMarkTimesheetAttendance, list, getById, create, update, remove };
