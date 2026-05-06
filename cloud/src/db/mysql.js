/**
 * MySQL 数据库连接模块
 * 微信云托管环境变量配置:
 * - MYSQL_HOST: 数据库主机
 * - MYSQL_PORT: 端口（默认3306）
 * - MYSQL_USER: 用户名
 * - MYSQL_PASSWORD: 密码
 * - MYSQL_DATABASE: 数据库名
 */

const mysql = require('mysql2/promise');

let pool = null;

/**
 * 获取连接池
 */
function getPool() {
  if (!pool) {
    const config = {
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };

    // 检查配置完整性
    const missing = Object.entries(config)
      .filter(([k, v]) => k !== 'port' && k !== 'keepAliveInitialDelay' && k !== 'enableKeepAlive' && !v)
      .map(([k]) => k);

    if (missing.length > 0) {
      console.warn(`[DB] MySQL配置不完整，缺少: ${missing.join(', ')}，将使用内存存储`);
      return null;
    }

    pool = mysql.createPool(config);
    console.log('[DB] MySQL连接池已创建');
  }
  return pool;
}

/**
 * 执行查询
 */
async function query(sql, params = []) {
  const p = getPool();
  if (!p) {
    throw new Error('MySQL未配置或连接失败');
  }
  const [rows] = await p.execute(sql, params);
  return rows;
}

/**
 * 执行插入并返回插入ID
 */
async function insert(sql, params = []) {
  const p = getPool();
  if (!p) {
    throw new Error('MySQL未配置或连接失败');
  }
  const [result] = await p.execute(sql, params);
  return result.insertId;
}

/**
 * 执行更新并返回影响行数
 */
async function update(sql, params = []) {
  const p = getPool();
  if (!p) {
    throw new Error('MySQL未配置或连接失败');
  }
  const [result] = await p.execute(sql, params);
  return result.affectedRows;
}

/**
 * 初始化数据库表结构
 */
async function initSchema() {
  const p = getPool();
  if (!p) {
    console.log('[DB] MySQL未配置，跳过表结构初始化');
    return;
  }

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      openid VARCHAR(128) UNIQUE,
      unionid VARCHAR(128),
      phone VARCHAR(20),
      nickname VARCHAR(64),
      avatar_url VARCHAR(512),
      gender TINYINT DEFAULT 0,
      height DECIMAL(5,1) DEFAULT NULL,
      weight DECIMAL(5,1) DEFAULT NULL,
      birthday DATE DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login_at DATETIME,
      is_member TINYINT DEFAULT 0,
      member_expire_at DATETIME,
      INDEX idx_openid (openid),
      INDEX idx_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(128) NOT NULL,
      description TEXT,
      cycle_type VARCHAR(32) DEFAULT 'natural_week',
      status VARCHAR(16) DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS plan_exercises (
      id VARCHAR(64) PRIMARY KEY,
      plan_id VARCHAR(64) NOT NULL,
      exercise_id VARCHAR(32) NOT NULL,
      exercise_name VARCHAR(128),
      day_of_week TINYINT DEFAULT 1,
      cycle_label VARCHAR(8),
      order_index INT DEFAULT 0,
      target_sets INT DEFAULT 3,
      target_reps INT DEFAULT 10,
      initial_weight DECIMAL(6,2) DEFAULT 0,
      increment_step DECIMAL(4,2) DEFAULT 2.5,
      decrement_rate DECIMAL(3,2) DEFAULT 0.1,
      rest_seconds INT DEFAULT 120,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_plan_id (plan_id),
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      plan_id VARCHAR(64),
      scheduled_date DATE,
      status VARCHAR(16) DEFAULT 'not_started',
      started_at DATETIME,
      completed_at DATETIME,
      paused_at DATETIME,
      aborted_at DATETIME,
      total_duration_seconds INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_plan_id (plan_id),
      INDEX idx_status (status),
      INDEX idx_scheduled_date (scheduled_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS session_sets (
      id VARCHAR(64) PRIMARY KEY,
      session_id VARCHAR(64) NOT NULL,
      exercise_id VARCHAR(32) NOT NULL,
      exercise_name VARCHAR(128),
      set_number INT NOT NULL,
      target_weight DECIMAL(6,2),
      actual_weight DECIMAL(6,2),
      target_reps INT,
      actual_reps INT,
      rpe TINYINT,
      is_alternative TINYINT DEFAULT 0,
      alternative_of VARCHAR(64),
      status VARCHAR(16) DEFAULT 'completed',
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session_id (session_id),
      INDEX idx_exercise_id (exercise_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS rm_history (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      exercise_id VARCHAR(32) NOT NULL,
      estimated_1rm DECIMAL(6,2) NOT NULL,
      based_weight DECIMAL(6,2),
      based_reps INT,
      rpe TINYINT,
      session_id VARCHAR(64),
      is_new_pr TINYINT DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_exercise_id (exercise_id),
      INDEX idx_recorded_at (recorded_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS progressions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      exercise_id VARCHAR(32) NOT NULL,
      session_id VARCHAR(64),
      progression_type VARCHAR(16),
      previous_weight DECIMAL(6,2),
      new_weight DECIMAL(6,2),
      increment DECIMAL(6,2),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_exercise_id (exercise_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS failure_counts (
      exercise_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      consecutive_failures INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (exercise_id, user_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const sql of tables) {
    try {
      await p.execute(sql);
    } catch (err) {
      console.error('[DB] 建表失败:', err.message);
    }
  }

  console.log('[DB] 数据库表结构初始化完成');
}

/**
 * 关闭连接池
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] MySQL连接池已关闭');
  }
}

module.exports = {
  getPool,
  query,
  insert,
  update,
  initSchema,
  close
};
