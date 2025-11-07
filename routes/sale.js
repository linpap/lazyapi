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

    // Get parameters
    const hashIn = getParam(req, 'h', '');
    const revenue = parseFloat(getParam(req, 'r', '0'));
    const logString = getParam(req, 'lo', '');

    if (!hashIn) {
      return res.json({ error: 'Missing hash parameter' });
    }

    // Parse hash to get domain key and action hash (format: dkey_pkey_actionhash)
    const hashParts = hashIn.split('_');
    if (hashParts.length < 3) {
      return res.json({ error: 'Invalid hash format' });
    }

    const dkey = parseInt(hashParts[0]);
    const actionHash = parseInt(hashParts[2]);

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

    // Update action revenue in domain-specific database (lazysauce_{dkey}.action)
    const updateAction = `
      UPDATE action
      SET revenue = ?, logstring = ?, date_revenue = NOW()
      WHERE hash = ?
    `;

    await executeDomainWrite(dkey, updateAction, [revenue, logString, actionHash], dbHost);

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
