const DepartmentReview = require("../models/DepartmentReview");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const Requirement = require("../models/Requirement");
const User = require("../models/User");

// Helper: Emit IO Event
function emitEvent(req, eventName, payload) {
  const io = req.app.get("io");
  if (io) {
    io.emit(eventName, payload);
  }
}

// Helper: Log Audit
async function logAudit(action, reviewId, user, details) {
  try {
    await AuditLog.create({
      title: "Department Review Action",
      name: action,
      metadata: { reviewId, details },
      owner: user ? user._id : "System",
      userName: user ? user.name : "System",
      role: user ? user.role : "System",
      date: new Date().toISOString()
    });
  } catch (err) {
    console.error("Audit Log Error:", err);
  }
}

// Helper: Send Notification
async function sendNotification(title, message, reviewId, priority = "medium") {
  try {
    await Notification.create({
      title,
      message,
      type: "REVIEW_UPDATE",
      module: "DepartmentReview",
      priority,
      entityType: "DepartmentReview",
      entityId: reviewId,
      actionUrl: `/department-review`
    });
  } catch (err) {
    console.error("Notification Error:", err);
  }
}

async function list(req, res) {
  try {
    const filter = req.query.filter || "";
    const query = {};

    if (filter === "pending") query.status = "Pending";
    if (filter === "approved") query.status = "Approved";
    if (filter === "rejected") query.status = "Rejected";

    const reviews = await DepartmentReview.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getById(req, res) {
  try {
    const review = await DepartmentReview.findById(req.params.id).lean();
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    res.json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function create(req, res) {
  try {
    const payload = req.body;
    const review = await DepartmentReview.create(payload);
    
    emitEvent(req, "review_created", { reviewId: review._id });
    await logAudit("Review Created", review._id, req.user, payload);
    await sendNotification("New Department Review", `Review created for ${payload.company}`, review._id, "high");

    res.status(201).json({ success: true, message: "Review created", data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const review = await DepartmentReview.findById(id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const oldStatus = review.status;
    review.status = status;
    review.lastActionAt = Date.now();
    await review.save();

    emitEvent(req, "review_updated", { reviewId: review._id, status });
    await logAudit("Status Updated", review._id, req.user, { oldStatus, newStatus: status });

    res.json({ success: true, message: `Status updated to ${status}`, data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function updateFeasibility(req, res) {
  try {
    const { id } = req.params;
    const { technicalScore, resourceScore, financialScore } = req.body;
    
    const review = await DepartmentReview.findById(id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (!review.feasibility) review.feasibility = {};
    if (technicalScore !== undefined) review.feasibility.technicalScore = technicalScore;
    if (resourceScore !== undefined) review.feasibility.resourceScore = resourceScore;
    if (financialScore !== undefined) review.feasibility.financialScore = financialScore;
    
    review.lastActionAt = Date.now();
    await review.save(); 

    emitEvent(req, "review_updated", { reviewId: review._id, type: "feasibility" });
    await logAudit("Feasibility Updated", review._id, req.user, { technicalScore, resourceScore, financialScore });

    res.json({ success: true, message: "Feasibility updated", data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function addClarification(req, res) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    const review = await DepartmentReview.findById(id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    review.clarifications.push({
      authorId: req.user?._id || null,
      authorName: req.user?.name || "System",
      message: message,
      timestamp: Date.now()
    });
    
    review.lastActionAt = Date.now();
    await review.save();

    emitEvent(req, "clarification_added", { reviewId: review._id });
    await logAudit("Clarification Added", review._id, req.user, { message });
    await sendNotification("Clarification Required", `New clarification added for ${review.company}`, review._id, "medium");

    res.json({ success: true, message: "Clarification added", data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function processApproval(req, res) {
  try {
    const { id } = req.params;
    const { status, notes, role } = req.body;
    
    const review = await DepartmentReview.findById(id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    let approvalIndex = review.approvals.findIndex(a => a.role === role);
    if (approvalIndex === -1) {
      review.approvals.push({ role, status, notes, approvedBy: req.user?._id, approvedByName: req.user?.name, timestamp: Date.now() });
    } else {
      review.approvals[approvalIndex].status = status;
      review.approvals[approvalIndex].notes = notes;
      review.approvals[approvalIndex].approvedBy = req.user?._id;
      review.approvals[approvalIndex].approvedByName = req.user?.name;
      review.approvals[approvalIndex].timestamp = Date.now();
    }
    
    if (status === "Approved") {
      if (role === "Final Approval") {
        review.status = "Approved";
        
        // Product Manager Handover
        const productController = require('./productController');
        const reqDoc = await productController.generateFromDepartmentReview(review._id);
        
        await logAudit("PM Handover", review._id, req.user, { requirementId: reqDoc._id });
        await sendNotification("Review Approved & Transferred", `Review for ${review.company} is approved. Product Manager notified.`, review._id, "high");
      }
    } else if (status === "Rejected") {
      review.status = "Rejected";
      await sendNotification("Review Rejected", `Review for ${review.company} was rejected at ${role} stage.`, review._id, "high");
    }

    review.lastActionAt = Date.now();
    await review.save();

    emitEvent(req, "review_approved", { reviewId: review._id, status, role });
    await logAudit("Approval Processed", review._id, req.user, { role, status, notes });

    res.json({ success: true, message: "Approval processed", data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function getDashboardStats(req, res) {
  try {
    const total = await DepartmentReview.countDocuments();
    const pending = await DepartmentReview.countDocuments({ status: "Pending" });
    const approved = await DepartmentReview.countDocuments({ status: "Approved" });
    const rejected = await DepartmentReview.countDocuments({ status: "Rejected" });
    const underReview = await DepartmentReview.countDocuments({ status: "Under Review" });
    const clarification = await DepartmentReview.countDocuments({ status: "Clarification" });
    const criticalRisks = await DepartmentReview.countDocuments({ priority: "Critical" });
    
    // Recent Activities (from AuditLogs)
    const recentActivities = await AuditLog.find({ "metadata.reviewId": { $exists: true } })
                                           .sort({ date: -1 }).limit(10).lean();
    
    // Performance stats
    const deptStats = await DepartmentReview.aggregate([
      { $group: { _id: "$department", total: { $sum: 1 }, approved: { $sum: { $cond: [ { $eq: ["$status", "Approved"] }, 1, 0 ] } } } }
    ]);
    
    // Upcoming Deadlines (simplification: reviews created in last 7 days still pending/under review)
    const upcomingDeadlines = await DepartmentReview.find({ status: { $in: ["Pending", "Under Review", "Clarification"] } })
                                                    .sort({ createdAt: 1 }).limit(5).lean();

    res.json({
      success: true,
      data: {
        counts: { total, pending, approved, rejected, underReview, clarification, criticalRisks },
        recentActivities,
        departmentPerformance: deptStats,
        upcomingDeadlines
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateChecklist(req, res) {
  try {
    const { id } = req.params;
    const { label, checked } = req.body;
    
    const review = await DepartmentReview.findById(id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (!review.checklist) review.checklist = [];
    
    const index = review.checklist.findIndex(c => c.label === label);
    if (index === -1) {
      review.checklist.push({ label, checked, checkedBy: req.user?.name || "User" });
    } else {
      review.checklist[index].checked = checked;
      review.checklist[index].checkedBy = req.user?.name || "User";
    }
      
    review.lastActionAt = Date.now();
    await review.save();
    
    emitEvent(req, "review_updated", { reviewId: review._id, type: "checklist" });
    res.json({ success: true, message: "Checklist updated", data: review.checklist });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function uploadAttachment(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const review = await DepartmentReview.findById(id);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const attachment = {
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user?.name || "User"
    };

    review.attachments.push(attachment);
    review.lastActionAt = Date.now();
    await review.save();

    emitEvent(req, "review_updated", { reviewId: review._id, type: "attachment" });
    await logAudit("Attachment Uploaded", review._id, req.user, { filename: attachment.filename });

    res.json({ success: true, message: "File uploaded successfully", data: attachment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  list,
  getById,
  create,
  updateStatus,
  updateFeasibility,
  addClarification,
  processApproval,
  getDashboardStats,
  updateChecklist,
  uploadAttachment
};
