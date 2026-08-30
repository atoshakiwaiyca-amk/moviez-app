require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { seedAdmin } = require('./db');

// Make sure upload folders exist before anything tries to write to them
['uploads/posters', 'uploads/videos'].forEach((dir) => {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const purchaseRoutes = require('./routes/purchase');
const adminRoutes = require('./routes/admin');

const app = express();

// ---------- USALAMA WA MSINGI ----------
app.disable('x-powered-by'); // usifichue teknolojia inayotumika
app.use(cors()); // badilisha na { origin: 'https://yourdomain.com' } production
app.use(express.json({ limit: '2mb' }));

// Zuia matumizi mabaya kwa jumla (general rate limit)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Poster za movie zinaweza kuonekana wazi (public)
app.use('/uploads/posters', express.static(path.join(__dirname, 'uploads', 'posters')));
// KUMBUKA: /uploads/videos HAIFANYWI static/public - video zinapatikana TU
// kupitia signed download link (routes/purchase.js). Hii ndiyo inazuia
// mtu kudownload movie bila kulipia.

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ---------- ERROR HANDLER YA JUMLA ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Hitilafu ya server.' });
});

seedAdmin();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Moviez backend inaendesha kwenye http://localhost:${PORT}`);
});
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (videos/images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. API Routes (Place your backend endpoints here)
// Example: app.use('/api/auth', authRoutes);
// Example: app.use('/api/movies', movieRoutes);

// 2. Serve Frontend Static Files
// Adjust '../frontend' if your frontend folder structure is different
app.use(express.static(path.join(__dirname, '../frontend')));

// 3. Fallback Route: Direct all other requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});