const express = require('express');
const router = express.Router();
const { executeCentralRead, executeCentralWrite, executeDomainWrite, createDomainSchema } = require('../config/database');
const {
  getClientIP,
  getIPLocation,
  parseUserAgent,
  getParam,
  cleanReferer,
  addChecksum,
  sendJSONP,
  parseURLParams
} = require('../utils/helpers');

/**
 * Hit endpoint - Track page visits
 * GET /4.7/hit.php
 */
router.get('/hit.php', async (req, res) => {
  try {
    const callback = getParam(req, 'response', null);

    // Get parameters
    const lazy_url = getParam(req, 'lazy_url', '');
    const actionOffer = getParam(req, 'ao', '');
    const shopify = parseInt(getParam(req, 'shopify', '0'));
    const appInstall = parseInt(getParam(req, 'appInstall', '0'));

    // Shopify check
    if (shopify === 1 && appInstall === 0) {
      return res.send('Please install Lazysauce App to proceed');
    }

    // Parse URL to get domain and params
    let hitOffer = '';
    let queryUrl = lazy_url;
    let params = {};

    if (lazy_url) {
      try {
        const urlObj = new URL(lazy_url);
        hitOffer = urlObj.hostname.replace('www.', '');
        params = parseURLParams(lazy_url);
      } catch (e) {
        hitOffer = 'unknown';
      }
    }

    // Check for redirect/blocked URLs
    const blockedPatterns = [
      '/home-mortgage-refinance-lenders/redr.php',
      '/home-mortgage/compare-best-refinance-lenders/redr.php',
      'besthomewarranty.deals/redr',
      'besthomewarranty.reviews/redr',
      'homemortgagerefinance.online/redr',
      'besthomewarranty.net/go.php',
      'besthomemortgagerefinance.com/go.php',
      'bestgiftsideas.com/go.php'
    ];

    const isBlocked = blockedPatterns.some(pattern =>
      actionOffer.includes(pattern) || queryUrl.includes(pattern)
    );

    if (isBlocked) {
      const result = {
        pkey: getParam(req, 'p', ''),
        hash: 'redr_hash',
        is_bot: 0
      };
      return sendJSONP(res, callback, result);
    }

    // Get channel parameters
    const channelVar = getParam(req, 'cv', '');
    let channel = getParam(req, 'co', '');

    if (!channel) {
      if (channelVar && params[channelVar]) {
        channel = params[channelVar];
      } else if (params['lz_c']) {
        channel = params['lz_c'];
      } else if (params['c']) {
        channel = params['c'];
      } else {
        channel = 'organic';
      }
    }

    // Get subchannel
    const subchannelVar = getParam(req, 'sv', '');
    let subchannel = getParam(req, 'so', '');

    if (!subchannel) {
      if (subchannelVar && params[subchannelVar]) {
        subchannel = params[subchannelVar];
      } else if (params['lz_s']) {
        subchannel = params['lz_s'];
      } else if (params['s']) {
        subchannel = params['s'];
      } else {
        subchannel = '';
      }
    }

    // Clean subchannel
    subchannel = subchannel.replace(/_/g, '.');
    if (subchannel.endsWith('.')) {
      subchannel = subchannel.slice(0, -1);
    }

    // Get keyword/target
    let keyword = getParam(req, 'to', '');
    if (!keyword) {
      keyword = params['lz_t'] || params['k'] || params['keyword'] || '';
    }

    // Get raw keyword
    const rawkw = params['raw'] || '';

    // Add campaign ID to keyword
    if (params['campid']) {
      keyword += '-.-' + params['campid'];
    }

    // Get other parameters
    const advertiser = getParam(req, 'a', '');
    const license = getParam(req, 'l', '');
    const pkey = getParam(req, 'p', '');
    let referer = getParam(req, 'ref', '');
    const useragent = getParam(req, 'ua', req.headers['user-agent'] || '');
    const variant = parseInt(getParam(req, 'v', '1'));
    const isEngagement = parseInt(getParam(req, 'e', '1'));
    const logString = getParam(req, 'lo', '');
    const dnt = parseInt(getParam(req, 'dnt', '0'));
    const languages = getParam(req, 'lg', '');
    const screenWidth = parseInt(getParam(req, 'scw', '0')) || null;
    const screenHeight = parseInt(getParam(req, 'sch', '0')) || null;
    const screenDepth = parseInt(getParam(req, 'scd', '0')) || null;
    const timezone = parseInt(getParam(req, 'tzo', '0')) * -1;

    // Get IP
    const ip = getParam(req, 'i', getClientIP(req));

    // SEM parameters
    const sem_gclid = params['gclid'] || '';
    const sem_bclid = params['bclid'] || '';
    const sem_msclkid = params['msclkid'] || '';
    const sem_fbclid = params['fbclid'] || '';
    const sem_audience = params['t'] || '';
    const sem_position = params['pos'] || '';

    // Clean referer
    referer = cleanReferer(referer);

    // Parse user agent
    const uaInfo = parseUserAgent(useragent);

    // Get IP location (async but we'll await it)
    const ipLocation = await getIPLocation(ip);

    // Check if bot
    const isBot = uaInfo.is_bot || ipLocation.is_crawler ? 1 : 0;

    // Validate advertiser
    if (!advertiser || isNaN(parseInt(advertiser))) {
      return res.json({ error: 'Advertiser ID invalid: ' + advertiser });
    }

    // Check if advertiser exists and license matches (from central database)
    const advertiserQuery = `
      SELECT * FROM advertiser WHERE aid = ?
    `;
    const advertiserResult = await executeCentralRead(advertiserQuery, [parseInt(advertiser)]);

    if (advertiserResult.length === 0) {
      return res.json({ error: 'Advertiser not found: ' + advertiser });
    }

    const advertiserData = advertiserResult[0];
    if (advertiserData.license !== license) {
      return res.json({ error: 'Invalid license for advertiser: ' + advertiser });
    }

    // Get db_host from advertiser (for domain-specific database connection)
    const dbHost = advertiserData.db_host || process.env.DB_HOST;

    // Check if domain exists or create it (from central database)
    let domainQuery = `SELECT * FROM domain WHERE name = ?`;
    let domainResult = await executeCentralRead(domainQuery, [hitOffer]);

    let domainKey = 0;
    if (domainResult.length === 0) {
      // Create new domain in central database
      const insertDomain = `
        INSERT INTO domain (name, aid, date_created)
        VALUES (?, ?, NOW())
      `;
      const insertResult = await executeCentralWrite(insertDomain, [hitOffer, parseInt(advertiser)]);
      domainKey = insertResult.insertId;
    } else {
      domainKey = domainResult[0].dkey;
    }

    // Create domain-specific database schema if it doesn't exist
    await createDomainSchema(domainKey);

    // Generate pkey if not provided
    let pkeyValue = pkey ? parseInt(pkey) : 0;

    if (pkeyValue === 0) {
      // Insert new visit record into domain-specific database (lazysauce_{dkey}.visit)
      // Note: Using 'visit' table and 'did' field (not 'hit' table and 'dkey')
      const insertVisit = `
        INSERT INTO visit (
          did, ip, variant, channel, subchannel, target,
          is_bot, engagement, date_created
        ) VALUES (
          ?, INET6_ATON(?), ?, ?, ?, ?, ?, ?, NOW()
        )
      `;

      const visitResult = await executeDomainWrite(domainKey, insertVisit, [
        domainKey,
        ip,
        variant,
        channel,
        subchannel,
        keyword,
        isBot,
        isEngagement
      ], dbHost);

      pkeyValue = visitResult.insertId;
    }

    // Generate hash
    const hash = domainKey + '_' + pkeyValue + '_' + Date.now();

    // Prepare response
    const result = {
      pkey: addChecksum(pkeyValue),
      hash: hash,
      domain: hitOffer,
      is_bot: isBot,
      os: uaInfo.os,
      os_version: uaInfo.os_version,
      browser: uaInfo.browser,
      browser_version: uaInfo.browser_version,
      is_mobile: uaInfo.is_mobile ? 1 : 0,
      is_smartphone: uaInfo.is_smartphone ? 1 : 0,
      is_tablet: uaInfo.is_tablet ? 1 : 0,
      is_android: uaInfo.os.toLowerCase().includes('android') ? 1 : 0,
      is_ios: uaInfo.os.toLowerCase().includes('ios') ? 1 : 0,
      languages: languages,
      screen: screenWidth + 'x' + screenHeight,
      country: ipLocation.country_code,
      state: ipLocation.state,
      city: ipLocation.city,
      postcode: ipLocation.postcode,
      channel: channel,
      subchannel: subchannel
    };

    // Send JSONP response
    sendJSONP(res, callback, result);

  } catch (error) {
    console.error('Hit endpoint error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

module.exports = router;
