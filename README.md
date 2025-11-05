# LazySauce Analytics API - Node.js Version

This is a Node.js/Express conversion of the PHP-based LazySauce Analytics API (api.lazysauce.com).

## Overview

LazySauce is an analytics and tracking platform similar to Google Analytics, designed for tracking:
- Page visits (hits)
- User actions
- Conversion checkpoints
- Sales and revenue
- Custom parameters
- Social proof data

## Project Structure

```
apinode/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── .env                   # Environment configuration (local)
├── .env.example          # Example environment file
├── config/
│   └── database.js       # MySQL connection pooling
├── routes/
│   ├── hit.js           # Track page visits
│   ├── action.js        # Track user actions
│   ├── checkpoint.js    # Track conversion checkpoints
│   ├── sale.js          # Track sales/revenue
│   ├── param.js         # Store custom parameters
│   └── socialproof.js   # Social proof data
├── utils/
│   └── helpers.js       # Utility functions (IP, UA parsing, etc.)
└── README.md            # This file
```

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - MySQL database driver with promise support
- **axios** - HTTP client for IPStack API
- **useragent** - User agent string parser
- **dotenv** - Environment variable management
- **cors** - Cross-origin resource sharing

## Database Schema

The API requires the following MySQL tables (simplified for local testing):

### Table: `advertiser`
```sql
CREATE TABLE advertiser (
  aid INT PRIMARY KEY AUTO_INCREMENT,
  license VARCHAR(255) NOT NULL,
  subscription_type INT DEFAULT 0,
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `domain`
```sql
CREATE TABLE domain (
  dkey INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  aid INT NOT NULL,
  channel_priority VARCHAR(255) DEFAULT '',
  subchannel_priority VARCHAR(255) DEFAULT '',
  keyword_priority VARCHAR(255) DEFAULT '',
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aid) REFERENCES advertiser(aid)
);
```

### Table: `hit`
```sql
CREATE TABLE hit (
  pkey BIGINT PRIMARY KEY AUTO_INCREMENT,
  dkey INT NOT NULL,
  ip VARCHAR(45),
  channel VARCHAR(255),
  subchannel VARCHAR(255),
  target VARCHAR(500),
  referer TEXT,
  raw_target VARCHAR(500),
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  device VARCHAR(100),
  is_mobile TINYINT DEFAULT 0,
  is_smartphone TINYINT DEFAULT 0,
  is_tablet TINYINT DEFAULT 0,
  is_bot TINYINT DEFAULT 0,
  country VARCHAR(10),
  state VARCHAR(100),
  city VARCHAR(255),
  postcode VARCHAR(20),
  isp VARCHAR(255),
  org VARCHAR(255),
  languages VARCHAR(100),
  screen_width INT,
  screen_height INT,
  screen_depth INT,
  timezone_offset INT,
  variant INT DEFAULT 1,
  is_engagement TINYINT DEFAULT 1,
  sem_gclid VARCHAR(255),
  sem_bclid VARCHAR(255),
  sem_msclkid VARCHAR(255),
  sem_fbclid VARCHAR(255),
  sem_audience VARCHAR(255),
  sem_position VARCHAR(100),
  log_string TEXT,
  dnt TINYINT DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dkey) REFERENCES domain(dkey)
);
```

### Table: `action`
```sql
CREATE TABLE action (
  akey BIGINT PRIMARY KEY AUTO_INCREMENT,
  pkey BIGINT NOT NULL,
  hash VARCHAR(255),
  action_offer TEXT,
  variant INT DEFAULT 1,
  engagement INT DEFAULT 1,
  log_string TEXT,
  revenue DECIMAL(10,2) DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pkey) REFERENCES hit(pkey)
);
```

### Table: `checkpoint`
```sql
CREATE TABLE checkpoint (
  ckey BIGINT PRIMARY KEY AUTO_INCREMENT,
  pkey BIGINT NOT NULL,
  hash VARCHAR(255),
  checkpoint_name VARCHAR(255),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pkey) REFERENCES hit(pkey)
);
```

### Table: `sale`
```sql
CREATE TABLE sale (
  skey BIGINT PRIMARY KEY AUTO_INCREMENT,
  hash VARCHAR(255),
  revenue DECIMAL(10,2),
  log_string TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `param`
```sql
CREATE TABLE param (
  paramkey BIGINT PRIMARY KEY AUTO_INCREMENT,
  pkey BIGINT,
  hash VARCHAR(255),
  param_name VARCHAR(255),
  param_value TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd /Users/soumyajitsarkar/Desktop/Code/apinode
npm install
```

### 2. Set Up Local MySQL Database

```bash
# Create database
mysql -u root -p
CREATE DATABASE lazysauce;
USE lazysauce;

# Import schema (run the CREATE TABLE statements above)
# Or import from SQL dump if available
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

Update these values in `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lazysauce
PORT=3000
```

### 4. Create Test Data

```sql
-- Insert test advertiser
INSERT INTO advertiser (aid, license)
VALUES (8, '238192a083189e214dca3ba2e2b3df2d');

-- Verify
SELECT * FROM advertiser;
```

### 5. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will be available at: `http://localhost:3000`

## API Endpoints

### 1. Health Check
```
GET http://localhost:3000/
```

**Response:**
```json
{
  "status": "ok",
  "message": "LazySauce Analytics API (Node.js)",
  "version": "1.0.0"
}
```

### 2. Track Hit (Page Visit)
```
GET http://localhost:3000/4.7/hit.php
```

**Parameters:**
- `lazy_url` - Full URL being tracked
- `a` - Advertiser ID (e.g., 8)
- `l` - License key
- `ao` - Action/offer name
- `ref` - Referer URL
- `ua` - User agent string
- `response` - JSONP callback function name (optional)

**Example:**
```bash
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://example.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Homepage&ref=https://google.com&ua=Mozilla/5.0"
```

**Response:**
```json
{
  "pkey": "12345",
  "hash": "dkey_pkey_timestamp",
  "domain": "example.com",
  "is_bot": 0,
  "os": "Mac OS X",
  "browser": "Chrome",
  "country": "US",
  "city": "New York"
}
```

### 3. Track Action
```
GET http://localhost:3000/4.7/action.php
```

**Parameters:**
- `p` - Page key (from hit response)
- `h` - Hash (from hit response)
- `ao` - Action offer/name
- `v` - Variant (default: 1)
- `e` - Engagement (default: 1)
- `r` - Revenue (optional)

**Example:**
```bash
curl "http://localhost:3000/4.7/action.php?p=12345&h=dkey_pkey_timestamp&ao=Button_Click"
```

### 4. Track Checkpoint
```
GET http://localhost:3000/4.7/checkpoint.php
```

**Parameters:**
- `p` - Page key
- `h` - Hash
- `c` - Checkpoint name

**Example:**
```bash
curl "http://localhost:3000/4.7/checkpoint.php?p=12345&h=hash_value&c=Form_Submit"
```

### 5. Track Sale
```
GET http://localhost:3000/4.7/sale.php
```

**Parameters:**
- `h` - Hash
- `r` - Revenue amount
- `lo` - Log string (optional)

**Example:**
```bash
curl "http://localhost:3000/4.7/sale.php?h=hash_value&r=99.99&lo=Order_12345"
```

### 6. Store Parameter
```
GET http://localhost:3000/4.7/param.php
```

**Parameters:**
- `p` - Page key
- `h` - Hash
- `pn` - Parameter name
- `pv` - Parameter value
- `action` - 0 for pkey, 1 for hash (default: 0)

### 7. Get Social Proof
```
GET http://localhost:3000/4.7/socialproof.php
```

**Parameters:**
- `t` - Trigger name (default: buy_click)
- `mr` - Minimum revenue (default: 0)
- `i` - Interval in hours (default: 24)
- `r` - Result count (default: 10)

**Response:**
```json
{
  "status": "success",
  "count": 5,
  "proofs": [
    {
      "revenue": 99.99,
      "time_ago": "5 minutes ago",
      "location": "New York, NY, US"
    }
  ]
}
```

## Testing

### Test with curl

```bash
# 1. Test health check
curl http://localhost:3000/

# 2. Test hit tracking
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Test_Page"

# 3. Use the pkey from response in subsequent calls
curl "http://localhost:3000/4.7/action.php?p=PKEY_FROM_ABOVE&h=HASH_FROM_ABOVE&ao=Test_Action"
```

### Test with Postman

1. Import the curl commands as requests
2. Create environment variables for pkey and hash
3. Chain requests using response values

### Test JSONP (for cross-domain)

```bash
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&response=myCallback"
```

Response will be:
```javascript
myCallback({"pkey":"12345","hash":"..."})
```

## Key Differences from PHP Version

### Similarities
✅ Same API endpoints (`/4.7/*.php`)
✅ Same parameter names
✅ Same response format (JSONP supported)
✅ Same database schema
✅ IP detection (CloudFlare support)
✅ User agent parsing
✅ Geolocation via IPStack API

### Differences
- **Async/Await**: Node.js uses promises instead of blocking I/O
- **Connection Pooling**: Better connection management
- **No Apache**: Standalone Express server
- **npm packages**: Modern libraries (useragent, axios, etc.)
- **Environment variables**: Using .env instead of PHP constants

## Production Deployment Considerations

### DO NOT USE IN PRODUCTION WITHOUT:

1. **Security Hardening**
   - Rate limiting
   - Input validation
   - SQL injection prevention (using parameterized queries)
   - CORS configuration
   - HTTPS enforcement

2. **Performance Optimization**
   - Redis caching
   - CDN for static assets
   - Load balancing
   - Database connection pooling tuning

3. **Monitoring**
   - Error tracking (Sentry, Rollbar)
   - Performance monitoring (New Relic, DataDog)
   - Uptime monitoring

4. **Database**
   - Use production Aurora MySQL endpoints
   - Read/write splitting
   - Connection pool optimization
   - Query optimization

## Troubleshooting

### Database Connection Error
```
Error: Access denied for user 'root'@'localhost'
```
**Solution:** Check your `.env` file and MySQL credentials

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change PORT in `.env` or kill the process using port 3000

### IPStack API Timeout
```
Error: IPStack lookup failed: timeout
```
**Solution:** Check internet connection or API key. The API will fall back to default location.

### Missing Tables
```
Error: Table 'lazysauce.hit' doesn't exist
```
**Solution:** Run the CREATE TABLE statements from the Database Schema section

## Development Notes

- **Local Only**: This setup is for LOCAL TESTING ONLY
- **No Production Data**: Never connect to production database
- **No Changes to Production**: This code doesn't affect the live PHP API
- **Testing Environment**: Safe to experiment and modify

## Future Enhancements

Potential improvements for production use:
- [ ] Redis for session management
- [ ] Queue system for high-volume tracking
- [ ] Batch inserts for better performance
- [ ] GraphQL API
- [ ] WebSocket support for real-time tracking
- [ ] Dashboard UI
- [ ] Admin API for reporting
- [ ] TypeScript conversion
- [ ] Unit tests
- [ ] Integration tests
- [ ] Docker containerization

## License

Internal use only - LazySauce API

## Contact

For questions about this Node.js conversion, refer to the original PHP source code in `/Users/soumyajitsarkar/Desktop/Code/apinode/apilazysauce/`

---

**Last Updated:** October 20, 2025
**PHP Source:** api.lazysauce.com (PHP 8.4 on Elastic Beanstalk)
**Node.js Version:** 1.0.0
