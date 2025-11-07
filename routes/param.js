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

    // Get parameters (matching PHP structure)
    const pkey = removeChecksum(getParam(req, 'p', '0'));
    const advertiser = getParam(req, 'a', '');
    const license = getParam(req, 'l', '');
    const lazyUrl = getParam(req, 'lazy_url', '');
    const hashIn = getParam(req, 'h', '0');
    const paramName = getParam(req, 'pn', '');
    const paramValue = getParam(req, 'pv', '');

    if (pkey === 0 || !paramName) {
      return res.json({ error: 'Missing required parameters' });
    }

    // Get domain from lazy_url
    let hitOffer = '';
    if (lazyUrl) {
      try {
        const urlObj = new URL(lazyUrl);
        hitOffer = urlObj.hostname.replace('www.', '');
      } catch (e) {
        hitOffer = 'unknown';
      }
    }

    if (!hitOffer) {
      return res.json({ error: 'Missing lazy_url parameter' });
    }

    // Verify advertiser and license from central database
    if (advertiser && license) {
      const advertiserQuery = `SELECT * FROM advertiser WHERE aid = ?`;
      const advertiserResult = await executeCentralRead(advertiserQuery, [parseInt(advertiser)]);

      if (advertiserResult.length === 0 || advertiserResult[0].license !== license) {
        return res.json({ error: 'Invalid advertiser or license' });
      }
    }

    // Get domain info from central database
    const domainQuery = `SELECT dkey, aid FROM domain WHERE name = ?`;
    const domainResult = await executeCentralRead(domainQuery, [hitOffer]);

    if (domainResult.length === 0) {
      return res.json({ error: 'Domain not found' });
    }

    const dkey = domainResult[0].dkey;

    // Get advertiser info for db_host
    const advertiserQuery2 = `SELECT db_host FROM advertiser WHERE aid = ?`;
    const advertiserResult2 = await executeCentralRead(advertiserQuery2, [domainResult[0].aid]);
    const dbHost = advertiserResult2.length > 0 ? advertiserResult2[0].db_host : process.env.DB_HOST;

    // Parse hash value if provided (format: dkey_pkey_actionhash)
    let hashValue = 0;
    if (hashIn && hashIn !== '0') {
      const hashParts = hashIn.split('_');
      if (hashParts.length >= 3) {
        hashValue = parseInt(hashParts[2]);
      }
    }

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
