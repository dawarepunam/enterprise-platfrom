const Team = require('../models/Team');
const User = require('../models/User'); // assuming User model exists
const io = require('../config/socket'); // socket instance

// List all teams
exports.listTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('managerId teamLeadId memberIds');
    res.json({ success: true, data: teams });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a new team
exports.createTeam = async (req, res) => {
  try {
    const team = await Team.create(req.body);
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get a single team
exports.getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('managerId teamLeadId memberIds');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a team
exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete a team
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add a member to a team (POST /api/teams/:teamId/members)
exports.addMember = async (req, res) => {
  const { teamId } = req.params;
  const { employeeId, name, email, role, department } = req.body;
  try {
    let user;
    if (employeeId) {
      user = await User.findById(employeeId);
    } else if (email) {
      user = await User.findOne({ email });
    }
    
    if (!user && email) {
      user = await User.create({ name, email, role, department });
    } else if (!user) {
      return res.status(404).json({ success: false, message: 'User not found or invalid data' });
    }

    const team = await Team.findByIdAndUpdate(
      teamId,
      { $addToSet: { memberIds: user._id, members: user.name } },
      { new: true }
    ).populate('memberIds');
    // emit socket event
    io.to(`team_${teamId}`).emit('teamMemberAdded', { teamId, member: { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department } });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};
