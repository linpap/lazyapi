const express = require('express');
const router = express.Router();
const { executeWrite } = require('../config/database');
const { getParam, removeChecksum, sendJSONP, generateHash } = require('../utils/helpers');

/**
 * Action endpoint - Track user actions
 * GET /4.7/action.php
 */
router.get('/action.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const pkey = removeChecksum(getParam(req, 'p', '0'));
    const hash = getParam(req, 'h', '');
    const actionOffer = getParam(req, 'ao', '');
    const variant = parseInt(getParam(req, 'v', '1'));
    const engagement = parseInt(getParam(req, 'e', '1'));
    const logString = getParam(req, 'lo', '');
    const revenue = parseFloat(getParam(req, 'r', '0'));

    if (pkey === 0) {
      return res.json({ error: 'Invalid pkey' });
    }

    // Insert action record
    const insertAction = `
      INSERT INTO action (
        pkey, hash, action_offer, variant, engagement,
        log_string, revenue, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await executeWrite(insertAction, [
      pkey, hash, actionOffer, variant, engagement,
      logString, revenue
    ]);

    // Generate new hash
    const newHash = generateHash({ pkey, hash, timestamp: Date.now() });

    const result = {
      pkey: pkey,
      hash: newHash,
      status: 'success'
    };

    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Action endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
