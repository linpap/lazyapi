const express = require('express');
const router = express.Router();
const { executeWrite } = require('../config/database');
const { getParam, removeChecksum, sendJSONP } = require('../utils/helpers');

/**
 * Param endpoint - Store custom parameters
 * GET /4.7/param.php
 */
router.get('/param.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const pkey = removeChecksum(getParam(req, 'p', '0'));
    const hash = getParam(req, 'h', '0');
    const action = parseInt(getParam(req, 'action', '0'));
    const paramName = getParam(req, 'pn', '');
    const paramValue = getParam(req, 'pv', '');

    if (pkey === 0 || !paramName) {
      return res.json({ error: 'Missing required parameters' });
    }

    // Determine which ID to use (pkey or hash)
    const idType = action === 1 ? 'hash' : 'pkey';
    const idValue = action === 1 ? hash : pkey;

    // Insert parameter record
    const insertParam = `
      INSERT INTO param (
        ${idType}, param_name, param_value, timestamp
      ) VALUES (?, ?, ?, NOW())
    `;

    await executeWrite(insertParam, [idValue, paramName, paramValue]);

    const result = {
      pkey: pkey,
      hash: hash,
      param_name: paramName,
      param_value: paramValue,
      status: 'success'
    };

    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Param endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
