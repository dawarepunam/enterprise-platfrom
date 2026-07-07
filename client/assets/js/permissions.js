function hasRole(allowedRoles = []) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

function requireRole(allowedRoles = []) {
  if (!hasRole(allowedRoles)) {
    window.location.href = "/pages/unauthorized.html";
  }
}
