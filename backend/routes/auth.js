const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');

const router = express.Router();

// Limit repeated login attempts in a short window (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  message: { error: 'Too many registration attempts from this location. Please try again later.' },
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  // at least 8 characters, one digit, one uppercase letter - reasonable security without being annoying
  return typeof password === 'string' && password.length >= 8 && /[0-9]/.test(password) && /[A-Z]/.test(password);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ---------- REGISTER ----------
router.post('/register', registerLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include one uppercase letter and one number.',
    });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'This email is already registered. Try logging in instead.' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email.toLowerCase(), hash, 'user');

  const user = { id: info.lastInsertRowid, email: email.toLowerCase(), role: 'user' };
  const token = signToken(user);

  res.status(201).json({ message: 'Registration successful.', token, user });
});

// ---------- LOGIN ----------
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // Account lockout after too many failed attempts
  if (user.locked_until && Date.now() < user.locked_until) {
    const waitMin = Math.ceil((user.locked_until - Date.now()) / 60000);
    return res.status(423).json({ error: `Account temporarily locked. Try again in ${waitMin} minute(s).` });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    let lockedUntil = null;
    if (attempts >= 5) {
      lockedUntil = Date.now() + 15 * 60 * 1000; // lock for 15 minutes
    }
    db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(
      attempts,
      lockedUntil,
      user.id
    );
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // Login succeeded - reset counters
  db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

  const token = signToken(user);
  res.json({
    message: 'Login successful.',
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

module.exports = router;
