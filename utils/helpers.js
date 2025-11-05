const axios = require('axios');
const useragent = require('useragent');
const crypto = require('crypto');

/**
 * Get client IP address (handles CloudFlare, proxies, etc.)
 */
function getClientIP(req) {
  // Check for CloudFlare connecting IP first
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }

  // Check various proxy headers
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded'
  ];

  for (const header of ipHeaders) {
    if (req.headers[header]) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = req.headers[header].split(',');
      const ip = ips[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fall back to connection remote address
  return req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         '0.0.0.0';
}

/**
 * Validate IP address
 */
function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get geolocation data from IPStack API
 */
async function getIPLocation(ip) {
  try {
    const apiKey = process.env.IPSTACK_API_KEY || '6138efd7d1eee9e2734a65a06dd1f712';
    const url = `http://api.ipstack.com/${ip}?access_key=${apiKey}&format=1&security=1`;

    const response = await axios.get(url, { timeout: 3000 });
    const data = response.data;

    if (data.error) {
      console.error('IPStack API Error:', data.error);
      return getDefaultLocation();
    }

    // Calculate timezone offset
    let timezoneOffset = 0;
    if (data.time_zone && data.time_zone.id) {
      try {
        const date = new Date();
        const timezone = data.time_zone.id;
        // This is simplified - in production you'd use a proper timezone library
        timezoneOffset = data.time_zone.offset || 0;
      } catch (e) {
        timezoneOffset = 0;
      }
    }

    return {
      country_code: data.country_code || '',
      city: data.city || '',
      state: data.region_code || '',
      country_name: data.country_name || '',
      isp: data.connection?.isp || '',
      org: data.connection?.isp || '',
      timezone_offset: timezoneOffset,
      postcode: data.zip || '',
      is_proxy: data.security?.is_proxy || false,
      proxy_type: data.security?.proxy_type || '',
      is_crawler: data.security?.is_crawler || false,
      crawler_name: data.security?.crawler_name || '',
      crawler_type: data.security?.crawler_type || '',
      is_tor: data.security?.is_tor || false
    };
  } catch (error) {
    console.error('IPStack lookup failed:', error.message);
    return getDefaultLocation();
  }
}

/**
 * Default location data when lookup fails
 */
function getDefaultLocation() {
  return {
    country_code: '',
    city: '',
    state: '',
    country_name: '',
    isp: '',
    org: '',
    timezone_offset: 0,
    postcode: '',
    is_proxy: false,
    proxy_type: '',
    is_crawler: false,
    crawler_name: '',
    crawler_type: '',
    is_tor: false
  };
}

/**
 * Parse user agent string
 */
function parseUserAgent(uaString) {
  const agent = useragent.parse(uaString);

  return {
    browser: agent.family || '',
    browser_version: agent.toVersion() || '',
    os: agent.os.family || '',
    os_version: agent.os.toVersion() || '',
    device: agent.device.family || '',
    is_mobile: agent.device.family !== 'Other',
    is_tablet: agent.device.family.toLowerCase().includes('tablet'),
    is_smartphone: agent.device.family !== 'Other' && !agent.device.family.toLowerCase().includes('tablet'),
    is_bot: agent.family.toLowerCase().includes('bot') ||
            agent.family.toLowerCase().includes('crawler') ||
            agent.family.toLowerCase().includes('spider')
  };
}

/**
 * Add checksum to a number (PHP equivalent)
 */
function addChecksum(num) {
  const str = num.toString();
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += parseInt(str[i]);
  }
  return str + (sum % 10).toString();
}

/**
 * Remove and verify checksum (PHP equivalent)
 */
function removeChecksum(str) {
  if (!str || str.length < 2) return 0;

  const numPart = str.slice(0, -1);
  const checksum = parseInt(str.slice(-1));

  let sum = 0;
  for (let i = 0; i < numPart.length; i++) {
    sum += parseInt(numPart[i]);
  }

  if ((sum % 10) === checksum) {
    return parseInt(numPart);
  }
  return 0;
}

/**
 * Parse URL parameters
 */
function parseURLParams(url) {
  try {
    const urlObj = new URL(url);
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch (error) {
    return {};
  }
}

/**
 * Get parameter from request (GET/POST)
 */
function getParam(req, name, defaultValue = '') {
  return req.query[name] || req.body[name] || defaultValue;
}

/**
 * Clean referer string (remove problematic characters)
 */
function cleanReferer(referer) {
  if (!referer) return '';

  return referer
    .replace(/\r\n/g, '')
    .replace(/\n/g, '')
    .replace(/\t/g, '')
    .replace(/,/g, '-')
    .replace(/aq=t/g, 'api=t')
    .replace(/http:\/\/pagead/g, 'pagead')
    .replace(/http:\/\/googleads/g, 'googleads')
    .replace(/op=/g, 'opi=')
    .replace(/ap=/g, 'api=');
}

/**
 * Generate hash for tracking
 */
function generateHash(data) {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data) + Date.now().toString());
  return hash.digest('hex');
}

/**
 * Send JSONP response
 */
function sendJSONP(res, callback, data) {
  if (callback) {
    res.type('application/javascript');
    res.send(`${callback}(${JSON.stringify(data)})`);
  } else {
    res.json(data);
  }
}

/**
 * Check if request is from a bot
 */
function isBot(userAgent, crawlerName = '') {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python', 'java', 'perl', 'ruby', 'go-http-client'
  ];

  for (const pattern of botPatterns) {
    if (ua.includes(pattern)) return true;
  }

  return crawlerName !== '';
}

module.exports = {
  getClientIP,
  isValidIP,
  getIPLocation,
  parseUserAgent,
  addChecksum,
  removeChecksum,
  parseURLParams,
  getParam,
  cleanReferer,
  generateHash,
  sendJSONP,
  isBot
};
