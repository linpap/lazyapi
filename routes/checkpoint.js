const express = require('express');
const router = express.Router();
const { executeWrite } = require('../config/database');
const { getParam, removeChecksum, sendJSONP } = require('../utils/helpers');

/**
 * Checkpoint endpoint - Track conversion checkpoints
 * GET /4.7/checkpoint.php
 */
router.get('/checkpoint.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const pkey = removeChecksum(getParam(req, 'p', '0'));
    const hash = getParam(req, 'h', '');
    const checkpoint = getParam(req, 'c', '');

    if (pkey === 0 || !hash || !checkpoint) {
      return res.json({ error: 'Missing required parameters' });
    }

    // Insert checkpoint record
    const insertCheckpoint = `
      INSERT INTO checkpoint (
        pkey, hash, checkpoint_name, timestamp
      ) VALUES (?, ?, ?, NOW())
    `;

    await executeWrite(insertCheckpoint, [pkey, hash, checkpoint]);

    const result = {
      pkey: pkey,
      hash: hash,
      checkpoint: checkpoint,
      status: 'success'
    };

    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Checkpoint endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
