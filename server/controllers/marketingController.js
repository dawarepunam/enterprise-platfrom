const MarketingLead = require("../models/MarketingLead");
const LeadImport = require("../models/LeadImport");
const LeadAssignment = require("../models/LeadAssignment");
const Campaign = require("../models/Campaign");
const LeadSource = require("../models/LeadSource");
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.getDashboardKPIs = async (req, res) => {
  try {
    const [
      totalLeads,
      todayLeads,
      importedLeads,
      assignedLeads,
      pendingLeads,
      hotLeads,
      recentLeads,
      recentImports,
      recentAssignments,
      campaigns,
      sources,
      notifications,
    ] = await Promise.all([
      MarketingLead.countDocuments(),
      MarketingLead.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      LeadImport.aggregate([{ $group: { _id: null, total: { $sum: "$validRows" } } }]),
      MarketingLead.countDocuments({ assignmentStatus: "Assigned" }),
      MarketingLead.countDocuments({ assignmentStatus: "Pending" }),
      MarketingLead.countDocuments({ quality: "Hot" }),
      MarketingLead.find().sort({ createdAt: -1 }).limit(8).lean(),
      LeadImport.find().sort({ createdAt: -1 }).limit(6).lean(),
      LeadAssignment.find().sort({ createdAt: -1 }).limit(6).lean(),
      Campaign.find({ department: "Marketing" }).sort({ createdAt: -1 }).limit(6).lean(),
      LeadSource.find().sort({ totalLeads: -1 }).limit(6).lean(),
      Notification.find({ $or: [{ userId: req.user._id }, { role: req.user.role }] })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const statusBuckets = await MarketingLead.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]);
    const sourceBuckets = await MarketingLead.aggregate([{ $group: { _id: "$source", total: { $sum: 1 } } }]);
    const trendBuckets = await MarketingLead.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 14 },
    ]);

    const activityFeed = [
      ...recentImports.map((item) => ({
        id: String(item._id),
        type: "import",
        title: "Lead import completed",
        description: `${item.validRows} valid leads added from ${item.fileName || "manual import"}.`,
        createdAt: item.createdAt,
      })),
      ...recentAssignments.map((item) => ({
        id: String(item._id),
        type: "assignment",
        title: "Lead assignment completed",
        description: `${item.leadIds.length} lead(s) assigned to ${item.assignedToName}.`,
        createdAt: item.createdAt,
      })),
      ...campaigns.map((item) => ({
        id: String(item._id),
        type: "campaign",
        title: `${item.name} campaign active`,
        description: `${item.channel || "Mixed"} campaign status is ${item.status}.`,
        createdAt: item.updatedAt || item.createdAt,
      })),
    ]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        kpis: {
          totalLeads,
          todayLeads,
          importedLeads: importedLeads[0]?.total || 0,
          assignedLeads,
          pendingLeads,
          hotLeads,
        },
        recentLeads,
        recentImports,
        recentAssignments,
        campaigns,
        sources,
        notifications,
        analytics: {
          leadStatus: statusBuckets,
          leadSources: sourceBuckets,
          leadTrend: trendBuckets,
        },
        activities: activityFeed,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching KPIs" });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.quality) filters.quality = req.query.quality;
    if (req.query.priority) filters.priority = req.query.priority;

    const leads = await MarketingLead.find(filters).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching leads" });
  }
};

exports.createLead = async (req, res) => {
  try {
    const lead = new MarketingLead({
      ...req.body,
      timeline: [
        {
          type: "activity",
          title: "Lead Created",
          actor: req.user.name,
          description: "Lead manually created",
        },
      ],
    });
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating lead" });
  }
};

exports.qualifyLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality, priority, notes, budget } = req.body;
    
    const lead = await MarketingLead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    lead.quality = quality || lead.quality;
    lead.priority = priority || lead.priority;
    lead.budget = budget !== undefined ? budget : lead.budget;
    lead.status = "Qualified";
    
    lead.timeline.push({
      type: "activity",
      title: "Lead Qualified",
      actor: req.user.name,
      description: notes || "Lead has been qualified",
    });

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error qualifying lead" });
  }
};

exports.assignLead = async (req, res) => {
  try {
    const { leadIds, assigneeId } = req.body;
    
    const assignee = await User.findById(assigneeId);
    if (!assignee) return res.status(404).json({ success: false, message: "User not found" });

    await MarketingLead.updateMany(
      { _id: { $in: leadIds } },
      {
        $set: {
          assignedToUserId: assignee._id,
          assignedToName: assignee.name,
          assignedToEmail: assignee.email,
          assignmentStatus: "Assigned",
          status: "Assigned"
        },
        $push: {
          timeline: {
            type: "activity",
            title: "Lead Assigned",
            actor: req.user.name,
            description: `Assigned to ${assignee.name}`,
          }
        }
      }
    );

    res.json({ success: true, message: `Assigned ${leadIds.length} leads to ${assignee.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error assigning leads" });
  }
};
