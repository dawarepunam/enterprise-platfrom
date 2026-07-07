const User = require('../models/User');

/**
 * Status Control Middleware (Phase 17)
 * Enforces HOLD, SHIFT, and REMOVE system states for employees.
 */
const statusControl = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const status = user.systemStatus || 'ACTIVE'; // ACTIVE, HOLD, SHIFT, REMOVE

    if (status === 'REMOVE') {
      // Read-only mode: only allow GET requests
      if (req.method !== 'GET') {
        return res.status(403).json({ 
          success: false, 
          error: 'Your account is in REMOVE state. Access is restricted to read-only.' 
        });
      }
    }

    if (status === 'HOLD') {
      // Restrict access entirely
      return res.status(403).json({ 
        success: false, 
        error: 'Your account is currently on HOLD. Please contact HR.' 
      });
    }

    if (status === 'SHIFT') {
      // Shift might have custom logic, e.g., restricting certain project routes
      // For now, attach flag to request
      req.isShifted = true;
    }

    next();
  } catch (error) {
    console.error('Status Control Error:', error);
    res.status(500).json({ success: false, error: 'Server error checking status' });
  }
};

module.exports = statusControl;
