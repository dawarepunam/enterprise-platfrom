const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const SalesDeal = require("../models/SalesDeal");
const Quotation = require("../models/Quotation");
const CallLog = require("../models/CallLog");
const FollowUp = require("../models/FollowUp");
const Revenue = require("../models/Revenue");
const File = require("../models/File");
const Message = require("../models/Message");
const Meeting = require("../models/Meeting");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { dispatchWorkflow, findUsersByRefs } = require("../services/workflowService");
const { sendEmail } = require("../services/emailService");
const { uploadToCloudinary } = require("../services/cloudinaryService");

const CALL_STATUSES = [
  "Interested",
  "Very Interested",
  "Not Interested",
  "Not Picked",
  "Busy",
  "Switched Off",
  "Wrong Number",
  "Call Back Later",
  "Follow-Up Required",
  "Quotation Sent",
  "Negotiation",
  "Deal Closed",
  "Lost",
];

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roleValue(user) {
  return String(user?.role || "").trim().toUpperCase();
}

function isPrivileged(user) {
  return ["ADMIN", "MANAGER"].includes(roleValue(user));
}

function salesLeadScope(user) {
  if (isPrivileged(user)) return {};
  return {
    $or: [{ assignedSalesId: user._id }, { assignedSalesExecutive: user.name }],
  };
}

function salesOwnerScope(user, idKey = "ownerId", nameKey = "owner") {
  if (isPrivileged(user)) return {};
  return {
    $or: [{ [idKey]: user._id }, { [nameKey]: user.name }],
  };
}

function salesExecScope(user, idKey = "salesExecutiveId") {
  if (isPrivileged(user)) return {};
  return { [idKey]: user._id };
}

function buildDealStageFromCallStatus(status = "") {
  const value = String(status || "").trim();
  if (["Interested", "Very Interested"].includes(value)) return "Interested";
  if (["Call Back Later", "Follow-Up Required"].includes(value)) return "Follow-Up Scheduled";
  if (value === "Quotation Sent") return "Quotation Sent";
  if (value === "Negotiation") return "Negotiation";
  if (value === "Deal Closed") return "Converted";
  if (["Not Interested", "Wrong Number", "Lost"].includes(value)) return "Lost";
  return "Called";
}

function buildLeadStatusFromCallStatus(status = "") {
  const value = String(status || "").trim();
  if (["Interested", "Very Interested"].includes(value)) return "Interested";
  if (["Call Back Later", "Follow-Up Required"].includes(value)) return "Follow-Up Scheduled";
  if (value === "Quotation Sent") return "Quotation Sent";
  if (value === "Negotiation") return "Negotiation";
  if (value === "Deal Closed") return "Converted";
  if (["Not Interested", "Wrong Number", "Lost"].includes(value)) return "Lost";
  return "Called";
}

function buildRoomId(leadId) {
  return `sales-lead-${leadId}`;
}

function sanitizeText(value = "") {
  return String(value || "").replace(/[()\\]/g, " ").trim();
}

function csvEscape(value = "") {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildTabularExportRows({ leads, deals, quotations, revenues }) {
  const quotationByLead = new Map(
    quotations
      .filter((item) => item.leadId)
      .map((item) => [String(item.leadId), item]),
  );
  const revenueByLead = new Map(
    revenues
      .filter((item) => item.leadId)
      .map((item) => [String(item.leadId), item]),
  );
  const dealByLead = new Map(deals.filter((item) => item.leadId).map((item) => [String(item.leadId), item]));

  return leads.map((lead) => {
    const quotation = quotationByLead.get(String(lead._id));
    const revenue = revenueByLead.get(String(lead._id));
    const deal = dealByLead.get(String(lead._id));
    return {
      leadName: lead.fullName || lead.contact,
      phone: lead.phone || "",
      status: lead.status || "",
      followUpDate: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString("en-IN") : "",
      quotationAmount: quotation?.amount || 0,
      dealValue: deal?.closedValue || deal?.expectedValue || 0,
      revenue: revenue?.netRevenue || 0,
      salesExecutive: lead.assignedSalesExecutive || deal?.owner || "",
    };
  });
}

function buildCsv(rows = []) {
  const headers = ["Lead Name", "Phone", "Status", "Follow-Up Date", "Quotation Amount", "Deal Value", "Revenue", "Sales Executive"];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(
      [
        row.leadName,
        row.phone,
        row.status,
        row.followUpDate,
        row.quotationAmount,
        row.dealValue,
        row.revenue,
        row.salesExecutive,
      ]
        .map(csvEscape)
        .join(","),
    );
  });
  return lines.join("\n");
}

function buildExcelHtml(rows = []) {
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${row.leadName || ""}</td>
          <td>${row.phone || ""}</td>
          <td>${row.status || ""}</td>
          <td>${row.followUpDate || ""}</td>
          <td>${row.quotationAmount || 0}</td>
          <td>${row.dealValue || 0}</td>
          <td>${row.revenue || 0}</td>
          <td>${row.salesExecutive || ""}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head><body><table border="1">
<tr><th>Lead Name</th><th>Phone</th><th>Status</th><th>Follow-Up Date</th><th>Quotation Amount</th><th>Deal Value</th><th>Revenue</th><th>Sales Executive</th></tr>
${tableRows}
</table></body></html>`;
}

function buildSimplePdf(lines = []) {
  const escapedLines = lines.map((line) => sanitizeText(line)).filter(Boolean);
  const content = escapedLines
    .map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 16} Td (${line}) Tj ET`)
    .join("\n");
  const objects = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj");
  objects.push(`4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`);
  objects.push("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

async function ensureLead(req) {
  const lead = await Lead.findOne({ _id: req.params.id, ...salesLeadScope(req.user) });
  if (!lead) {
    return null;
  }
  return lead;
}

async function resolveSalesRecipients(lead) {
  return findUsersByRefs([
    { userId: lead.ownerId },
    { email: lead.ownerEmail },
    { userId: lead.assignedSalesId },
    { email: lead.assignedSalesEmail },
    { role: "MANAGER" },
    { role: "MARKETING" },
  ]);
}

async function ensureDealForLead(lead, user) {
  let deal = await SalesDeal.findOne({ leadId: lead._id });
  if (!deal) {
    deal = await SalesDeal.create({
      leadId: lead._id,
      company: lead.company || lead.fullName || lead.contact,
      contact: lead.fullName || lead.contact,
      contactEmail: lead.email || "",
      phone: lead.phone || "",
      owner: lead.assignedSalesExecutive || user?.name || "",
      ownerId: lead.assignedSalesId || user?._id || null,
      stage: buildDealStageFromCallStatus(lead.callStatus || lead.status),
      expectedValue: normalizeNumber(lead.expectedBudget || lead.value || 0),
      nextFollowUp: lead.nextFollowUpAt || null,
      probability: normalizeNumber(lead.probability || 0),
      notes: lead.notes || lead.message || "",
    });
  }
  return deal;
}

async function getWorkspaceData(req) {
  const leadQuery = salesLeadScope(req.user);
  const dealQuery = salesOwnerScope(req.user);
  const quotationQuery = salesOwnerScope(req.user);
  const callLogQuery = salesExecScope(req.user);
  const followUpQuery = salesExecScope(req.user);
  const revenueQuery = salesExecScope(req.user);
  const notificationQuery = isPrivileged(req.user)
    ? { module: { $in: ["sales", "leads", "quotations"] } }
    : { $or: [{ userId: req.user._id }, { role: req.user.role }], module: { $in: ["sales", "leads", "quotations"] } };
  const roomPattern = /^sales-lead-/;
  const meetingQuery = isPrivileged(req.user)
    ? { module: "sales" }
    : { $or: [{ startedBy: req.user._id }, { "participants.userId": req.user._id }], module: "sales" };
  const messageQuery = isPrivileged(req.user)
    ? { module: "sales", roomId: roomPattern }
    : { module: "sales", roomId: roomPattern, $or: [{ senderId: req.user._id }, { participants: req.user._id }] };

  const [leads, deals, quotations, callLogs, followUps, revenues, notifications, messages, meetings] = await Promise.all([
    Lead.find(leadQuery).sort({ createdAt: -1 }).lean(),
    SalesDeal.find(dealQuery).sort({ updatedAt: -1 }).lean(),
    Quotation.find(quotationQuery).sort({ updatedAt: -1 }).lean(),
    CallLog.find(callLogQuery).sort({ createdAt: -1 }).limit(50).lean(),
    FollowUp.find(followUpQuery).sort({ date: 1 }).lean(),
    Revenue.find(revenueQuery).sort({ createdAt: -1 }).lean(),
    Notification.find(notificationQuery).sort({ createdAt: -1 }).limit(25).lean(),
    Message.find(messageQuery).sort({ createdAt: -1 }).limit(50).lean(),
    Meeting.find(meetingQuery).sort({ createdAt: -1 }).lean(),
  ]);

  return { leads, deals, quotations, callLogs, followUps, revenues, notifications, messages, meetings };
}

function buildSummary(data) {
  const today = new Date();
  const todayKey = today.toDateString();
  const dueFollowUps = data.followUps.filter((item) => item.status === "Pending" && new Date(item.date) <= today);
  const todayCalls = data.callLogs.filter((item) => new Date(item.createdAt).toDateString() === todayKey);
  const interestedLeads = data.leads.filter((item) => ["Interested", "Requirement Discussed", "Quotation Sent", "Negotiation", "Converted"].includes(item.status));
  const quotationsSent = data.quotations.filter((item) => ["Sent", "Viewed", "Under Discussion", "Approved"].includes(item.status));
  const dealsClosed = data.deals.filter((item) => item.stage === "Converted");
  const revenue = data.revenues.reduce((sum, item) => sum + normalizeNumber(item.netRevenue), 0);
  const conversionRate = data.leads.length ? Number(((dealsClosed.length / data.leads.length) * 100).toFixed(2)) : 0;
  const connectedStatuses = ["Interested", "Very Interested", "Not Interested", "Call Back Later", "Follow-Up Required", "Quotation Sent", "Negotiation", "Deal Closed", "Lost"];
  const connectedCalls = data.callLogs.filter((item) => connectedStatuses.includes(item.status));

  const premium = buildPremiumSalesInsights(data);

  return {
    cards: {
      newLeads: data.leads.filter((item) => ["New", "Assigned to Sales"].includes(item.status)).length,
      todayCalls: todayCalls.length,
      followUpsDue: dueFollowUps.length,
      interestedLeads: interestedLeads.length,
      quotationsSent: quotationsSent.length,
      dealsClosed: dealsClosed.length,
      revenueGenerated: revenue,
      conversionRate,
    },
    kpis: {
      callsMade: data.callLogs.length,
      connectedCalls: connectedCalls.length,
      interestedLeads: interestedLeads.length,
      followUpsPending: data.followUps.filter((item) => item.status === "Pending").length,
      quotationsSent: quotationsSent.length,
      dealsClosed: dealsClosed.length,
      revenueGenerated: revenue,
      conversionRate,
    },
    premium,
  };
}

function daysBetween(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function moneyValue(item = {}) {
  return normalizeNumber(item.expectedValue || item.closedValue || item.expectedBudget || item.value || 0);
}

function stageAgeDays(deal = {}) {
  return daysBetween(deal.stageEnteredAt || deal.updatedAt || deal.createdAt);
}

function riskForDeal(deal = {}, related = {}) {
  const reasons = [];
  const lastActivityDays = daysBetween(deal.lastActivityAt || related.lastCall?.createdAt || deal.updatedAt || deal.createdAt);
  const age = stageAgeDays(deal);

  if (lastActivityDays >= 10) reasons.push("No response 10+ days");
  if (["Quotation Sent", "Negotiation"].includes(deal.stage) && age >= 7) reasons.push("Proposal pending");
  if (related.cancelledMeetings > 0) reasons.push("Meeting cancelled");
  if (normalizeNumber(deal.discountRequested) >= 20 && deal.approvalStatus === "Pending") reasons.push("Discount approval pending");
  if (deal.quotationStatus === "Expired") reasons.push("Quotation expired");

  const score = Math.min(100, reasons.length * 28 + Math.min(age * 2, 30));
  return {
    level: score >= 70 ? "High" : score >= 38 ? "Medium" : "Low",
    score,
    reasons,
  };
}

function relationshipScore(deal = {}, related = {}) {
  const callScore = Math.min((related.calls?.length || 0) * 12, 35);
  const meetingScore = Math.min((related.meetings?.length || 0) * 18, 30);
  const quoteScore = ["Viewed", "Under Discussion", "Approved"].includes(deal.quotationStatus) ? 20 : 8;
  const recencyPenalty = Math.min(daysBetween(deal.lastActivityAt || deal.updatedAt) * 2, 30);
  return Math.max(18, Math.min(98, callScore + meetingScore + quoteScore + 35 - recencyPenalty));
}

function nextBestAction(deal = {}, risk = {}) {
  if (risk.level === "High") return "Manager review and rescue call";
  if (deal.stage === "New") return "Call and qualify decision maker";
  if (deal.stage === "Called" || deal.stage === "Interested") return "Schedule meeting";
  if (deal.stage === "Requirement Discussed") return "Send proposal";
  if (deal.stage === "Quotation Sent") return "Follow up on proposal";
  if (deal.stage === "Negotiation") return "Involve manager for closure";
  if (deal.stage === "Lost") return "Move to rescue queue";
  return "Keep relationship warm";
}

function defaultContactsForDeal(deal = {}) {
  const primary = {
    name: deal.contact || deal.decisionMakerName || "Primary Contact",
    role: deal.decisionMakerRole || "Owner",
    email: deal.contactEmail || "",
    phone: deal.phone || "",
    influence: "High",
  };
  return deal.contacts?.length ? deal.contacts : [primary];
}

function defaultStakeholdersForDeal(deal = {}) {
  if (deal.stakeholders?.length) return deal.stakeholders;
  const decisionRole = deal.decisionMakerRole || "Decision Maker";
  return [
    { name: deal.decisionMakerName || deal.contact || "Client Owner", role: decisionRole, reportsTo: "" },
    { name: "Project Sponsor", role: "Manager", reportsTo: decisionRole },
    { name: "Technical Reviewer", role: "Technical Team", reportsTo: "Manager" },
  ];
}

function buildPremiumSalesInsights(data) {
  const callsByLead = new Map();
  const meetingsByLead = new Map();
  const quotationsByLead = new Map();

  data.callLogs.forEach((item) => {
    const key = String(item.leadId || "");
    callsByLead.set(key, [...(callsByLead.get(key) || []), item]);
  });
  data.meetings.forEach((item) => {
    const key = String(item.leadId || "");
    meetingsByLead.set(key, [...(meetingsByLead.get(key) || []), item]);
  });
  data.quotations.forEach((item) => {
    const key = String(item.leadId || "");
    quotationsByLead.set(key, [...(quotationsByLead.get(key) || []), item]);
  });

  const dealCards = data.deals.map((deal) => {
    const leadId = String(deal.leadId || "");
    const calls = callsByLead.get(leadId) || [];
    const meetings = meetingsByLead.get(leadId) || [];
    const quotations = quotationsByLead.get(leadId) || [];
    const lastCall = calls[0] || null;
    const cancelledMeetings = meetings.filter((item) => ["CANCELLED", "Cancelled"].includes(item.status)).length;
    const risk = riskForDeal(deal, { calls, meetings, lastCall, cancelledMeetings });
    const relationship = relationshipScore(deal, { calls, meetings });
    const value = moneyValue(deal);

    return {
      ...deal,
      value,
      stageAgeDays: stageAgeDays(deal),
      risk,
      relationshipScore: relationship,
      expectedRevenue: Math.round(value * (normalizeNumber(deal.probability, 45) / 100)),
      nextBestAction: nextBestAction(deal, risk),
      contacts: defaultContactsForDeal(deal),
      stakeholders: defaultStakeholdersForDeal(deal),
      proposalVersions: deal.proposalVersions?.length
        ? deal.proposalVersions
        : quotations.map((quotation, index) => ({
            version: `V${index + 1}`,
            amount: quotation.amount,
            status: quotation.status,
            createdAt: quotation.createdAt,
          })),
    };
  });

  const stages = ["New", "Interested", "Requirement Discussed", "Quotation Sent", "Negotiation", "Converted", "Lost"];
  const pipeline = stages.map((stage) => ({
    stage,
    count: dealCards.filter((deal) => deal.stage === stage).length,
    value: dealCards.filter((deal) => deal.stage === stage).reduce((sum, deal) => sum + moneyValue(deal), 0),
    deals: dealCards.filter((deal) => deal.stage === stage).slice(0, 8),
  }));

  const expectedRevenue = dealCards
    .filter((deal) => !["Converted", "Lost"].includes(deal.stage))
    .reduce((sum, deal) => sum + deal.expectedRevenue, 0);
  const activeValue = dealCards
    .filter((deal) => !["Converted", "Lost"].includes(deal.stage))
    .reduce((sum, deal) => sum + moneyValue(deal), 0);
  const rescueQueue = dealCards.filter((deal) => deal.stage === "Lost" || deal.risk.level === "High").slice(0, 10);
  const reassignmentQueue = dealCards
    .filter((deal) => !["Converted", "Lost"].includes(deal.stage) && daysBetween(deal.lastActivityAt || deal.updatedAt) >= 7)
    .slice(0, 10);
  const approvalQueue = dealCards.filter((deal) => deal.approvalStatus === "Pending" || normalizeNumber(deal.discountRequested) >= 20);

  return {
    expectedRevenue,
    activePipelineValue: activeValue,
    averageRelationshipScore: dealCards.length
      ? Math.round(dealCards.reduce((sum, deal) => sum + deal.relationshipScore, 0) / dealCards.length)
      : 0,
    highRiskDeals: dealCards.filter((deal) => deal.risk.level === "High").length,
    rescueQueue,
    reassignmentQueue,
    approvalQueue,
    pipeline,
    dealCards,
    lostReasons: dealCards
      .filter((deal) => deal.stage === "Lost")
      .reduce((acc, deal) => {
        const key = deal.lostCategory || deal.lostReason || "Reason Pending";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
  };
}

async function list(req, res) {
  const deals = await SalesDeal.find(salesOwnerScope(req.user)).sort({ updatedAt: -1 });
  res.json({ success: true, data: deals });
}

async function getById(req, res) {
  const deal = await SalesDeal.findOne({ _id: req.params.id, ...salesOwnerScope(req.user) });
  if (!deal) {
    return res.status(404).json({ success: false, message: "sales deal record not found" });
  }
  res.json({ success: true, data: deal });
}

async function create(req, res) {
  const payload = { ...req.body, ownerId: req.body.ownerId || req.user._id, owner: req.body.owner || req.user.name };
  const deal = await SalesDeal.create(payload);
  res.status(201).json({ success: true, message: "sales deal created", data: deal });
}

async function update(req, res) {
  const deal = await SalesDeal.findOne({ _id: req.params.id, ...salesOwnerScope(req.user) });
  if (!deal) {
    return res.status(404).json({ success: false, message: "sales deal record not found" });
  }
  Object.assign(deal, req.body);
  await deal.save();
  res.json({ success: true, message: "sales deal updated", data: deal });
}

async function remove(req, res) {
  const deal = await SalesDeal.findOneAndDelete({ _id: req.params.id, ...salesOwnerScope(req.user) });
  if (!deal) {
    return res.status(404).json({ success: false, message: "sales deal record not found" });
  }
  res.json({ success: true, message: "sales deal deleted", id: req.params.id });
}

async function summary(req, res) {
  const data = await getWorkspaceData(req);
  res.json({ success: true, data: { ...buildSummary(data), ...data } });
}

async function createFollowUpRecord(lead, user, payload = {}) {
  if (!payload.date) return null;

  return FollowUp.create({
    leadId: lead._id,
    salesExecutiveId: user._id,
    salesExecutiveName: user.name,
    date: new Date(payload.date),
    reminderMinutes: normalizeNumber(payload.reminderMinutes, 30),
    purpose: payload.purpose || "Follow up with customer",
    notes: payload.notes || "",
  });
}

async function uploadProofFiles(req, lead, proofs = []) {
  const uploaded = [];
  for (const proof of proofs) {
    const upload = await uploadToCloudinary(proof, { folder: `enterprise-platform/sales/${lead._id}` });
    const file = await File.create({
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      name: proof.name || upload.original_filename || "proof-file",
      url: upload.secure_url || upload.url || proof.url || "",
      mimeType: proof.mimeType || "",
      size: normalizeNumber(proof.size),
      module: "sales",
      entityType: "lead",
      entityId: String(lead._id),
      provider: upload.provider || "cloudinary",
      metadata: { proofType: proof.type || "proof", publicId: upload.public_id || "" },
    });
    uploaded.push({
      fileId: file._id,
      name: file.name,
      url: file.url,
      mimeType: file.mimeType,
      provider: file.provider,
    });
  }
  return uploaded;
}

async function logCall(req, res) {
  const lead = await ensureLead(req);
  if (!lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }

  const status = CALL_STATUSES.includes(req.body.status) ? req.body.status : "Follow-Up Required";
  const proofs = Array.isArray(req.body.proofs) ? await uploadProofFiles(req, lead, req.body.proofs) : [];
  const followUp = await createFollowUpRecord(lead, req.user, {
    date: req.body.nextFollowUpAt,
    reminderMinutes: req.body.reminderMinutes,
    purpose: req.body.followUpPurpose,
    notes: req.body.followUpNotes || req.body.notes,
  });

  const callLog = await CallLog.create({
    leadId: lead._id,
    salesExecutiveId: req.user._id,
    salesExecutiveName: req.user.name,
    salesExecutiveEmail: req.user.email,
    status,
    notes: req.body.notes || "",
    customerRequirement: req.body.customerRequirement || req.body.requirement || "",
    expectedBudget: normalizeNumber(req.body.expectedBudget),
    nextFollowUpAt: req.body.nextFollowUpAt ? new Date(req.body.nextFollowUpAt) : null,
    probability: normalizeNumber(req.body.probability),
    durationSeconds: normalizeNumber(req.body.durationSeconds),
    proofs,
  });

  lead.callStatus = status;
  lead.status = buildLeadStatusFromCallStatus(status);
  lead.lastContactedAt = new Date();
  lead.nextFollowUpAt = req.body.nextFollowUpAt ? new Date(req.body.nextFollowUpAt) : lead.nextFollowUpAt;
  lead.probability = normalizeNumber(req.body.probability, lead.probability || 0);
  lead.expectedBudget = normalizeNumber(req.body.expectedBudget, lead.expectedBudget || 0);
  lead.requirement = req.body.customerRequirement || req.body.requirement || lead.requirement;
  lead.notes = req.body.notes || lead.notes;
  await lead.save();

  const deal = await ensureDealForLead(lead, req.user);
  deal.owner = req.user.name;
  deal.ownerId = req.user._id;
  deal.contact = lead.fullName || lead.contact;
  deal.contactEmail = lead.email || deal.contactEmail;
  deal.phone = lead.phone || deal.phone;
  deal.stage = buildDealStageFromCallStatus(status);
  deal.nextFollowUp = lead.nextFollowUpAt;
  deal.probability = lead.probability;
  deal.expectedValue = normalizeNumber(req.body.expectedBudget, deal.expectedValue || lead.value || 0);
  deal.notes = req.body.notes || deal.notes;
  await deal.save();

  await dispatchWorkflow({
    req,
    module: "sales",
    event: "CALL_UPDATED",
    title: "Sales call updated",
    message: `${req.user.name} marked ${lead.fullName || lead.contact} as ${status}.`,
    priority: ["Very Interested", "Deal Closed", "Negotiation"].includes(status) ? "high" : "medium",
    actionUrl: "/modules/sales/calling/calling.html",
    entityType: "lead",
    entityId: lead._id,
    userRefs: await resolveSalesRecipients(lead),
    email: {
      subject: `Sales call update: ${lead.fullName || lead.contact}`,
      template: "generic",
      variables: {
        title: "Sales call updated",
        leadName: lead.fullName || lead.contact,
        companyName: lead.company || "",
        currentStatus: status,
        nextFollowUp: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString("en-IN") : "Not scheduled",
        actionLabel: "Open Sales Workspace",
      },
    },
    metadata: {
      leadName: lead.fullName || lead.contact,
      quality: lead.quality,
      status,
    },
  });

  res.status(201).json({ success: true, message: "call log saved", data: { callLog, deal, lead, followUp } });
}

async function createFollowUp(req, res) {
  const lead = await ensureLead(req);
  if (!lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }

  const followUp = await createFollowUpRecord(lead, req.user, req.body);
  if (!followUp) {
    return res.status(400).json({ success: false, message: "follow-up date is required" });
  }

  lead.nextFollowUpAt = new Date(req.body.date);
  lead.status = "Follow-Up Scheduled";
  await lead.save();

  const deal = await ensureDealForLead(lead, req.user);
  deal.stage = "Follow-Up Scheduled";
  deal.nextFollowUp = followUp.date;
  await deal.save();

  await dispatchWorkflow({
    req,
    module: "sales",
    event: "FOLLOWUP_CREATED",
    title: "Follow-up scheduled",
    message: `${req.user.name} scheduled a follow-up for ${lead.fullName || lead.contact}.`,
    priority: "medium",
    actionUrl: "/modules/sales/dashboard/dashboard.html",
    entityType: "followup",
    entityId: followUp._id,
    userRefs: await resolveSalesRecipients(lead),
    metadata: {
      leadName: lead.fullName || lead.contact,
      followUpDate: followUp.date,
    },
  });

  res.status(201).json({ success: true, message: "follow-up created", data: followUp });
}

async function createQuotation(req, res) {
  const lead = await ensureLead(req);
  if (!lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const normalizedItems = items.map((item) => {
    const quantity = Math.max(1, normalizeNumber(item.quantity, 1));
    const unitPrice = normalizeNumber(item.unitPrice);
    return {
      label: item.label || "Service",
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    };
  });
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const taxPercent = normalizeNumber(req.body.taxPercent);
  const discountAmount = normalizeNumber(req.body.discountAmount);
  const taxAmount = Number(((subtotal * taxPercent) / 100).toFixed(2));
  const amount = Math.max(0, subtotal + taxAmount - discountAmount);
  const validityDays = normalizeNumber(req.body.validityDays, 15);
  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  const quotation = await Quotation.create({
    leadId: lead._id,
    client: lead.fullName || lead.contact,
    clientEmail: lead.email || "",
    clientPhone: lead.phone || "",
    clientCompany: lead.company || "",
    title: req.body.title || `${lead.company || lead.fullName || lead.contact} Proposal`,
    description: req.body.description || lead.requirement || lead.serviceInterested || "",
    items: normalizedItems,
    subtotal,
    taxPercent,
    taxAmount,
    discountAmount,
    amount,
    validityDays,
    validUntil,
    terms: req.body.terms || "Payment terms as mutually agreed.",
    digitalSignature: req.body.digitalSignature || req.user.name,
    ownerId: req.user._id,
    owner: req.user.name,
    ownerEmail: req.user.email,
    dueDate: validUntil,
    status: "Draft",
  });

  lead.status = "Quotation Sent";
  await lead.save();

  const deal = await ensureDealForLead(lead, req.user);
  deal.stage = "Quotation Sent";
  deal.quotationId = quotation._id;
  deal.quotationStatus = "Draft";
  deal.expectedValue = amount;
  await deal.save();

  res.status(201).json({ success: true, message: "quotation created", data: quotation });
}

async function sendQuotation(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) {
    return res.status(404).json({ success: false, message: "quotation record not found" });
  }

  if (!isPrivileged(req.user) && String(quotation.ownerId) !== String(req.user._id) && quotation.owner !== req.user.name) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (!quotation.clientEmail) {
    return res.status(400).json({ success: false, message: "Client email is required before sending quotation" });
  }

  const lead = quotation.leadId ? await Lead.findById(quotation.leadId) : null;
  quotation.status = "Sent";
  quotation.sentAt = new Date();
  await quotation.save();

  if (lead) {
    lead.status = "Quotation Sent";
    await lead.save();
  }

  await SalesDeal.updateMany(
    { quotationId: quotation._id },
    { quotationStatus: "Sent", stage: "Quotation Sent" },
  );

  const emailResult = await sendEmail({
    to: quotation.clientEmail,
    subject: req.body.subject || `Quotation for ${quotation.title}`,
    template: "generic",
    variables: {
      title: "Quotation from Sales Team",
      recipientName: quotation.client,
      quotationTitle: quotation.title,
      totalAmount: `INR ${quotation.amount}`,
      validity: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("en-IN") : `${quotation.validityDays} days`,
      message: req.body.message || "Please review the attached commercial proposal and let us know your feedback.",
      actionLabel: "View Quotation",
    },
    relatedModule: "sales",
    relatedEntityType: "quotation",
    relatedEntityId: quotation._id,
    metadata: {
      leadId: quotation.leadId ? String(quotation.leadId) : "",
      quotationAmount: quotation.amount,
    },
  });

  if (lead) {
    await dispatchWorkflow({
      req,
      module: "sales",
      event: "QUOTATION_SENT",
      title: "Quotation emailed",
      message: `${quotation.title} was emailed to ${quotation.client}.`,
      priority: "high",
      actionUrl: "/modules/sales/conversions/conversions.html",
      entityType: "quotation",
      entityId: quotation._id,
      userRefs: await resolveSalesRecipients(lead),
      metadata: {
        leadName: lead.fullName || lead.contact,
        quotationAmount: quotation.amount,
      },
    });
  }

  res.json({ success: true, message: "quotation sent", data: { quotation, emailResult } });
}

async function uploadProof(req, res) {
  const lead = await ensureLead(req);
  if (!lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }
  const proofs = Array.isArray(req.body.proofs) ? req.body.proofs : [];
  const uploaded = await uploadProofFiles(req, lead, proofs);
  res.status(201).json({ success: true, message: "proofs uploaded", data: uploaded });
}

async function closeDeal(req, res) {
  const deal = await SalesDeal.findOne({ _id: req.params.id, ...salesOwnerScope(req.user) });
  if (!deal) {
    return res.status(404).json({ success: false, message: "sales deal record not found" });
  }

  const lead = deal.leadId ? await Lead.findById(deal.leadId) : null;
  const converted = Boolean(req.body.converted !== false);
  const grossAmount = normalizeNumber(req.body.dealAmount, deal.expectedValue || deal.closedValue || 0);
  const discountAmount = normalizeNumber(req.body.discountAmount, deal.discountRequested || 0);
  const finalPrice = normalizeNumber(req.body.finalAgreedPrice, grossAmount - discountAmount);

  deal.stage = converted ? "Converted" : "Lost";
  deal.closedValue = converted ? finalPrice : 0;
  deal.finalAgreedPrice = finalPrice;
  deal.discountRequested = discountAmount;
  deal.paymentTerms = req.body.paymentTerms || deal.paymentTerms;
  deal.paymentStatus = req.body.paymentStatus || deal.paymentStatus;
  deal.expectedPaymentDate = req.body.expectedPaymentDate ? new Date(req.body.expectedPaymentDate) : deal.expectedPaymentDate;
  deal.convertedAt = converted ? new Date() : deal.convertedAt;
  deal.lostReason = converted ? "" : req.body.lostReason || deal.lostReason;
  deal.notes = req.body.notes || deal.notes;
  await deal.save();

  let revenue = null;
  if (converted) {
    revenue = await Revenue.findOneAndUpdate(
      { dealId: deal._id },
      {
        leadId: deal.leadId || null,
        quotationId: deal.quotationId || null,
        salesExecutiveId: deal.ownerId || req.user._id,
        salesExecutiveName: deal.owner || req.user.name,
        grossAmount,
        discountAmount,
        netRevenue: finalPrice,
        paymentStatus: req.body.paymentStatus || deal.paymentStatus,
        expectedPaymentDate: req.body.expectedPaymentDate ? new Date(req.body.expectedPaymentDate) : deal.expectedPaymentDate,
        notes: req.body.notes || "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  if (lead) {
    lead.status = converted ? "Converted" : "Lost";
    lead.callStatus = converted ? "Deal Closed" : "Lost";
    lead.value = converted ? finalPrice : lead.value;
    await lead.save();
  }

  if (deal.quotationId) {
    await Quotation.findByIdAndUpdate(deal.quotationId, {
      status: converted ? "Approved" : "Rejected",
    });
  }

  await dispatchWorkflow({
    req,
    module: "sales",
    event: converted ? "DEAL_CLOSED" : "DEAL_LOST",
    title: converted ? "Deal closed" : "Deal marked lost",
    message: converted
      ? `${deal.company} was converted by ${req.user.name} for INR ${finalPrice}.`
      : `${deal.company} was marked lost by ${req.user.name}.`,
    priority: converted ? "high" : "medium",
    actionUrl: "/modules/sales/conversions/conversions.html",
    entityType: "deal",
    entityId: deal._id,
    userRefs: lead ? await resolveSalesRecipients(lead) : [{ role: "MANAGER" }],
    metadata: {
      company: deal.company,
      revenue: finalPrice,
      paymentStatus: deal.paymentStatus,
    },
  });

  res.json({ success: true, message: converted ? "deal closed" : "deal updated as lost", data: { deal, revenue } });
}

async function exportReport(req, res) {
  const data = await getWorkspaceData(req);
  const rows = buildTabularExportRows(data);
  const format = String(req.query.format || "csv").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  if (format === "excel" || format === "xlsx" || format === "xls") {
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sales-report-${today}.xls"`);
    return res.send(buildExcelHtml(rows));
  }

  if (format === "pdf") {
    const lines = [
      `Sales Report ${today}`,
      "",
      ...rows.map(
        (row) =>
          `${row.leadName} | ${row.phone} | ${row.status} | Follow-up ${row.followUpDate || "-"} | Quotation ${row.quotationAmount} | Deal ${row.dealValue} | Revenue ${row.revenue} | ${row.salesExecutive}`,
      ),
    ];
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="sales-report-${today}.pdf"`);
    return res.send(buildSimplePdf(lines));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="sales-report-${today}.csv"`);
  return res.send(buildCsv(rows));
}

async function leaderboard(req, res) {
  const users = await User.find({ role: "SALES" }).lean();
  const [callLogs, deals, revenues, quotations] = await Promise.all([
    CallLog.find({}).lean(),
    SalesDeal.find({}).lean(),
    Revenue.find({}).lean(),
    Quotation.find({ ownerId: { $ne: null } }).lean(),
  ]);

  const data = users.map((user) => {
    const userCalls = callLogs.filter((item) => String(item.salesExecutiveId) === String(user._id));
    const userDeals = deals.filter((item) => String(item.ownerId) === String(user._id) || item.owner === user.name);
    const userRevenues = revenues.filter((item) => String(item.salesExecutiveId) === String(user._id));
    const userQuotations = quotations.filter((item) => String(item.ownerId) === String(user._id) || item.owner === user.name);
    const closedDeals = userDeals.filter((item) => item.stage === "Converted");
    const totalRevenue = userRevenues.reduce((sum, item) => sum + normalizeNumber(item.netRevenue), 0);
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      callsMade: userCalls.length,
      quotationsSent: userQuotations.filter((item) => ["Sent", "Viewed", "Under Discussion", "Approved"].includes(item.status)).length,
      dealsClosed: closedDeals.length,
      revenue: totalRevenue,
      conversionRate: userDeals.length ? Number(((closedDeals.length / userDeals.length) * 100).toFixed(2)) : 0,
    };
  });

  data.sort((a, b) => b.revenue - a.revenue || b.dealsClosed - a.dealsClosed || b.callsMade - a.callsMade);
  res.json({ success: true, data });
}

async function listMessages(req, res) {
  const lead = req.query.leadId ? await Lead.findOne({ _id: req.query.leadId, ...salesLeadScope(req.user) }) : null;
  if (req.query.leadId && !lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }

  const roomId = req.query.roomId || (lead ? buildRoomId(lead._id) : null);
  const query = {
    module: "sales",
    ...(roomId ? { roomId } : { $or: [{ senderId: req.user._id }, { participants: req.user._id }] }),
  };
  const messages = await Message.find(query).sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: messages });
}

async function sendMessage(req, res) {
  const lead = req.body.leadId ? await Lead.findOne({ _id: req.body.leadId, ...salesLeadScope(req.user) }) : null;
  if (req.body.leadId && !lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }

  const recipients = await findUsersByRefs(
    Array.isArray(req.body.recipientRefs) && req.body.recipientRefs.length
      ? req.body.recipientRefs
      : [{ role: "MANAGER" }, { role: "MARKETING" }],
  );
  const participantIds = Array.from(new Set([String(req.user._id), ...recipients.map((item) => String(item._id))]));
  const roomId = req.body.roomId || (lead ? buildRoomId(lead._id) : `sales-room-${Date.now()}`);

  const message = await Message.create({
    roomId,
    senderId: req.user._id,
    senderName: req.user.name,
    senderRole: req.user.role,
    messageType: "TEXT",
    text: req.body.text || "",
    module: "sales",
    leadId: lead?._id || null,
    participants: participantIds,
  });

  const io = req.app.get("io");
  if (io) {
    io.to(roomId).emit("sales:message", message);
  }

  await dispatchWorkflow({
    req,
    module: "sales",
    event: "SALES_MESSAGE",
    title: "Sales chat updated",
    message: `${req.user.name} sent a new sales message.`,
    priority: "medium",
    actionUrl: "/modules/sales/dashboard/dashboard.html",
    entityType: "message",
    entityId: message._id,
    userRefs: recipients.map((item) => ({ userId: item._id })),
    metadata: {
      roomId,
      leadId: lead ? String(lead._id) : "",
    },
  });

  res.status(201).json({ success: true, message: "message sent", data: message });
}

async function listMeetings(req, res) {
  const query = isPrivileged(req.user)
    ? { module: "sales" }
    : { module: "sales", $or: [{ startedBy: req.user._id }, { "participants.userId": req.user._id }] };
  const meetings = await Meeting.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: meetings });
}

async function createMeeting(req, res) {
  const lead = req.body.leadId ? await Lead.findOne({ _id: req.body.leadId, ...salesLeadScope(req.user) }) : null;
  if (req.body.leadId && !lead) {
    return res.status(404).json({ success: false, message: "lead record not found" });
  }

  const roomId = req.body.roomId || (lead ? buildRoomId(lead._id) : `sales-meeting-${Date.now()}`);
  const participants = [
    { userId: req.user._id, name: req.user.name, role: req.user.role, joinedAt: new Date() },
  ];
  const meeting = await Meeting.create({
    roomId,
    leadId: lead?._id || null,
    module: "sales",
    title: req.body.title || `Sales meeting${lead ? ` - ${lead.fullName || lead.contact}` : ""}`,
    meetingType: req.body.meetingType || "VIDEO",
    status: "SCHEDULED",
    startedBy: req.user._id,
    startedByName: req.user.name,
    participants,
    scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null,
    notes: req.body.notes || "",
  });

  await dispatchWorkflow({
    req,
    module: "sales",
    event: "SALES_MEETING",
    title: "Sales meeting scheduled",
    message: `${req.user.name} scheduled a sales meeting${lead ? ` for ${lead.fullName || lead.contact}` : ""}.`,
    priority: "medium",
    actionUrl: "/modules/sales/dashboard/dashboard.html",
    entityType: "meeting",
    entityId: meeting._id,
    userRefs: lead ? await resolveSalesRecipients(lead) : [{ role: "MANAGER" }, { role: "MARKETING" }],
    metadata: {
      roomId,
      scheduledFor: meeting.scheduledFor,
    },
  });

  res.status(201).json({ success: true, message: "meeting scheduled", data: meeting });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  summary,
  logCall,
  createFollowUp,
  createQuotation,
  sendQuotation,
  uploadProof,
  closeDeal,
  exportReport,
  leaderboard,
  listMessages,
  sendMessage,
  listMeetings,
  createMeeting,
};
