const SalesDeal = require("../models/SalesDeal");

async function runFollowUpReminderJob() {
  const now = new Date();
  const deals = await SalesDeal.find({
    nextFollowUp: { $lte: now },
    stage: { $nin: ["Converted", "Lost"] },
  }).lean();

  return {
    job: "follow-up-reminders",
    executedAt: now,
    deals: deals.map((deal) => ({
      dealId: deal._id,
      company: deal.company,
      owner: deal.owner,
      stage: deal.stage,
    })),
  };
}

module.exports = runFollowUpReminderJob;
