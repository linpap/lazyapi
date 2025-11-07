const express = require('express');
const router = express.Router();
const { executeCentralRead, executeDomainRead } = require('../config/database');
const { getParam, sendJSONP } = require('../utils/helpers');

/**
 * Social proof endpoint - Get recent activity for social proof display
 * GET /4.7/socialproof.php
 */
router.get('/socialproof.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const domainName = getParam(req, 'd', '');
    const trigger = getParam(req, 't', 'buy_click');
    const minRevenue = parseFloat(getParam(req, 'mr', '0'));
    const intervalHours = parseInt(getParam(req, 'i', '24'));
    const resultCount = parseInt(getParam(req, 'r', '10'));

    if (!domainName) {
      return res.json({ error: 'Missing domain parameter' });
    }

    // Get domain info from central database
    const domainQuery = `SELECT dkey, aid FROM domain WHERE name = ?`;
    const domainResult = await executeCentralRead(domainQuery, [domainName]);

    if (domainResult.length === 0) {
      return res.json({ error: 'Domain not found' });
    }

    const dkey = domainResult[0].dkey;

    // Get advertiser info for db_host
    const advertiserQuery = `SELECT db_host FROM advertiser WHERE aid = ?`;
    const advertiserResult = await executeCentralRead(advertiserQuery, [domainResult[0].aid]);
    const dbHost = advertiserResult.length > 0 ? advertiserResult[0].db_host : process.env.DB_HOST;

    // Query recent actions with revenue from domain-specific database
    // Note: In domain DB, there's no separate 'sale' table - revenue is in action table
    const query = `
      SELECT
        action.revenue,
        action.date_created as timestamp,
        action.name
      FROM action
      WHERE
        action.revenue >= ?
        AND action.date_created >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        AND action.name LIKE ?
      ORDER BY action.date_created DESC
      LIMIT ?
    `;

    const results = await executeDomainRead(dkey, query, [
      minRevenue,
      intervalHours,
      `%${trigger}%`,
      resultCount
    ], dbHost);

    // Format results
    const proofs = results.map(row => ({
      revenue: parseFloat(row.revenue),
      time_ago: calculateTimeAgo(row.timestamp),
      action: row.name
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

module.exports = router;
