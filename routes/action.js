const express = require('express');
const router = express.Router();
const { executeCentralRead, executeDomainWrite, executeDomainRead } = require('../config/database');
const { getParam, removeChecksum, sendJSONP, parseURLParams } = require('../utils/helpers');

/**
 * Action endpoint - Track user actions
 * GET /4.7/action.php
 */
router.get('/action.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters (matching PHP structure)
    const pkey = removeChecksum(getParam(req, 'p', '0'));
    const advertiser = getParam(req, 'a', '');
    const license = getParam(req, 'l', '');
    const lazyUrl = getParam(req, 'lazy_url', '');
    const actionOffer = getParam(req, 'ao', '');
    const variant = parseInt(getParam(req, 'v', '1'));
    const engagement = parseInt(getParam(req, 'e', '1'));
    const logString = getParam(req, 'lo', '');
    const revenue = parseFloat(getParam(req, 'r', '0'));

    if (pkey === 0) {
      return res.json({ error: 'Invalid pkey' });
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

    // Check if last action is the same (to avoid duplicates)
    const actionName = actionOffer.split('|')[0]; // Get action name before parameters
    let hash = 0;

    const checkLastAction = `
      SELECT action.hash, action.name
      FROM action
      WHERE action.pkey = ?
      ORDER BY action.hash DESC
      LIMIT 1
    `;

    const lastActionResult = await executeDomainRead(dkey, checkLastAction, [pkey], dbHost);

    if (lastActionResult.length > 0 && lastActionResult[0].name === actionName) {
      // If last action is the same, return existing hash
      hash = lastActionResult[0].hash;
    } else {
      // Insert new action record into domain-specific database (lazysauce_{dkey}.action)
      const dateRevenue = revenue > 0 ? new Date() : new Date('1970-01-01');
      const pixel = revenue > 0 ? 1 : 0;

      const insertAction = `
        INSERT INTO action (
          pkey, name, variant, is_engagement,
          logstring, revenue, date_revenue, pixel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const actionResult = await executeDomainWrite(dkey, insertAction, [
        pkey, actionName, variant, engagement,
        logString, revenue, dateRevenue, pixel
      ], dbHost);

      hash = actionResult.insertId;
    }

    // Generate response hash (matching PHP format)
    const responseHash = dkey + '_' + pkey + '_' + hash;

    const result = {
      pkey: pkey,
      hash: responseHash,
      status: 'success'
    };

    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Action endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
