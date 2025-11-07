const express = require('express');
const router = express.Router();
const { executeCentralRead, executeDomainWrite } = require('../config/database');
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
    const hashIn = getParam(req, 'h', '0');
    const action = parseInt(getParam(req, 'action', '0'));
    const paramName = getParam(req, 'pn', '');
    const paramValue = getParam(req, 'pv', '');

    if ((pkey === 0 && !hashIn) || !paramName) {
      return res.json({ error: 'Missing required parameters' });
    }

    // Parse hash to get domain key (format: dkey_pkey_actionhash)
    let dkey = 0;
    let hashValue = 0;

    if (hashIn && hashIn !== '0') {
      const hashParts = hashIn.split('_');
      if (hashParts.length >= 2) {
        dkey = parseInt(hashParts[0]);
        hashValue = hashParts.length >= 3 ? parseInt(hashParts[2]) : 0;
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

    // Insert parameter into domain-specific database (lazysauce_{dkey}.parameters)
    const insertParam = `
      INSERT INTO parameters (
        pkey, hash, name, value, date_created
      ) VALUES (?, ?, ?, ?, NOW())
    `;

    await executeDomainWrite(dkey, insertParam, [pkey, hashValue, paramName, paramValue], dbHost);

    const result = {
      pkey: pkey,
      hash: hashIn,
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
