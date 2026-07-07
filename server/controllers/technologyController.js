const Requirement = require("../models/Requirement");
const TechnologyStack = require("../models/TechnologyStack");
const { DEFAULT_STACK_OPTIONS, suggestStackForRequirement } = require("./productController");

async function list(req, res) {
  const requirement = req.query.requirementId ? await Requirement.findById(req.query.requirementId).lean() : null;
  const recommendedStack = suggestStackForRequirement(requirement || req.query || {});
  const savedStacks = req.query.requirementId ? await TechnologyStack.find({ requirementId: req.query.requirementId }).lean() : [];

  res.json({
    success: true,
    data: {
      options: DEFAULT_STACK_OPTIONS,
      recommendedStack,
      savedStacks,
    },
  });
}

module.exports = {
  list,
};
