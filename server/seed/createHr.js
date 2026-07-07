const User = require("../models/User");

async function createHr() {
  const email = (process.env.HR_EMAIL || "hr@enterprise.local").toLowerCase();
  const password = process.env.HR_PASSWORD || "Hr@12345";
  const name = process.env.HR_NAME || "HR Manager";

  let user = await User.findOne({ email }).select("+password");
  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      role: "HR",
      department: "Human Resources",
      title: "HR Manager",
      status: "ACTIVE",
    });
    return user;
  }

  let dirty = false;
  if (String(user.role || "").toUpperCase() !== "HR") {
    user.role = "HR";
    dirty = true;
  }
  if (!user.department) {
    user.department = "Human Resources";
    dirty = true;
  }
  if (!user.title) {
    user.title = "HR Manager";
    dirty = true;
  }
  if (String(process.env.HR_PASSWORD || "").trim()) {
    user.password = password;
    dirty = true;
  }

  if (dirty) {
    await user.save();
  }

  return user;
}

module.exports = createHr;
