const Department = require("../models/Department");
const MarketingLead = require("../models/MarketingLead");
const DepartmentLead = require("../models/DepartmentLead");
const RoutingHistory = require("../models/RoutingHistory");
const PriorityLead = require("../models/PriorityLead");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");

const DEFAULT_DEPARTMENTS = [
  ["CRM Team", "CRM", "CRM implementation and workflow configuration"],
  ["HRMS Team", "HRMS", "HR, payroll and attendance implementation"],
  ["Website Team", "WEB", "Website delivery and frontend execution"],
  ["Mobile App Team", "APP", "Mobile product and app delivery"],
  ["AI Team", "AI", "AI agents, automations and intelligence features"],
  ["ERP Team", "ERP", "ERP and school/enterprise operations systems"],
  ["E-Commerce Team", "ECOM", "Commerce storefront and operations"],
  ["Digital Marketing Team", "DMKT", "Campaign execution and digital acquisition"],
];

function normalizeRole(role = "") {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizePriority(value = "") {
  const priority = String(value || "Medium").trim();
  if (["Low", "Medium", "High", "Critical"].includes(priority)) return priority;
  return "Medium";
}

function buildSuggestion(requirement = "", source = "", budget = 0) {
  const text = `${requirement} ${source}`.toLowerCase();
  if (/erp|school|campus|fee|attendance/.test(text)) return { department: "ERP Team", confidence: 92, timeline: "3 - 5 Days" };
  if (/hr|payroll|leave|hrms/.test(text)) return { department: "HRMS Team", confidence: 91, timeline: "4 - 6 Days" };
  if (/website|landing|frontend|portal/.test(text)) return { department: "Website Team", confidence: 88, timeline: "5 - 7 Days" };
  if (/mobile|android|ios|app/.test(text)) return { department: "Mobile App Team", confidence: 89, timeline: "8 - 12 Days" };
  if (/ai|bot|automation|agent|prediction/.test(text)) return { department: "AI Team", confidence: 94, timeline: "6 - 10 Days" };
  if (/shop|commerce|store|cart/.test(text)) return { department: "E-Commerce Team", confidence: 86, timeline: "5 - 8 Days" };
  if (/marketing|campaign|ads|seo/.test(text)) return { department: "Digital Marketing Team", confidence: 84, timeline: "2 - 4 Days" };
  if (Number(budget || 0) >= 300000) return { department: "CRM Team", confidence: 79, timeline: "4 - 7 Days" };
  return { department: "CRM Team", confidence: 74, timeline: "3 - 5 Days" };
}

function buildTimelineEntry(title, description, actor, metadata = {}) {
  return {
    type: "routing",
    title,
    description,
    actor,
    at: new Date(),
    metadata,
  };
}

async function ensureDepartments() {
  for (const [name, code, description] of DEFAULT_DEPARTMENTS) {
    await Department.findOneAndUpdate(
      { code },
      {
        $setOnInsert: {
          name,
          code,
          description,
          status: "ACTIVE",
        },
      },
      { upsert: true, new: true },
    );
  }
}

async function ensureLeadMirror(lead, payload, actor) {
  lead.routingStatus = payload.department ? "Routed" : lead.routingStatus;
  lead.routedDepartment = payload.department || lead.routedDepartment;
  lead.routedDepartmentCode = payload.departmentCode || lead.routedDepartmentCode;
  lead.routedProductManagerId = payload.productManagerId || lead.routedProductManagerId;
  lead.routedProductManagerName = payload.productManagerName || lead.routedProductManagerName;
  lead.routingPriority = payload.priority || lead.routingPriority;
  lead.routingDeadline = payload.deadline || lead.routingDeadline;
  lead.routingNotes = payload.notes || lead.routingNotes;
  lead.priority = payload.priority || lead.priority;
  lead.lastActivityAt = new Date();
  lead.timeline.push(
    buildTimelineEntry(
      payload.action || "Lead Routed",
      `${payload.department || lead.routedDepartment} selected with ${payload.priority || lead.priority} priority.`,
      actor,
      { department: payload.department, priority: payload.priority },
    ),
  );
  await lead.save();
}

async function upsertDepartmentQueue(lead, payload, actor) {
  return DepartmentLead.findOneAndUpdate(
    { leadId: lead._id },
    {
      leadId: lead._id,
      leadName: lead.name,
      company: lead.company,
      requirement: lead.requirement,
      budget: payload.expectedBudget,
      department: payload.department,
      departmentCode: payload.departmentCode,
      priority: payload.priority,
      assignedProductManagerId: payload.productManagerId || null,
      assignedProductManagerName: payload.productManagerName || "",
      deadline: payload.deadline,
      status: "New",
      routedById: actor._id,
      routedByName: actor.name,
      notes: payload.notes || "",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

async function syncPriorityLead(lead, queueRecord) {
  if (["High", "Critical"].includes(queueRecord.priority)) {
    await PriorityLead.findOneAndUpdate(
      { leadId: lead._id },
      {
        leadId: lead._id,
        leadName: lead.name,
        company: lead.company,
        department: queueRecord.department,
        priority: queueRecord.priority,
        deadline: queueRecord.deadline,
        assignedProductManagerName: queueRecord.assignedProductManagerName,
        status: queueRecord.status,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } else {
    await PriorityLead.findOneAndDelete({ leadId: lead._id });
  }
}

async function getDashboardData(req) {
  await ensureDepartments();
  const [departments, pendingLeads, routedLeads, history, priorityLeads, queue, managers] = await Promise.all([
    Department.find({ status: "ACTIVE" }).sort({ name: 1 }).lean(),
    MarketingLead.find({ assignmentStatus: "Assigned", routingStatus: { $ne: "Routed" } }).sort({ updatedAt: -1 }).lean(),
    MarketingLead.find({ routingStatus: "Routed" }).sort({ updatedAt: -1 }).lean(),
    RoutingHistory.find().sort({ createdAt: -1 }).limit(30).lean(),
    PriorityLead.find().sort({ updatedAt: -1 }).lean(),
    DepartmentLead.find().sort({ updatedAt: -1 }).lean(),
    User.find({ role: "MANAGER", status: "ACTIVE" }).sort({ name: 1 }).lean(),
  ]);

  const departmentLoad = departments.map((department) => {
    const items = queue.filter((item) => item.department === department.name);
    return {
      name: department.name,
      code: department.code,
      count: items.length,
      highPriority: items.filter((item) => ["High", "Critical"].includes(item.priority)).length,
      preview: items.slice(0, 4),
    };
  });

  const analytics = {
    distribution: departmentLoad.map((item) => ({ _id: item.name, total: item.count })),
    routingSpeed: history.slice(0, 7).reverse().map((item, index) => ({ _id: `Day ${index + 1}`, total: 1 })),
    load: departmentLoad.map((item) => ({ _id: item.code || item.name, total: item.count })),
  };

  const unroutedLeads = pendingLeads.map((lead) => ({
    ...lead,
    aiSuggestion: buildSuggestion(lead.requirement, lead.source, lead.budget),
  }));

  return {
    departments,
    managers,
    queue,
    priorityLeads,
    history,
    departmentLoad,
    analytics,
    unroutedLeads,
    kpis: {
      pendingRouting: unroutedLeads.length,
      assignedDepartments: queue.length,
      highPriorityLeads: priorityLeads.filter((item) => item.priority === "High").length,
      criticalLeads: priorityLeads.filter((item) => item.priority === "Critical").length,
      todaysRoutedLeads: history.filter((item) => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return new Date(item.createdAt) >= start;
      }).length,
      aiSuggestedRouting: unroutedLeads.filter((item) => item.aiSuggestion.confidence >= 85).length,
    },
  };
}

async function dashboard(req, res) {
  const data = await getDashboardData(req);
  res.json({ success: true, data });
}

async function listLeads(req, res) {
  const data = await getDashboardData(req);
  res.json({ success: true, data: data.unroutedLeads });
}

async function listHistory(req, res) {
  const items = await RoutingHistory.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
}

async function assign(req, res) {
  await ensureDepartments();
  const lead = await MarketingLead.findById(req.body.leadId);
  if (!lead) {
    return res.status(404).json({ success: false, message: "Lead not found" });
  }

  const department = await Department.findOne({ name: req.body.department, status: "ACTIVE" }).lean();
  if (!department) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  const manager = req.body.productManagerId ? await User.findById(req.body.productManagerId).lean() : null;
  if (req.body.productManagerId && !manager) {
    return res.status(404).json({ success: false, message: "Product manager not found" });
  }

  const payload = {
    department: department.name,
    departmentCode: department.code,
    priority: normalizePriority(req.body.priority),
    expectedBudget: Number(req.body.expectedBudget || lead.budget || 0),
    deadline: req.body.deadline ? new Date(req.body.deadline) : null,
    productManagerId: manager?._id || null,
    productManagerName: manager?.name || "",
    notes: req.body.notes || "",
    action: "Lead Routed",
  };

  const previous = {
    department: lead.routedDepartment || "",
    priority: lead.routingPriority || "",
    productManager: lead.routedProductManagerName || "",
    deadline: lead.routingDeadline || null,
  };

  await ensureLeadMirror(lead, payload, req.user.name);
  const queueRecord = await upsertDepartmentQueue(lead, payload, req.user);
  await syncPriorityLead(lead, queueRecord);

  const history = await RoutingHistory.create({
    leadId: lead._id,
    leadName: lead.name,
    action: "Lead Routed",
    oldDepartment: previous.department,
    newDepartment: payload.department,
    oldPriority: previous.priority,
    newPriority: payload.priority,
    oldProductManager: previous.productManager,
    newProductManager: payload.productManagerName,
    oldDeadline: previous.deadline,
    newDeadline: payload.deadline,
    actorId: req.user._id,
    actorName: req.user.name,
    notes: payload.notes,
  });

  const io = req.app.get("io");
  await createNotification(
    {
      role: "MANAGER",
      module: "routing",
      type: "LEAD_ROUTED",
      priority: payload.priority === "Critical" ? "high" : "medium",
      title: `New Lead Assigned To ${payload.department}`,
      message: `${lead.name} routed to ${payload.department}.`,
      actionUrl: "/department-routing",
      entityType: "RoutingHistory",
      entityId: history._id,
    },
    io,
  );

  if (manager?._id) {
    await createNotification(
      {
        userId: manager._id,
        role: manager.role,
        module: "routing",
        type: "PM_ASSIGNED",
        priority: payload.priority === "Critical" ? "high" : "medium",
        title: "New routed lead assigned",
        message: `${lead.name} assigned to you for ${payload.department}.`,
        actionUrl: "/department-routing",
        entityType: "DepartmentLead",
        entityId: queueRecord._id,
      },
      io,
    );
  }

  if (io) {
    io.emit("leadRouted", { leadId: String(lead._id), department: payload.department });
    io.emit("departmentChanged", { leadId: String(lead._id), department: payload.department });
    if (["High", "Critical"].includes(payload.priority)) {
      io.emit("newPriorityLead", { leadId: String(lead._id), priority: payload.priority });
    }
  }

  res.status(201).json({ success: true, message: "Lead routed successfully", data: { queueRecord, history } });
}

async function update(req, res) {
  const lead = await MarketingLead.findById(req.body.leadId || req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, message: "Lead not found" });
  }
  const existing = await DepartmentLead.findOne({ leadId: lead._id });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Department queue record not found" });
  }

  const departmentName = req.body.department || existing.department;
  const department = await Department.findOne({ name: departmentName, status: "ACTIVE" }).lean();
  const manager = req.body.productManagerId ? await User.findById(req.body.productManagerId).lean() : null;
  const payload = {
    department: department?.name || existing.department,
    departmentCode: department?.code || existing.departmentCode,
    priority: normalizePriority(req.body.priority || existing.priority),
    expectedBudget: Number(req.body.expectedBudget || existing.budget || lead.budget || 0),
    deadline: req.body.deadline ? new Date(req.body.deadline) : existing.deadline,
    productManagerId: manager?._id || existing.assignedProductManagerId || null,
    productManagerName: manager?.name || existing.assignedProductManagerName || "",
    notes: req.body.notes || existing.notes || "",
    action: "Routing Updated",
  };

  await ensureLeadMirror(lead, payload, req.user.name);
  const queueRecord = await upsertDepartmentQueue(lead, payload, req.user);
  await syncPriorityLead(lead, queueRecord);

  const history = await RoutingHistory.create({
    leadId: lead._id,
    leadName: lead.name,
    action: "Routing Updated",
    oldDepartment: existing.department,
    newDepartment: payload.department,
    oldPriority: existing.priority,
    newPriority: payload.priority,
    oldProductManager: existing.assignedProductManagerName,
    newProductManager: payload.productManagerName,
    oldDeadline: existing.deadline,
    newDeadline: payload.deadline,
    actorId: req.user._id,
    actorName: req.user.name,
    notes: payload.notes,
  });

  const io = req.app.get("io");
  if (io) {
    io.emit("departmentChanged", { leadId: String(lead._id), department: payload.department });
    io.emit("pmAssigned", { leadId: String(lead._id), productManager: payload.productManagerName });
  }

  res.json({ success: true, message: "Routing updated", data: { queueRecord, history } });
}

module.exports = {
  dashboard,
  listLeads,
  listHistory,
  assign,
  update,
};
