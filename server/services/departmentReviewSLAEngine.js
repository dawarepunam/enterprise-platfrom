const cron = require('node-cron');
const DepartmentReview = require('../models/DepartmentReview');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

function startSLAEngine() {
  // Run every hour at the top of the hour (or every minute for testing: '* * * * *')
  cron.schedule('0 * * * *', async () => {
    try {
      console.log("[SLA Engine] Running Department Review SLA check...");
      const now = Date.now();
      
      const activeReviews = await DepartmentReview.find({ 
        status: { $nin: ["Approved", "Rejected"] } 
      });

      for (const review of activeReviews) {
        const timeSinceLastAction = now - review.lastActionAt.getTime();
        const hoursPassed = timeSinceLastAction / (1000 * 60 * 60);

        let escalated = false;
        let priorityLevel = "medium";
        let message = "";

        if (hoursPassed >= 72 && !review.metadata?.escalated72) {
          message = `SLA Breached (72h): Review for ${review.company} requires immediate Department Head attention.`;
          priorityLevel = "high";
          escalated = true;
          review.metadata = { ...review.metadata, escalated72: true, escalated48: true, escalated24: true };
        } else if (hoursPassed >= 48 && !review.metadata?.escalated48) {
          message = `SLA Warning (48h): Review for ${review.company} is delayed. Manager escalation required.`;
          priorityLevel = "high";
          escalated = true;
          review.metadata = { ...review.metadata, escalated48: true, escalated24: true };
        } else if (hoursPassed >= 24 && !review.metadata?.escalated24) {
          message = `SLA Reminder (24h): Review for ${review.company} has been pending for 24 hours.`;
          priorityLevel = "medium";
          escalated = true;
          review.metadata = { ...review.metadata, escalated24: true };
        }

        if (escalated) {
          await review.save();
          
          await Notification.create({
            title: "SLA Escalation",
            message,
            type: "SLA_BREACH",
            module: "DepartmentReview",
            priority: priorityLevel,
            entityType: "DepartmentReview",
            entityId: review._id,
            actionUrl: `/department-review`
          });

          await AuditLog.create({
            title: "SLA Escalation Triggered",
            name: "SLA Escalation",
            metadata: { reviewId: review._id, hoursPassed },
            owner: "System",
            userName: "System",
            role: "System",
            date: new Date().toISOString()
          });
          
          console.log(`[SLA Engine] Escalated review ${review._id} (${Math.floor(hoursPassed)}h)`);
        }
      }
    } catch (err) {
      console.error("[SLA Engine] Error:", err);
    }
  });
  console.log("[SLA Engine] Department Review SLA Cron Started.");
}

module.exports = { startSLAEngine };
