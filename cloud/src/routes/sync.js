/**
 * 同步路由
 * 处理客户端数据双向同步
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const storage = require('../services/storage');

/**
 * 将时间戳或日期字符串安全转换为 MySQL DATETIME 格式 (YYYY-MM-DD HH:mm:ss)
 */
function toMySQLDateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/**
 * 转换为 MySQL DATE 格式 (YYYY-MM-DD)
 */
function toMySQLDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const dt = toMySQLDateTime(value);
  return dt ? dt.slice(0, 10) : null;
}

/**
 * 推送变更到服务端
 */
router.post('/push', verifyToken, async (req, res, next) => {
  try {
    const { changes } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(changes)) {
      return res.status(400).json({ success: false, error: 'changes 必须是数组' });
    }

    console.log(`[Sync] 收到 ${changes.length} 项变更，用户: ${userId}`);
    const synced = [];
    const conflicts = [];

    for (const change of changes) {
      const { entity_type, entity_id, operation, payload } = change;

      try {
        await applyChange(userId, entity_type, entity_id, operation, payload);
        synced.push(entity_id);
      } catch (err) {
        console.error(`[Sync] 应用变更失败: ${entity_type}/${entity_id}`, err.message);
        conflicts.push({ entity_id, entity_type, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        synced,
        conflicts,
        server_changes: []
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 从服务端拉取变更
 * 注意：mysql2 的 execute() 不支持 ?? 标识符占位符，因此按白名单分别使用固定 SQL
 */
router.get('/pull', verifyToken, async (req, res, next) => {
  try {
    const { since } = req.query;
    const userId = req.user.userId;

    if (!storage.isMySQL()) {
      return res.json({ success: true, data: { changes: [], sync_timestamp: Date.now() } });
    }

    const sinceTs = Math.max(0, parseInt(since || '0', 10) || 0);
    const sinceDate = toMySQLDateTime(sinceTs) || '1970-01-01 00:00:00';
    const changes = [];

    const entityQueries = [
      {
        entityType: 'plans',
        sql: `SELECT * FROM plans WHERE user_id = ? AND COALESCE(updated_at, created_at) > ?`,
        params: [userId, sinceDate]
      },
      {
        entityType: 'plan_exercises',
        sql: `SELECT pe.* FROM plan_exercises pe INNER JOIN plans p ON pe.plan_id = p.id WHERE p.user_id = ? AND COALESCE(pe.updated_at, pe.created_at) > ?`,
        params: [userId, sinceDate]
      },
      {
        entityType: 'sessions',
        sql: `SELECT * FROM sessions WHERE user_id = ? AND COALESCE(updated_at, created_at) > ?`,
        params: [userId, sinceDate]
      },
      {
        entityType: 'session_sets',
        sql: `SELECT ss.* FROM session_sets ss INNER JOIN sessions s ON ss.session_id = s.id WHERE s.user_id = ? AND COALESCE(ss.updated_at, ss.created_at) > ?`,
        params: [userId, sinceDate]
      },
      {
        entityType: 'rm_history',
        sql: `SELECT * FROM rm_history WHERE user_id = ? AND COALESCE(updated_at, created_at) > ?`,
        params: [userId, sinceDate]
      },
      {
        entityType: 'progressions',
        sql: `SELECT * FROM progressions WHERE user_id = ? AND COALESCE(updated_at, created_at) > ?`,
        params: [userId, sinceDate]
      }
    ];

    for (const q of entityQueries) {
      const rows = await storage.query(q.sql, q.params);
      for (const row of rows) {
        const tsSource = row.updated_at || row.created_at;
        changes.push({
          entity_type: q.entityType,
          entity_id: row.id,
          operation: 'upsert',
          payload: row,
          server_updated_at: tsSource ? new Date(tsSource).getTime() : Date.now()
        });
      }
    }

    res.json({
      success: true,
      data: {
        changes,
        sync_timestamp: Date.now()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 应用单条变更到数据库
 */
async function applyChange(userId, entityType, entityId, operation, payload) {
  if (!storage.isMySQL()) return;

  const now = toMySQLDateTime(Date.now());
  const data = payload || {};

  switch (entityType) {
    case 'plans':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO plans (id, user_id, name, description, cycle_type, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = IF(user_id = VALUES(user_id), VALUES(name), name),
             description = IF(user_id = VALUES(user_id), VALUES(description), description),
             cycle_type = IF(user_id = VALUES(user_id), VALUES(cycle_type), cycle_type),
             status = IF(user_id = VALUES(user_id), VALUES(status), status),
             updated_at = IF(user_id = VALUES(user_id), VALUES(updated_at), updated_at)`,
          [
            entityId,
            userId,
            data.name || '未命名计划',
            data.description || null,
            data.cycle_type || 'natural_week',
            data.status || 'draft',
            toMySQLDateTime(data.created_at) || now,
            now
          ]
        );
      } else if (operation === 'delete') {
        await storage.query(`DELETE FROM plans WHERE id = ? AND user_id = ?`, [entityId, userId]);
      }
      break;

    case 'plan_exercises':
      if (operation === 'upsert') {
        // 校验 plan 归属当前用户，防止越权写入
        const ownedPlans = await storage.query(`SELECT id FROM plans WHERE id = ? AND user_id = ?`, [data.plan_id, userId]);
        if (ownedPlans.length === 0) {
          throw new Error('关联的训练计划不存在或无权操作');
        }
        await storage.query(
          `INSERT INTO plan_exercises (id, plan_id, exercise_id, exercise_name, day_of_week, cycle_label, order_index, target_sets, target_reps, initial_weight, increment_step, decrement_rate, rest_seconds, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             exercise_id = VALUES(exercise_id),
             exercise_name = VALUES(exercise_name),
             day_of_week = VALUES(day_of_week),
             cycle_label = VALUES(cycle_label),
             order_index = VALUES(order_index),
             target_sets = VALUES(target_sets),
             target_reps = VALUES(target_reps),
             initial_weight = VALUES(initial_weight),
             increment_step = VALUES(increment_step),
             decrement_rate = VALUES(decrement_rate),
             rest_seconds = VALUES(rest_seconds),
             updated_at = VALUES(updated_at)`,
          [
            entityId,
            data.plan_id,
            data.exercise_id,
            data.exercise_name || null,
            data.day_of_week || 1,
            data.cycle_label || null,
            data.order_index || 0,
            data.target_sets || 3,
            data.target_reps || 10,
            data.initial_weight || 0,
            data.increment_step || 2.5,
            data.decrement_rate || 0.1,
            data.rest_seconds || 120,
            toMySQLDateTime(data.created_at) || now,
            now
          ]
        );
      } else if (operation === 'delete') {
        await storage.query(
          `DELETE pe FROM plan_exercises pe INNER JOIN plans p ON pe.plan_id = p.id WHERE pe.id = ? AND p.user_id = ?`,
          [entityId, userId]
        );
      }
      break;

    case 'sessions':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO sessions (id, user_id, plan_id, scheduled_date, status, started_at, completed_at, paused_at, aborted_at, total_duration_seconds, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = IF(user_id = VALUES(user_id), VALUES(status), status),
             started_at = IF(user_id = VALUES(user_id), VALUES(started_at), started_at),
             completed_at = IF(user_id = VALUES(user_id), VALUES(completed_at), completed_at),
             paused_at = IF(user_id = VALUES(user_id), VALUES(paused_at), paused_at),
             aborted_at = IF(user_id = VALUES(user_id), VALUES(aborted_at), aborted_at),
             total_duration_seconds = IF(user_id = VALUES(user_id), VALUES(total_duration_seconds), total_duration_seconds),
             updated_at = IF(user_id = VALUES(user_id), VALUES(updated_at), updated_at)`,
          [
            entityId,
            userId,
            data.plan_id || null,
            toMySQLDate(data.scheduled_date),
            data.status || 'not_started',
            toMySQLDateTime(data.started_at),
            toMySQLDateTime(data.completed_at),
            toMySQLDateTime(data.paused_at),
            toMySQLDateTime(data.aborted_at),
            data.total_duration_seconds || null,
            toMySQLDateTime(data.created_at) || now,
            now
          ]
        );
      } else if (operation === 'delete') {
        await storage.query(`DELETE FROM sessions WHERE id = ? AND user_id = ?`, [entityId, userId]);
      }
      break;

    case 'session_sets':
      if (operation === 'upsert') {
        // 校验 session 归属当前用户，防止越权覆盖他人数据
        const ownedSessions = await storage.query(`SELECT id FROM sessions WHERE id = ? AND user_id = ?`, [data.session_id, userId]);
        if (ownedSessions.length === 0) {
          throw new Error('关联的训练会话不存在或无权操作');
        }
        await storage.query(
          `INSERT INTO session_sets (id, user_id, session_id, exercise_id, exercise_name, set_number, target_weight, actual_weight, target_reps, actual_reps, rpe, is_alternative, alternative_of, status, completed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             actual_weight = VALUES(actual_weight),
             actual_reps = VALUES(actual_reps),
             rpe = VALUES(rpe),
             status = VALUES(status),
             completed_at = VALUES(completed_at),
             updated_at = VALUES(updated_at)`,
          [
            entityId,
            userId,
            data.session_id,
            data.exercise_id,
            data.exercise_name || null,
            data.set_number || 1,
            data.target_weight ?? null,
            data.actual_weight ?? null,
            data.target_reps ?? null,
            data.actual_reps ?? null,
            data.rpe ?? null,
            data.is_alternative ? 1 : 0,
            data.alternative_of || null,
            data.status || 'completed',
            toMySQLDateTime(data.completed_at),
            toMySQLDateTime(data.created_at) || now,
            now
          ]
        );
      } else if (operation === 'delete') {
        await storage.query(
          `DELETE ss FROM session_sets ss INNER JOIN sessions s ON ss.session_id = s.id WHERE ss.id = ? AND s.user_id = ?`,
          [entityId, userId]
        );
      }
      break;

    case 'rm_history':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO rm_history (id, user_id, exercise_id, estimated_1rm, based_weight, based_reps, rpe, session_id, is_new_pr, recorded_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             estimated_1rm = IF(user_id = VALUES(user_id), VALUES(estimated_1rm), estimated_1rm),
             is_new_pr = IF(user_id = VALUES(user_id), VALUES(is_new_pr), is_new_pr),
             updated_at = IF(user_id = VALUES(user_id), VALUES(updated_at), updated_at)`,
          [
            entityId,
            userId,
            data.exercise_id,
            data.estimated_1rm,
            data.based_weight ?? null,
            data.based_reps ?? null,
            data.rpe ?? null,
            data.session_id || null,
            data.is_new_pr ? 1 : 0,
            toMySQLDateTime(data.recorded_at) || now,
            toMySQLDateTime(data.created_at) || now,
            now
          ]
        );
      } else if (operation === 'delete') {
        await storage.query(`DELETE FROM rm_history WHERE id = ? AND user_id = ?`, [entityId, userId]);
      }
      break;

    case 'progressions':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO progressions (id, user_id, exercise_id, session_id, progression_type, previous_weight, new_weight, increment, reason, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             progression_type = IF(user_id = VALUES(user_id), VALUES(progression_type), progression_type),
             new_weight = IF(user_id = VALUES(user_id), VALUES(new_weight), new_weight),
             increment = IF(user_id = VALUES(user_id), VALUES(increment), increment),
             reason = IF(user_id = VALUES(user_id), VALUES(reason), reason),
             updated_at = IF(user_id = VALUES(user_id), VALUES(updated_at), updated_at)`,
          [
            entityId,
            userId,
            data.exercise_id,
            data.session_id || null,
            data.progression_type || null,
            data.previous_weight ?? null,
            data.new_weight ?? null,
            data.increment ?? null,
            data.reason || null,
            toMySQLDateTime(data.created_at) || now,
            now
          ]
        );
      } else if (operation === 'delete') {
        await storage.query(`DELETE FROM progressions WHERE id = ? AND user_id = ?`, [entityId, userId]);
      }
      break;

    case 'profiles':
      if (operation === 'upsert') {
        await storage.query(
          `UPDATE users SET weight = ?, height = ?, updated_at = ? WHERE id = ?`,
          [data.weight ?? null, data.height ?? null, now, userId]
        );
      }
      break;

    case 'failure_counts':
      if (operation === 'upsert' && data.exercise_id) {
        await storage.query(
          `INSERT INTO failure_counts (exercise_id, user_id, consecutive_failures, updated_at)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             consecutive_failures = VALUES(consecutive_failures),
             updated_at = VALUES(updated_at)`,
          [data.exercise_id, userId, data.consecutive_failures || 0, now]
        );
      }
      break;

    default:
      console.warn(`[Sync] 未知实体类型: ${entityType}`);
  }
}

module.exports = router;
