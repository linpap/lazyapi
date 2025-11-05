const express = require('express');
const router = express.Router();
const { executeWrite } = require('../config/database');
const { getParam, sendJSONP } = require('../utils/helpers');

/**
 * Sale endpoint - Track sales/revenue
 * GET /4.7/sale.php
 */
router.get('/sale.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const hash = getParam(req, 'h', '');
    const revenue = parseFloat(getParam(req, 'r', '0'));
    const logString = getParam(req, 'lo', '');

    if (!hash) {
      return res.json({ error: 'Missing hash parameter' });
    }

    // Insert sale record
    const insertSale = `
      INSERT INTO sale (
        hash, revenue, log_string, timestamp
      ) VALUES (?, ?, ?, NOW())
    `;

    await executeWrite(insertSale, [hash, revenue, logString]);

    const result = {
      hash: hash,
      revenue: revenue,
      status: 'success'
    };

    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Sale endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
