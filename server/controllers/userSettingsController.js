const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    res.json({
      name: user.name,
      email: user.email,
      jobTitle: user.designation,
      department: user.department,
      phone: user.phone,
      location: user.location || "",
      bio: user.bio || "",
      profilePhoto: user.profilePhoto || "",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, location, bio } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    user.phone = phone || "";
    user.location = location || "";
    user.bio = bio || "";
    
    await user.save();
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        title: user.title,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        employeeId: user.employeeId,
        teamId: user.teamId,
        teamName: user.teamName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get 2FA Status
exports.get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    res.json({ enabled: user.security && user.security.twoFactorEnabled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle 2FA
exports.toggle2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    if (!user.security) user.security = {};
    
    if (user.security.twoFactorEnabled) {
      // Disable it
      user.security.twoFactorEnabled = false;
      await user.save();
      return res.json({ success: true, message: "2FA Disabled" });
    } else {
      // Return a fake QR code for demonstration since we don't have speakeasy installed by default
      const qrCode = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // Just a 1x1 pixel image for demo
      res.json({ success: true, qrCode });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Confirm 2FA
exports.confirm2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    if (!user.security) user.security = {};
    user.security.twoFactorEnabled = true;
    await user.save();
    
    res.json({ success: true, message: "2FA Enabled successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPwd, newPwd } = req.body;
    
    // We need to select password explicitly since it's select: false in schema
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    // Compare current password
    const isMatch = await user.comparePassword(currentPwd);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }
    
    user.password = newPwd;
    await user.save(); // pre-save hook handles hashing
    
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Sessions
exports.getSessions = async (req, res) => {
  try {
    // For now we will return some dummy sessions or fetch from User's knownDevices if it exists
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    const sessions = [
      {
        id: "1",
        device: "Windows Laptop",
        ip: "192.168.1.100",
        lastActive: new Date(),
        current: true
      },
      {
        id: "2",
        device: "iPhone 13",
        ip: "10.0.0.5",
        lastActive: new Date(Date.now() - 86400000), // 1 day ago
        current: false
      }
    ];
    
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Preferences
exports.updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.preferences) user.preferences = {};
    
    // Merge new preferences with existing
    user.preferences = { ...user.preferences.toObject(), ...req.body };
    
    // Also save privacy settings if sent
    if (req.body.privacy) {
      if (!user.privacy) user.privacy = {};
      user.privacy = { ...user.privacy.toObject(), ...req.body.privacy };
    }

    await user.save();
    res.json({ success: true, message: "Preferences updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upload Avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // In a real app we'd upload to S3/Cloudinary and get a URL.
    // For now we just use local uploads folder.
    user.profilePhoto = '/uploads/' + req.file.filename;
    await user.save();

    res.json({ success: true, message: 'Profile photo updated', profilePhoto: user.profilePhoto });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
