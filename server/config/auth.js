// server/config/auth.js

// Export JWT secret used throughout the app. The secret is read from the environment.
// The user mentioned the passkey is stored in the .env file.
// If PASSKEY is not defined we fall back to JWT_SECRET for backward compatibility.

module.exports = {
  jwtSecret: process.env.PASSKEY || process.env.JWT_SECRET || 'defaultSecret',
};
