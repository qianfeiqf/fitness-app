/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const { verifyToken } = require('../middleware/auth');

// 微信登录
router.post('/wx-login', async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '缺少code参数'
      });
    }

    const result = await authService.wxLogin(code);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// 手机号登录
router.post('/phone-login', async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '缺少手机号'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '缺少验证码'
      });
    }

    const result = await authService.phoneLogin(phone, code);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// 发送手机验证码
router.post('/send-phone-code', async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '缺少手机号'
      });
    }

    // 简单的手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: '手机号格式不正确'
      });
    }

    const result = await authService.sendPhoneCode(phone);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// 刷新Token
router.post('/refresh-token', verifyToken, async (req, res, next) => {
  try {
    const result = await authService.refreshToken(req.user.userId);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// 登出
router.post('/logout', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

module.exports = router;
