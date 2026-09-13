const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------- ENSURE UPLOAD DIRECTORIES EXIST ----------
const posterDir = path.join(__dirname, '..', 'uploads', 'posters');
const videoDir = path.join(__dirname, '..', 'uploads', 'videos');

// Tengeneza ma-folder kiotomatiki kama hayapo
if (!fs.existsSync(posterDir)) fs.mkdirSync(posterDir, { recursive: true });
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

// ---------- MULTER (file uploads) ----------
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

// Helper kwa ajili ya kushughulikia makosa ya Multer
const uploadFields = upload.fields([
  { name: 'poster', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

// ---------- PUBLIC: List movies ----------
router.get('/', (req, res) => {
  try {
    const movies = db
      .prepare('SELECT id, title, description, poster_path, price, created_at FROM movies ORDER BY created_at DESC')
      .all();
    res.json(movies || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movies.' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const movie = db
      .prepare('SELECT id, title, description, poster_path, price, created_at FROM movies WHERE id = ?')
      .get(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movie details.' });
  }
});

// ---------- ADMIN: Upload a new movie ----------
router.post('/', requireAuth, requireAdmin, (req, res) => {
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { title, description, price } = req.body;
    if (!title || !price || !req.files?.video) {
      return res.status(400).json({ error: 'Please provide a title, price, and video file.' });
    }

    try {
      const posterPath = req.files.poster ? `/uploads/posters/${req.files.poster[0].filename}` : null;
      const videoPath = `/uploads/videos/${req.files.video[0].filename}`;

      const info = db
        .prepare('INSERT INTO movies (title, description, poster_path, video_path, price) VALUES (?, ?, ?, ?, ?)')
        .run(title, description || '', posterPath, videoPath, parseFloat(price));

      res.status(201).json({ message: 'Movie uploaded successfully.', id: info.lastInsertRowid });
    } catch (dbErr) {
      res.status(500).json({ error: 'Database error saving movie.' });
    }
  });
});

// ---------- ADMIN: Delete a movie ----------
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });

    // Remove actual files from disk safely
    [movie.poster_path, movie.video_path].forEach((p) => {
      if (p) {
        const fullPath = path.join(__dirname, '..', p);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
    });

    db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Movie deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete movie.' });
  }
});

// ---------- ADMIN: Edit movie ----------
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { title, description, price } = req.body;
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found.' });

    db.prepare('UPDATE movies SET title = ?, description = ?, price = ? WHERE id = ?').run(
      title || movie.title,
      description ?? movie.description,
      price ? parseFloat(price) : movie.price,
      req.params.id
    );
    res.json({ message: 'Movie updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update movie.' });
  }
});

module.exports = router;