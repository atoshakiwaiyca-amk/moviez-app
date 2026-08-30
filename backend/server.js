const path = require('path');
const cors = require('cors');
const express = require('express');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (videos/images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. API Routes
// app.use('/api/movies', movieRoutes);

// 2. Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend')));

// 3. Fallback Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
