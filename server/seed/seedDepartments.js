const Department = require("../models/Department");

const defaultDepartments = [
  { name: "Marketing", code: "MKT", description: "Campaign strategy, creatives, SEO and paid media.", status: "ACTIVE" },
  { name: "Sales", code: "SLS", description: "Lead handling, quotations, negotiation and conversions.", status: "ACTIVE" },
  { name: "Development", code: "DEV", description: "Frontend, backend, QA and product delivery.", status: "ACTIVE" },
  { name: "HR", code: "HRM", description: "Hiring, employee lifecycle, leave and attendance.", status: "ACTIVE" },
  { name: "Support", code: "SUP", description: "Client portal, issue resolution and account support.", status: "ACTIVE" },
];

async function seedDepartments() {
  const count = await Department.countDocuments();
  if (count > 0) {
    return Department.find().sort({ createdAt: 1 });
  }

  await Department.insertMany(defaultDepartments);
  return Department.find().sort({ createdAt: 1 });
}

module.exports = seedDepartments;
