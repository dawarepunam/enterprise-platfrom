const Requirement = require("../models/Requirement");
const Feature = require("../models/Feature");
const Estimation = require("../models/Estimation");

async function list(req, res) {
  const estimations = await Estimation.find().sort({ updatedAt: -1 }).lean();
  res.json({ success: true, data: estimations });
}

async function create(req, res) {
  const { requirementId, modules = [] } = req.body || {};
  if (!requirementId) {
    return res.status(400).json({ success: false, message: "Requirement id is required" });
  }

  const requirement = await Requirement.findById(requirementId).lean();
  if (!requirement) {
    return res.status(404).json({ success: false, message: "Requirement not found" });
  }

  const features = await Feature.find({ requirementId }).lean();
  const featureHours = features.reduce((sum, item) => sum + Number(item.estimatedHours || 0), 0);
  const developmentHours = Number(req.body.developmentHours || featureHours || 160);
  const testingHours = Number(req.body.testingHours || Math.ceil(developmentHours * 0.3));
  const uiCost = Number(req.body.uiCost || Math.ceil(developmentHours * 700));
  const serverCost = Number(req.body.serverCost || 45000);
  const maintenanceCost = Number(req.body.maintenanceCost || 25000);
  const totalHours = developmentHours + testingHours;
  const totalCost = uiCost + serverCost + maintenanceCost + Number(req.body.additionalCost || 0);
  const timelineWeeks = Number(req.body.timelineWeeks || Math.max(4, Math.ceil(totalHours / 50)));

  const estimation = await Estimation.findOneAndUpdate(
    { requirementId },
    {
      requirementId,
      projectName: `${requirement.company || requirement.clientName} Implementation`,
      modules: modules.length ? modules : requirement.suggestedModules || [],
      developmentHours,
      testingHours,
      uiCost,
      serverCost,
      maintenanceCost,
      totalHours,
      totalCost,
      timelineWeeks,
      status: "Generated",
      createdBy: req.user?._id || null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  requirement.estimatedBudget = totalCost;
  requirement.estimatedTimelineWeeks = timelineWeeks;
  await Requirement.findByIdAndUpdate(requirementId, {
    estimatedBudget: totalCost,
    estimatedTimelineWeeks: timelineWeeks,
  });

  req.app.get("io")?.emit?.("product:estimation-generated", {
    requirementId: String(requirementId),
    estimationId: String(estimation._id),
  });

  res.status(201).json({ success: true, message: "Estimation generated successfully", data: estimation });
}

module.exports = {
  list,
  create,
};
