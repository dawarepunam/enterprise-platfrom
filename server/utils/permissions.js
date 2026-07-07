function hasPermission(userRole, allowedRoles = []) {
  return allowedRoles.includes(userRole);
}

module.exports = { hasPermission };
