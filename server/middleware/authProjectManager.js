const jwt = require('jsonwebtoken');

// Middleware to verify JWT and check role
const protectProjectManager = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Assuming user object includes role
    if (!decoded.role || !['ADMIN', 'PROJECT_MANAGER', 'PRODUCT_MANAGER'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Insufficient role' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protectProjectManager };
