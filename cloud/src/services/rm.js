/**
 * 1RM 计算服务
 * 通过 storage 策略层统一 MySQL / 内存存储
 */

const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');

const STORE_NAME = 'rm_history';

/**
 * 计算 1RM（Epley公式）
 */
function calculate1RM(weight, reps) {
  if (weight <= 0 || reps <= 0) {
    return { estimated1RM: 0, isQualified: false, reason: '无效的重量或次数' };
  }
  if (reps === 1) {
    return { estimated1RM: weight, isQualified: true, formula: 'direct', reason: '单次直接作为1RM' };
  }
  if (reps > 10) {
    return { estimated1RM: null, isQualified: false, reason: '次数超过10次，不计入1RM统计' };
  }
  const estimated1RM = weight * (1 + reps / 30);
  return {
    estimated1RM: Math.round(estimated1RM * 10) / 10,
    isQualified: true,
    formula: 'epley',
    reps,
    weight
  };
}

/**
 * 计算并保存 1RM
 */
async function calculateAndSave1RM(userId, exerciseId, weight, reps, rpe, sessionId) {
  const result = calculate1RM(weight, reps);
  if (!result.isQualified) return { ...result, saved: false };

  const currentBest = await getBest1RM(userId, exerciseId);
  const isNewPR = result.estimated1RM > (currentBest || 0);

  const record = {
    id: 'rm_' + uuidv4(),
    user_id: userId,
    exercise_id: exerciseId,
    estimated_1rm: result.estimated1RM,
    based_weight: weight,
    based_reps: reps,
    rpe,
    session_id: sessionId,
    is_new_pr: isNewPR ? 1 : 0,
    recorded_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  if (db && db.getPool) {
    await db.query(
      `INSERT INTO rm_history (id, user_id, exercise_id, estimated_1rm, based_weight, based_reps, rpe, session_id, is_new_pr, recorded_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.user_id, record.exercise_id, record.estimated_1rm, record.based_weight, record.based_reps, record.rpe, record.session_id, record.is_new_pr, record.recorded_at, record.created_at]
    );
  } else {
    rmHistory.set(record.id, record);
  }

  return { ...result, saved: true, isNewPR, previousBest: currentBest };
}

/**
 * 获取动作的最佳1RM
 */
async function getBest1RM(userId, exerciseId) {
  if (db && db.getPool) {
    const rows = await db.query(
      `SELECT MAX(estimated_1rm) as best FROM rm_history WHERE user_id = ? AND exercise_id = ?`,
      [userId, exerciseId]
    );
    return rows.length > 0 && rows[0].best ? parseFloat(rows[0].best) : null;
  }
  let best = null;
  for (const record of rmHistory.values()) {
    if (record.user_id === userId && record.exercise_id === exerciseId) {
      if (!best || record.estimated_1rm > best) best = record.estimated_1rm;
    }
  }
  return best;
}

/**
 * 获取1RM历史
 */
async function getRMHistory(userId, exerciseId, limit = 30) {
  if (storage.isMySQL()) {
    const rows = await storage.query(
      `SELECT * FROM rm_history WHERE user_id = ? AND exercise_id = ? ORDER BY recorded_at DESC LIMIT ?`,
      [userId, exerciseId, parseInt(limit, 10)]
    );
    return rows.map(row => ({
      id: row.id,
      exercise_id: row.exercise_id,
      estimated_1rm: parseFloat(row.estimated_1rm),
      based_weight: parseFloat(row.based_weight),
      based_reps: row.based_reps,
      rpe: row.rpe,
      is_new_pr: !!row.is_new_pr,
      recorded_at: row.recorded_at
    }));
  }
  return storage.findInStore(STORE_NAME,
    r => r.user_id === userId && r.exercise_id === exerciseId,
    { sortBy: 'recorded_at', order: 'desc', limit }
  );
}

/**
 * 获取最新1RM
 */
async function getLatestRM(userId, exerciseId) {
  const history = await getRMHistory(userId, exerciseId, 1);
  return history.length > 0 ? history[0] : null;
}

module.exports = {
  calculate1RM,
  calculateAndSave1RM,
  getBest1RM,
  getRMHistory,
  getLatestRM
};
