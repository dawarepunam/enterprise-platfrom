const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userRoles = ["ADMIN", "MANAGER", "PROJECT_MANAGER", "PRODUCT_MANAGER", "TEAM_LEAD", "MEMBER", "MARKETING", "CALLING", "SALES", "HR", "CLIENT"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      required: true,
      enum: userRoles,
      default: "MEMBER",
    },
    username: { type: String, trim: true, default: "" },
    employeeId: { type: String, unique: true, sparse: true, trim: true },
    department: { type: String, trim: true, default: "" },
    designation: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    permissions: [{ type: String, trim: true }],
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    teamName: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "BLOCKED", "ON_HOLD"], default: "ACTIVE" },
    profilePhoto: { type: String, trim: true, default: "" },
    skills: [{ type: String, trim: true }],
    joiningDate: { type: Date, default: Date.now },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      activityVisible: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
    },
    preferences: {
      darkMode: { type: Boolean, default: false },
      notificationsEnabled: { type: Boolean, default: true },
      privacyMode: { type: Boolean, default: false },
      salary: {
        base: { type: Number, default: 45000 },
        allowances: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },
        bonuses: { type: Number, default: 0 },
        reimbursements: { type: Number, default: 0 },
      },
    },
    settings: {
      theme: { type: String, trim: true, default: "light" },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
    microsoft: {
      outlookEmail: { type: String, trim: true, default: "" },
      outlookReady: { type: Boolean, default: false },
      calendarReady: { type: Boolean, default: false },
      teamsReady: { type: Boolean, default: false },
      oneDriveReady: { type: Boolean, default: false },
      lastWelcomeEmailAt: { type: Date, default: null },
    },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String, trim: true, default: "" },
    lastLoginUserAgent: { type: String, trim: true, default: "" },
    knownDevices: {
      type: [
        {
          deviceId: { type: String, trim: true, default: "" },
          ip: { type: String, trim: true, default: "" },
          userAgent: { type: String, trim: true, default: "" },
          firstSeenAt: { type: Date, default: Date.now },
          lastSeenAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      deviceTrackingEnabled: { type: Boolean, default: true },
      passwordResetToken: { type: String, default: "" },
      passwordResetExpiresAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// Pre‑save hook to keep Department.employeeCount in sync
userSchema.pre('save', async function () {
  const Department = require('../models/Department');
  // If new user and department set – increment count
  if (this.isNew && this.department) {
    await Department.updateOne({ name: this.department }, { $inc: { employeeCount: 1 } });
  } else if (this.isModified('department')) {
    // Decrement old department, increment new department
    const oldDept = this.get('department', null, { getters: false, virtuals: false });
    // this.get('department') returns new value, so we need original via this.modifiedPaths()
    const prevDept = this.getModifiedPaths ? this.getModifiedPaths().includes('department') ? this.get('department', null, { getters: false, virtuals: false }) : null : null;
    // Simpler: use this.get('department') before change is not directly available; fetch from DB
    const existing = await this.constructor.findById(this._id).select('department');
    const previousDept = existing ? existing.department : null;
    if (previousDept && previousDept !== this.department) {
      await Department.updateOne({ name: previousDept }, { $inc: { employeeCount: -1 } });
      if (this.department) {
        await Department.updateOne({ name: this.department }, { $inc: { employeeCount: 1 } });
      }
    }
  }
});
userSchema.pre('remove', async function () {
  if (this.department) {
    const Department = require('../models/Department');
    await Department.updateOne({ name: this.department }, { $inc: { employeeCount: -1 } });
  }
});

userSchema.pre("save", async function saveEmployeeId() {
  if (!this.employeeId) {
    let count = await mongoose.model("User").countDocuments();
    let uniqueIdFound = false;
    let candidateId = "";
    while (!uniqueIdFound) {
      count++;
      candidateId = `EMP${String(count).padStart(3, "0")}`;
      const existing = await mongoose.model("User").findOne({ employeeId: candidateId });
      if (!existing) {
        uniqueIdFound = true;
      }
    }
    this.employeeId = candidateId;
  }
});

userSchema.pre("save", async function savePassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    if (ret.security) {
      delete ret.security.passwordResetToken;
      delete ret.security.passwordResetExpiresAt;
    }
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
