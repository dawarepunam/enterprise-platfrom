const Campaign = require("../models/Campaign");
const MarketingLead = require("../models/MarketingLead");
const { sendEmail } = require("../services/emailService");

async function list(req, res) {
  const items = await Campaign.find({ department: "Marketing" }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
}

async function create(req, res) {
  const payload = {
    name: String(req.body.name || req.body.campaignName || "").trim(),
    channel: String(req.body.platform || req.body.channel || "").trim(),
    status: String(req.body.status || "Active").trim(),
    ownerId: req.user?._id || null,
    owner: req.user?.name || "",
    ownerEmail: req.user?.email || "",
    department: "Marketing",
    targetAudience: String(req.body.targetAudience || "").trim(),
    objective: String(req.body.objective || "").trim(),
    notes: String(req.body.notes || "").trim(),
    budget: Number(req.body.budget || 0),
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
  };

  if (!payload.name) {
    return res.status(400).json({ success: false, message: "Campaign name is required" });
  }

  const campaign = await Campaign.create(payload);
  res.status(201).json({ success: true, message: "Campaign created", data: campaign });
}

async function update(req, res) {
  const allowed = ["name", "channel", "platform", "status", "targetAudience", "objective", "notes", "budget", "startDate", "endDate"];
  const payload = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) payload[key === "platform" ? "channel" : key] = req.body[key];
  });
  if (payload.budget !== undefined) payload.budget = Number(payload.budget || 0);

  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, department: "Marketing" },
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  res.json({ success: true, message: "Campaign updated", data: campaign });
}

async function remove(req, res) {
  const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, department: "Marketing" });
  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }
  res.json({ success: true, message: "Campaign deleted" });
}

async function sendEmailCampaign(req, res) {
  const leadIds = Array.isArray(req.body.leadIds) ? req.body.leadIds.filter(Boolean) : [];
  const subject = String(req.body.subject || "").trim();
  const html = String(req.body.html || req.body.message || "").trim();
  const scheduleAt = req.body.scheduleAt ? new Date(req.body.scheduleAt) : null;

  if (!leadIds.length || !subject || !html) {
    return res.status(400).json({ success: false, message: "leadIds, subject and html are required" });
  }

  const leads = await MarketingLead.find({ _id: { $in: leadIds }, email: { $ne: "" } }).lean();
  if (!leads.length) {
    return res.status(400).json({ success: false, message: "No selected leads have an email address" });
  }

  if (scheduleAt && scheduleAt.getTime() > Date.now()) {
    return res.json({
      success: true,
      message: "Email campaign scheduled",
      data: { scheduled: true, scheduleAt, recipients: leads.length },
    });
  }

  const results = [];
  for (const lead of leads) {
    const result = await sendEmail({
      to: lead.email,
      subject,
      html: html
        .replace(/{{\s*lead_name\s*}}/gi, lead.name)
        .replace(/{{\s*company\s*}}/gi, lead.company || "your team"),
      relatedModule: "marketing",
      relatedEntityType: "MarketingLead",
      relatedEntityId: lead._id,
      metadata: { channel: "email_campaign", sentBy: req.user?.email || "" },
    });
    results.push({ leadId: lead._id, email: lead.email, delivered: result.delivered });
  }

  await MarketingLead.updateMany(
    { _id: { $in: leadIds } },
    {
      $set: { lastActivityAt: new Date() },
      $push: {
        timeline: {
          type: "email",
          title: "Email campaign sent",
          description: subject,
          actor: req.user?.name || "System",
          at: new Date(),
          channel: "Email",
        },
      },
    },
  );

  res.json({ success: true, message: "Email campaign processed", data: results });
}

async function sendWhatsAppCampaign(req, res) {
  const leadIds = Array.isArray(req.body.leadIds) ? req.body.leadIds.filter(Boolean) : [];
  const message = String(req.body.message || "").trim();
  const scheduleAt = req.body.scheduleAt ? new Date(req.body.scheduleAt) : null;

  if (!leadIds.length || !message) {
    return res.status(400).json({ success: false, message: "leadIds and message are required" });
  }

  const leads = await MarketingLead.find({ _id: { $in: leadIds }, phone: { $ne: "" } }).lean();
  if (!leads.length) {
    return res.status(400).json({ success: false, message: "No selected leads have a phone number" });
  }

  if (scheduleAt && scheduleAt.getTime() > Date.now()) {
    return res.json({
      success: true,
      message: "WhatsApp campaign scheduled",
      data: { scheduled: true, scheduleAt, recipients: leads.length },
    });
  }

  const sid = process.env.TWILIO_SID || "";
  const auth = process.env.TWILIO_AUTH || "";
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || "";

  if (!sid || !auth || !fromNumber) {
    return res.status(400).json({ success: false, message: "Twilio WhatsApp credentials are not configured" });
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const basicAuth = Buffer.from(`${sid}:${auth}`).toString("base64");
  const results = [];

  for (const lead of leads) {
    const body = new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: `whatsapp:${lead.phone.startsWith("+") ? lead.phone : `+${lead.phone}`}`,
      Body: message.replace(/{{\s*lead_name\s*}}/gi, lead.name),
    });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      const data = await response.json();
      results.push({ leadId: lead._id, phone: lead.phone, delivered: response.ok, sid: data.sid || "" });
    } catch (error) {
      results.push({ leadId: lead._id, phone: lead.phone, delivered: false, error: error.message });
    }
  }

  await MarketingLead.updateMany(
    { _id: { $in: leadIds } },
    {
      $set: { lastActivityAt: new Date() },
      $push: {
        timeline: {
          type: "whatsapp",
          title: "WhatsApp campaign sent",
          description: message.slice(0, 80),
          actor: req.user?.name || "System",
          at: new Date(),
          channel: "WhatsApp",
        },
      },
    },
  );

  res.json({ success: true, message: "WhatsApp campaign processed", data: results });
}

module.exports = {
  list,
  create,
  update,
  remove,
  sendEmailCampaign,
  sendWhatsAppCampaign,
};
