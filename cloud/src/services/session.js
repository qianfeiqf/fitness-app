/**
 * 训练会话服务
 * 通过 storage 策略层统一 MySQL / 内存存储
 */

const { v4: uuidv4 } = require('uuid');
const rmService = require('./rm');
const storage = require('./storage');

const SESSIONS_STORE = 'sessions';
const SESSION_SETS_STORE = 'session_sets';

/**
 * 创建会话
 */
async function createSession(userId, { plan_id, scheduled_date }) {
  const session = {
    id: 'sess_' + uuidv4(),
    user_id: userId,
    plan_id: plan_id || null,
    scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
    status: 'not_started',
    started_at: null,
    completed_at: null,
    paused_at: null,
    aborted_at: null,
    total_duration_seconds: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (storage.isMySQL()) {
    await storage.query(
      `INSERT INTO sessions (id, user_id, plan_id, scheduled_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.user_id, session.plan_id, session.scheduled_date, session.status, session.created_at, session.updated_at]
    );
  } else {
    storage.saveToStore(SESSIONS_STORE, session);
  }
  return session;
}

/**
 * 获取会话列表
 */
async function getSessions(userId, { status, limit = 20, offset = 0 }) {
  if (storage.isMySQL()) {
    let sql = `SELECT * FROM sessions WHERE user_id = ?`;
    const params = [userId];
    if (status) { sql += ` AND status = ?`; params.push(status); }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    return await storage.query(sql, params);
  }
  return storage.findInStore(SESSIONS_STORE,
    s => s.user_id === userId && (!status || s.status === status),
    { sortBy: 'created_at', order: 'desc', limit, offset }
  );
}

/**
 * 获取会话详情
 */
async function getSession(userId, sessionId) {
  let session;
  let sets = [];

  if (storage.isMySQL()) {
    const rows = await storage.query(`SELECT * FROM sessions WHERE id = ? AND user_id = ?`, [sessionId, userId]);
    if (rows.length === 0) return null;
    session = rows[0];
    const setRows = await storage.query(`SELECT * FROM session_sets WHERE session_id = ? ORDER BY set_number`, [sessionId]);
    sets = setRows;
  } else {
    session = storage.findById(SESSIONS_STORE, sessionId);
    if (!session || session.user_id !== userId) return null;
    sets = storage.findInStore(SESSION_SETS_STORE,
      s => s.session_id === sessionId,
      { sortBy: 'set_number', order: 'asc' }
    );
  }

  return { ...session, sets };
}

/**
 * 更新会话
 */
async function updateSession(userId, sessionId, updates) {
  const existing = await getSession(userId, sessionId);
  if (!existing) throw new Error('会话不存在');

  const updatedAt = new Date().toISOString();
  let statusChange = {};

  if (updates.status === 'in_progress' && existing.status === 'not_started') {
    statusChange.started_at = updatedAt;
  }
  if (updates.status === 'paused' && existing.status === 'in_progress') {
    statusChange.paused_at = updatedAt;
  }

  if (storage.isMySQL()) {
    await storage.query(
      `UPDATE sessions SET status = ?, updated_at = ?, started_at = COALESCE(?, started_at), paused_at = COALESCE(?, paused_at), aborted_at = COALESCE(?, aborted_at), total_duration_seconds = ? WHERE id = ?`,
      [updates.status || existing.status, updatedAt, statusChange.started_at, statusChange.paused_at, updates.aborted_at, updates.total_duration_seconds, sessionId]
    );
  } else {
    storage.updateInStore(SESSIONS_STORE, sessionId, { ...updates, ...statusChange, updated_at: updatedAt });
  }

  return getSession(userId, sessionId);
}

/**
 * 完成会话
 */
async function completeSession(userId, sessionId) {
  const session = await getSession(userId, sessionId);
  if (!session) throw new Error('会话不存在');

  const completedAt = new Date().toISOString();
  let totalDuration = null;
  if (session.started_at) {
    totalDuration = Math.floor((new Date(completedAt) - new Date(session.started_at)) / 1000);
  }

  if (storage.isMySQL()) {
    await storage.query(
      `UPDATE sessions SET status = 'completed', completed_at = ?, updated_at = ?, total_duration_seconds = ? WHERE id = ?`,
      [completedAt, completedAt, totalDuration, sessionId]
    );
  } else {
    storage.updateInStore(SESSIONS_STORE, sessionId, {
      status: 'completed',
      completed_at: completedAt,
      total_duration_seconds: totalDuration
    });
  }

  // 直接使用 getSession 返回的 sets，避免重复查询 session_sets
  const sessionSetsData = session.sets || [];

  // 延迟 require 避免循环依赖
  const progressionService = require('./progression');
  const progressions = await progressionService.calculateProgression(sessionId, userId, sessionSetsData);
  const updatedSession = await getSession(userId, sessionId);
  // 1RM 已在 addSet 时逐一计算并保存，这里只收集本次会话的 PR 记录
  const prs = collectSessionPRs(updatedSession);

  return { session: updatedSession, progressions, prs };
}

/**
 * 放弃会话
 */
async function abortSession(userId, sessionId) {
  const existing = await getSession(userId, sessionId);
  if (!existing) throw new Error('会话不存在');

  const abortedAt = new Date().toISOString();
  if (storage.isMySQL()) {
    await storage.query(`UPDATE sessions SET status = 'aborted', aborted_at = ?, updated_at = ? WHERE id = ?`, [abortedAt, abortedAt, sessionId]);
  } else {
    storage.updateInStore(SESSIONS_STORE, sessionId, { status: 'aborted', aborted_at: abortedAt });
  }
  return getSession(userId, sessionId);
}

/**
 * 添加完成组记录
 */
async function addSet(userId, sessionId, setData) {
  const session = await getSession(userId, sessionId);
  if (!session) throw new Error('会话不存在');

  const set = {
    id: 'set_' + uuidv4(),
    session_id: sessionId,
    exercise_id: setData.exercise_id,
    exercise_name: setData.exercise_name || '',
    set_number: setData.set_number,
    target_weight: setData.target_weight,
    actual_weight: setData.actual_weight,
    target_reps: setData.target_reps,
    actual_reps: setData.actual_reps,
    rpe: setData.rpe,
    is_alternative: setData.is_alternative || false,
    alternative_of: setData.alternative_of || null,
    status: 'completed',
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  if (storage.isMySQL()) {
    await storage.query(
      `INSERT INTO session_sets (id, session_id, exercise_id, exercise_name, set_number, target_weight, actual_weight, target_reps, actual_reps, rpe, is_alternative, alternative_of, status, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [set.id, set.session_id, set.exercise_id, set.exercise_name, set.set_number, set.target_weight, set.actual_weight, set.target_reps, set.actual_reps, set.rpe, set.is_alternative ? 1 : 0, set.alternative_of, set.status, set.completed_at, set.created_at]
    );
  } else {
    storage.saveToStore(SESSION_SETS_STORE, set);
  }

  // 更新会话状态为进行中
  if (session.status === 'not_started') {
    await updateSession(userId, sessionId, { status: 'in_progress' });
  }

  // 计算1RM
  let rmResult = null;
  if (set.actual_reps >= 1 && set.actual_reps <= 10) {
    rmResult = await rmService.calculateAndSave1RM(
      userId,
      set.exercise_id,
      set.actual_weight,
      set.actual_reps,
      set.rpe,
      sessionId
    );
  }

  return { ...set, rm_result: rmResult };
}

/**
 * 收集会话中的PR记录（仅读取 addSet 时已保存的结果，不重复计算1RM）
 */
function collectSessionPRs(session) {
  const prs = [];
  if (!session.sets || session.sets.length === 0) return prs;

  const setsByExercise = {};
  session.sets.forEach(set => {
    if (!setsByExercise[set.exercise_id]) setsByExercise[set.exercise_id] = [];
    setsByExercise[set.exercise_id].push(set);
  });

  for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
    // 查询该动作本次会话的最佳组（1RM已在addSet中计算并保存）
    const bestSet = sets.reduce((best, current) => {
      const currentVolume = current.actual_weight * current.actual_reps;
      const bestVolume = best.actual_weight * best.actual_reps;
      return currentVolume > bestVolume ? current : best;
    }, sets[0]);

    prs.push({
      type: '1RM',
      exercise_id: exerciseId,
      exercise_name: bestSet.exercise_name,
      best_weight: bestSet.actual_weight,
      best_reps: bestSet.actual_reps
    });
  }
  return prs;
}

module.exports = {
  createSession,
  getSessions,
  getSession,
  updateSession,
  completeSession,
  abortSession,
  addSet,
  getSessionsMap: () => storage.getStore(SESSIONS_STORE),
  getSessionSetsMap: () => storage.getStore(SESSION_SETS_STORE)
};
