const express = require('express');
const router = express.Router();
const { executeCentralRead, executeDomainWrite } = require('../config/database');
const { getParam, sendJSONP } = require('../utils/helpers');

/**
 * Sale endpoint - Track sales/revenue
 * GET /4.7/sale.php
 */
router.get('/sale.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters (matching PHP structure)
    const advertiser = getParam(req, 'a', '');
    const license = getParam(req, 'l', '');
    const lazyUrl = getParam(req, 'lazy_url', '');
    const hashIn = getParam(req, 'h', '');
    const revenue = parseFloat(getParam(req, 'r', '0'));
    const pixel = parseInt(getParam(req, 'p', '0'));
    const logString = getParam(req, 'lo', '');

    if (!hashIn) {
      return res.json({ error: 'Missing hash parameter' });
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

    // Parse hash to get action hash (format: dkey_pkey_actionhash)
    const hashParts = hashIn.split('_');
    if (hashParts.length < 3) {
      return res.json({ error: 'Invalid hash format' });
    }

    const actionHash = parseInt(hashParts[2]);

    // Update action revenue in domain-specific database (lazysauce_{dkey}.action)
    const updateAction = `
      UPDATE action
      SET revenue = ?, logstring = ?, date_revenue = NOW(), pixel = ?
      WHERE hash = ?
    `;

    await executeDomainWrite(dkey, updateAction, [revenue, logString, pixel, actionHash], dbHost);

    const result = {
      hash: hashIn,
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
