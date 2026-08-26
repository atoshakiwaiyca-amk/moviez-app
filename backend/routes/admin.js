const express = require('express');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ---------- ORODHA YA WATUMIAJI WALIOJIUNGA ----------
router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT id, email, role, created_at,
       (SELECT COUNT(*) FROM purchases WHERE user_id = users.id AND status = 'completed') AS total_purchases
       FROM users ORDER BY created_at DESC`
    )
    .all();
  res.json(users);
});

// ---------- RIPOTI YA MAUZO ----------
router.get('/stats', (req, res) => {
  const totalUsers = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'user'`).get().n;
  const totalMovies = db.prepare('SELECT COUNT(*) AS n FROM movies').get().n;
  const totalSales = db
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS revenue FROM purchases WHERE status = 'completed'`)
    .get();

  const topMovies = db
    .prepare(
      `SELECT m.title, COUNT(*) AS sales, SUM(p.amount) AS revenue
       FROM purchases p JOIN movies m ON m.id = p.movie_id
       WHERE p.status = 'completed'
       GROUP BY m.id ORDER BY sales DESC LIMIT 5`
    )
    .all();

  res.json({
    totalUsers,
    totalMovies,
    totalSalesCount: totalSales.n,
    totalRevenue: totalSales.revenue,
    topMovies,
  });
});

module.exports = router;
