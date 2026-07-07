const AuditLog = require("../models/AuditLog");

async function logAction(userId, action, module, details) {
  try {
    const io = require("../server").io; // Assuming io is exported or can be retrieved from app
    
    const logEntry = await AuditLog.create({
      userId,
      action,
      module,
      details,
      createdAt: new Date()
    });

    return logEntry;
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}

module.exports = { logAction };
