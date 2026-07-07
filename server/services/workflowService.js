const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const { createNotifications } = require("./notificationService");
const { sendEmail } = require("./emailService");

function uniqById(list = []) {
  const seen = new Set();
  return list.filter((item) => {
    const key = String(item?._id || item?.email || item?.name || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeActionUrl(actionUrl = "") {
  if (!actionUrl) return "";
  if (/^https?:\/\//i.test(actionUrl)) return actionUrl;
  const base = process.env.CLIENT_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
  return `${base}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`;
}

async function findUsersByRefs(refs = []) {
  const filters = refs.filter(Boolean);
  if (!filters.length) return [];

  const query = { $or: [] };
  for (const ref of filters) {
    if (ref.userId) query.$or.push({ _id: ref.userId });
    if (ref.email) query.$or.push({ email: String(ref.email).toLowerCase() });
    if (ref.name) query.$or.push({ name: ref.name });
    if (ref.role) query.$or.push({ role: ref.role });
  }

  if (!query.$or.length) return [];
  const users = await User.find(query);
  return uniqById(users);
}

async function logAuditEntry(payload = {}) {
  try {
    return await AuditLog.create({
      title: payload.title || payload.action || "System Event",
      status: payload.status || "SUCCESS",
      category: payload.module || "",
      userName: payload.actorName || "",
      role: payload.actorRole || "",
      projectName: payload.projectName || "",
      taskTitle: payload.taskTitle || "",
      note: payload.note || payload.message || "",
      metadata: payload.metadata || {},
    });
  } catch (error) {
    return null;
  }
}

async function dispatchWorkflow({
  req,
  module,
  event,
  title,
  message,
  priority = "medium",
  actionUrl = "",
  entityType = "",
  entityId = "",
  userRefs = [],
  notificationRoles = [],
  email = null,
  audit = true,
  metadata = {},
}) {
  const recipients = await findUsersByRefs(userRefs);
  const io = req?.app?.get?.("io") || null;
  const absoluteActionUrl = normalizeActionUrl(actionUrl);

  const notificationPayloads = recipients.map((user) => ({
    title,
    message,
    type: event || "INFO",
    module,
    priority,
    userId: user._id,
    role: user.role,
    actionUrl: absoluteActionUrl,
    entityType,
    entityId,
    metadata: { ...metadata, recipientEmail: user.email },
  }));

  for (const role of notificationRoles) {
    notificationPayloads.push({
      title,
      message,
      type: event || "INFO",
      module,
      priority,
      role,
      actionUrl: absoluteActionUrl,
      entityType,
      entityId,
      metadata,
    });
  }

  let notifications = [];
  try {
    notifications = notificationPayloads.length ? await createNotifications(notificationPayloads, io) : [];
  } catch (error) {
    notifications = [{ error: error.message }];
  }

  const emailResults = [];
  if (email?.template && email?.subject) {
    for (const user of recipients) {
      if (!user.email) continue;

      try {
        emailResults.push(
          await sendEmail({
            to: user.email,
            subject: email.subject,
            template: email.template,
            variables: {
              name: user.name,
              recipientName: user.name,
              actionUrl: absoluteActionUrl,
              ...(email.variables || {}),
            },
            relatedModule: module,
            relatedEntityType: entityType,
            relatedEntityId: entityId,
            metadata: { ...metadata, event, recipientUserId: String(user._id) },
          }),
        );
      } catch (error) {
        emailResults.push({ delivered: false, reason: error.message, recipientEmail: user.email });
      }
    }
  }

  if (audit) {
    try {
      await logAuditEntry({
        title,
        action: event,
        status: "SUCCESS",
        module,
        actorName: req?.user?.name || "System",
        actorRole: req?.user?.role || "SYSTEM",
        projectName: metadata.projectName || "",
        taskTitle: metadata.taskTitle || "",
        message,
        metadata: {
          ...metadata,
          entityType,
          entityId: entityId ? String(entityId) : "",
        },
      });
    } catch (error) {
      // Keep business operations non-blocking even if audit persistence fails.
    }
  }

  return { recipients, notifications, emailResults };
}

module.exports = {
  dispatchWorkflow,
  findUsersByRefs,
  normalizeActionUrl,
};
