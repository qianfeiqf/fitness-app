/**
 * 训练会话路由
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const sessionService = require('../services/session');

// 所有路由需要认证
router.use(verifyToken);

// 创建训练会话
router.post('/', async (req, res, next) => {
  try {
    const { plan_id, scheduled_date } = req.body;

    if (scheduled_date && !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
      return res.status(400).json({ success: false, error: '日期格式应为 YYYY-MM-DD' });
    }

    const session = await sessionService.createSession(req.user.userId, {
      plan_id,
      scheduled_date
    });

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// 获取会话列表
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const validStatuses = ['not_started', 'in_progress', 'paused', 'completed', 'aborted'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '无效的会话状态' });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    const sessions = await sessionService.getSessions(req.user.userId, {
      status,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({ success: true, data: sessions });
  } catch (err) {
    next(err);
  }
});

// 获取会话详情
router.get('/:id', async (req, res, next) => {
  try {
    const session = await sessionService.getSession(req.user.userId, req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: '会话不存在' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// 更新会话
router.patch('/:id', async (req, res, next) => {
  try {
    const validStatuses = ['not_started', 'in_progress', 'paused', 'completed', 'aborted'];
    const { status } = req.body;

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '无效的会话状态' });
    }

    // 只允许更新白名单字段
    const allowedFields = ['status', 'aborted_at', 'total_duration_seconds'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const session = await sessionService.updateSession(
      req.user.userId,
      req.params.id,
      updates
    );

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// 完成会话
router.post('/:id/complete', async (req, res, next) => {
  try {
    const result = await sessionService.completeSession(
      req.user.userId,
      req.params.id
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// 放弃会话
router.post('/:id/abort', async (req, res, next) => {
  try {
    const session = await sessionService.abortSession(
      req.user.userId,
      req.params.id
    );

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// 添加完成组记录
router.post('/:id/sets', async (req, res, next) => {
  try {
    const { exercise_id, set_number, actual_weight, actual_reps } = req.body;

    if (!exercise_id) {
      return res.status(400).json({ success: false, error: '缺少动作ID' });
    }
    if (set_number === undefined || set_number < 1) {
      return res.status(400).json({ success: false, error: '组号必须大于0' });
    }
    if (actual_weight !== undefined && (typeof actual_weight !== 'number' || actual_weight < 0)) {
      return res.status(400).json({ success: false, error: '重量必须是非负数' });
    }
    if (actual_reps !== undefined && (typeof actual_reps !== 'number' || actual_reps < 0)) {
      return res.status(400).json({ success: false, error: '次数必须是非负数' });
    }
    if (req.body.rpe !== undefined && (req.body.rpe < 1 || req.body.rpe > 10)) {
      return res.status(400).json({ success: false, error: 'RPE必须在1-10之间' });
    }

    const set = await sessionService.addSet(
      req.user.userId,
      req.params.id,
      req.body
    );

    res.json({ success: true, data: set });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
