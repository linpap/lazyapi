const express = require('express');
const router = express.Router();
const { executeCentralRead, executeDomainWrite } = require('../config/database');
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
    const hashIn = getParam(req, 'h', '');
    const actionOffer = getParam(req, 'ao', '');
    const variant = parseInt(getParam(req, 'v', '1'));
    const engagement = parseInt(getParam(req, 'e', '1'));
    const logString = getParam(req, 'lo', '');
    const revenue = parseFloat(getParam(req, 'r', '0'));

    if (pkey === 0 && !hashIn) {
      return res.json({ error: 'Invalid pkey or hash' });
    }

    // Parse hash to get domain key (format: dkey_pkey_timestamp)
    let dkey = 0;
    if (hashIn) {
      const hashParts = hashIn.split('_');
      if (hashParts.length >= 2) {
        dkey = parseInt(hashParts[0]);
      }
    }

    // If no dkey from hash, we need to lookup from pkey (not ideal but fallback)
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

    // Insert action record into domain-specific database (lazysauce_{dkey}.action)
    const insertAction = `
      INSERT INTO action (
        pkey, name, variant, is_engagement,
        logstring, revenue, date_created
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const actionResult = await executeDomainWrite(dkey, insertAction, [
      pkey, actionOffer, variant, engagement,
      logString, revenue
    ], dbHost);

    // Generate new hash
    const newHash = dkey + '_' + pkey + '_' + actionResult.insertId;

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
