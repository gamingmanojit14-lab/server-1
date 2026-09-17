const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = (plain) => bcrypt.hash(plain, 12);

const verifyPassword = (plain, hashed) => bcrypt.compare(plain, hashed);

const signAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '15m' }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { sub: user._id.toString() },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES || '7d' }
  );

module.exports = { hashPassword, verifyPassword, signAccessToken, signRefreshToken };
