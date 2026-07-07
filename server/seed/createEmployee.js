const User = require("../models/User");

async function createEmployee() {
  const email = (
    process.env.EMPLOYEE_EMAIL || "employee@enterprise.local"
  ).toLowerCase();
  const password = process.env.EMPLOYEE_PASSWORD || "Employee@123";
  const name = process.env.EMPLOYEE_NAME || "Staff Employee";

  let user = await User.findOne({ email }).select("+password");
  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      role: "MEMBER",
      department: "Operations",
      title: "Employee",
      status: "ACTIVE",
    });
    return user;
  }

  let dirty = false;
  if (String(user.role || "").toUpperCase() !== "MEMBER") {
    user.role = "MEMBER";
    dirty = true;
  }
  if (!user.department) {
    user.department = "Operations";
    dirty = true;
  }
  if (!user.title) {
    user.title = "Employee";
    dirty = true;
  }
  if (String(process.env.EMPLOYEE_PASSWORD || "").trim()) {
    user.password = password;
    dirty = true;
  }

  if (dirty) {
    await user.save();
  }

  return user;
}

module.exports = createEmployee;
