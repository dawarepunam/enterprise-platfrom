const User = require("../models/User");

async function createAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@jmkc.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "AdminPassword123";
  const name = process.env.ADMIN_NAME || "Punam (System Admin)";

  let admin = await User.findOne({ email }).select("+password");
  if (!admin) {
    admin = await User.create({
      name,
      email,
      password,
      role: "ADMIN",
      department: "Executive",
      title: "Platform Administrator",
      status: "ACTIVE",
      teamName: "All Teams",
    });
  }

  return admin;
}

module.exports = createAdmin;
