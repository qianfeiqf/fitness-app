/**
 * 健身训练计划小程序 - 云托管后端入口
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const planRoutes = require('./routes/plans');
const exerciseRoutes = require('./routes/exercises');
const sessionRoutes = require('./routes/sessions');
const statsRoutes = require('./routes/stats');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化 MySQL 数据库（如果已配置）
let db;
try {
  db = require('./db/mysql');
  db.initSchema().catch(err => {
    console.warn('[启动] MySQL初始化警告:', err.message);
  });
} catch (err) {
  console.warn('[启动] MySQL模块加载失败:', err.message);
}

// 中间件
app.use(helmet());

// CORS 配置 - 仅允许微信小程序和指定域名
const corsOptions = {
  origin: function (origin, callback) {
    // 允许无 origin 的请求（小程序端请求、Postman等）
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://servicewechat.com',        // 微信小程序
      'https://mp.weixin.qq.com',         // 微信公众号
      process.env.CORS_ALLOW_ORIGIN       // 环境变量配置的额外域名
    ].filter(Boolean);

    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn('[CORS] 拒绝来源:', origin);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/exercises', exerciseRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/sync', syncRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理（放在错误处理之前）
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// 错误处理（4参数中间件，仅在有next(err)时触发）
const isDev = process.env.NODE_ENV !== 'production';
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.status || 500;
  // 生产环境不暴露内部错误详情
  const message = isDev
    ? (err.message || 'Internal server error')
    : (statusCode < 500 ? err.message : '服务器内部错误');
  res.status(statusCode).json({
    success: false,
    error: message
  });
});

// 启动服务器（微信云托管会调用）
module.exports = app;

// 本地开发时启动
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
