const User = require("../models/User");

async function createProductManager() {
  const email = (process.env.PRODUCT_MANAGER_EMAIL || "product.manager@enterprise.local").toLowerCase();
  const password = process.env.PRODUCT_MANAGER_PASSWORD || "Product@123";
  const name = process.env.PRODUCT_MANAGER_NAME || "Rahul Sharma";

  let user = await User.findOne({ email }).select("+password");
  if (!user) {
    user = await User.create({
      name,
      email,
      password,
      role: "PRODUCT_MANAGER",
      department: "Product",
      title: "Product Manager",
      status: "ACTIVE",
    });
    return user;
  }

  let dirty = false;
  if (String(user.role || "").toUpperCase() !== "PRODUCT_MANAGER") {
    user.role = "PRODUCT_MANAGER";
    dirty = true;
  }
  if (!user.department) {
    user.department = "Product";
    dirty = true;
  }
  if (!user.title) {
    user.title = "Product Manager";
    dirty = true;
  }
  if (String(process.env.PRODUCT_MANAGER_PASSWORD || "").trim()) {
    user.password = password;
    dirty = true;
  }

  if (dirty) {
    await user.save();
  }

  return user;
}

module.exports = createProductManager;
