const express = require('express');
const router = express.Router();
const { executeCentralRead, executeDomainWrite } = require('../config/database');
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
    const hashIn = getParam(req, 'h', '');
    const checkpoint = getParam(req, 'c', '');

    if ((pkey === 0 && !hashIn) || !checkpoint) {
      return res.json({ error: 'Missing required parameters' });
    }

    // Parse hash to get domain key (format: dkey_pkey_timestamp)
    let dkey = 0;
    if (hashIn) {
      const hashParts = hashIn.split('_');
      if (hashParts.length >= 2) {
        dkey = parseInt(hashParts[0]);
      }
    }

    if (!dkey) {
      return res.json({ error: 'Invalid hash format' });
    }

    // Get domain info from central database to get db_host
    const domainQuery = `SELECT * FROM domain WHERE dkey = ?`;
    const domainResult = await executeCentralRead(domainQuery, [dkey]);

    if (domainResult.length === 0) {
      return res.json({ error: 'Domain not found' });
    }

    // Get advertiser info for db_host
    const advertiserQuery = `SELECT db_host FROM advertiser WHERE aid = ?`;
    const advertiserResult = await executeCentralRead(advertiserQuery, [domainResult[0].aid]);
    const dbHost = advertiserResult.length > 0 ? advertiserResult[0].db_host : process.env.DB_HOST;

    // Insert checkpoint as parameter into domain-specific database (lazysauce_{dkey}.parameters)
    const insertCheckpoint = `
      INSERT INTO parameters (
        pkey, hash, name, value, date_created
      ) VALUES (?, ?, ?, ?, NOW())
    `;

    const hashValue = hashIn ? parseInt(hashIn.split('_')[2] || 0) : 0;
    await executeDomainWrite(dkey, insertCheckpoint, [pkey, hashValue, checkpoint, '1'], dbHost);

    const result = {
      pkey: pkey,
      hash: hashIn,
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
