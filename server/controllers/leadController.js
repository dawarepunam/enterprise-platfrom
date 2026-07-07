const mongoose = require("mongoose");
const multer = require("multer");
const MarketingLead = require("../models/MarketingLead");
const LeadImport = require("../models/LeadImport");
const LeadAssignment = require("../models/LeadAssignment");
const LeadSource = require("../models/LeadSource");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { sendEmail } = require("../services/emailService");

let xlsx = null;
try {
  xlsx = require("xlsx");
} catch (error) {
  xlsx = null;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const MARKETING_ROLES = ["ADMIN", "MANAGER", "MARKETING"];
const ASSIGNABLE_ROLES = ["MARKETING", "SALES", "MANAGER", "TEAM_LEAD", "MEMBER"];

function normalizeRole(role = "") {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isMarketingUser(user) {
  return MARKETING_ROLES.includes(normalizeRole(user?.role));
}

function buildLeadQuery(req) {
  const query = {};
  const search = String(req.query.search || "").trim();
  const filter = String(req.query.filter || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim();
  const source = String(req.query.source || "").trim();
  const conditions = [];

  if (search) {
    conditions.push({
      $or: [
      { name: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { requirement: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (status) query.status = status;
  if (source) query.source = source;

  if (filter === "hot") query.quality = "Hot";
  if (filter === "cold") query.quality = "Cold";
  if (filter === "assigned") query.assignmentStatus = "Assigned";
  if (filter === "pending") query.assignmentStatus = "Pending";
  if (filter === "facebook") query.source = "Facebook Leads";
  if (filter === "website") query.source = "Website Leads";
  if (filter === "google") query.source = "Google Leads";

  if (!isMarketingUser(req.user)) {
    conditions.push({
      $or: [
      { assignedToUserId: req.user?._id },
      { assignedToEmail: req.user?.email || "" },
      ],
    });
  }

  if (conditions.length) {
    query.$and = conditions;
  }

  return query;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function computeAiScore(payload = {}) {
  let score = 20;
  if (payload.phone) score += 15;
  if (payload.email) score += 10;
  if (payload.company) score += 10;
  if (payload.requirement) score += 20;
  if (toNumber(payload.budget) >= 100000) score += 20;
  if (/crm|automation|enterprise|software|marketing/i.test(String(payload.requirement || ""))) score += 10;
  if (/facebook|google|linkedin|website/i.test(String(payload.source || ""))) score += 10;
  return Math.min(100, score);
}

function computeQuality(score) {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

function makeTimelineEntry(type, title, description, actor, metadata = {}) {
  return {
    type,
    title,
    description,
    actor,
    at: new Date(),
    metadata,
  };
}

function normalizeLeadPayload(payload = {}, user = null) {
  const aiScore = computeAiScore(payload);
  return {
    name: String(payload.name || payload.fullName || "").trim(),
    phone: String(payload.phone || payload.contact || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    company: String(payload.company || "").trim(),
    requirement: String(payload.requirement || payload.serviceInterested || "").trim(),
    budget: toNumber(payload.budget || payload.expectedBudget || payload.value),
    source: String(payload.source || "Manual").trim() || "Manual",
    status: String(payload.status || "New").trim() || "New",
    priority: String(payload.priority || "Medium").trim() || "Medium",
    quality: String(payload.quality || computeQuality(aiScore)).trim(),
    aiScore,
    notes: String(payload.notes || payload.message || "").trim(),
    city: String(payload.city || "").trim(),
    tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
    campaignId: payload.campaignId || null,
    campaignName: String(payload.campaignName || "").trim(),
    importedById: user?._id || null,
    importedBy: user?.name || "",
    assignmentStatus: String(payload.assignmentStatus || "Pending").trim(),
    followUpDate: payload.followUpDate || null,
    timeline: [
      makeTimelineEntry(
        "created",
        "Lead created",
        `Lead created from ${String(payload.source || "Manual").trim() || "Manual"} source.`,
        user?.name || "System",
      ),
    ],
  };
}

async function upsertLeadSource(sourceName, lead) {
  if (!sourceName) return;
  const name = String(sourceName).trim();
  if (!name) return;

  const update = {
    $inc: {
      totalLeads: 1,
      hotLeads: lead.quality === "Hot" ? 1 : 0,
      convertedLeads: lead.status === "Converted" ? 1 : 0,
    },
    $set: {
      lastImportedAt: new Date(),
    },
    $setOnInsert: {
      category: "Digital",
    },
  };

  await LeadSource.findOneAndUpdate({ name }, update, { upsert: true, new: true });
}

function parseCsvRow(line = "") {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvBuffer(buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) return [];
  const headers = parseCsvRow(rows[0]).map((item) => item.trim());
  return rows.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return headers.reduce((result, header, index) => {
      result[header] = values[index] || "";
      return result;
    }, {});
  });
}

function parseSpreadsheetFile(file) {
  const fileName = String(file?.originalname || "").toLowerCase();
  if (!file?.buffer) return [];

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    if (!xlsx) {
      throw new Error("XLSX import support is not installed yet. Please upload CSV for now or install the xlsx package.");
    }
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return [];
    return xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
  }

  return parseCsvBuffer(file.buffer);
}

function mapImportRecord(record = {}, mapping = {}) {
  const normalized = {};
  const fieldMap = {
    name: ["name", "lead name", "full name"],
    phone: ["phone", "mobile", "contact", "phone number"],
    email: ["email", "email address"],
    company: ["company", "organization"],
    requirement: ["requirement", "service", "interest", "need"],
    budget: ["budget", "expected budget", "value"],
    source: ["source", "lead source", "platform"],
  };

  Object.entries(fieldMap).forEach(([targetField, aliases]) => {
    const explicitColumn = mapping[targetField];
    if (explicitColumn && record[explicitColumn] !== undefined) {
      normalized[targetField] = record[explicitColumn];
      return;
    }

    const match = Object.keys(record).find((key) => aliases.includes(String(key).trim().toLowerCase()));
    if (match) normalized[targetField] = record[match];
  });

  return normalized;
}

async function syncLeadToSales(leadDoc) {
  const query = {
    $or: [{ phone: leadDoc.phone || "__missing__" }, { email: leadDoc.email || "__missing__" }],
  };

  const payload = {
    fullName: leadDoc.name,
    company: leadDoc.company,
    email: leadDoc.email,
    phone: leadDoc.phone,
    source: leadDoc.source,
    status: leadDoc.status,
    quality: leadDoc.quality,
    leadScore: leadDoc.aiScore,
    requirement: leadDoc.requirement,
    notes: leadDoc.notes,
    priority: leadDoc.priority,
    expectedBudget: leadDoc.budget,
    nextFollowUpAt: leadDoc.followUpDate,
    ownerId: leadDoc.importedById || null,
    owner: leadDoc.importedBy || "",
    assignedSalesId: leadDoc.assignedToUserId || null,
    assignedSalesExecutive: leadDoc.assignedToName || "",
    assignedSalesEmail: leadDoc.assignedToEmail || "",
  };

  await Lead.findOneAndUpdate(query, payload, { upsert: true, new: true, setDefaultsOnInsert: true });
}

function emitMarketingEvent(req, eventName, payload) {
  const io = req.app.get("io");
  if (io) {
    io.emit(eventName, payload);
  }
}

async function list(req, res) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 12)));
  const skip = (page - 1) * limit;
  const query = buildLeadQuery(req);

  const [items, total] = await Promise.all([
    MarketingLead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MarketingLead.countDocuments(query),
  ]);

  const summary = {
    total,
    hot: await MarketingLead.countDocuments({ ...query, quality: "Hot" }),
    assigned: await MarketingLead.countDocuments({ ...query, assignmentStatus: "Assigned" }),
    pending: await MarketingLead.countDocuments({ ...query, assignmentStatus: "Pending" }),
  };

  res.json({
    success: true,
    leads: items,
    data: {
      items,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

async function getById(req, res) {
  const lead = await MarketingLead.findById(req.params.id).lean();
  if (!lead) {
    return res.status(404).json({ success: false, message: "Lead not found" });
  }

  res.json({ success: true, data: lead });
}

async function create(req, res) {
  const payload = normalizeLeadPayload(req.body, req.user);
  if (!payload.name || !payload.phone) {
    return res.status(400).json({ success: false, message: "Lead name and phone are required" });
  }

  const duplicate = await MarketingLead.findOne({
    $or: [{ phone: payload.phone }, { email: payload.email || "__missing__" }],
  });

  if (duplicate) {
    return res.status(409).json({ success: false, message: "Lead already exists with same phone or email" });
  }

  const lead = await MarketingLead.create(payload);
  await upsertLeadSource(lead.source, lead);
  await syncLeadToSales(lead);

  emitMarketingEvent(req, "marketing:new-lead", { leadId: lead._id, name: lead.name, source: lead.source });

  res.status(201).json({ success: true, message: "Lead created", data: lead });
}

async function update(req, res) {
  const lead = await MarketingLead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, message: "Lead not found" });
  }

  const aiScore = computeAiScore({ ...lead.toObject(), ...req.body });
  if (req.body.name !== undefined) lead.name = String(req.body.name || "").trim();
  if (req.body.phone !== undefined) lead.phone = String(req.body.phone || "").trim();
  if (req.body.email !== undefined) lead.email = String(req.body.email || "").trim().toLowerCase();
  if (req.body.company !== undefined) lead.company = String(req.body.company || "").trim();
  if (req.body.requirement !== undefined) lead.requirement = String(req.body.requirement || "").trim();
  if (req.body.budget !== undefined) lead.budget = toNumber(req.body.budget);
  if (req.body.source !== undefined) lead.source = String(req.body.source || "Manual").trim() || "Manual";
  if (req.body.status !== undefined) lead.status = String(req.body.status || "New").trim() || "New";
  if (req.body.priority !== undefined) lead.priority = String(req.body.priority || "Medium").trim() || "Medium";
  if (req.body.notes !== undefined) lead.notes = String(req.body.notes || "").trim();
  if (req.body.city !== undefined) lead.city = String(req.body.city || "").trim();
  if (req.body.followUpDate !== undefined) lead.followUpDate = req.body.followUpDate || null;
  lead.aiScore = aiScore;
  lead.quality = computeQuality(aiScore);
  lead.timeline.push(
    makeTimelineEntry("updated", "Lead updated", "Lead details were updated.", req.user?.name || "System"),
  );
  lead.lastActivityAt = new Date();
  await lead.save();
  await syncLeadToSales(lead);

  res.json({ success: true, message: "Lead updated", data: lead });
}

async function remove(req, res) {
  const lead = await MarketingLead.findByIdAndDelete(req.params.id);
  if (!lead) {
    return res.status(404).json({ success: false, message: "Lead not found" });
  }

  res.json({ success: true, message: "Lead deleted", id: req.params.id });
}

async function importLeads(req, res) {
  const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : {};
  const source = String(req.body.source || "Import").trim() || "Import";
  let importedRows = [];

  if (Array.isArray(req.body.rows)) {
    importedRows = req.body.rows;
  } else if (req.file) {
    try {
      importedRows = parseSpreadsheetFile(req.file);
    } catch (error) {
      return res.status(400).json({ success: false, message: `Unable to parse file: ${error.message}` });
    }
  }

  if (!importedRows.length) {
    return res.status(400).json({ success: false, message: "No lead rows found to import" });
  }

  const importLog = await LeadImport.create({
    fileName: req.file?.originalname || "manual-import",
    fileType: req.file?.mimetype || "application/json",
    source,
    importedById: req.user?._id || null,
    importedBy: req.user?.name || "",
    totalRows: importedRows.length,
    mapping,
    status: "Processing",
  });

  const insertedLeadIds = [];
  let validRows = 0;
  let duplicateRows = 0;
  let errorRows = 0;
  const importErrors = [];

  for (let index = 0; index < importedRows.length; index += 1) {
    const raw = importedRows[index];
    const mapped = mapImportRecord(raw, mapping);
    const payload = normalizeLeadPayload({ ...mapped, source }, req.user);

    if (!payload.name || !payload.phone) {
      errorRows += 1;
      importErrors.push(`Row ${index + 2}: lead name and phone are required.`);
      continue;
    }

    const duplicate = await MarketingLead.findOne({
      $or: [{ phone: payload.phone }, { email: payload.email || "__missing__" }],
    }).lean();

    if (duplicate) {
      duplicateRows += 1;
      continue;
    }

    payload.importId = importLog._id;
    payload.timeline.push(
      makeTimelineEntry("imported", "Lead imported", `Imported from ${source}.`, req.user?.name || "System"),
    );

    const lead = await MarketingLead.create(payload);
    insertedLeadIds.push(lead._id);
    validRows += 1;
    await upsertLeadSource(lead.source, lead);
    await syncLeadToSales(lead);
  }

  importLog.status = "Completed";
  importLog.validRows = validRows;
  importLog.duplicateRows = duplicateRows;
  importLog.errorRows = errorRows;
  importLog.importErrors = importErrors;
  importLog.importedLeadIds = insertedLeadIds;
  await importLog.save();

  emitMarketingEvent(req, "marketing:import-completed", {
    importId: importLog._id,
    totalRows: importLog.totalRows,
    validRows,
    duplicateRows,
    errorRows,
  });

  res.status(201).json({
    success: true,
    message: "Lead import completed",
    data: {
      importId: importLog._id,
      totalRows: importLog.totalRows,
      validRows,
      duplicateRows,
      errorRows,
      errors: importErrors,
    },
  });
}

async function assign(req, res) {
  const leadIds = Array.isArray(req.body.leadIds) ? req.body.leadIds.filter(Boolean) : [];
  const assignedToUserId = req.body.assignedToUserId;

  if (!leadIds.length || !assignedToUserId) {
    return res.status(400).json({ success: false, message: "leadIds and assignedToUserId are required" });
  }

  if (!leadIds.every((id) => mongoose.isValidObjectId(id))) {
    return res.status(400).json({ success: false, message: "One or more lead ids are invalid" });
  }

  const user = await User.findById(assignedToUserId).lean();
  if (!user || !ASSIGNABLE_ROLES.includes(normalizeRole(user.role))) {
    return res.status(404).json({ success: false, message: "Assignable user not found" });
  }

  const assignment = await LeadAssignment.create({
    leadIds,
    assignedToUserId: user._id,
    assignedToName: user.name,
    assignedToEmail: user.email,
    department: req.body.department || user.department || user.role,
    priority: req.body.priority || "Medium",
    followUpDate: req.body.followUpDate || null,
    notes: req.body.notes || "",
    assignedById: req.user?._id || null,
    assignedBy: req.user?.name || "",
  });

  const leads = await MarketingLead.find({ _id: { $in: leadIds } });
  for (const lead of leads) {
    lead.assignedToUserId = user._id;
    lead.assignedToName = user.name;
    lead.assignedToEmail = user.email;
    lead.assignedDepartment = req.body.department || user.department || user.role;
    lead.priority = req.body.priority || lead.priority || "Medium";
    lead.followUpDate = req.body.followUpDate || lead.followUpDate;
    lead.assignmentStatus = "Assigned";
    lead.status = lead.status === "New" ? "Assigned" : lead.status;
    lead.lastActivityAt = new Date();
    lead.timeline.push(
      makeTimelineEntry(
        "assigned",
        "Lead assigned",
        `Assigned to ${user.name} for follow-up.`,
        req.user?.name || "System",
        { assignmentId: assignment._id },
      ),
    );
    await lead.save();
    await syncLeadToSales(lead);
  }

  const io = req.app.get("io");
  await createNotification(
    {
      userId: user._id,
      role: user.role,
      module: "marketing",
      type: "LEAD_ASSIGNED",
      priority: "high",
      title: "New Lead Assigned",
      message: `${leads.length} marketing lead(s) assigned to you.`,
      actionUrl: "/marketing/dashboard",
      entityType: "LeadAssignment",
      entityId: assignment._id,
    },
    io,
  );

  if (req.body.sendAssignmentMail === true || req.body.sendAssignmentMail === "true") {
    await sendEmail({
      to: user.email,
      subject: `New lead assignment: ${leads.length} lead(s)`,
      template: "generic",
      variables: {
        title: "New lead assignment",
        name: user.name,
        assignedCount: leads.length,
        department: req.body.department || user.department || user.role,
        priority: req.body.priority || "Medium",
        actionLabel: "Open Dashboard",
        actionUrl: `${process.env.CLIENT_URL || "http://127.0.0.1:5000"}/sales/dashboard`,
      },
      relatedModule: "marketing",
      relatedEntityType: "LeadAssignment",
      relatedEntityId: assignment._id,
    });
  }

  emitMarketingEvent(req, "marketing:lead-assigned", {
    assignmentId: assignment._id,
    assignedToUserId: String(user._id),
    leadIds,
  });
  emitMarketingEvent(req, "leadAssigned", {
    assignmentId: assignment._id,
    assignedToUserId: String(user._id),
    leadIds,
  });

  res.json({ success: true, message: "Leads assigned successfully", data: assignment });
}

async function reassign(req, res) {
  req.body.leadIds = Array.isArray(req.body.leadIds) && req.body.leadIds.length ? req.body.leadIds : [req.params.id];
  return assign(req, res);
}

async function listUnassigned(req, res) {
  const items = await MarketingLead.find({ assignmentStatus: { $ne: "Assigned" } }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
}

async function listAssignedLeads(req, res) {
  const role = normalizeRole(req.user?.role);
  const query =
    role === "SALES"
      ? {
          $or: [{ assignedToUserId: req.user._id }, { assignedToEmail: req.user.email }, { assignedToName: req.user.name }],
        }
      : { assignmentStatus: "Assigned" };

  const leads = await MarketingLead.find(query).sort({ updatedAt: -1 }).lean();
  const followUpPending = leads.filter((lead) => lead.followUpDate && new Date(lead.followUpDate) <= new Date()).length;

  res.json({
    success: true,
    data: {
      items: leads,
      summary: {
        totalAssigned: leads.length,
        newAssigned: leads.filter((lead) => {
          const created = new Date(lead.updatedAt || lead.createdAt);
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          return created >= start;
        }).length,
        followUpPending,
        hotLeads: leads.filter((lead) => lead.quality === "Hot").length,
      },
    },
  });
}

async function listImports(req, res) {
  const items = await LeadImport.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ success: true, data: items });
}

async function listAssignments(req, res) {
  const items = await LeadAssignment.find().sort({ createdAt: -1 }).limit(20).lean();
  res.json({ success: true, data: items });
}

module.exports = {
  upload,
  list,
  getById,
  create,
  update,
  remove,
  importLeads,
  assign,
  reassign,
  listUnassigned,
  listAssignedLeads,
  listImports,
  listAssignments,
};
