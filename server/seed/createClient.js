const User = require("../models/User");

async function createClient() {
  const email = (
    process.env.CLIENT_EMAIL || "client@enterprise.local"
  ).toLowerCase();
  const password = process.env.CLIENT_PASSWORD || "Client@123";
  const name = process.env.CLIENT_NAME || "Client User";

  let user = await User.findOne({ email }).select("+password");
  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      role: "CLIENT",
      department: "Client Services",
      title: "Client Representative",
      status: "ACTIVE",
    });
    return user;
  }

  let dirty = false;
  if (String(user.role || "").toUpperCase() !== "CLIENT") {
    user.role = "CLIENT";
    dirty = true;
  }
  if (!user.department) {
    user.department = "Client Services";
    dirty = true;
  }
  if (!user.title) {
    user.title = "Client Representative";
    dirty = true;
  }
  if (String(process.env.CLIENT_PASSWORD || "").trim()) {
    user.password = password;
    dirty = true;
  }

  if (dirty) {
    await user.save();
  }

  return user;
}

module.exports = createClient;
