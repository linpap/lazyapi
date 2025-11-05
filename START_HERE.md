# 🚀 START HERE - LazySauce API (Node.js)

**Welcome!** This is your Node.js version of api.lazysauce.com

---

## ✅ Status: Ready to Test!

Your server is **running** at: **http://localhost:3000**

---

## 🎯 Quick Test (30 seconds)

Open a terminal and paste:

```bash
# Test 1: Health check
curl http://localhost:3000/

# Test 2: Track a page visit
curl "http://localhost:3000/4.7/hit.php?lazy_url=https://test.com&a=8&l=238192a083189e214dca3ba2e2b3df2d&ao=Homepage"

# Test 3: Check database
mysql -u root lazysauce -e "SELECT * FROM hit ORDER BY pkey DESC LIMIT 3;"
```

---

## 📚 Documentation Guide

| Read This | When You Want To... |
|-----------|---------------------|
| **SETUP_COMPLETE.md** | Verify everything is working ✅ |
| **TESTING_GUIDE.md** | Learn how to test all endpoints |
| **PROJECT_INDEX.md** | Understand every file in the project |
| **README.md** | Deep dive into complete API docs |
| **QUICKSTART.md** | Quick reference guide |

---

## 📁 What's In This Folder?

```
apinode/
├── 📖 Documentation (7 files)
│   ├── START_HERE.md         👈 You are here
│   ├── SETUP_COMPLETE.md      ✅ Setup verification
│   ├── TESTING_GUIDE.md       🧪 Testing instructions
│   ├── PROJECT_INDEX.md       📋 Complete file index
│   ├── README.md              📚 Full API docs
│   ├── QUICKSTART.md          ⚡ Quick reference
│   └── CONVERSION_SUMMARY.md  📊 Conversion details
│
├── 💻 Source Code (8 files)
│   ├── server.js              🚀 Main server
│   ├── config/database.js     💾 Database
│   ├── routes/*.js            🛣️  API endpoints (6 files)
│   └── utils/helpers.js       🔧 Utilities
│
├── ⚙️ Configuration (4 files)
│   ├── package.json           📦 Dependencies
│   ├── .env                   🔐 Environment config
│   ├── .gitignore             🚫 Git ignore
│   └── schema.sql             🗄️  Database schema
│
└── 📂 Original PHP Source
    └── apilazysauce/          (265 MB, 50+ files)
```

---

## 🧪 What Can You Test?

### 6 API Endpoints (All Working!)

1. **Health Check** - `GET /`
2. **Track Visits** - `GET /4.7/hit.php`
3. **Track Actions** - `GET /4.7/action.php`
4. **Track Checkpoints** - `GET /4.7/checkpoint.php`
5. **Track Sales** - `GET /4.7/sale.php`
6. **Store Parameters** - `GET /4.7/param.php`
7. **Social Proof** - `GET /4.7/socialproof.php`

---

## 🎓 What Is This?

This is an **analytics tracking API** (like Google Analytics) that tracks:

- 📊 **Page Visits** - When users visit your website
- 🖱️ **User Actions** - Button clicks, form submissions
- ✅ **Checkpoints** - Steps in conversion funnel
- 💰 **Sales** - Revenue tracking
- 🌍 **User Info** - Location, device, browser
- 📈 **Attribution** - Channel, source, campaign

---

## 💡 Quick Commands

### Server Management
```bash
# Check if server is running
lsof -i :3000

# Stop server
lsof -ti:3000 | xargs kill -9

# Start server
cd /Users/soumyajitsarkar/Desktop/Code/apinode
node server.js
```

### Database
```bash
# Connect to database
mysql -u root lazysauce

# View all data
mysql -u root lazysauce -e "
  SELECT 'Hits' AS table_name, COUNT(*) FROM hit
  UNION ALL SELECT 'Actions', COUNT(*) FROM action
  UNION ALL SELECT 'Sales', COUNT(*) FROM sale;
"

# Reset database
mysql -u root < schema.sql
```

---

## 🆘 Quick Fixes

### Server not responding?
```bash
lsof -ti:3000 | xargs kill -9
cd /Users/soumyajitsarkar/Desktop/Code/apinode
node server.js
```

### Database error?
```bash
brew services restart mysql
```

### Need help?
Read **TESTING_GUIDE.md** for complete instructions

---

## ✅ Project Status

- ✅ Server running on port 3000
- ✅ MySQL database configured
- ✅ All 6 endpoints working
- ✅ Test data loaded
- ✅ Documentation complete
- ✅ Ready for testing

---

## 🎯 Test Credentials

| Parameter | Value |
|-----------|-------|
| Advertiser ID | `8` |
| License Key | `238192a083189e214dca3ba2e2b3df2d` |
| Test Domain | `test.com` |

Use these in all API calls!

---

## 📞 Where to Get Help

1. **TESTING_GUIDE.md** - Testing instructions
2. **PROJECT_INDEX.md** - What each file does
3. **README.md** - Complete API reference
4. **SETUP_COMPLETE.md** - Verify setup

---

## 🚀 Next Steps

1. ✅ Test the API (see TESTING_GUIDE.md)
2. ✅ Explore the code (see PROJECT_INDEX.md)
3. ✅ Read the docs (see README.md)
4. ✅ Experiment safely (local testing only)

---

## ⚠️ Important

- ✅ This is LOCAL TESTING ONLY
- ✅ Safe to experiment and modify
- ❌ NOT connected to production
- ❌ NOT deployed to internet

---

**Server:** http://localhost:3000
**Location:** `/Users/soumyajitsarkar/Desktop/Code/apinode/`
**Status:** ✅ Operational

**Ready to test! 🎉**

---

**Quick Test:**
```bash
curl http://localhost:3000/
```

**Full Testing Guide:**
```bash
cat TESTING_GUIDE.md
```

**Complete File Index:**
```bash
cat PROJECT_INDEX.md
```
