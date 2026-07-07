const Claim = require('../models/Claim');
const TravelRequest = require('../models/TravelRequest');
const Benefit = require('../models/Benefit');

// CLAIMS
exports.getClaims = async (req, res) => {
  try {
    const claims = await Claim.find().populate('employeeId', 'name email').sort({ createdAt: -1 });
    res.status(200).json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createClaim = async (req, res) => {
  try {
    const claim = new Claim(req.body);
    // Hardcoding employee ID for demo purposes since we don't have auth middleware here
    claim.employeeId = "6676ba9b76dbb04da12bd5a0"; // Placeholder Object ID
    await claim.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('claimCreated', claim);
    }
    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// TRAVEL
exports.getTravelRequests = async (req, res) => {
  try {
    const requests = await TravelRequest.find().populate('employeeId', 'name email').sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createTravelRequest = async (req, res) => {
  try {
    const request = new TravelRequest(req.body);
    request.employeeId = "6676ba9b76dbb04da12bd5a0"; // Placeholder Object ID
    await request.save();
    if (req.app.get('io')) {
      req.app.get('io').emit('travelCreated', request);
    }
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// BENEFITS
exports.getBenefits = async (req, res) => {
  try {
    const benefits = await Benefit.find().populate('employeeId', 'name email').sort({ createdAt: -1 });
    res.status(200).json(benefits);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generic Update
exports.updateStatus = async (req, res) => {
  try {
    const { type, id, status } = req.body;
    let result = null;
    if (type === 'claim') {
      result = await Claim.findByIdAndUpdate(id, { status }, { new: true });
      if (req.app.get('io')) req.app.get('io').emit('claimApproved', result);
    } else if (type === 'travel') {
      result = await TravelRequest.findByIdAndUpdate(id, { status }, { new: true });
      if (req.app.get('io')) req.app.get('io').emit('travelUpdated', result);
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
