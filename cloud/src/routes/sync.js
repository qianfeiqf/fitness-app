/**
 * 同步路由
 * 处理客户端数据双向同步
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const storage = require('../services/storage');

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
        conflicts.push({ entity_id, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        synced,
        conflicts,
        server_changes: [] // 简化版：暂不返回服务端变更
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 从服务端拉取变更
 */
router.get('/pull', verifyToken, async (req, res, next) => {
  try {
    const { since } = req.query;
    const userId = req.user.userId;

    if (!storage.isMySQL()) {
      return res.json({ success: true, data: { changes: [], sync_timestamp: Date.now() } });
    }

    // 查询自 since 以来所有有变更的实体
    const sinceTs = parseInt(since || '0');
    // 表名白名单映射，防止SQL注入
    const ALLOWED_TABLES = {
      plans: 'plans',
      sessions: 'sessions',
      session_sets: 'session_sets',
      rm_history: 'rm_history',
      progressions: 'progressions'
    };
    const changes = [];

    for (const [key, tableName] of Object.entries(ALLOWED_TABLES)) {
      const rows = await storage.query(
        `SELECT * FROM ?? WHERE user_id = ? AND updated_at > FROM_UNIXTIME(? / 1000)`,
        [tableName, userId, sinceTs]
      );
      for (const row of rows) {
        changes.push({
          entity_type: key,
          entity_id: row.id,
          operation: 'upsert',
          payload: row,
          server_updated_at: new Date(row.updated_at).getTime()
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

  const now = new Date().toISOString();

  switch (entityType) {
    case 'plans':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO plans (id, user_id, name, description, cycle_type, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), cycle_type=VALUES(cycle_type), status=VALUES(status), updated_at=VALUES(updated_at)`,
          [entityId, userId, payload.name, payload.description, payload.cycle_type, payload.status, payload.created_at || now, now]
        );
      } else if (operation === 'delete') {
        await storage.query(`DELETE FROM plans WHERE id = ? AND user_id = ?`, [entityId, userId]);
      }
      break;

    case 'sessions':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO sessions (id, user_id, plan_id, scheduled_date, status, started_at, completed_at, aborted_at, total_duration_seconds, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), started_at=VALUES(started_at), completed_at=VALUES(completed_at), aborted_at=VALUES(aborted_at), total_duration_seconds=VALUES(total_duration_seconds), updated_at=VALUES(updated_at)`,
          [entityId, userId, payload.plan_id, payload.scheduled_date, payload.status, payload.started_at, payload.completed_at, payload.aborted_at, payload.total_duration_seconds, payload.created_at || now, now]
        );
      } else if (operation === 'delete') {
        await storage.query(`DELETE FROM sessions WHERE id = ? AND user_id = ?`, [entityId, userId]);
      }
      break;

    case 'session_sets':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO session_sets (id, session_id, exercise_id, exercise_name, set_number, target_weight, actual_weight, target_reps, actual_reps, rpe, is_alternative, alternative_of, status, completed_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE actual_weight=VALUES(actual_weight), actual_reps=VALUES(actual_reps), rpe=VALUES(rpe), completed_at=VALUES(completed_at)`,
          [entityId, payload.session_id, payload.exercise_id, payload.exercise_name, payload.set_number, payload.target_weight, payload.actual_weight, payload.target_reps, payload.actual_reps, payload.rpe, payload.is_alternative ? 1 : 0, payload.alternative_of, payload.status, payload.completed_at, payload.created_at || now]
        );
      }
      break;

    case 'rm_history':
      if (operation === 'upsert') {
        await storage.query(
          `INSERT INTO rm_history (id, user_id, exercise_id, estimated_1rm, based_weight, based_reps, rpe, session_id, is_new_pr, recorded_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE estimated_1rm=VALUES(estimated_1rm), is_new_pr=VALUES(is_new_pr)`,
          [entityId, userId, payload.exercise_id, payload.estimated_1rm, payload.based_weight, payload.based_reps, payload.rpe, payload.session_id, payload.is_new_pr ? 1 : 0, payload.recorded_at, payload.created_at || now]
        );
      }
      break;

    default:
      console.warn(`[Sync] 未知实体类型: ${entityType}`);
  }
}

module.exports = router;
