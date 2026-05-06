/**
 * 认证中间件
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 验证Token
 */
function verifyToken(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      error: '服务器未配置 JWT_SECRET 环境变量'
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: '未提供认证Token'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Token格式错误'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token已过期'
      });
    }
    return res.status(401).json({
      success: false,
      error: '无效的Token'
    });
  }
}

/**
 * 生成Token
 */
function generateToken(userId) {
  if (!JWT_SECRET) {
    throw new Error('服务器未配置 JWT_SECRET 环境变量，请在云托管环境变量中设置');
  }
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_JWT }
  );
}

module.exports = {
  verifyToken,
  generateToken
};
};
