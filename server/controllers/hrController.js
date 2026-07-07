const multer = require("multer");
const User = require("../models/User");
const Leave = require("../models/Leave");
const File = require("../models/File");
const Interview = require("../models/Interview");
const RecruitmentJob = require("../models/RecruitmentJob");
const CandidateApplication = require("../models/CandidateApplication");
const OfferLetter = require("../models/OfferLetter");
const { getUploadConfig } = require("../config/multer");
const { createNotification } = require("../services/notificationService");
const { sendMailViaMicrosoft, createTeamsMeeting } = require("../services/microsoftGraphService");
const {
  CANDIDATE_STAGES,
  getAttendanceWorkspace,
  getDashboardData,
  getEmployeeCollection,
  getEmployeeProfile,
  getInterviewsWorkspace,
  getLeavesWorkspace,
  getPayrollWorkspace,
  getRecruitmentWorkspace,
  getReportsWorkspace,
} = require("../services/hrService");

const uploadMiddleware = multer(getUploadConfig()).single("file");

function normalizeBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizeCandidateStage(value, fallback = "Applied") {
  const raw = String(value || "").trim().toLowerCase();
  const match = CANDIDATE_STAGES.find((stage) => stage.toLowerCase() === raw);
  return match || fallback;
}

function deriveEmployeeRole(candidate = {}) {
  const position = `${candidate.position || ""} ${candidate.department || ""}`.toLowerCase();
  if (position.includes("hr")) return "HR";
  if (position.includes("manager")) return "MANAGER";
  if (position.includes("team lead") || position.includes("lead")) return "TEAM_LEAD";
  if (position.includes("sales")) return "SALES";
  if (position.includes("marketing")) return "MARKETING";
  return "MEMBER";
}

function buildUsername(seed = "employee") {
  const normalized = String(seed || "employee")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${normalized || "employee"}.${Date.now().toString().slice(-6)}`;
}

async function broadcastRecruitment(req, payload = {}) {
  const io = req.app.get("io");
  if (io) {
    io.emit("hr:recruitment-updated", { at: new Date().toISOString(), ...payload });
  }
}

async function dashboard(req, res) {
  const data = await getDashboardData();
  res.json({ success: true, data });
}

async function listEmployees(req, res) {
  const data = await getEmployeeCollection(req.query);
  res.json({ success: true, data });
}

async function getEmployee(req, res) {
  const data = await getEmployeeProfile(req.params.id);
  if (!data) {
    return res.status(404).json({ success: false, message: "Employee not found" });
  }

  res.json({ success: true, data });
}

async function attendance(req, res) {
  const data = await getAttendanceWorkspace();
  res.json({ success: true, data });
}

async function payroll(req, res) {
  const data = await getPayrollWorkspace();
  res.json({ success: true, data });
}

async function leaves(req, res) {
  const data = await getLeavesWorkspace();
  res.json({ success: true, data });
}

async function reports(req, res) {
  const data = await getReportsWorkspace();
  res.json({ success: true, data });
}

async function interviews(req, res) {
  const data = await getInterviewsWorkspace();
  res.json({ success: true, data });
}

async function recruitment(req, res) {
  const data = await getRecruitmentWorkspace();
  res.json({ success: true, data });
}

async function createRecruitmentJob(req, res) {
  const job = await RecruitmentJob.create({
    title: String(req.body.title || "").trim(),
    department: String(req.body.department || "").trim(),
    location: String(req.body.location || "").trim(),
    description: String(req.body.description || "Fresh hiring role created from the recruitment desk.").trim(),
    deadline: req.body.deadline ? new Date(req.body.deadline) : null,
    status: "Open",
    hiringManagerId: req.user?._id || null,
    hiringManagerName: req.user?.name || "HR Team",
    openings: Number(req.body.openings || 1),
  });

  await createNotification({
    title: "New job posted",
    message: `${job.title} has been published in the recruitment desk.`,
    type: "JOB_POSTED",
    module: "hr",
    priority: "medium",
    role: "HR",
    actionUrl: "/hr/interviews.html",
    entityType: "recruitment-job",
    entityId: String(job._id),
  }, req.app.get("io"));

  await broadcastRecruitment(req, { type: "job-created", jobId: String(job._id) });
  res.status(201).json({ success: true, message: "Job posted successfully", data: job });
}

async function updateRecruitmentJob(req, res) {
  const job = await RecruitmentJob.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }

  if (req.body.title !== undefined) job.title = String(req.body.title || "").trim() || job.title;
  if (req.body.department !== undefined) job.department = String(req.body.department || "").trim();
  if (req.body.location !== undefined) job.location = String(req.body.location || "").trim();
  if (req.body.description !== undefined) job.description = String(req.body.description || "").trim();
  if (req.body.deadline !== undefined) job.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
  if (req.body.openings !== undefined) job.openings = Math.max(1, Number(req.body.openings || 1));
  if (req.body.status !== undefined) job.status = ["Open", "Closed", "Paused"].includes(req.body.status) ? req.body.status : job.status;
  await job.save();

  await broadcastRecruitment(req, { type: "job-updated", jobId: String(job._id) });
  res.json({ success: true, message: "Job updated successfully", data: job });
}

async function closeRecruitmentJob(req, res) {
  const job = await RecruitmentJob.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, message: "Job not found" });
  }

  job.status = "Closed";
  await job.save();
  await broadcastRecruitment(req, { type: "job-closed", jobId: String(job._id) });
  res.json({ success: true, message: "Hiring closed successfully", data: job });
}

async function createCandidate(req, res) {
  const candidate = await CandidateApplication.create({
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim().toLowerCase(),
    phone: String(req.body.phone || "").trim(),
    position: String(req.body.position || req.body.role || "").trim(),
    department: String(req.body.department || "").trim(),
    status: normalizeCandidateStage(req.body.status, "Applied"),
    experience: Number(req.body.experience || 0),
    skills: Array.isArray(req.body.skills)
      ? req.body.skills.map((item) => String(item || "").trim()).filter(Boolean)
      : String(req.body.skills || "").split(",").map((item) => item.trim()).filter(Boolean),
    location: String(req.body.location || "").trim(),
    education: String(req.body.education || "").trim(),
    expectedSalary: String(req.body.expectedSalary || "").trim(),
    notes: String(req.body.notes || "Added manually by HR.").trim(),
    resume: {
      fileName: String(req.body.resumeFileName || req.body.resume || "").trim(),
      fileUrl: String(req.body.resumeUrl || "").trim(),
    },
    jobId: req.body.jobId || null,
    source: "HR Desk",
  });

  await createNotification({
    title: "Candidate added",
    message: `${candidate.name} has been added to ${candidate.position}.`,
    type: "CANDIDATE_CREATED",
    module: "hr",
    priority: "medium",
    role: "HR",
    actionUrl: "/hr/interviews.html",
    entityType: "candidate",
    entityId: String(candidate._id),
  }, req.app.get("io"));

  await broadcastRecruitment(req, { type: "candidate-created", candidateId: String(candidate._id) });
  res.status(201).json({ success: true, message: "Candidate added successfully", data: candidate });
}

async function updateCandidateStage(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  candidate.status = normalizeCandidateStage(req.body.status, candidate.status);
  if (req.body.notes !== undefined) {
    candidate.notes = String(req.body.notes || "").trim();
  }
  await candidate.save();

  await broadcastRecruitment(req, { type: "candidate-stage", candidateId: String(candidate._id), status: candidate.status });
  res.json({ success: true, message: "Candidate stage updated successfully", data: candidate });
}

async function candidateProfile(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id).populate("jobId").populate("interviewId").populate("hiredUserId");
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  res.json({ success: true, data: candidate });
}

async function candidateEmail(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  const result = await sendMailViaMicrosoft({
    to: [candidate.email],
    subject: req.body.subject || `Update regarding ${candidate.position}`,
    html: `<p>Hello ${candidate.name},</p><p>${String(req.body.message || `This is an update regarding your ${candidate.position} application.`).trim()}</p><p>Regards,<br />${req.user.name}</p>`,
    text: String(req.body.message || `This is an update regarding your ${candidate.position} application.`),
  }, req.user?._id);

  await createNotification({
    title: "Candidate mail sent",
    message: `Recruitment mail sent to ${candidate.name}.`,
    type: "CANDIDATE_MAIL",
    module: "hr",
    priority: "low",
    role: "HR",
    actionUrl: "/hr/interviews.html",
    entityType: "candidate",
    entityId: String(candidate._id),
  }, req.app.get("io"));

  res.json({ success: true, message: "Candidate email sent successfully", data: result });
}

async function scheduleCandidateInterview(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  const startDateTime = req.body.startDateTime ? new Date(req.body.startDateTime) : null;
  if (!startDateTime || Number.isNaN(startDateTime.getTime())) {
    return res.status(400).json({ success: false, message: "Valid interview start time is required" });
  }

  let meetingJoinUrl = "";
  let calendarEventId = "";
  try {
    const meeting = await createTeamsMeeting({
      title: req.body.title || `${candidate.position} Interview`,
      description: req.body.description || `Interview scheduled for ${candidate.name}.`,
      startDateTime: startDateTime.toISOString(),
      endDateTime: new Date(startDateTime.getTime() + Number(req.body.durationMinutes || 45) * 60000).toISOString(),
      attendees: [{ email: candidate.email, name: candidate.name }],
    }, req.user?._id);
    meetingJoinUrl = meeting.joinUrl || "";
    calendarEventId = meeting.eventId || "";
  } catch (error) {
    // Keep interview creation resilient when Microsoft integrations are unavailable.
  }

  const interview = await Interview.create({
    candidateName: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    position: candidate.position,
    department: candidate.department,
    stage: "Interview",
    status: "SCHEDULED",
    scheduledAt: startDateTime,
    durationMinutes: Number(req.body.durationMinutes || 45),
    meetingJoinUrl,
    calendarEventId,
    notes: String(req.body.notes || candidate.notes || "Interview scheduled from recruitment desk.").trim(),
    createdBy: req.user?._id || null,
  });

  candidate.status = "Interview";
  candidate.interviewId = interview._id;
  await candidate.save();

  await broadcastRecruitment(req, { type: "interview-created", candidateId: String(candidate._id), interviewId: String(interview._id) });
  res.status(201).json({ success: true, message: "Interview scheduled successfully", data: interview });
}

async function rejectCandidateProfile(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  candidate.status = "Rejected";
  if (req.body.notes !== undefined) {
    candidate.notes = String(req.body.notes || "").trim();
  }
  await candidate.save();

  await broadcastRecruitment(req, { type: "candidate-rejected", candidateId: String(candidate._id) });
  res.json({ success: true, message: "Candidate rejected successfully", data: candidate });
}

async function hireCandidateProfile(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  let employee = await User.findOne({ email: candidate.email });
  if (!employee) {
    employee = await User.create({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      role: deriveEmployeeRole(candidate),
      department: candidate.department,
      designation: candidate.position,
      title: candidate.position,
      username: buildUsername(candidate.name),
      password: "Welcome@123",
      status: "ACTIVE",
      skills: candidate.skills || [],
      joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : new Date(),
      microsoft: {
        outlookEmail: candidate.email,
        outlookReady: true,
        calendarReady: true,
        teamsReady: true,
        oneDriveReady: true,
      },
    });
  }

  candidate.status = "Hired";
  candidate.hiredUserId = employee._id;
  await candidate.save();

  await createNotification({
    title: "Candidate hired",
    message: `${candidate.name} has been moved to employees.`,
    type: "CANDIDATE_HIRED",
    module: "hr",
    priority: "high",
    role: "HR",
    actionUrl: "/hr/employees.html",
    entityType: "user",
    entityId: String(employee._id),
  }, req.app.get("io"));

  await broadcastRecruitment(req, { type: "candidate-hired", candidateId: String(candidate._id), employeeId: String(employee._id) });
  res.json({ success: true, message: "Candidate hired and employee record created", data: { candidate, employee } });
}

async function sendRecruitmentOffer(req, res) {
  const candidate = await CandidateApplication.findById(req.params.id);
  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  const offer = await OfferLetter.findOneAndUpdate(
    { candidateId: candidate._id },
    {
      candidateId: candidate._id,
      candidateName: candidate.name,
      email: candidate.email,
      designation: req.body.designation || candidate.position,
      department: req.body.department || candidate.department,
      manager: req.body.manager || req.user.name,
      salary: req.body.salary || candidate.expectedSalary || "As discussed",
      joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : new Date(Date.now() + 7 * 86400000),
      status: "Sent",
      sentAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const joiningLabel = offer.joiningDate
    ? new Date(offer.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "to be confirmed";

  const result = await sendMailViaMicrosoft({
    to: [candidate.email],
    subject: req.body.subject || `Offer Letter for ${offer.designation}`,
    html: `<p>Hello ${candidate.name},</p><p>${String(req.body.message || `We are pleased to move forward with your application for ${offer.designation}.`).trim()}</p><p><strong>Department:</strong> ${offer.department}<br /><strong>Manager:</strong> ${offer.manager}<br /><strong>Salary:</strong> ${offer.salary}<br /><strong>Joining Date:</strong> ${joiningLabel}</p><p>Regards,<br />${req.user.name}</p>`,
    text: String(req.body.message || `Your offer for ${offer.designation} has been generated.`),
  }, req.user?._id);

  candidate.status = "Offer Sent";
  await candidate.save();

  await broadcastRecruitment(req, { type: "offer-sent", candidateId: String(candidate._id), offerId: String(offer._id) });
  res.json({ success: true, message: "Offer letter sent successfully", data: { offer, mail: result } });
}

async function acceptRecruitmentOffer(req, res) {
  const offer = await OfferLetter.findById(req.params.id);
  if (!offer) {
    return res.status(404).json({ success: false, message: "Offer not found" });
  }

  offer.status = "Accepted";
  offer.acceptedAt = new Date();
  await offer.save();

  const candidate = await CandidateApplication.findById(offer.candidateId);
  let employee = null;
  if (candidate) {
    candidate.status = "Hired";
    employee = candidate.hiredUserId ? await User.findById(candidate.hiredUserId) : await User.findOne({ email: candidate.email });
    if (!employee) {
      employee = await User.create({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        role: deriveEmployeeRole(candidate),
        department: candidate.department,
        designation: candidate.position,
        title: candidate.position,
        username: buildUsername(candidate.name),
        password: "Welcome@123",
        status: "ACTIVE",
        skills: candidate.skills || [],
        joiningDate: offer.joiningDate || new Date(),
        microsoft: {
          outlookEmail: candidate.email,
          outlookReady: true,
          calendarReady: true,
          teamsReady: true,
          oneDriveReady: true,
        },
      });
    }
    candidate.hiredUserId = employee._id;
    await candidate.save();
  }

  await broadcastRecruitment(req, { type: "offer-accepted", offerId: String(offer._id), candidateId: candidate ? String(candidate._id) : "" });
  res.json({ success: true, message: "Offer marked as accepted", data: { offer, employee } });
}

async function approveLeave(req, res) {
  const leave = await Leave.findById(req.params.id);
  if (!leave) {
    return res.status(404).json({ success: false, message: "Leave request not found" });
  }

  leave.status = "Approved";
  leave.reviewedBy = req.user.name;
  leave.reviewedAt = new Date();
  leave.reviewNote = String(req.body.note || "Approved by HR").trim();
  await leave.save();

  // Sync approved leave dates to attendance log
  try {
    const user = await User.findOne({
      $or: [{ _id: leave.userId }, { name: leave.employee }]
    });
    if (user) {
      const Attendance = require("../models/Attendance");
      const start = new Date(leave.fromDate || leave.date);
      const end = new Date(leave.toDate || leave.date);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        let curr = new Date(start);
        while (curr <= end) {
          const dateStr = curr.toISOString().slice(0, 10);
          
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

          record.status = "On Leave";
          record.remarks = `Leave approved: ${leave.reason || leave.category || "Approved Leave"}`;
          record.hours = 0;
          record.checkIn = "";
          record.checkOut = "";
          await record.save();

          curr.setDate(curr.getDate() + 1);
        }
      }
    }
  } catch (err) {
    console.error("Error auto marking leave attendance from HR approve:", err);
  }

  const io = req.app.get("io");
  await createNotification({
    title: "Leave approved",
    message: `Your leave request has been approved by ${req.user.name}.`,
    type: "LEAVE_APPROVED",
    module: "hr",
    priority: "high",
    userId: leave.userId || null,
    role: leave.role || "",
    actionUrl: "/hr/dashboard.html",
    entityType: "leave",
    entityId: String(leave._id),
  }, io);

  try {
    const employee = leave.userId ? await User.findById(leave.userId) : null;
    if (employee?.email) {
      await sendMailViaMicrosoft({
        to: [employee.email],
        subject: "Leave request approved",
        html: `<p>Hello ${employee.name},</p><p>Your leave request from ${leave.fromDate || "-"} to ${leave.toDate || "-"} has been approved.</p>`,
        text: `Your leave request from ${leave.fromDate || "-"} to ${leave.toDate || "-"} has been approved.`,
      }, req.user?._id);
    }
  } catch (error) {
    // Keep the approval flow resilient even if Microsoft mail is unavailable.
  }

  if (io) {
    io.emit("hr:leave-updated", { leaveId: String(leave._id), status: leave.status });
  }

  res.json({ success: true, message: "Leave approved successfully", data: leave });
}

async function createAttendanceEntry(req, res) {
  const targetUser = req.body.employeeId ? await User.findById(req.body.employeeId) : await User.findOne({ email: String(req.body.email || "").trim().toLowerCase() });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: "Employee not found for attendance entry" });
  }

  const checkInAt = req.body.checkInAt ? new Date(req.body.checkInAt) : new Date();
  const checkOutAt = req.body.checkOutAt ? new Date(req.body.checkOutAt) : null;
  const hours = checkOutAt ? Math.max(0, Math.round(((checkOutAt - checkInAt) / 36e5) * 10) / 10) : Number(req.body.hours || 0);

  const record = await require("../models/Attendance").create({
    userId: targetUser._id,
    userName: targetUser.name,
    employee: targetUser.name,
    role: targetUser.role,
    date: req.body.date || checkInAt.toISOString().slice(0, 10),
    checkInAt: checkInAt.toISOString(),
    checkOutAt: checkOutAt ? checkOutAt.toISOString() : "",
    status: req.body.status || "Present",
    hours,
    breakHours: Number(req.body.breakHours || 0),
    overtimeHours: Number(req.body.overtimeHours || Math.max(0, hours - 8)),
    productiveHours: Number(req.body.productiveHours || Math.max(0, hours - Number(req.body.breakHours || 0))),
    lateMinutes: Number(req.body.lateMinutes || 0),
    note: String(req.body.note || "").trim(),
  });

  await broadcastRecruitment(req, { type: "attendance-created", attendanceId: String(record._id), employeeId: String(targetUser._id) });
  res.status(201).json({ success: true, message: "Attendance entry added successfully", data: record });
}

async function createLeaveEntry(req, res) {
  const targetUser = req.body.employeeId ? await User.findById(req.body.employeeId) : await User.findOne({ email: String(req.body.email || "").trim().toLowerCase() });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: "Employee not found for leave entry" });
  }

  const leave = await Leave.create({
    userId: targetUser._id,
    employee: targetUser.name,
    role: targetUser.role,
    fromDate: String(req.body.fromDate || "").trim(),
    toDate: String(req.body.toDate || "").trim(),
    leaveType: String(req.body.leaveType || req.body.category || "General").trim(),
    category: String(req.body.leaveType || req.body.category || "General").trim(),
    reason: String(req.body.reason || "").trim(),
    status: String(req.body.status || "Pending").trim(),
    note: String(req.body.note || "").trim(),
  });

  await createNotification({
    title: "Leave request created",
    message: `${targetUser.name} leave request has been added by HR.`,
    type: "LEAVE_CREATED",
    module: "hr",
    priority: "medium",
    userId: targetUser._id,
    role: targetUser.role || "",
    actionUrl: "/hr/leaves.html",
    entityType: "leave",
    entityId: String(leave._id),
  }, req.app.get("io"));

  res.status(201).json({ success: true, message: "Leave entry created successfully", data: leave });
}

async function rejectLeave(req, res) {
  const leave = await Leave.findById(req.params.id);
  if (!leave) {
    return res.status(404).json({ success: false, message: "Leave request not found" });
  }

  leave.status = "Rejected";
  leave.reviewedBy = req.user.name;
  leave.reviewedAt = new Date();
  leave.reviewNote = String(req.body.note || "Rejected by HR").trim();
  await leave.save();

  const io = req.app.get("io");
  await createNotification({
    title: "Leave rejected",
    message: `Your leave request has been rejected by ${req.user.name}.`,
    type: "LEAVE_REJECTED",
    module: "hr",
    priority: "medium",
    userId: leave.userId || null,
    role: leave.role || "",
    actionUrl: "/hr/dashboard.html",
    entityType: "leave",
    entityId: String(leave._id),
  }, io);

  if (io) {
    io.emit("hr:leave-updated", { leaveId: String(leave._id), status: leave.status });
  }

  res.json({ success: true, message: "Leave rejected successfully", data: leave });
}

async function holdLeave(req, res) {
  const leave = await Leave.findById(req.params.id);
  if (!leave) {
    return res.status(404).json({ success: false, message: "Leave request not found" });
  }

  leave.status = "On Hold";
  leave.reviewedBy = req.user.name;
  leave.reviewedAt = new Date();
  leave.reviewNote = String(req.body.note || "Marked on hold by HR").trim();
  await leave.save();

  const io = req.app.get("io");
  await createNotification({
    title: "Leave on hold",
    message: `Your leave request is currently on hold.`,
    type: "LEAVE_ON_HOLD",
    module: "hr",
    priority: "medium",
    userId: leave.userId || null,
    role: leave.role || "",
    actionUrl: "/hr/dashboard.html",
    entityType: "leave",
    entityId: String(leave._id),
  }, io);

  if (io) {
    io.emit("hr:leave-updated", { leaveId: String(leave._id), status: leave.status });
  }

  res.json({ success: true, message: "Leave put on hold successfully", data: leave });
}

async function uploadEmployeeFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please attach a file." });
  }

  const targetUser = await User.findById(req.body.employeeId || req.body.entityId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: "Employee not found for upload" });
  }

  const microsoftController = require("./microsoftController");
  req.body.module = "hr-documents";
  req.body.entityType = "employee";
  req.body.entityId = String(targetUser._id);
  req.body.projectId = req.body.projectId || "";
  req.body.folderPath = req.body.folderPath || `HR/${targetUser.department || "General"}/${targetUser.name}/Documents`;
  await microsoftController.uploadToOneDrive(req, res);
}

async function getSettings(req, res) {
  const user = await User.findById(req.user._id);
  const profile = user?.preferences || {};
  res.json({
    success: true,
    data: {
      profile: {
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        department: user?.department || "",
        designation: user?.designation || user?.title || "",
      },
      preferences: {
        darkMode: Boolean(profile.darkMode),
        notificationsEnabled: profile.notificationsEnabled !== false,
        privacyMode: Boolean(profile.privacyMode),
        twoFactorEnabled: Boolean(user?.security?.twoFactorEnabled),
      },
      integrations: {
        teamsReady: Boolean(user?.microsoft?.teamsReady),
        outlookReady: Boolean(user?.microsoft?.outlookReady),
        calendarReady: Boolean(user?.microsoft?.calendarReady),
        oneDriveReady: Boolean(user?.microsoft?.oneDriveReady),
        outlookEmail: user?.microsoft?.outlookEmail || user?.email || "",
      },
    },
  });
}

async function updateSettings(req, res) {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (req.body.name !== undefined) user.name = String(req.body.name).trim();
  if (req.body.phone !== undefined) user.phone = String(req.body.phone).trim();
  if (req.body.department !== undefined) user.department = String(req.body.department).trim();
  if (req.body.designation !== undefined) user.designation = String(req.body.designation).trim();

  user.preferences = {
    ...(user.preferences || {}),
    darkMode: normalizeBoolean(req.body.darkMode, user.preferences?.darkMode),
    notificationsEnabled: normalizeBoolean(req.body.notificationsEnabled, user.preferences?.notificationsEnabled !== false),
    privacyMode: normalizeBoolean(req.body.privacyMode, user.preferences?.privacyMode),
  };

  user.security = {
    ...(user.security || {}),
    twoFactorEnabled: normalizeBoolean(req.body.twoFactorEnabled, user.security?.twoFactorEnabled),
  };

  if (req.body.password) {
    user.password = String(req.body.password);
  }

  await user.save();
  res.json({ success: true, message: "Settings updated successfully" });
}

async function sendOfferLetter(req, res) {
  const employee = req.body.employeeId ? await User.findById(req.body.employeeId) : null;
  const recipientEmail = String(req.body.toEmail || employee?.email || "").trim().toLowerCase();
  const recipientName = String(req.body.recipientName || employee?.name || "Candidate").trim();
  if (!recipientEmail) {
    return res.status(400).json({ success: false, message: "Recipient email not found" });
  }

  const bodyHtml = `
    <p>Hello ${recipientName},</p>
    <p>${String(req.body.message || "Please find your offer letter attached and review the details shared by HR.").trim()}</p>
    <p>Regards,<br />${req.user.name}</p>
  `;

  const result = await sendMailViaMicrosoft({
    to: [recipientEmail],
    subject: req.body.subject || "Offer Letter from HR",
    html: bodyHtml,
    text: String(req.body.message || "Please find your offer letter attached."),
  }, req.user?._id);

  await createNotification({
    title: "Offer letter sent",
    message: `Offer letter email was sent to ${recipientName}.`,
    type: "OFFER_LETTER_SENT",
    module: "hr",
    priority: "medium",
    role: "HR",
    actionUrl: "/hr/interviews.html",
    entityType: employee ? "employee" : "candidate",
    entityId: employee ? String(employee._id) : recipientEmail,
  }, req.app.get("io"));

  res.json({ success: true, message: "Offer letter sent successfully", data: result });
}

async function sendReminder(req, res) {
  const employee = req.body.employeeId ? await User.findById(req.body.employeeId) : null;
  const recipientEmail = String(req.body.toEmail || employee?.email || "").trim().toLowerCase();
  if (!recipientEmail) {
    return res.status(400).json({ success: false, message: "Recipient email not found" });
  }

  const result = await sendMailViaMicrosoft({
    to: [recipientEmail],
    subject: req.body.subject || "HR Reminder",
    html: `<p>${String(req.body.message || "This is a reminder from HR.").trim()}</p>`,
    text: String(req.body.message || "This is a reminder from HR."),
  }, req.user?._id);

  res.json({ success: true, message: "Reminder sent successfully", data: result });
}

async function scheduleMeeting(req, res) {
  const employee = req.body.employeeId ? await User.findById(req.body.employeeId) : null;
  const recipientEmail = String(req.body.toEmail || employee?.email || "").trim().toLowerCase();
  const recipientName = String(req.body.recipientName || employee?.name || "Participant").trim();
  if (!recipientEmail) {
    return res.status(400).json({ success: false, message: "Recipient email not found" });
  }

  const result = await createTeamsMeeting({
    title: req.body.title || `${recipientName} HR Meeting`,
    description: req.body.description || "Meeting scheduled by the HR team.",
    startDateTime: req.body.startDateTime,
    endDateTime: req.body.endDateTime,
    attendees: [{ email: recipientEmail, name: recipientName }],
  }, req.user?._id);

  res.json({ success: true, message: "Meeting scheduled successfully", data: result });
}

async function interviewCalendar(req, res) {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    return res.status(404).json({ success: false, message: "Interview not found" });
  }

  const result = await createTeamsMeeting({
    title: `${interview.position || "Interview"} with ${interview.candidateName}`,
    description: interview.notes || "Interview scheduled by HR.",
    startDateTime: interview.scheduledAt,
    endDateTime: new Date(new Date(interview.scheduledAt).getTime() + Number(interview.durationMinutes || 45) * 60000),
    attendees: [{ email: interview.email, name: interview.candidateName }],
  }, req.user?._id);

  interview.calendarEventId = result.eventId || interview.calendarEventId;
  interview.meetingJoinUrl = result.joinUrl || interview.meetingJoinUrl;
  await interview.save();

  res.json({ success: true, message: "Calendar event created successfully", data: result });
}

async function interviewJoin(req, res) {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    return res.status(404).json({ success: false, message: "Interview not found" });
  }

  res.json({
    success: true,
    data: {
      joinUrl: interview.meetingJoinUrl || "https://teams.microsoft.com",
    },
  });
}

async function interviewStatus(req, res) {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    return res.status(404).json({ success: false, message: "Interview not found" });
  }

  if (req.body.scheduledAt) {
    interview.scheduledAt = new Date(req.body.scheduledAt);
  }

  if (req.body.status) {
    interview.status = String(req.body.status).toUpperCase();
  }

  await interview.save();
  res.json({ success: true, message: "Interview updated successfully", data: interview });
}

module.exports = {
  approveLeave,
  attendance,
  createAttendanceEntry,
  createLeaveEntry,
  candidateEmail,
  candidateProfile,
  closeRecruitmentJob,
  createCandidate,
  createRecruitmentJob,
  dashboard,
  getEmployee,
  getSettings,
  holdLeave,
  hireCandidateProfile,
  interviewCalendar,
  interviewJoin,
  interviews,
  interviewStatus,
  leaves,
  listEmployees,
  payroll,
  recruitment,
  rejectLeave,
  rejectCandidateProfile,
  reports,
  scheduleCandidateInterview,
  scheduleMeeting,
  sendRecruitmentOffer,
  sendOfferLetter,
  sendReminder,
  acceptRecruitmentOffer,
  updateCandidateStage,
  updateRecruitmentJob,
  updateSettings,
  uploadEmployeeFile,
  uploadMiddleware,
};
