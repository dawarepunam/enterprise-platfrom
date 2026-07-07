const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const RefreshToken = require("../models/RefreshToken");

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

async function issueRefreshToken({ user, req, tokenFamily = "" } = {}) {
  const family = tokenFamily || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const tokenId = new mongoose.Types.ObjectId();

  const refreshToken = jwt.sign(
    {
      id: user._id,
      tokenId,
      type: "refresh",
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );

  await RefreshToken.create({
    _id: tokenId,
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    tokenFamily: family,
    userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 500),
    ipAddress: String(req?.headers?.["x-forwarded-for"] || req?.ip || "").slice(0, 120),
    expiresAt,
  });

  return {
    refreshToken,
    tokenFamily: family,
    expiresAt,
  };
}

async function rotateRefreshToken({ user, currentToken, req } = {}) {
  const currentHash = hashToken(currentToken);
  const existing = await RefreshToken.findOne({
    userId: user._id,
    tokenHash: currentHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!existing) {
    throw new Error("Refresh token is invalid or expired.");
  }

  existing.revokedAt = new Date();
  const nextToken = await issueRefreshToken({ user, req, tokenFamily: existing.tokenFamily });
  existing.replacedByTokenHash = hashToken(nextToken.refreshToken);
  await existing.save();

  return nextToken;
}

async function revokeRefreshToken(token) {
  if (!token) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

async function revokeAllUserRefreshTokens(userId) {
  if (!userId) return;
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

module.exports = {
  issueRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
};
