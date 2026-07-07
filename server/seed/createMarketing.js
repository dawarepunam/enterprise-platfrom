const User = require("../models/User");

async function createMarketing() {
  const email = (
    process.env.MARKETING_EMAIL || "marketing@enterprise.local"
  ).toLowerCase();
  const password = process.env.MARKETING_PASSWORD || "Marketing@123";
  const name = process.env.MARKETING_NAME || "Marketing Lead";

  let user = await User.findOne({ email }).select("+password");
  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      role: "MARKETING",
      department: "Marketing",
      title: "Marketing Lead",
      status: "ACTIVE",
    });
    return user;
  }

  let dirty = false;
  if (String(user.role || "").toUpperCase() !== "MARKETING") {
    user.role = "MARKETING";
    dirty = true;
  }
  if (!user.department) {
    user.department = "Marketing";
    dirty = true;
  }
  if (!user.title) {
    user.title = "Marketing Lead";
    dirty = true;
  }
  if (String(process.env.MARKETING_PASSWORD || "").trim()) {
    user.password = password;
    dirty = true;
  }

  if (dirty) {
    await user.save();
  }

  return user;
}

module.exports = createMarketing;
