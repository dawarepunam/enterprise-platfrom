const User = require("../models/User");

async function createManager() {
  const email = (process.env.MANAGER_EMAIL || "punamdaware09@gmail.com").toLowerCase();
  const password = process.env.MANAGER_PASSWORD || "Manager@123";
  const name = process.env.MANAGER_NAME || "poonam daware";

  let manager = await User.findOne({ email }).select("+password");
  if (!manager) {
    manager = await User.create({
      name,
      email,
      password,
      role: "MANAGER",
      department: "Operations",
      title: "Delivery Manager",
      status: "ACTIVE",
    });
    return manager;
  }

  let dirty = false;
  if (String(manager.role || "").toUpperCase() !== "MANAGER") {
    manager.role = "MANAGER";
    dirty = true;
  }

  if (!manager.department) {
    manager.department = "Operations";
    dirty = true;
  }

  if (!manager.title) {
    manager.title = "Delivery Manager";
    dirty = true;
  }

  if (String(process.env.MANAGER_PASSWORD || "").trim()) {
    manager.password = password;
    dirty = true;
  }

  if (dirty) {
    await manager.save();
  }

  return manager;
}

module.exports = createManager;
