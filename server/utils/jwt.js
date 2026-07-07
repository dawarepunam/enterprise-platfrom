// server/utils/jwt.js

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

function sign(payload, expiresIn = '1h') {
  return jwt.sign(payload, jwtSecret, { expiresIn });
}

function verify(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = { sign, verify };
