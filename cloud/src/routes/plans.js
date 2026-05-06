/**
 * 计划路由
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const planService = require('../services/plan');

// 获取计划列表
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const plans = await planService.getPlans(req.user.userId);
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

// 获取系统模板计划
router.get('/templates', async (req, res, next) => {
  try {
    const templates = await planService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

// 创建计划
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name, description, cycle_type } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: '计划名称不能为空' });
    }
    if (name.length > 128) {
      return res.status(400).json({ success: false, error: '计划名称不能超过128个字符' });
    }
    const validCycleTypes = ['natural_week', 'rolling'];
    if (cycle_type && !validCycleTypes.includes(cycle_type)) {
      return res.status(400).json({ success: false, error: '无效的周期类型' });
    }

    const plan = await planService.createPlan(req.user.userId, {
      name: name.trim(),
      description: description || null,
      cycle_type: cycle_type || 'natural_week'
    });
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// 获取计划详情
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const plan = await planService.getPlan(req.user.userId, req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: '计划不存在' });
    }
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// 更新计划
router.patch('/:id', verifyToken, async (req, res, next) => {
  try {
    const { name, description, cycle_type, status } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ success: false, error: '计划名称不能为空' });
    }
    const validStatuses = ['draft', 'active', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '无效的计划状态' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (cycle_type !== undefined) updates.cycle_type = cycle_type;
    if (status !== undefined) updates.status = status;

    const plan = await planService.updatePlan(req.user.userId, req.params.id, updates);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// 激活计划
router.post('/:id/activate', verifyToken, async (req, res, next) => {
  try {
    const plan = await planService.activatePlan(req.user.userId, req.params.id);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// 克隆模板计划
router.post('/clone/:templateId', verifyToken, async (req, res, next) => {
  try {
    const plan = await planService.cloneFromTemplate(req.user.userId, req.params.templateId);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
