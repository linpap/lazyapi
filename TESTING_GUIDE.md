# Testing Guide - LazySauce API (Node.js)

**Status:** ✅ Fully Operational
**Date:** October 20, 2025
**Location:** `/Users/soumyajitsarkar/Desktop/Code/apinode/`

---

## 🎉 Setup Complete!

Your Node.js API is running successfully on **http://localhost:3000**

### What's Running:
- ✅ Node.js v24.10.0
- ✅ MySQL 9.4.0 (via Homebrew)
- ✅ Express server on port 3000
- ✅ Database: `lazysauce` with 7 tables
- ✅ Test data loaded

---

## 🧪 Quick Test Commands

### 1. Health Check
```bash
curl http://localhost:3000/
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "LazySauce Analytics API (Node.js)",
  "version": "1.0.0"
}
```

### 2. Track a Page Visit
```bash
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://myshop.com/products&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Product_Page&ref=https://google.com"
```

**Expected Response:**
```json
{
  "pkey": "12",
  "hash": "2_2_1760948200000",
  "domain": "myshop.com",
  "is_bot": 0,
  "os": "Other",
  "browser": "curl",
  "country": "",
  "city": "",
  "channel": "organic",
  "subchannel": ""
}
```

**Save the `pkey` and `hash` values for next steps!**

### 3. Track an Action
```bash
# Replace PKEY and HASH with values from step 2
curl "http://localhost:3000/4.7/action.php?p=PKEY&h=HASH&ao=Add_To_Cart&v=1&e=1&r=49.99"
```

**Example:**
```bash
curl "http://localhost:3000/4.7/action.php?p=12&h=2_2_1760948200000&ao=Add_To_Cart&v=1&e=1&r=49.99"
```

### 4. Track a Checkpoint
```bash
curl "http://localhost:3000/4.7/checkpoint.php?p=PKEY&h=HASH&c=Checkout_Started"
```

### 5. Track a Sale
```bash
curl "http://localhost:3000/4.7/sale.php?h=HASH&r=99.99&lo=Order_12345"
```

### 6. Get Social Proof
```bash
curl "http://localhost:3000/4.7/socialproof.php?t=buy_click&mr=0&i=24&r=10"
```

---

## 🔍 Verify Data in Database

### Check Tracked Hits
```bash
mysql -u root lazysauce -e "SELECT pkey, channel, browser, city, country, timestamp FROM hit ORDER BY pkey DESC LIMIT 5;"
```

### Check Actions
```bash
mysql -u root lazysauce -e "SELECT akey, pkey, action_offer, revenue, timestamp FROM action ORDER BY akey DESC LIMIT 5;"
```

### Check Sales
```bash
mysql -u root lazysauce -e "SELECT skey, hash, revenue, log_string, timestamp FROM sale ORDER BY skey DESC LIMIT 5;"
```

### Check Checkpoints
```bash
mysql -u root lazysauce -e "SELECT * FROM checkpoint ORDER BY ckey DESC LIMIT 5;"
```

### Check All Tables at Once
```bash
mysql -u root lazysauce <<EOF
SELECT 'HITS' AS Table_Name, COUNT(*) AS Count FROM hit
UNION ALL
SELECT 'ACTIONS', COUNT(*) FROM action
UNION ALL
SELECT 'SALES', COUNT(*) FROM sale
UNION ALL
SELECT 'CHECKPOINTS', COUNT(*) FROM checkpoint
UNION ALL
SELECT 'PARAMS', COUNT(*) FROM param;
EOF
```

---

## 🧪 Complete Test Flow

Here's a full tracking flow from visit to sale:

```bash
# Step 1: Track page visit and save response
RESPONSE=$(curl -s "http://localhost:3000/4.7/hit.php?lazy_url=https://mystore.com/product/123&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Product_View&ref=https://google.com")

# Extract pkey and hash
PKEY=$(echo $RESPONSE | grep -o '"pkey":"[^"]*"' | cut -d'"' -f4)
HASH=$(echo $RESPONSE | grep -o '"hash":"[^"]*"' | cut -d'"' -f4)

echo "Tracking with PKEY: $PKEY, HASH: $HASH"

# Step 2: Track action
curl "http://localhost:3000/4.7/action.php?p=$PKEY&h=$HASH&ao=Add_To_Cart&v=1&e=1&r=49.99"

# Step 3: Track checkpoint
curl "http://localhost:3000/4.7/checkpoint.php?p=$PKEY&h=$HASH&c=Checkout_Started"

# Step 4: Track another checkpoint
curl "http://localhost:3000/4.7/checkpoint.php?p=$PKEY&h=$HASH&c=Payment_Complete"

# Step 5: Track sale
curl "http://localhost:3000/4.7/sale.php?h=$HASH&r=99.99&lo=Order_$(date +%s)"

# Verify in database
echo "\\nDatabase verification:"
mysql -u root lazysauce -e "SELECT 'Last Hit' AS Type, pkey, channel, timestamp FROM hit WHERE pkey=$PKEY;"
mysql -u root lazysauce -e "SELECT 'Actions' AS Type, action_offer, revenue FROM action WHERE pkey=$PKEY;"
mysql -u root lazysauce -e "SELECT 'Checkpoints' AS Type, checkpoint_name FROM checkpoint WHERE pkey=$PKEY;"
mysql -u root lazysauce -e "SELECT 'Sale' AS Type, revenue, log_string FROM sale WHERE hash='$HASH';"
```

---

## 🌐 Test with Real Browser

### Browser Test (JavaScript Console)

Open your browser console and paste:

```javascript
// Create tracking pixel
(function() {
  const script = document.createElement('script');
  script.src = 'http://localhost:3000/4.7/hit.php?lazy_url=' +
               encodeURIComponent(window.location.href) +
               '&a=8&l=238192a083189e214dca3ba2e2b3df2d' +
               '&ao=' + encodeURIComponent(document.title) +
               '&ref=' + encodeURIComponent(document.referrer) +
               '&ua=' + encodeURIComponent(navigator.userAgent) +
               '&response=lazysauceCallback';
  document.head.appendChild(script);

  window.lazysauceCallback = function(data) {
    console.log('LazySauce Tracking:', data);
  };
})();
```

This will track your browser visit with real browser data!

---

## 📊 Server Management

### Start Server
```bash
cd /Users/soumyajitsarkar/Desktop/Code/apinode
node server.js
```

### Start with Auto-Reload (Development)
```bash
npm run dev
```

### Stop Server
```
Press Ctrl+C in the terminal
```

### Check if Server is Running
```bash
lsof -i :3000
```

### View Server Logs
Server logs are printed to the console where you started it.

---

## 🔧 Troubleshooting

### Server Won't Start - Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then start server again
cd /Users/soumyajitsarkar/Desktop/Code/apinode
node server.js
```

### Database Connection Failed
```bash
# Check if MySQL is running
brew services list | grep mysql

# Start MySQL if stopped
brew services start mysql

# Test connection
mysql -u root -e "SELECT 'Connected!' AS status;"
```

### Empty Responses or Errors
```bash
# Check server logs for errors
# Restart server
lsof -ti:3000 | xargs kill -9
cd /Users/soumyajitsarkar/Desktop/Code/apinode
node server.js
```

### Reset Database (Fresh Start)
```bash
# Drop and recreate database
mysql -u root -e "DROP DATABASE IF EXISTS lazysauce;"
mysql -u root < schema.sql

# Verify
mysql -u root lazysauce -e "SHOW TABLES;"
```

---

## 📈 Performance Testing

### Basic Load Test with curl
```bash
# Run 100 requests
for i in {1..100}; do
  curl -s "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com/page$i&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Test_$i" > /dev/null &
done
wait

# Check how many were tracked
mysql -u root lazysauce -e "SELECT COUNT(*) AS total_hits FROM hit;"
```

### Response Time Test
```bash
# Measure response time
time curl -s "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Test" > /dev/null
```

---

## 🎯 Test Credentials

Pre-configured in database:

| Parameter | Value |
|-----------|-------|
| **Advertiser ID** | `8` |
| **License Key** | `238192a083189e214dca3ba2e2b3df2d` |
| **Test Domain** | `test.com` |

These match the production PHP API configuration.

---

## 📝 API Endpoints Summary

| Endpoint | Purpose | Required Params |
|----------|---------|-----------------|
| `/` | Health check | None |
| `/4.7/hit.php` | Track page visit | `lazy_url`, `a`, `l` |
| `/4.7/action.php` | Track user action | `p`, `h`, `ao` |
| `/4.7/checkpoint.php` | Track checkpoint | `p`, `h`, `c` |
| `/4.7/sale.php` | Track sale | `h`, `r` |
| `/4.7/param.php` | Store parameter | `p`, `pn`, `pv` |
| `/4.7/socialproof.php` | Get social proof | None (optional params) |

---

## 🚀 Advanced Testing

### Test with Postman

1. Import this collection:

**Collection:** LazySauce API
```json
{
  "info": {
    "name": "LazySauce Analytics API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/"
      }
    },
    {
      "name": "Track Hit",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Test",
          "query": [
            {"key": "lazy_url", "value": "https://test.com"},
            {"key": "a", "value": "8"},
            {"key": "l", "value": "238192a083189e214dca3ba2e2b3df2d"},
            {"key": "ao", "value": "Test"}
          ]
        }
      }
    }
  ]
}
```

### Test JSONP (Cross-Domain)
```bash
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Test&response=myCallback"
```

**Expected Response:**
```javascript
myCallback({"pkey":"13","hash":"...","domain":"test.com",...})
```

---

## ✅ Verification Checklist

- [x] Server running on port 3000
- [x] Health check returns status: ok
- [x] Hit endpoint tracks visits
- [x] Action endpoint tracks actions
- [x] Checkpoint endpoint tracks checkpoints
- [x] Sale endpoint tracks sales
- [x] Data appears in MySQL database
- [x] All 7 database tables exist
- [x] Test advertiser (ID: 8) exists

---

## 📚 Documentation

For more detailed information, see:

- **README.md** - Complete API documentation
- **QUICKSTART.md** - 5-minute setup guide
- **CONVERSION_SUMMARY.md** - PHP to Node.js conversion details
- **PROJECT_COMPLETE.md** - Project overview

---

## 🎉 You're All Set!

Your LazySauce Analytics API (Node.js version) is fully operational and ready for testing!

**What's Working:**
- ✅ All 6 API endpoints
- ✅ MySQL database with test data
- ✅ IP detection & geolocation
- ✅ User agent parsing
- ✅ Bot detection
- ✅ JSONP support
- ✅ Complete tracking flow

**Quick Start:**
```bash
# In one terminal - start server
cd /Users/soumyajitsarkar/Desktop/Code/apinode
node server.js

# In another terminal - test it
curl http://localhost:3000/
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Homepage"
```

**Enjoy testing your API! 🚀**

---

**Last Updated:** October 20, 2025
**Status:** ✅ Fully Operational
**Server:** http://localhost:3000
