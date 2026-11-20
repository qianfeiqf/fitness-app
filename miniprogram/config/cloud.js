/**
 * 微信云开发（CloudBase）环境配置
 * 环境 ID：cloud1-1g20tdh446a011c5（上海 / 个人版）
 */
const CLOUD_ENV_ID = 'cloud1-1g20tdh446a011c5';

// 需要与云数据库双向同步的集合（请在云开发控制台将权限统一设为「仅创建者可读写」）
const SYNC_COLLECTIONS = [
  'profiles',
  'plans',
  'plan_exercises',
  'sessions',
  'session_sets',
  'rm_history',
  'progressions',
  'goals'
];

module.exports = {
  CLOUD_ENV_ID,
  SYNC_COLLECTIONS
};
