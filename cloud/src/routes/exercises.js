/**
 * 动作路由
 * 提供标准动作库数据
 * 数据来源：统一数据源 cloud/src/data/exercises.js
 */

const express = require('express');
const router = express.Router();
const { EXERCISES } = require('../data/exercises');

/**
 * 获取动作库
 */
router.get('/', async (req, res, next) => {
  try {
    const { muscle_group, keyword } = req.query;

    let results = EXERCISES;

    if (muscle_group) {
      results = results.filter(ex => ex.muscle_group === muscle_group);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      results = results.filter(ex =>
        ex.name.toLowerCase().includes(kw) ||
        (ex.name_en && ex.name_en.toLowerCase().includes(kw))
      );
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取替代动作
 */
router.get('/:id/alternatives', async (req, res, next) => {
  try {
    const exercise = EXERCISES.find(ex => ex.id === req.params.id);
    if (!exercise) {
      return res.status(404).json({ success: false, error: '动作不存在' });
    }

    const alternatives = (exercise.alternatives || [])
      .map(altId => EXERCISES.find(ex => ex.id === altId))
      .filter(Boolean);

    res.json({ success: true, data: alternatives });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取单个动作详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const exercise = EXERCISES.find(ex => ex.id === req.params.id);
    if (!exercise) {
      return res.status(404).json({ success: false, error: '动作不存在' });
    }
    res.json({ success: true, data: exercise });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
