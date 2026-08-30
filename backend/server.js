const path = require('path');
const fs = require('fs');
const cors = require('cors');
const express = require('express');

const app = express();

// Middleware ya Usalama na Data Parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hakikisha folder la Uploads lipo kabla ya kuserve static files
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// 1. Serving Uploaded Files (Picha za poster na video)
app.use('/uploads', express.static(uploadsPath));

// 2. IMPORT & REGISTER API ROUTES (Hapa ndipo API zako zilipokosa!)
const moviesRoutes = require('./routes/movies');
// Kama una routes zingine kama auth au purchases, ziongeze hapa:
// const authRoutes = require('./routes/auth');
// const purchaseRoutes = require('./routes/purchases');

app.use('/api/movies', moviesRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/purchases', purchaseRoutes);

// 3. Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend')));

// 4. Fallback Single Page Application (SPA) Routing
// Hii lazimaikae CHINI KABISA baada ya API routes zote
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});