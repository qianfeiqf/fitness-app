/**
 * 统计路由
 * 提供训练统计数据
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const storage = require('../services/storage');

const BIG_THREE_EXERCISES = [
  { exercise_id: 'ex_001', exerciseName: '卧推', muscleGroup: '胸部' },
  { exercise_id: 'ex_020', exerciseName: '深蹲', muscleGroup: '下肢' },
  { exercise_id: 'ex_030', exerciseName: '硬拉', muscleGroup: '硬拉' }
];

/**
 * 完整动作库映射（exercise_id -> { name, muscleGroup }）
 * 用于容量统计时按肌群和动作分类
 */
const EXERCISE_MAP = {
  'ex_001': { name: '杠铃卧推', muscleGroup: '胸部' },
  'ex_002': { name: '哑铃卧推', muscleGroup: '胸部' },
  'ex_003': { name: '机械卧推', muscleGroup: '胸部' },
  'ex_004': { name: '俯卧撑', muscleGroup: '胸部' },
  'ex_005': { name: '上斜杠铃卧推', muscleGroup: '胸部' },
  'ex_006': { name: '上斜哑铃卧推', muscleGroup: '胸部' },
  'ex_007': { name: '双杠臂屈伸', muscleGroup: '胸部' },
  'ex_008': { name: '绳索飞鸟', muscleGroup: '胸部' },
  'ex_009': { name: '哑铃飞鸟', muscleGroup: '胸部' },
  'ex_010': { name: '杠铃划船', muscleGroup: '背部' },
  'ex_011': { name: '哑铃划船', muscleGroup: '背部' },
  'ex_012': { name: '坐姿划船', muscleGroup: '背部' },
  'ex_013': { name: '引体向上', muscleGroup: '背部' },
  'ex_014': { name: '高位下拉', muscleGroup: '背部' },
  'ex_015': { name: 'T杆划船', muscleGroup: '背部' },
  'ex_016': { name: '直臂下压', muscleGroup: '背部' },
  'ex_020': { name: '杠铃深蹲', muscleGroup: '下肢' },
  'ex_021': { name: '腿举', muscleGroup: '下肢' },
  'ex_022': { name: '前蹲', muscleGroup: '下肢' },
  'ex_023': { name: '保加利亚分腿蹲', muscleGroup: '下肢' },
  'ex_024': { name: '腿弯举', muscleGroup: '下肢' },
  'ex_025': { name: '腿伸展', muscleGroup: '下肢' },
  'ex_026': { name: '罗马尼亚硬拉', muscleGroup: '下肢' },
  'ex_027': { name: '臀推', muscleGroup: '下肢' },
  'ex_028': { name: '腿举(哈克机)', muscleGroup: '下肢' },
  'ex_029': { name: '行走箭步蹲', muscleGroup: '下肢' },
  'ex_030': { name: '传统硬拉', muscleGroup: '硬拉' },
  'ex_031': { name: '相扑硬拉', muscleGroup: '硬拉' },
  'ex_032': { name: '直腿硬拉', muscleGroup: '硬拉' },
  'ex_040': { name: '杠铃推举', muscleGroup: '肩部' },
  'ex_041': { name: '哑铃推举', muscleGroup: '肩部' },
  'ex_042': { name: '侧平举', muscleGroup: '肩部' },
  'ex_043': { name: '前平举', muscleGroup: '肩部' },
  'ex_044': { name: '面拉', muscleGroup: '肩部' },
  'ex_045': { name: '阿诺德推举', muscleGroup: '肩部' },
  'ex_046': { name: '俯身侧平举', muscleGroup: '肩部' },
  'ex_050': { name: '杠铃弯举', muscleGroup: '手臂' },
  'ex_051': { name: '哑铃弯举', muscleGroup: '手臂' },
  'ex_052': { name: '锤式弯举', muscleGroup: '手臂' },
  'ex_053': { name: '集中弯举', muscleGroup: '手臂' },
  'ex_054': { name: '绳索下压', muscleGroup: '手臂' },
  'ex_055': { name: '过头臂屈伸', muscleGroup: '手臂' },
  'ex_056': { name: '窄距卧推', muscleGroup: '手臂' },
  'ex_057': { name: '双杠臂屈伸(臂屈伸)', muscleGroup: '手臂' },
  'ex_060': { name: '平板支撑', muscleGroup: '核心' },
  'ex_061': { name: '卷腹', muscleGroup: '核心' },
  'ex_062': { name: '悬垂举腿', muscleGroup: '核心' },
  'ex_063': { name: '俄罗斯转体', muscleGroup: '核心' },
  'ex_064': { name: '死虫式', muscleGroup: '核心' },
  'ex_065': { name: '登山者', muscleGroup: '核心' },
  'ex_066': { name: '农夫行走', muscleGroup: '核心' }
};

/**
 * 获取容量统计
 */
router.get('/capacity', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { period = 'weekly', start_date, end_date } = req.query;

    let startDateStr, endDateStr;
    if (start_date && end_date) {
      startDateStr = new Date(start_date).toISOString().slice(0, 19).replace('T', ' ');
      endDateStr = new Date(end_date).toISOString().slice(0, 19).replace('T', ' ');
    } else {
      const now = new Date();
      endDateStr = now.toISOString().slice(0, 19).replace('T', ' ');
      const start = new Date(now);
      if (period === 'weekly') {
        start.setDate(start.getDate() - 7);
      } else {
        start.setDate(start.getDate() - 30);
      }
      startDateStr = start.toISOString().slice(0, 19).replace('T', ' ');
    }

    let data;
    if (storage.isMySQL()) {
      const rows = await storage.query(
        `SELECT ss.* FROM session_sets ss
         JOIN sessions s ON ss.session_id = s.id
         WHERE s.user_id = ? AND s.completed_at >= ? AND s.completed_at <= ? AND ss.status = 'completed'`,
        [userId, startDateStr, endDateStr]
      );

      let totalVolume = 0;
      const byMuscleGroup = {};
      const byExercise = {};

      for (const set of rows) {
        const volume = (set.actual_weight || 0) * (set.actual_reps || 0);
        totalVolume += volume;

        const exInfo = findExerciseInfo(set.exercise_id);
        if (exInfo) {
          byMuscleGroup[exInfo.muscleGroup] = (byMuscleGroup[exInfo.muscleGroup] || 0) + volume;
          byExercise[set.exercise_id] = byExercise[set.exercise_id] || { name: exInfo.exerciseName, volume: 0 };
          byExercise[set.exercise_id].volume += volume;
        }
      }

      data = {
        period,
        start_date: startDateStr,
        end_date: endDateStr,
        total_volume_kg: Math.round(totalVolume),
        by_muscle_group: byMuscleGroup,
        by_exercise: byExercise
      };
    } else {
      data = {
        period,
        total_volume_kg: 0,
        by_muscle_group: {},
        by_exercise: {},
        trend: []
      };
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取1RM趋势
 */
router.get('/1rm', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { exercise_id } = req.query;

    if (!exercise_id) {
      return res.status(400).json({ success: false, error: 'exercise_id is required' });
    }

    let data;
    if (storage.isMySQL()) {
      const rows = await storage.query(
        `SELECT * FROM rm_history WHERE user_id = ? AND exercise_id = ? ORDER BY recorded_at DESC LIMIT 30`,
        [userId, exercise_id]
      );

      // rows 是 DESC（最新在前），reverse 后变成 ASC（最旧在前），trend 应该是 ASC 顺序
      const trend = rows.map(row => ({
        date: row.recorded_at,
        estimated_1rm: parseFloat(row.estimated_1rm)
      })).reverse();

      // 第一条（索引 0）才是最新的
      const latest = rows.length > 0 ? parseFloat(rows[0].estimated_1rm) : null;

      data = { exercise_id, estimated_1rm: latest, trend };
    } else {
      data = { exercise_id, estimated_1rm: null, trend: [] };
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * 获取三大项概览（合并查询，每个动作仅需1条SQL）
 */
router.get('/big-three', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = [];

    if (storage.isMySQL()) {
      const exerciseIds = BIG_THREE_EXERCISES.map(bt => bt.exercise_id);

      // 用一条查询获取所有三大项的聚合数据
      const rows = await storage.query(
        `SELECT exercise_id,
                MAX(estimated_1rm) as best_1rm,
                (SELECT r2.estimated_1rm FROM rm_history r2
                 WHERE r2.user_id = ? AND r2.exercise_id = rm_history.exercise_id
                 ORDER BY r2.recorded_at DESC LIMIT 1) as latest_1rm
         FROM rm_history
         WHERE user_id = ? AND exercise_id IN (?, ?, ?)
         GROUP BY exercise_id`,
        [userId, userId, ...exerciseIds]
      );

      // 用一条查询获取近5次记录用于趋势计算
      const recentRows = await storage.query(
        `SELECT exercise_id, estimated_1rm, recorded_at FROM (
           SELECT exercise_id, estimated_1rm, recorded_at,
                  ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY recorded_at DESC) as rn
           FROM rm_history WHERE user_id = ? AND exercise_id IN (?, ?, ?)
         ) t WHERE rn <= 5`,
        [userId, ...exerciseIds]
      );

      // 按 exercise_id 分组趋势数据
      const recentByExercise = {};
      for (const r of recentRows) {
        if (!recentByExercise[r.exercise_id]) recentByExercise[r.exercise_id] = [];
        recentByExercise[r.exercise_id].push(r);
      }

      for (const bt of BIG_THREE_EXERCISES) {
        const aggRow = rows.find(r => r.exercise_id === bt.exercise_id);
        const latest1RM = aggRow && aggRow.latest_1rm ? parseFloat(aggRow.latest_1rm) : null;
        const best1RM = aggRow && aggRow.best_1rm ? parseFloat(aggRow.best_1rm) : null;

        let trend = null;
        const recents = recentByExercise[bt.exercise_id] || [];
        if (recents.length >= 2) {
          const recent = parseFloat(recents[0].estimated_1rm);
          const older = parseFloat(recents[recents.length - 1].estimated_1rm);
          if (older > 0) {
            trend = Math.round(((recent - older) / older) * 1000) / 10;
          }
        }

        result.push({
          exerciseId: bt.exercise_id,
          exerciseName: bt.exerciseName,
          muscleGroup: bt.muscleGroup,
          latest1RM,
          best1RM,
          trend
        });
      }
    } else {
      for (const bt of BIG_THREE_EXERCISES) {
        result.push({
          exerciseId: bt.exercise_id,
          exerciseName: bt.exerciseName,
          muscleGroup: bt.muscleGroup,
          latest1RM: null,
          best1RM: null,
          trend: null
        });
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * 根据 exercise_id 查找动作信息
 */
function findExerciseInfo(exerciseId) {
  const info = EXERCISE_MAP[exerciseId];
  if (info) {
    return { exerciseName: info.name, muscleGroup: info.muscleGroup };
  }
  // 兜底：从 BIG_THREE 查找
  for (const bt of BIG_THREE_EXERCISES) {
    if (bt.exercise_id === exerciseId) return bt;
  }
  return null;
}

module.exports = router;
