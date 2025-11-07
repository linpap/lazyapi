require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const hitRoutes = require('./routes/hit');
const actionRoutes = require('./routes/action');
const checkpointRoutes = require('./routes/checkpoint');
const saleRoutes = require('./routes/sale');
const paramRoutes = require('./routes/param');
const socialproofRoutes = require('./routes/socialproof');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LazySauce Analytics API (Node.js)',
    version: '1.0.0'
  });
});

// API Routes (matching PHP structure: /4.7/endpoint.php)
app.use('/4.7', hitRoutes);
app.use('/4.7', actionRoutes);
app.use('/4.7', checkpointRoutes);
app.use('/4.7', saleRoutes);
app.use('/4.7', paramRoutes);
app.use('/4.7', socialproofRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Export for Vercel
module.exports = app;
