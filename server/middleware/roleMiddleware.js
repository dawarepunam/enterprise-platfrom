function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);
    const allowed = allowedRoles.map(normalizeRole);

    if (!allowed.includes(userRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
}

module.exports = roleMiddleware;
