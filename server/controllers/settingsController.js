const createCrudController = require("../utils/createCrudController");
const SmtpSetting = require("../models/SmtpSetting");
const { getActiveSmtpSettings, sendEmail } = require("../services/emailService");
const { getMicrosoftConnectionStatus } = require("../services/microsoftGraphService");

const base = createCrudController("settings");

async function list(req, res) {
  return base.list(req, res);
}

async function getById(req, res) {
  return base.getById(req, res);
}

async function create(req, res) {
  return base.create(req, res);
}

async function update(req, res) {
  return base.update(req, res);
}

async function remove(req, res) {
  return base.remove(req, res);
}

async function getSmtpSettings(req, res) {
  const settings = await getActiveSmtpSettings();
  res.json({
    success: true,
    data: {
      ...settings,
      auth: settings.auth?.user ? { user: settings.auth.user, pass: settings.auth.pass ? "********" : "" } : { user: "", pass: "" },
    },
  });
}

async function saveSmtpSettings(req, res) {
  const payload = {
    provider: req.body.provider || "custom",
    host: req.body.host || "",
    port: Number(req.body.port || 587),
    secure: Boolean(req.body.secure),
    username: req.body.username || "",
    password: req.body.password || "",
    fromName: req.body.fromName || "",
    fromEmail: req.body.fromEmail || "",
    replyTo: req.body.replyTo || "",
    isActive: true,
    updatedBy: req.user?._id || null,
  };

  await SmtpSetting.updateMany({ isActive: true }, { isActive: false });
  const settings = await SmtpSetting.create(payload);
  res.status(201).json({ success: true, message: "SMTP settings saved", data: settings });
}

async function testSmtpSettings(req, res) {
  const to = String(req.body.to || req.user?.email || "").trim().toLowerCase();
  if (!to) {
    return res.status(400).json({ success: false, message: "Recipient email is required for SMTP test" });
  }

  const result = await sendEmail({
    to,
    subject: "Smart Enterprise SMTP test",
    template: "generic",
    variables: {
      title: "SMTP configuration test successful",
      recipientName: req.user?.name || "Administrator",
      module: "Settings",
      environment: process.env.NODE_ENV || "development",
      checkedAt: new Date().toLocaleString(),
      actionLabel: "Open Admin Dashboard",
      actionUrl: "/modules/admin/dashboard/dashboard.html",
    },
    relatedModule: "settings",
    relatedEntityType: "smtp",
    relatedEntityId: "active",
    metadata: { triggeredBy: req.user?._id ? String(req.user._id) : "" },
  });

  res.json({
    success: result.delivered,
    message: result.delivered ? "SMTP test email sent successfully" : "SMTP test email could not be delivered",
    data: result,
  });
}

async function getIntegrationStatus(req, res) {
  const smtp = await getActiveSmtpSettings();
  const connection = await getMicrosoftConnectionStatus();
  const microsoft = {
    tenantConfigured: Boolean(String(process.env.MICROSOFT_TENANT_ID || "").trim()),
    clientConfigured: Boolean(String(process.env.MICROSOFT_CLIENT_ID || "").trim()),
    secretConfigured: Boolean(String(process.env.MICROSOFT_CLIENT_SECRET || "").trim()),
    redirectConfigured: Boolean(String(process.env.MICROSOFT_REDIRECT_URI || "").trim()),
    userEmailConfigured: Boolean(String(process.env.MICROSOFT_USER_EMAIL || process.env.ADMIN_EMAIL || "").trim()),
    oneDriveRootConfigured: Boolean(String(process.env.ONEDRIVE_ROOT_FOLDER || "").trim()),
  };

  const graphReady =
    microsoft.tenantConfigured &&
    microsoft.clientConfigured &&
    microsoft.secretConfigured &&
    microsoft.redirectConfigured;

  res.json({
    success: true,
    data: {
      microsoft: {
        ...microsoft,
        graphReady,
        outlookReady: graphReady,
        calendarReady: graphReady,
        teamsReady: graphReady,
        oneDriveReady: graphReady && microsoft.oneDriveRootConfigured,
        connected: connection.connected,
        mailbox: connection.mailbox,
        connectionReason: connection.reason || "",
      },
      smtp: {
        configured: Boolean(smtp.host && smtp.auth?.user && smtp.auth?.pass && smtp.fromEmail),
        fromEmail: smtp.fromEmail || "",
      },
    },
  });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getSmtpSettings,
  saveSmtpSettings,
  testSmtpSettings,
  getIntegrationStatus,
};
