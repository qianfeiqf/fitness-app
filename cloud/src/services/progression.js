/**
 * 演进逻辑服务
 * 实现训练计划的自动演进判定树
 * 通过 storage 策略层统一 MySQL / 内存存储
 */

const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');

const PROGRESSION_STORE = 'progressions';
const FAILURE_STORE = 'failure_counts';

/**
 * 获取用户体重
 * 优先从数据库读取，若无则使用默认值
 */
async function getUserBodyWeight(userId) {
  const defaultBodyWeight = 70;

  if (storage.isMySQL()) {
    try {
      const rows = await storage.query(`SELECT weight FROM users WHERE id = ?`, [userId]);
      if (rows.length > 0 && rows[0].weight && rows[0].weight > 0) {
        return rows[0].weight;
      }
    } catch (err) {
      console.warn('[Progression] 获取用户体重失败:', err.message);
    }
  }

  return defaultBodyWeight;
}

/**
 * 从 plan_exercises 表读取动作的训练配置
 * 如果找不到配置，使用 completedSets 中的数据作为兜底
 */
async function getPlanConfig(exerciseId, userId, completedSets) {
  const fallback = {
    initial_weight: completedSets[0].actual_weight,
    target_weight: completedSets[0].target_weight,
    target_reps: completedSets[0].target_reps,
    increment_step: 2.5,
    decrement_rate: 0.1
  };

  if (storage.isMySQL()) {
    try {
      const rows = await storage.query(
        `SELECT pe.increment_step, pe.decrement_rate, pe.target_sets, pe.target_reps, pe.initial_weight
         FROM plan_exercises pe
         JOIN plans p ON pe.plan_id = p.id
         WHERE pe.exercise_id = ? AND p.user_id = ? AND p.status = 'active'
         ORDER BY pe.created_at DESC LIMIT 1`,
        [exerciseId, userId]
      );
      if (rows.length > 0) {
        const row = rows[0];
        return {
          initial_weight: completedSets[0].actual_weight,
          target_weight: completedSets[0].target_weight || parseFloat(row.initial_weight) || 0,
          target_reps: completedSets[0].target_reps || row.target_reps || 5,
          increment_step: parseFloat(row.increment_step) || 2.5,
          decrement_rate: parseFloat(row.decrement_rate) || 0.1
        };
      }
    } catch (err) {
      console.warn('[Progression] 读取plan_exercises配置失败:', err.message);
    }
  }

  return fallback;
}

/**
 * 计算训练演进
 * @param {string} sessionId - 会话ID
 * @param {string} userId - 用户ID
 * @param {Array} sessionSets - session_sets 记录数组（由调用方传入，避免循环依赖）
 */
async function calculateProgression(sessionId, userId, sessionSets) {
  console.log('计算演进, sessionId:', sessionId);

  const setsByExercise = {};
  for (const set of (sessionSets || [])) {
    if (set.session_id === sessionId && set.status === 'completed') {
      if (!setsByExercise[set.exercise_id]) setsByExercise[set.exercise_id] = [];
      setsByExercise[set.exercise_id].push(set);
    }
  }

  const results = [];
  for (const [exerciseId, completedSets] of Object.entries(setsByExercise)) {
    if (completedSets.length === 0) continue;

    // 从数据库读取该动作的训练计划配置
    const planConfig = await getPlanConfig(exerciseId, userId, completedSets);
    if (!planConfig) continue;

    // 获取用户真实体重用于计算增量步幅
    const bodyWeight = await getUserBodyWeight(userId);
    const result = await calculateExerciseProgression(exerciseId, completedSets, planConfig, bodyWeight, userId);
    if (result) results.push(result);
  }

  return results;
}

/**
 * 计算单个动作的演进
 */
async function calculateExerciseProgression(exerciseId, completedSets, planConfig, bodyWeight, userId) {
  const lastSet = completedSets[completedSets.length - 1];
  const bestSet = findBestSet(completedSets);

  const targetVolume = planConfig.target_weight * planConfig.target_reps;
  const actualVolume = bestSet.actual_weight * bestSet.actual_reps;
  const isTargetAchieved = actualVolume >= targetVolume;

  const consecutiveFailures = await getFailureCount(exerciseId, userId);

  let progressionType = null;
  let newWeight = planConfig.initial_weight;
  let reason = '';

  if (isTargetAchieved) {
    progressionType = 'progression';
    const incrementStep = getIncrementStep(planConfig, bodyWeight);
    newWeight = lastSet.actual_weight + incrementStep;
    reason = `达成目标，重量增加${incrementStep}kg`;
    await setFailureCount(exerciseId, 0, userId);
  } else if (consecutiveFailures === 0) {
    progressionType = 'stall';
    newWeight = lastSet.actual_weight;
    reason = '首次未达成目标，保持重量';
    await setFailureCount(exerciseId, 1, userId);
  } else {
    progressionType = 'deload';
    const decrementRate = planConfig.decrement_rate || 0.1;
    newWeight = lastSet.actual_weight * (1 - decrementRate);
    reason = `连续${consecutiveFailures + 1}次未达成，触发Deload`;
    await setFailureCount(exerciseId, consecutiveFailures + 1, userId);
  }

  if (newWeight / bodyWeight >= 1.4 && planConfig.increment_step >= 2.5) {
    reason += '（建议降低递增步幅至1.25kg）';
  }

  const record = {
    id: 'prog_' + uuidv4(),
    exercise_id: exerciseId,
    session_id: completedSets[0]?.session_id,
    user_id: userId,
    progression_type: progressionType,
    previous_weight: lastSet.actual_weight,
    new_weight: newWeight,
    increment: newWeight - lastSet.actual_weight,
    reason,
    created_at: new Date().toISOString()
  };

  if (storage.isMySQL()) {
    await storage.query(
      `INSERT INTO progressions (id, user_id, exercise_id, session_id, progression_type, previous_weight, new_weight, increment, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.user_id, record.exercise_id, record.session_id, record.progression_type, record.previous_weight, record.new_weight, record.increment, record.reason, record.created_at]
    );
  } else {
    storage.saveToStore(PROGRESSION_STORE, record);
  }

  return record;
}

function findBestSet(sets) {
  return sets.reduce((best, current) => {
    const currentVolume = current.actual_weight * current.actual_reps;
    const bestVolume = best.actual_weight * best.actual_reps;
    return currentVolume > bestVolume ? current : best;
  }, sets[0]);
}

function getIncrementStep(planConfig, bodyWeight) {
  let step = planConfig.increment_step || 2.5;
  if (planConfig.initial_weight / bodyWeight >= 1.4) step = 1.25;
  return step;
}

async function getFailureCount(exerciseId, userId) {
  if (storage.isMySQL()) {
    const rows = await storage.query(`SELECT consecutive_failures FROM failure_counts WHERE exercise_id = ? AND user_id = ?`, [exerciseId, userId]);
    return rows.length > 0 ? rows[0].consecutive_failures : 0;
  }
  const key = `${userId}_${exerciseId}`;
  return storage.getStore(FAILURE_STORE).get(key) || 0;
}

async function setFailureCount(exerciseId, count, userId) {
  const key = `${userId}_${exerciseId}`;
  if (storage.isMySQL()) {
    await storage.query(
      `INSERT INTO failure_counts (exercise_id, user_id, consecutive_failures, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE consecutive_failures = VALUES(consecutive_failures), updated_at = VALUES(updated_at)`,
      [exerciseId, userId, count, new Date().toISOString()]
    );
  } else {
    storage.getStore(FAILURE_STORE).set(key, count);
  }
}

async function getProgressionHistory(exerciseId, userId, limit = 20) {
  if (storage.isMySQL()) {
    const rows = await storage.query(
      `SELECT * FROM progressions WHERE exercise_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [exerciseId, userId, limit]
    );
    return rows;
  }
  return storage.findInStore(PROGRESSION_STORE,
    p => p.exercise_id === exerciseId && p.user_id === userId,
    { sortBy: 'created_at', order: 'desc', limit }
  );
}

module.exports = {
  calculateProgression,
  calculateExerciseProgression,
  getProgressionHistory
};
