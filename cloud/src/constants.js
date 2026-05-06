/**
 * 全局常量定义
 * 统一管理项目中的魔法数字和重复常量
 */

// Token 有效期
const TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60; // 7天
const TOKEN_EXPIRES_JWT = '7d';

// 验证码
const PHONE_CODE_EXPIRE_MS = 5 * 60 * 1000;       // 验证码有效期 5分钟
const PHONE_CODE_RATE_LIMIT_MS = 60 * 1000;        // 发送间隔限制 1分钟
const PHONE_CODE_MAX_ATTEMPTS = 5;                  // 最大尝试次数

// 默认值
const DEFAULT_BODY_WEIGHT_KG = 70;                  // 默认体重
const DEFAULT_INCREMENT_STEP = 2.5;                 // 默认递增步幅 kg
const DEFAULT_DECREMENT_RATE = 0.1;                 // 默认减量比率
const DEFAULT_REST_SECONDS = 120;                   // 默认休息时间 秒
const DEFAULT_DECREMENT_RATE_STR = '0.1';           // 数据库存储的字符串

// 分页
const DEFAULT_PAGE_LIMIT = 20;
const DEFAULT_1RM_HISTORY_LIMIT = 30;
const DEFAULT_PROGRESSION_HISTORY_LIMIT = 20;

module.exports = {
  TOKEN_EXPIRES_SECONDS,
  TOKEN_EXPIRES_JWT,
  PHONE_CODE_EXPIRE_MS,
  PHONE_CODE_RATE_LIMIT_MS,
  PHONE_CODE_MAX_ATTEMPTS,
  DEFAULT_BODY_WEIGHT_KG,
  DEFAULT_INCREMENT_STEP,
  DEFAULT_DECREMENT_RATE,
  DEFAULT_REST_SECONDS,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_1RM_HISTORY_LIMIT,
  DEFAULT_PROGRESSION_HISTORY_LIMIT
};
