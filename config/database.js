const mysql = require('mysql2/promise');

// Create connection pools for better performance
let writePool = null;
let readPool = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lazysauce',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const readDbConfig = {
  ...dbConfig,
  host: process.env.DB_READ_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.DB_READ_PORT || process.env.DB_PORT || 3306
};

/**
 * Get write database connection pool
 */
function getWritePool() {
  if (!writePool) {
    writePool = mysql.createPool(dbConfig);
    console.log('Write DB pool created:', dbConfig.host);
  }
  return writePool;
}

/**
 * Get read database connection pool (read replica)
 */
function getReadPool() {
  if (!readPool) {
    readPool = mysql.createPool(readDbConfig);
    console.log('Read DB pool created:', readDbConfig.host);
  }
  return readPool;
}

/**
 * Execute a query on write database
 */
async function executeWrite(query, params = []) {
  try {
    const pool = getWritePool();
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Write DB Error:', error.message);
    throw error;
  }
}

/**
 * Execute a query on read database
 */
async function executeRead(query, params = []) {
  try {
    const pool = getReadPool();
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Read DB Error:', error.message);
    throw error;
  }
}

/**
 * Close all database connections
 */
async function closeAll() {
  if (writePool) await writePool.end();
  if (readPool) await readPool.end();
  console.log('All database connections closed');
}

module.exports = {
  getWritePool,
  getReadPool,
  executeWrite,
  executeRead,
  closeAll
};
