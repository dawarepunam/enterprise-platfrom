const Asset = require('../models/Asset');
const Training = require('../models/Training');
const ExitRecord = require('../models/ExitRecord');
const User = require('../models/User'); // Used for onboarding list

// ONBOARDING (Recent Hires)
exports.getOnboardingList = async (req, res) => {
  try {
    // Get users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newHires = await User.find({ createdAt: { $gte: thirtyDaysAgo } }).sort({ createdAt: -1 });
    res.status(200).json(newHires);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ASSETS
exports.getAssets = async (req, res) => {
  try {
    const assets = await Asset.find().populate('assignedTo', 'name email');
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAsset = async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('assetAssigned', asset);
    }
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// EXITS
exports.getExitRecords = async (req, res) => {
  try {
    const records = await ExitRecord.find().populate('employeeId', 'name email department');
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.initiateExit = async (req, res) => {
  try {
    const record = new ExitRecord(req.body);
    await record.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('exitInitiated', record);
    }
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateExitStatus = async (req, res) => {
  try {
    const record = await ExitRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (req.app.get('io')) {
      req.app.get('io').emit('exitUpdated', record);
    }
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
