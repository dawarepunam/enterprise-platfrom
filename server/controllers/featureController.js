const Feature = require("../models/Feature");

async function list(req, res) {
  const query = req.query.requirementId ? { requirementId: req.query.requirementId } : {};
  const features = await Feature.find(query).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: features });
}

async function create(req, res) {
  const { requirementId, name } = req.body || {};
  if (!requirementId || !name) {
    return res.status(400).json({ success: false, message: "Requirement id and feature name are required" });
  }

  const feature = await Feature.create({
    requirementId,
    name,
    description: req.body.description || "",
    priority: req.body.priority || "Medium",
    estimatedHours: Number(req.body.estimatedHours || 0),
    dependencies: Array.isArray(req.body.dependencies)
      ? req.body.dependencies
      : String(req.body.dependencies || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    group: req.body.group || "Core Features",
    createdBy: req.user?._id || null,
  });

  res.status(201).json({ success: true, message: "Feature created successfully", data: feature });
}

module.exports = {
  list,
  create,
};
