/**
 * 认证服务
 * 通过 storage 策略层统一 MySQL / 内存存储
 */

const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth');
const storage = require('./storage');

const USERS_STORE = 'users';

/**
 * 微信登录
 */
async function wxLogin(code) {
  // 微信 code2session API 配置
  const WX_APPID = process.env.WX_APPID;
  const WX_SECRET = process.env.WX_SECRET;

  let openId;
  let unionId = null;

  if (WX_APPID && WX_SECRET) {
    // 调用微信API换取 openid
    try {
      const wxApiUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;

      const response = await fetch(wxApiUrl);
      const data = await response.json();

      if (data.errcode) {
        throw new Error(`微信API错误: ${data.errmsg} (${data.errcode})`);
      }

      openId = data.openid;
      unionId = data.unionid || null;
      console.log('微信登录成功, openId:', openId);
    } catch (err) {
      console.error('微信API调用失败:', err.message);
      throw new Error('微信登录失败，请稍后重试');
    }
  } else {
    // 未配置微信凭证时，降级为本地mock（仅供开发测试）
    console.warn('警告: 未配置 WX_APPID/WX_SECRET，使用模拟openid');
    openId = 'mock_openid_' + code;
  }

  // 查找或创建用户
  let user = await findUserByOpenId(openId);

  const isNewUser = !user;
  const now = new Date();

  if (!user) {
    // 创建新用户
    const newUser = {
      id: uuidv4(),
      openId,
      unionid: unionId,
      createdAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isMember: 0,
      memberExpireAt: null
    };

    if (storage.isMySQL()) {
      await storage.query(
        `INSERT INTO users (id, openid, unionid, created_at, last_login_at, updated_at, is_member)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newUser.id, newUser.openId, newUser.unionid, newUser.createdAt, newUser.lastLoginAt, newUser.updatedAt, newUser.isMember]
      );
      user = { id: newUser.id, openId: newUser.openId };
    } else {
      storage.saveToStore(USERS_STORE, newUser);
      user = newUser;
    }
    console.log('创建新用户:', user.id);
  } else {
    // 更新最后登录时间
    const updatedAt = now.toISOString();
    if (storage.isMySQL()) {
      await storage.query(
        `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`,
        [updatedAt, updatedAt, user.id]
      );
      user.lastLoginAt = updatedAt;
    } else {
      storage.updateInStore(USERS_STORE, user.id, { lastLoginAt: updatedAt, updatedAt });
      user.lastLoginAt = updatedAt;
      user.updatedAt = updatedAt;
    }
  }

  // 生成Token
  const accessToken = generateToken(user.id);

  return {
    accessToken,
    user: {
      id: user.id,
      isNewUser
    },
    expiresIn: 604800
  };
}

/**
 * 手机号登录
 * 验证码校验：支持微信云托管手机号快速验证 + 短信验证码模式
 */
async function phoneLogin(phone, code) {
  if (!code) {
    throw new Error('验证码不能为空');
  }

  // 验证码校验逻辑
  const isVerified = await verifyPhoneCode(phone, code);
  if (!isVerified) {
    throw new Error('验证码错误或已过期');
  }

  let user = await findUserByPhone(phone);
  const now = new Date();

  if (!user) {
    const newUser = {
      id: uuidv4(),
      phone,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isMember: 0
    };

    if (storage.isMySQL()) {
      await storage.query(
        `INSERT INTO users (id, phone, created_at, updated_at, is_member) VALUES (?, ?, ?, ?, ?)`,
        [newUser.id, phone, newUser.createdAt, newUser.updatedAt, newUser.isMember]
      );
      user = { id: newUser.id, phone };
    } else {
      storage.saveToStore(USERS_STORE, newUser);
      user = newUser;
    }
  }

  const accessToken = generateToken(user.id);

  return {
    accessToken,
    user: {
      id: user.id,
      phone: user.phone || phone
    },
    expiresIn: 604800
  };
}

/**
 * 刷新Token
 */
async function refreshToken(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const accessToken = generateToken(userId);

  return {
    accessToken,
    expiresIn: 604800
  };
}

/**
 * 根据openid查找用户
 */
async function findUserByOpenId(openId) {
  if (storage.isMySQL()) {
    const rows = await storage.query(`SELECT * FROM users WHERE openid = ?`, [openId]);
    return rows.length > 0 ? rows[0] : null;
  }
  const results = storage.findInStore(USERS_STORE, u => u.openId === openId);
  return results.length > 0 ? results[0] : null;
}

/**
 * 根据ID查找用户
 */
async function findUserById(userId) {
  if (storage.isMySQL()) {
    const rows = await storage.query(`SELECT * FROM users WHERE id = ?`, [userId]);
    return rows.length > 0 ? rows[0] : null;
  }
  return storage.findById(USERS_STORE, userId);
}

/**
 * 根据手机号查找用户
 */
async function findUserByPhone(phone) {
  if (storage.isMySQL()) {
    const rows = await storage.query(`SELECT * FROM users WHERE phone = ?`, [phone]);
    return rows.length > 0 ? rows[0] : null;
  }
  const results = storage.findInStore(USERS_STORE, u => u.phone === phone);
  return results.length > 0 ? results[0] : null;
}

/**
 * 验证手机验证码
 * 支持两种模式：
 * 1. 微信小程序 getPhoneNumber 获取的 code（cloudID 模式）
 * 2. 短信验证码模式（通过 SMS 服务发送）
 */
async function verifyPhoneCode(phone, code) {
  // 微信 getPhoneNumber 模式：code 以 "wx_phone_" 为前缀
  if (code.startsWith('wx_phone_')) {
    console.warn('[Auth] 微信手机号验证码模式，生产环境需对接cloudID解密');
    return true;
  }

  // 短信验证码模式：从存储中校验
  const verification = phoneCodeStore.get(phone);
  if (!verification) {
    return false;
  }

  // 检查是否过期（5分钟有效期）
  const now = Date.now();
  if (now - verification.createdAt > 5 * 60 * 1000) {
    phoneCodeStore.delete(phone);
    return false;
  }

  // 校验验证码
  if (verification.code !== code) {
    verification.attempts = (verification.attempts || 0) + 1;
    if (verification.attempts >= 5) {
      phoneCodeStore.delete(phone);
    }
    return false;
  }

  // 验证成功，清除验证码
  phoneCodeStore.delete(phone);
  return true;
}

/**
 * 发送手机验证码（短信模式）
 * 生产环境需对接短信服务（腾讯云SMS等）
 */
async function sendPhoneCode(phone) {
  // 简单的频率限制
  const existing = phoneCodeStore.get(phone);
  if (existing && Date.now() - existing.createdAt < PHONE_CODE_RATE_LIMIT_MS) {
    throw new Error('发送过于频繁，请1分钟后重试');
  }

  // 生成6位随机验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));
  phoneCodeStore.set(phone, { code, createdAt: Date.now(), attempts: 0 });

  // TODO: 对接短信服务发送验证码
  console.log(`[Auth] 验证码已生成: ${phone} -> ${code}（生产环境需对接短信服务）`);

  return { success: true, message: '验证码已发送' };
}

/**
 * 内存存储验证码（生产环境应使用Redis）
 */
const phoneCodeStore = new Map();

module.exports = {
  wxLogin,
  phoneLogin,
  refreshToken,
  sendPhoneCode
};
};
