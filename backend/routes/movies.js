const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------- MULTER (file uploads) ----------
const posterDir = path.join(__dirname, '..', 'uploads', 'posters');
const videoDir = path.join(__dirname, '..', 'uploads', 'videos');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'poster') cb(null, posterDir);
    else if (file.fieldname === 'video') cb(null, videoDir);
    else cb(new Error('Unrecognized file field'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB max for video
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'poster' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Poster must be an image file.'));
    }
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Movie file must be a video.'));
    }
    cb(null, true);
  },
});

// ---------- PUBLIC: List movies (no video path - that stays private) ----------
router.get('/', (req, res) => {
  const movies = db
    .prepare('SELECT id, title, description, poster_path, price, created_at FROM movies ORDER BY created_at DESC')
    .all();
  res.json(movies);
});

router.get('/:id', (req, res) => {
  const movie = db
    .prepare('SELECT id, title, description, poster_path, price, created_at FROM movies WHERE id = ?')
    .get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found.' });
  res.json(movie);
});

// ---------- ADMIN: Upload a new movie ----------
router.post(
  '/',
  requireAuth,
  requireAdmin,
  upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  (req, res) => {
    const { title, description, price } = req.body;
    if (!title || !price || !req.files?.video) {
      return res.status(400).json({ error: 'Please provide a title, price, and video file.' });
    }

    const posterPath = req.files.poster ? `/uploads/posters/${req.files.poster[0].filename}` : null;
    const videoPath = `/uploads/videos/${req.files.video[0].filename}`;

    const info = db
      .prepare('INSERT INTO movies (title, description, poster_path, video_path, price) VALUES (?, ?, ?, ?, ?)')
      .run(title, description || '', posterPath, videoPath, parseFloat(price));

    res.status(201).json({ message: 'Movie uploaded successfully.', id: info.lastInsertRowid });
  }
);

// ---------- ADMIN: Delete a movie ----------
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found.' });

  // Remove the actual files from disk
  [movie.poster_path, movie.video_path].forEach((p) => {
    if (p) {
      const fullPath = path.join(__dirname, '..', p);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
  });

  db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
  res.json({ message: 'Movie deleted.' });
});

// ---------- ADMIN: Edit movie (title/description/price) ----------
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { title, description, price } = req.body;
  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
  if (!movie) return res.status(404).json({ error: 'Movie not found.' });

  db.prepare('UPDATE movies SET title = ?, description = ?, price = ? WHERE id = ?').run(
    title || movie.title,
    description ?? movie.description,
    price ? parseFloat(price) : movie.price,
    req.params.id
  );
  res.json({ message: 'Movie updated.' });
});

module.exports = router;
