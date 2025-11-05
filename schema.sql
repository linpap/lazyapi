-- LazySauce Analytics API - Database Schema
-- For local testing only

CREATE DATABASE IF NOT EXISTS lazysauce;
USE lazysauce;

-- Table: advertiser
-- Stores advertiser/client information
CREATE TABLE IF NOT EXISTS advertiser (
  aid INT PRIMARY KEY AUTO_INCREMENT,
  license VARCHAR(255) NOT NULL,
  subscription_type INT DEFAULT 0,
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_license (license)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: domain
-- Stores tracked domains
CREATE TABLE IF NOT EXISTS domain (
  dkey INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  aid INT NOT NULL,
  channel_priority VARCHAR(255) DEFAULT '',
  subchannel_priority VARCHAR(255) DEFAULT '',
  keyword_priority VARCHAR(255) DEFAULT '',
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (aid) REFERENCES advertiser(aid),
  INDEX idx_name (name),
  INDEX idx_aid (aid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: hit
-- Stores page visit tracking data
CREATE TABLE IF NOT EXISTS hit (
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
  FOREIGN KEY (dkey) REFERENCES domain(dkey),
  INDEX idx_dkey (dkey),
  INDEX idx_timestamp (timestamp),
  INDEX idx_channel (channel),
  INDEX idx_is_bot (is_bot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: action
-- Stores user action tracking
CREATE TABLE IF NOT EXISTS action (
  akey BIGINT PRIMARY KEY AUTO_INCREMENT,
  pkey BIGINT NOT NULL,
  hash VARCHAR(255),
  action_offer TEXT,
  variant INT DEFAULT 1,
  engagement INT DEFAULT 1,
  log_string TEXT,
  revenue DECIMAL(10,2) DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pkey) REFERENCES hit(pkey),
  INDEX idx_pkey (pkey),
  INDEX idx_hash (hash),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: checkpoint
-- Stores conversion checkpoint tracking
CREATE TABLE IF NOT EXISTS checkpoint (
  ckey BIGINT PRIMARY KEY AUTO_INCREMENT,
  pkey BIGINT NOT NULL,
  hash VARCHAR(255),
  checkpoint_name VARCHAR(255),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pkey) REFERENCES hit(pkey),
  INDEX idx_pkey (pkey),
  INDEX idx_hash (hash),
  INDEX idx_checkpoint_name (checkpoint_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: sale
-- Stores sale/revenue tracking
CREATE TABLE IF NOT EXISTS sale (
  skey BIGINT PRIMARY KEY AUTO_INCREMENT,
  hash VARCHAR(255),
  revenue DECIMAL(10,2),
  log_string TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hash (hash),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: param
-- Stores custom parameter tracking
CREATE TABLE IF NOT EXISTS param (
  paramkey BIGINT PRIMARY KEY AUTO_INCREMENT,
  pkey BIGINT,
  hash VARCHAR(255),
  param_name VARCHAR(255),
  param_value TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pkey (pkey),
  INDEX idx_hash (hash),
  INDEX idx_param_name (param_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert test advertiser data
-- This matches the advertiser used in the PHP production API
INSERT INTO advertiser (aid, license, subscription_type)
VALUES (8, '238192a083189e214dca3ba2e2b3df2d', 1)
ON DUPLICATE KEY UPDATE license=license;

-- Insert test domain
INSERT INTO domain (name, aid)
VALUES ('test.com', 8)
ON DUPLICATE KEY UPDATE name=name;

-- Verify setup
SELECT 'Database schema created successfully!' AS status;
SELECT 'Test advertiser ID: 8' AS advertiser;
SELECT 'Test license: 238192a083189e214dca3ba2e2b3df2d' AS license;

-- Show table structure
SHOW TABLES;
