const mysql = require('mysql2/promise');

// Connection pools
let centralWritePool = null;
let centralReadPool = null;
const domainPools = {}; // Cache for domain-specific connection pools

const centralDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'lazysauce', // Always central database
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true
};

const centralReadDbConfig = {
  ...centralDbConfig,
  host: process.env.DB_READ_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.DB_READ_PORT || process.env.DB_PORT || 3306
};

/**
 * Get central write database connection pool (lazysauce)
 */
function getCentralWritePool() {
  if (!centralWritePool) {
    centralWritePool = mysql.createPool(centralDbConfig);
    console.log('Central Write DB pool created:', centralDbConfig.host);
  }
  return centralWritePool;
}

/**
 * Get central read database connection pool (lazysauce)
 */
function getCentralReadPool() {
  if (!centralReadPool) {
    centralReadPool = mysql.createPool(centralReadDbConfig);
    console.log('Central Read DB pool created:', centralReadDbConfig.host);
  }
  return centralReadPool;
}

/**
 * Get domain-specific database connection pool (lazysauce_{dkey})
 * @param {number} dkey - Domain key
 * @param {string} dbHost - Database host (from advertiser table)
 */
function getDomainPool(dkey, dbHost = null) {
  const host = dbHost || process.env.DB_HOST;
  const poolKey = `${host}_${dkey}`;

  if (!domainPools[poolKey]) {
    const domainDbConfig = {
      host: host,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: `lazysauce_${dkey}`,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      multipleStatements: true
    };

    domainPools[poolKey] = mysql.createPool(domainDbConfig);
    console.log(`Domain DB pool created: lazysauce_${dkey} on ${host}`);
  }

  return domainPools[poolKey];
}

/**
 * Execute a query on central write database
 */
async function executeCentralWrite(query, params = []) {
  try {
    const pool = getCentralWritePool();
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Central Write DB Error:', error.message);
    throw error;
  }
}

/**
 * Execute a query on central read database
 */
async function executeCentralRead(query, params = []) {
  try {
    const pool = getCentralReadPool();
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Central Read DB Error:', error.message);
    throw error;
  }
}

/**
 * Execute a query on domain-specific database (write)
 */
async function executeDomainWrite(dkey, query, params = [], dbHost = null) {
  try {
    const pool = getDomainPool(dkey, dbHost);
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error(`Domain ${dkey} Write DB Error:`, error.message);
    throw error;
  }
}

/**
 * Execute a query on domain-specific database (read)
 */
async function executeDomainRead(dkey, query, params = [], dbHost = null) {
  try {
    const pool = getDomainPool(dkey, dbHost);
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error(`Domain ${dkey} Read DB Error:`, error.message);
    throw error;
  }
}

/**
 * Create domain-specific database schema if it doesn't exist
 * Matches the PHP create_schema() function
 */
async function createDomainSchema(dkey) {
  const domainDbName = `lazysauce_${dkey}`;
  const pool = getCentralWritePool();

  try {
    // Check if database exists
    const [databases] = await pool.query(`SHOW DATABASES LIKE '${domainDbName}'`);

    if (databases.length === 0) {
      console.log(`Creating schema for domain: ${domainDbName}`);

      // Create database
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${domainDbName} DEFAULT CHARACTER SET latin1`);

      // Get domain pool for creating tables
      const domainPool = getDomainPool(dkey);

      // Create visit table (matches PHP schema)
      const createVisitTable = `
        CREATE TABLE IF NOT EXISTS visit (
          pkey BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          guid BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
          did BIGINT(20) UNSIGNED NOT NULL,
          ip VARBINARY(16) NOT NULL,
          variant INT(10) UNSIGNED NOT NULL DEFAULT 0,
          channel VARCHAR(100) NOT NULL DEFAULT 'organic',
          subchannel VARCHAR(100) NOT NULL DEFAULT '',
          target VARCHAR(250) NOT NULL DEFAULT '',
          is_bot TINYINT(1) NOT NULL DEFAULT 0,
          engagement INT(8) UNSIGNED NOT NULL DEFAULT 0,
          date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (pkey),
          UNIQUE INDEX pkey_UNIQUE (pkey ASC),
          INDEX (guid),
          INDEX (channel),
          UNIQUE INDEX combo_UNIQUE (did, ip, channel, subchannel, target, date_created),
          INDEX (date_created),
          INDEX (is_bot),
          INDEX analytics1 (pkey, date_created, is_bot)
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `;

      await domainPool.query(createVisitTable);

      // Create action table (matches PHP schema)
      const createActionTable = `
        CREATE TABLE IF NOT EXISTS action (
          hash BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          pkey BIGINT(20) UNSIGNED NOT NULL,
          action INT(10) NOT NULL DEFAULT 0,
          name VARCHAR(250) NOT NULL,
          variant INT(10) UNSIGNED NOT NULL DEFAULT 0,
          is_engagement TINYINT(1) NOT NULL DEFAULT 1,
          date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          date_revenue TIMESTAMP NOT NULL DEFAULT '0000-00-00 00:00:00',
          revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
          pixel INT(8) UNSIGNED NOT NULL DEFAULT 0,
          logstring VARCHAR(1000) NOT NULL DEFAULT '',
          PRIMARY KEY (hash),
          UNIQUE INDEX hash_UNIQUE (hash ASC),
          INDEX (name),
          INDEX (pixel),
          INDEX (date_created),
          INDEX (date_revenue),
          CONSTRAINT fk_action_pkey FOREIGN KEY (pkey) REFERENCES visit (pkey) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `;

      await domainPool.query(createActionTable);

      // Create parameters table (matches PHP schema)
      const createParametersTable = `
        CREATE TABLE IF NOT EXISTS parameters (
          pid BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          pkey BIGINT(20) UNSIGNED NOT NULL,
          hash BIGINT(20) UNSIGNED NOT NULL DEFAULT 0,
          name VARCHAR(45) NOT NULL,
          value VARCHAR(255) NOT NULL,
          date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (pid),
          UNIQUE INDEX pid_UNIQUE (pid ASC),
          INDEX (hash),
          INDEX (pkey),
          INDEX (name),
          UNIQUE INDEX combo_UNIQUE (pkey, hash, name),
          INDEX (date_created),
          CONSTRAINT fk_parameters_pkey FOREIGN KEY (pkey) REFERENCES visit (pkey) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `;

      await domainPool.query(createParametersTable);

      // Create affiliate table (matches PHP schema)
      const createAffiliateTable = `
        CREATE TABLE IF NOT EXISTS affiliate (
          akey BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL DEFAULT '',
          channel VARCHAR(100) NOT NULL,
          subchannel VARCHAR(100) NOT NULL DEFAULT '',
          maxbucket DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
          revshare DECIMAL(3,2) UNSIGNED NOT NULL DEFAULT 0,
          cpa DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
          cpm DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
          cpc DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0,
          pixel VARCHAR(255) NOT NULL DEFAULT '',
          date_created TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          date_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (akey),
          UNIQUE INDEX akey_UNIQUE (akey ASC),
          INDEX (channel),
          UNIQUE INDEX combo_UNIQUE (channel, subchannel)
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `;

      await domainPool.query(createAffiliateTable);

      // Create bucket table (matches PHP schema)
      const createBucketTable = `
        CREATE TABLE IF NOT EXISTS bucket (
          bid BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
          akey BIGINT(20) UNSIGNED NOT NULL,
          subchannel VARCHAR(100) NOT NULL,
          revenue DECIMAL(10,2) UNSIGNED NOT NULL DEFAULT 0.00,
          date_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (bid),
          UNIQUE INDEX bid_UNIQUE (bid ASC),
          INDEX (akey),
          INDEX (subchannel),
          UNIQUE INDEX combo_UNIQUE (akey, subchannel),
          CONSTRAINT fk_bucket_akey FOREIGN KEY (akey) REFERENCES affiliate (akey) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `;

      await domainPool.query(createBucketTable);

      console.log(`Schema created successfully for: ${domainDbName}`);
    }

    return true;
  } catch (error) {
    console.error(`Error creating schema for ${domainDbName}:`, error.message);
    throw error;
  }
}

/**
 * Close all database connections
 */
async function closeAll() {
  if (centralWritePool) await centralWritePool.end();
  if (centralReadPool) await centralReadPool.end();

  // Close all domain pools
  for (const poolKey in domainPools) {
    await domainPools[poolKey].end();
  }

  console.log('All database connections closed');
}

module.exports = {
  getCentralWritePool,
  getCentralReadPool,
  getDomainPool,
  executeCentralWrite,
  executeCentralRead,
  executeDomainWrite,
  executeDomainRead,
  createDomainSchema,
  closeAll,

  // Legacy exports for backward compatibility
  getWritePool: getCentralWritePool,
  getReadPool: getCentralReadPool,
  executeWrite: executeCentralWrite,
  executeRead: executeCentralRead
};
