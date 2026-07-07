const { ROLES } = require("../config/constants");

async function seedRoles() {
  return Object.values(ROLES).map((role) => ({
    code: role,
    label: role.replace(/_/g, " "),
  }));
}

module.exports = seedRoles;
