const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendEmail } = require("../services/emailService");
const { dispatchWorkflow } = require("../services/workflowService");
const { issueRefreshToken, revokeRefreshToken, rotateRefreshToken, signAccessToken } = require("../services/authTokenService");

function getClientBaseUrl() {
  return process.env.CLIENT_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
}

function buildDeviceSnapshot(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.ip || "");
  return {
    ip,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
  };
}

function trackKnownDevice(user, req) {
  if (!user.security?.deviceTrackingEnabled) {
    return;
  }

  const snapshot = buildDeviceSnapshot(req);
  const deviceId = `${snapshot.ip}__${snapshot.userAgent}`;
  const existing = (user.knownDevices || []).find((item) => item.deviceId === deviceId);

  if (existing) {
    existing.lastSeenAt = new Date();
    existing.ip = snapshot.ip;
    existing.userAgent = snapshot.userAgent;
  } else {
    user.knownDevices.push({
      deviceId,
      ip: snapshot.ip,
      userAgent: snapshot.userAgent,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
  }

  user.knownDevices = user.knownDevices.slice(-10);
  user.lastLoginIp = snapshot.ip;
  user.lastLoginUserAgent = snapshot.userAgent;
}

function isStrongPassword(password = "") {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function formatUser(user) {
  return {
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
    employeeId: user.employeeId,
    joiningDate: user.joiningDate,
    skills: user.skills || [],
    teamId: user.teamId,
    teamName: user.teamName,
    status: user.status,
    profilePhoto: user.profilePhoto,
    preferences: user.preferences || {},
    settings: user.settings || {},
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    lastLoginUserAgent: user.lastLoginUserAgent,
    security: {
      twoFactorEnabled: Boolean(user.security?.twoFactorEnabled),
      deviceTrackingEnabled: user.security?.deviceTrackingEnabled !== false,
      knownDeviceCount: Array.isArray(user.knownDevices) ? user.knownDevices.length : 0,
    },
  };
}

async function register(req, res) {
  const { name, email, password, role, department, title, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: "User already exists with this email" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "MEMBER",
    department,
    title,
    phone,
  });

  const refreshTokenPayload = await issueRefreshToken({ user, req });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      token: signAccessToken({ id: user._id, role: user.role }),
      refreshToken: refreshTokenPayload.refreshToken,
      user: formatUser(user),
    },
  });
}

async function login(req, res) {
  const { email, password, loginRole } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  if (!loginRole) {
    return res.status(400).json({ success: false, message: "Please Select Role" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User Not Found" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid Password" });
  }

  if (user.status === "BLOCKED") {
    return res.status(403).json({ success: false, message: "Account Disabled. Contact Administrator." });
  }

  // Allow both MANAGER and PROJECT_MANAGER to login as Project Manager
  const requestedRole = String(loginRole || "").toUpperCase();
  const userRole = String(user.role || "").toUpperCase();
  const pmRoles = ["MANAGER", "PROJECT_MANAGER"];
  const isPmLogin = pmRoles.includes(requestedRole) && pmRoles.includes(userRole);
  if (!isPmLogin && userRole !== requestedRole) {
    return res.status(403).json({ success: false, message: "Invalid Role Selected" });
  }

  user.lastLoginAt = new Date();
  trackKnownDevice(user, req);
  await user.save();
  const refreshTokenPayload = await issueRefreshToken({ user, req });

  if (user.security?.twoFactorEnabled || user.security?.deviceTrackingEnabled) {
    Promise.resolve(dispatchWorkflow({
      req: { app: req.app, user },
      module: "security",
      event: "LOGIN_DETECTED",
      title: "New login detected",
      message: `A new login was detected for ${user.email}.`,
      priority: "medium",
      actionUrl: "/modules/admin/profile/security.html",
      entityType: "user",
      entityId: user._id,
      userRefs: [{ userId: user._id }],
      email: {
        subject: "Security alert: new login detected",
        template: "generic",
        variables: {
          title: "New login detected",
          email: user.email,
          role: user.role,
          loginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : new Date().toLocaleString(),
          ipAddress: user.lastLoginIp || "Unknown",
          userAgent: user.lastLoginUserAgent || "Unknown",
          actionLabel: "Review Security",
        },
      },
      metadata: {
        loginIp: user.lastLoginIp,
        userAgent: user.lastLoginUserAgent,
      },
    })).catch(() => {});
  }

  res.json({
    success: true,
    message: "Login successful",
    data: {
      token: signAccessToken({ id: user._id, role: user.role }),
      refreshToken: refreshTokenPayload.refreshToken,
      user: formatUser(user),
    },
  });
}

async function managerLogin(req, res) {
  req.body = {
    ...req.body,
    loginRole: "MANAGER",
  };

  return login(req, res);
}

async function refresh(req, res) {
  const refreshToken = String(req.body.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token is required" });
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "dev-secret");
  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ success: false, message: "User not found" });
  }

  const nextRefreshToken = await rotateRefreshToken({ user, currentToken: refreshToken, req });
  res.json({
    success: true,
    message: "Session refreshed",
    data: {
      token: signAccessToken({ id: user._id, role: user.role }),
      refreshToken: nextRefreshToken.refreshToken,
      user: formatUser(user),
    },
  });
}

async function logout(req, res) {
  const refreshToken = String(req.body.refreshToken || "").trim();
  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch (error) {
      // Ignore logout revocation errors so clients can still clear local session state.
    }
  }

  res.json({ success: true, message: "Logged out successfully" });
}

async function me(req, res) {
  res.json({ success: true, data: formatUser(req.user) });
}

async function forgotPassword(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: "Email Not Registered" });
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const hashedToken = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresInMinutes = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES || 30);

  user.security = user.security || {};
  user.security.passwordResetToken = hashedToken;
  user.security.passwordResetExpiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await user.save();

  const emailResult = await sendEmail({
    to: user.email,
    subject: "JMKC CRM Password Reset",
    template: "generic",
    preferSmtp: true,
    variables: {
      title: "Password Reset OTP",
      name: user.name,
      email: user.email,
      otp,
      expiresInMinutes,
      actionLabel: "Go to Password Reset",
      actionUrl: `${getClientBaseUrl()}/forgot-password`,
    },
    relatedModule: "security",
    relatedEntityType: "user",
    relatedEntityId: user._id,
  });

  const showDebugOtp = !emailResult.delivered || String(process.env.DEBUG_AUTH_OTP || "").toLowerCase() === "true" || process.env.NODE_ENV !== "production";

  res.json({
    success: true,
    message: emailResult.delivered ? "OTP sent successfully to your email" : "OTP generated, but email delivery failed. Check SMTP settings.",
    data: {
      expiresInMinutes,
      delivered: emailResult.delivered,
      reason: emailResult.reason || "",
      debugOtp: showDebugOtp ? otp : undefined,
    },
  });
}

async function verifyResetOtp(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();

  if (!email || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "Email and valid 6 digit OTP are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ success: false, message: "OTP is invalid" });
  }

  const hashedToken = crypto.createHash("sha256").update(otp).digest("hex");
  if (!user.security?.passwordResetToken || !user.security.passwordResetExpiresAt) {
    return res.status(400).json({ success: false, message: "OTP Expired" });
  }

  if (new Date() > new Date(user.security.passwordResetExpiresAt)) {
    return res.status(400).json({ success: false, message: "OTP Expired" });
  }

  if (user.security.passwordResetToken !== hashedToken) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  res.json({ success: true, message: "OTP Verified Successfully" });
}

async function resetPassword(req, res) {
  const token = String(req.body.token || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!token || !email || !password) {
    return res.status(400).json({ success: false, message: "Email, OTP and new password are required" });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must have at least 8 characters, uppercase, lowercase, digit and special character.",
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    email,
    "security.passwordResetToken": hashedToken,
    "security.passwordResetExpiresAt": { $gt: new Date() },
  }).select("+password");

  if (!user) {
    return res.status(400).json({ success: false, message: "Reset token is invalid or expired" });
  }

  user.password = password;
  user.security.passwordResetToken = "";
  user.security.passwordResetExpiresAt = null;
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
}

module.exports = {
  register,
  login,
  managerLogin,
  refresh,
  logout,
  me,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
