# Quick Start Guide - LazySauce API (Node.js)

## 5-Minute Setup

### Step 1: Install Dependencies (1 minute)

```bash
cd /Users/soumyajitsarkar/Desktop/Code/apinode
npm install
```

### Step 2: Set Up MySQL Database (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Import schema
source schema.sql

# Or copy-paste the schema.sql content
```

### Step 3: Configure Environment (30 seconds)

The `.env` file is already created. Just update your MySQL password:

```bash
nano .env
```

Change this line:
```
DB_PASSWORD=your_actual_mysql_password
```

### Step 4: Start the Server (30 seconds)

```bash
npm start
```

You should see:
```
LazySauce API (Node.js) running on port 3000
Environment: development
Database: localhost:3306
```

### Step 5: Test the API (1 minute)

```bash
# Test health check
curl http://localhost:3000/

# Test hit tracking
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Homepage"
```

## Test Credentials

- **Advertiser ID:** 8
- **License Key:** 238192a083189e214dca3ba2e2b3df2d
- **Test Domain:** test.com

## Common Commands

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Check database
mysql -u root -p lazysauce -e "SELECT * FROM hit ORDER BY pkey DESC LIMIT 5;"

# View logs
tail -f logs/app.log  # If logging is enabled
```

## Testing Flow

### 1. Track a Page Visit
```bash
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://mysite.com/page1&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Product_Page&ref=https://google.com"
```

**Save the `pkey` and `hash` from response!**

### 2. Track an Action
```bash
# Replace PKEY and HASH with values from step 1
curl "http://localhost:3000/4.7/action.php?p=PKEY&h=HASH&ao=Add_To_Cart&v=1"
```

### 3. Track a Checkpoint
```bash
curl "http://localhost:3000/4.7/checkpoint.php?p=PKEY&h=HASH&c=Checkout_Started"
```

### 4. Track a Sale
```bash
curl "http://localhost:3000/4.7/sale.php?h=HASH&r=99.99&lo=Order_12345"
```

### 5. Get Social Proof
```bash
curl "http://localhost:3000/4.7/socialproof.php?t=buy_click&mr=0&i=24&r=10"
```

## Verify Data in Database

```sql
-- Check hits
SELECT pkey, channel, subchannel, city, country, timestamp
FROM hit
ORDER BY pkey DESC
LIMIT 10;

-- Check actions
SELECT * FROM action ORDER BY akey DESC LIMIT 10;

-- Check sales
SELECT * FROM sale ORDER BY skey DESC LIMIT 10;
```

## Troubleshooting

### Server won't start
- Check if port 3000 is available: `lsof -i :3000`
- Change PORT in .env file

### Database connection failed
- Verify MySQL is running: `mysql.server status`
- Check credentials in .env file
- Ensure lazysauce database exists

### No data in tables
- Check if hit endpoint returned a valid pkey
- Look for errors in console output
- Verify advertiser ID (8) and license match

## Next Steps

1. ✅ Server running
2. ✅ Database connected
3. ✅ Test hit tracked
4. ✅ Action tracked
5. ✅ Data visible in MySQL

**You're all set for local testing!**

## Important Notes

- This is LOCAL TESTING ONLY
- DO NOT connect to production database
- Safe to experiment and break things
- Changes here don't affect live PHP API

---

For detailed documentation, see [README.md](README.md)
