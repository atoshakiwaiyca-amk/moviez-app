const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ---------- BUY A MOVIE ----------
// NOTE: This is a simplified (simulated) payment step. To connect a real
// M-Pesa/Tigo Pesa/Airtel Money or Stripe integration, this is where you'd
// call the payment provider's API and wait for their success webhook/callback
// before setting status = 'completed'.
router.post('/:movieId', requireAuth, (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.movieId);
  if (!movie) return res.status(404).json({ error: 'Movie not found.' });

  const already = db
    .prepare('SELECT * FROM purchases WHERE user_id = ? AND movie_id = ?')
    .get(req.user.id, movie.id);
  if (already && already.status === 'completed') {
    return res.status(409).json({ error: 'You already purchased this movie.' });
  }

  // --- Real payment gateway integration (Stripe/M-Pesa etc) goes here ---
  // For now we mark it as 'completed' immediately for testing/demo purposes.
  db.prepare(
    `INSERT INTO purchases (user_id, movie_id, status, amount)
     VALUES (?, ?, 'completed', ?)
     ON CONFLICT(user_id, movie_id) DO UPDATE SET status = 'completed', amount = excluded.amount`
  ).run(req.user.id, movie.id, movie.price);

  res.json({ message: 'Payment successful. You can now download the movie.' });
});

// ---------- LIST PURCHASED MOVIES ----------
router.get('/my-movies', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.id, m.title, m.poster_path, p.purchased_at
       FROM purchases p JOIN movies m ON m.id = p.movie_id
       WHERE p.user_id = ? AND p.status = 'completed'
       ORDER BY p.purchased_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// ---------- GENERATE SIGNED DOWNLOAD LINK ----------
// This link expires (default 15 minutes) so it can't be shared freely with
// people who haven't paid. See DOWNLOAD_LINK_EXPIRES_MIN in .env
router.get('/download-link/:movieId', requireAuth, (req, res) => {
  const purchase = db
    .prepare(`SELECT * FROM purchases WHERE user_id = ? AND movie_id = ? AND status = 'completed'`)
    .get(req.user.id, req.params.movieId);

  if (!purchase) {
    return res.status(403).json({ error: 'You have not purchased this movie yet.' });
  }

  const expiresMin = parseInt(process.env.DOWNLOAD_LINK_EXPIRES_MIN || '15', 10);
  const token = jwt.sign(
    { userId: req.user.id, movieId: req.params.movieId },
    process.env.JWT_SECRET,
    { expiresIn: `${expiresMin}m` }
  );

  res.json({ downloadUrl: `/api/purchases/download/${token}`, expiresInMinutes: expiresMin });
});

// ---------- ACTUAL DOWNLOAD (time-limited link) ----------
router.get('/download/:token', (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'This download link has expired or is invalid. Generate a new one.' });
  }

  const purchase = db
    .prepare(`SELECT * FROM purchases WHERE user_id = ? AND movie_id = ? AND status = 'completed'`)
    .get(payload.userId, payload.movieId);
  if (!purchase) {
    return res.status(403).json({ error: 'You have not purchased this movie.' });
  }

  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(payload.movieId);
  if (!movie) return res.status(404).json({ error: 'Movie not found.' });

  const filePath = path.join(__dirname, '..', movie.video_path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on the server.' });
  }

  db.prepare('INSERT INTO download_logs (user_id, movie_id) VALUES (?, ?)').run(
    payload.userId,
    payload.movieId
  );

  res.download(filePath, `${movie.title}${path.extname(filePath)}`);
});

module.exports = router;
