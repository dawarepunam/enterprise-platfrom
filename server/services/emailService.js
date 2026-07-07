const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const EmailLog = require("../models/EmailLog");
const SmtpSetting = require("../models/SmtpSetting");
const { hasMicrosoftGraphConfig, sendMailViaMicrosoft } = require("./microsoftGraphService");

function replaceTokens(content, variables = {}) {
  return Object.entries(variables).reduce((html, [key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    return html.replace(token, String(value ?? ""));
  }, content);
}

function renderFallbackTemplate(templateName, variables = {}) {
  const title = variables.title || variables.subject || "Smart Enterprise Update";
  const recipient = variables.name || variables.recipientName || "Team member";
  const actionLabel = variables.actionLabel || "Open Workspace";
  const actionUrl = variables.actionUrl || variables.resetUrl || variables.joinUrl || "";
  const details = Object.entries(variables)
    .filter(([key, value]) => value && !["name", "recipientName", "title", "subject", "actionLabel", "actionUrl"].includes(key))
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${label}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${String(value)}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title}</title></head>
<body style="margin:0;background:#e2e8f0;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:720px;margin:32px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,0.12);">
    <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
      <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.75;">Smart Enterprise</div>
      <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">${title}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin-top:0;font-size:16px;">Hello ${recipient},</p>
      <p style="font-size:15px;line-height:1.7;color:#334155;">This is an automated update from your enterprise workspace. Review the details below and take action if needed.</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">${details}</table>
      ${actionUrl ? `<div style="margin-top:28px;"><a href="${actionUrl}" style="display:inline-block;padding:14px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;">${actionLabel}</a></div>` : ""}
    </div>
    <div style="padding:22px 32px;background:#f8fafc;color:#64748b;font-size:13px;">
      This email was generated automatically by Smart Enterprise. Please contact your system administrator if you need help.
    </div>
  </div>
</body>
</html>`;
}

function renderTemplate(templateName, variables = {}) {
  const templatePath = path.join(__dirname, "../templates/email", `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    return renderFallbackTemplate(templateName, variables);
  }

  const file = fs.readFileSync(templatePath, "utf8");
  return replaceTokens(file, variables);
}

async function getActiveSmtpSettings() {
  const dbSettings = await SmtpSetting.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
  const envFrom = String(process.env.SMTP_FROM || "").trim();
  const fromMatch = envFrom.match(/^(.*)<(.+)>$/);

  return {
    host: dbSettings?.host || process.env.SMTP_HOST || "",
    port: Number(dbSettings?.port || process.env.SMTP_PORT || 587),
    secure: Boolean(dbSettings?.secure || String(process.env.SMTP_SECURE || "").toLowerCase() === "true"),
    auth: {
      user: dbSettings?.username || process.env.SMTP_USER || "",
      pass: dbSettings?.password || process.env.SMTP_PASS || "",
    },
    fromName: dbSettings?.fromName || (fromMatch ? fromMatch[1].trim().replace(/(^"|"$)/g, "") : "Smart Enterprise"),
    fromEmail: dbSettings?.fromEmail || (fromMatch ? fromMatch[2].trim() : process.env.SMTP_USER || ""),
    replyTo: dbSettings?.replyTo || process.env.SMTP_REPLY_TO || "",
  };
}

function hasUsableTransport(config) {
  return Boolean(config.host && config.auth?.user && config.auth?.pass && config.fromEmail);
}

async function sendEmail(payload = {}) {
  const html = payload.html || renderTemplate(payload.template || "generic", payload.variables || {});
  const recipientEmail = Array.isArray(payload.to) ? payload.to.join(", ") : String(payload.to || "");
  const logPayload = {
    recipientEmail,
    subject: payload.subject || "",
    templateName: payload.template || "generic",
    relatedModule: payload.relatedModule || "",
    relatedEntityType: payload.relatedEntityType || "",
    relatedEntityId: payload.relatedEntityId ? String(payload.relatedEntityId) : "",
    status: "pending",
    metadata: payload.metadata || {},
  };

  if (!payload.preferSmtp && hasMicrosoftGraphConfig()) {
    try {
      const graphResult = await sendMailViaMicrosoft({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        html,
        text: payload.text,
      });

      const log = await EmailLog.create({
        ...logPayload,
        status: "sent",
        sentAt: new Date(),
        transportMessageId: graphResult.transportMessageId || "",
        metadata: {
          ...(payload.metadata || {}),
          provider: graphResult.provider || "microsoft-graph",
          mailbox: graphResult.mailbox || "",
        },
      });

      return {
        delivered: true,
        preview: html,
        transportMessageId: graphResult.transportMessageId || "",
        log,
        provider: graphResult.provider || "microsoft-graph",
      };
    } catch (graphError) {
      // Fall back to SMTP below if Microsoft Graph is configured but currently unavailable.
      logPayload.metadata = {
        ...(logPayload.metadata || {}),
        graphFallbackReason: graphError.message,
      };
    }
  }

  const config = await getActiveSmtpSettings();
  if (!hasUsableTransport(config)) {
    const log = await EmailLog.create({
      ...logPayload,
      status: "skipped",
      errorMessage: "SMTP is not configured. Add SMTP credentials in env or smtp settings.",
    });

    return {
      delivered: false,
      preview: html,
      log,
      reason: "smtp_not_configured",
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const info = await transport.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      replyTo: config.replyTo || config.fromEmail,
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      html,
      text: payload.text,
    });

    const log = await EmailLog.create({
      ...logPayload,
      status: "sent",
      sentAt: new Date(),
      transportMessageId: info.messageId || "",
    });

    return {
      delivered: true,
      preview: html,
      transportMessageId: info.messageId || "",
      log,
    };
  } catch (error) {
    const log = await EmailLog.create({
      ...logPayload,
      status: "failed",
      errorMessage: error.message,
    });

    return {
      delivered: false,
      preview: html,
      log,
      reason: error.message,
    };
  }
}

module.exports = {
  renderTemplate,
  sendEmail,
  getActiveSmtpSettings,
};
