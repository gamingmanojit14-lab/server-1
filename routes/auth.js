const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  hashPassword, verifyPassword,
  signAccessToken, signRefreshToken,
} = require('../utils/auth');
const { protect } = require('../middleware/auth');

const REFRESH_COOKIE = 'refresh_token';

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8)
      return res.status(400).json({ message: 'Weak credentials (min 8 chars)' });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already used' });

    const user = await User.create({
      name, email, password: await hashPassword(password),
    });

    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refresh, 10);
    await user.save();

    res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
    res.status(201).json({
      access,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!(await verifyPassword(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const access = signAccessToken(user);
    const refresh = signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refresh, 10);
    await user.save();

    res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
    res.json({
      access,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// REFRESH
router.post('/refresh', async (req, res) => {
  const refresh = req.cookies[REFRESH_COOKIE];
  if (!refresh) return res.status(401).json({ message: 'No refresh token' });

  try {
    const payload = jwt.verify(refresh, process.env.REFRESH_SECRET);
    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user?.refreshTokenHash)
      return res.status(401).json({ message: 'Invalid' });

    if (!(await bcrypt.compare(refresh, user.refreshTokenHash)))
      return res.status(401).json({ message: 'Invalid' });

    res.json({ access: signAccessToken(user) });
  } catch {
    res.status(401).json({ message: 'Expired or invalid' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  const refresh = req.cookies[REFRESH_COOKIE];
  if (refresh) {
    try {
      const payload = jwt.verify(refresh, process.env.REFRESH_SECRET);
      await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
    } catch {}
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.json({ success: true });
});

// ME
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

module.exports = router;
