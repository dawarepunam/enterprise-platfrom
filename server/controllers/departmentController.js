const Department = require("../models/Department");
const User = require("../models/User");
const Project = require("../models/Project");
const Settings = require("../models/Settings");

module.exports = {
  list: async (req, res) => {
    const departments = await Department.find().sort({ createdAt: -1 });
    const enriched = [];
    for (const dept of departments) {
      const employeeCount = await User.countDocuments({ department: dept.name });
      const projectCount = await Project.countDocuments({ department: dept.name });
      enriched.push({
        ...dept.toJSON(),
        employeeCount,
        projectCount
      });
    }
    res.json({ success: true, data: enriched });
  },

  getById: async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    const employees = await User.find({ department: dept.name });
    const projects = await Project.find({ department: dept.name });

    res.json({
      success: true,
      data: {
        ...dept.toJSON(),
        employees,
        projects
      }
    });
  },

  create: async (req, res) => {
    const payload = { ...req.body };
    const dept = await Department.create(payload);

    await Settings.findOneAndUpdate(
      { name: "setupCompleted" },
      { name: "setupCompleted", metadata: { completed: true } },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: "Department created", data: dept });
  },

  update: async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    const oldName = dept.name;
    const newName = req.body.name;

    Object.assign(dept, req.body);
    await dept.save();

    if (newName && oldName !== newName) {
      await User.updateMany({ department: oldName }, { department: newName });
      await Project.updateMany({ department: oldName }, { department: newName });
    }

    res.json({ success: true, message: "Department updated", data: dept });
  },

  remove: async (req, res) => {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const count = await Department.countDocuments();
    if (count === 0) {
      await Settings.findOneAndUpdate(
        { name: "setupCompleted" },
        { name: "setupCompleted", metadata: { completed: false } },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: "Department deleted", id: req.params.id });
  },

  getSetupStatus: async (req, res) => {
    let setting = await Settings.findOne({ name: "setupCompleted" });
    let completed = setting?.metadata?.completed === true;

    if (!setting) {
      const count = await Department.countDocuments();
      if (count > 0) {
        completed = true;
        await Settings.create({ name: "setupCompleted", metadata: { completed: true } });
      }
    }

    res.json({ success: true, completed });
  }
};
