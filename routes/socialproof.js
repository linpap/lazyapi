const express = require('express');
const router = express.Router();
const { executeRead } = require('../config/database');
const { getParam, sendJSONP } = require('../utils/helpers');

/**
 * Social proof endpoint - Get recent activity for social proof display
 * GET /4.7/socialproof.php
 */
router.get('/socialproof.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const trigger = getParam(req, 't', 'buy_click');
    const minRevenue = parseFloat(getParam(req, 'mr', '0'));
    const intervalHours = parseInt(getParam(req, 'i', '24'));
    const resultCount = parseInt(getParam(req, 'r', '10'));

    // Query recent sales for social proof
    const query = `
      SELECT
        sale.revenue,
        sale.timestamp,
        hit.city,
        hit.state,
        hit.country
      FROM sale
      INNER JOIN action ON sale.hash = action.hash
      INNER JOIN hit ON action.pkey = hit.pkey
      WHERE
        sale.revenue >= ?
        AND sale.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND action.action_offer LIKE ?
      ORDER BY sale.timestamp DESC
      LIMIT ?
    `;

    const results = await executeRead(query, [
      minRevenue,
      intervalHours,
      `%${trigger}%`,
      resultCount
    ]);

    // Format results
    const proofs = results.map(row => ({
      revenue: parseFloat(row.revenue),
      time_ago: calculateTimeAgo(row.timestamp),
      location: formatLocation(row.city, row.state, row.country)
    }));

    const result = {
      status: 'success',
      count: proofs.length,
      proofs: proofs
    };

    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Social proof endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * Calculate time ago string
 */
function calculateTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Format location string
 */
function formatLocation(city, state, country) {
  const parts = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);
  return parts.join(', ') || 'Unknown';
}

module.exports = router;
