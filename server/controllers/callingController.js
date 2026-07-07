const CallLog = require("../models/CallLog");
const Lead = require("../models/Lead");
const User = require("../models/User");

// Get dashboard metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    // For demo purposes or real queries
    const leads = await Lead.find({ assignedTo: userId });
    
    const assignedCount = leads.length;
    const attemptedCount = leads.filter(l => l.assignmentStatus === "Attempted").length;
    const connectedCount = leads.filter(l => l.assignmentStatus === "Connected").length;
    const interestedCount = leads.filter(l => l.assignmentStatus === "Interested").length;
    const convertedCount = leads.filter(l => l.assignmentStatus === "Converted").length;
    const notCalledCount = leads.filter(l => !l.assignmentStatus || l.assignmentStatus === "Not Called" || l.assignmentStatus === "Assigned").length;
    
    // Recent logs
    const recentLogs = await CallLog.find({ salesExecutiveId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("leadId", "name phone company");

    res.status(200).json({
      success: true,
      data: {
        funnel: {
          assigned: assignedCount,
          attempted: attemptedCount,
          connected: connectedCount,
          interested: interestedCount,
          converted: convertedCount,
          notCalled: notCalledCount
        },
        recentActivity: recentLogs,
      }
    });
  } catch (error) {
    console.error("Error in getDashboardMetrics:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get calling queue (Leads assigned to agent)
exports.getCallingQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    const statusFilter = req.query.status;
    const query = { assignedTo: userId };
    if (statusFilter) {
      query.assignmentStatus = statusFilter;
    }
    
    const leads = await Lead.find(query).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    console.error("Error in getCallingQueue:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Log a call and run smart engine rules
exports.logCall = async (req, res) => {
  try {
    const { leadId, status, durationSeconds, notes, nextFollowUpAt, customerRequirement } = req.body;
    const userId = req.user.id;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    // Create call log
    const newLog = await CallLog.create({
      leadId,
      salesExecutiveId: userId,
      status,
      durationSeconds,
      notes,
      customerRequirement,
      nextFollowUpAt
    });

    // Smart Engine logic
    let newLeadStatus = status; 
    let newPriority = lead.priority || "Medium";

    // Mapping statuses if needed
    if (status === "Not Picked" || status === "Busy" || status === "Switched Off") {
      newLeadStatus = "Attempted";
    } else if (status === "Call Back Later" || status === "Follow-Up Required") {
      newLeadStatus = "Follow-up";
    } else if (status === "Connected") {
      newLeadStatus = "Connected";
    }

    if (status === "Interested" || status === "Very Interested") {
      newPriority = "High";
      newLeadStatus = "Interested";
    } else if (status === "Not Interested" || status === "Wrong Number") {
      newPriority = "Low";
      newLeadStatus = "Lost";
    } else if (status === "Deal Closed") {
      newLeadStatus = "Converted";
    }

    // Auto mark cold after 3 missed calls
    if (["Attempted", "Not Called"].includes(newLeadStatus)) {
      const pastLogs = await CallLog.find({ leadId });
      const missedCount = pastLogs.filter(l => ["Not Picked", "Busy", "Switched Off"].includes(l.status)).length;
      if (missedCount >= 3) {
        newPriority = "Low";
      }
    }

    lead.assignmentStatus = newLeadStatus;
    lead.priority = newPriority;
    if (nextFollowUpAt) lead.followUpDate = nextFollowUpAt;
    
    await lead.save();

    res.status(201).json({ success: true, data: newLog, message: "Call logged successfully" });
  } catch (error) {
    console.error("Error in logCall:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Handover to sales
exports.handoverLead = async (req, res) => {
  try {
    const { leadId, salesRepId } = req.body;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    lead.assignmentStatus = "Sales Handover";
    // Usually logic to create a Deal in Sales pipeline goes here
    
    await lead.save();
    res.status(200).json({ success: true, message: "Lead handed over to sales" });
  } catch (error) {
    console.error("Error in handoverLead:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
