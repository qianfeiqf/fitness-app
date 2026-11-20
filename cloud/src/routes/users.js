/**
 * 用户路由
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const storage = require('../services/storage');

/**
 * 获取当前用户信息
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (storage.isMySQL()) {
      const rows = await storage.query(`SELECT id, nickname, avatar_url, gender, height, weight, birthday, is_member, member_expire_at, created_at FROM users WHERE id = ?`, [userId]);
      if (rows.length > 0) {
        const row = rows[0];
        return res.json({
          success: true,
          data: {
            id: row.id,
            nickname: row.nickname,
            avatarUrl: row.avatar_url,
            gender: row.gender,
            height: row.height ? parseFloat(row.height) : null,
            weight: row.weight ? parseFloat(row.weight) : null,
            birthday: row.birthday,
            isMember: !!row.is_member,
            memberExpireAt: row.member_expire_at,
            createdAt: row.created_at
          }
        });
      }
    }

    // 降级模式
    res.json({
      success: true,
      data: {
        id: userId,
        isMember: false,
        memberExpireAt: null
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 更新用户信息
 */
router.patch('/me', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const allowedFields = ['weight', 'height', 'nickname', 'avatar_url', 'gender', 'birthday'];
    const updates = {};
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if ((field === 'weight' || field === 'height') && req.body[field] !== null) {
          const num = Number(req.body[field]);
          if (isNaN(num) || num < 0) {
            return res.status(400).json({ success: false, error: `${field} 必须是有效的正数` });
          }
          updates[field] = num;
        } else {
          updates[field] = req.body[field];
        }
        values.push(updates[field]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    if (storage.isMySQL()) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      values.push(userId);
      await storage.query(`UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = ?`, values);
    }

    res.json({
      success: true,
      data: {
        id: userId,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 注销账号并清除该用户的云端数据
 */
router.delete('/me', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    if (storage.isMySQL()) {
      await storage.query(
        `DELETE ss FROM session_sets ss INNER JOIN sessions s ON ss.session_id = s.id WHERE s.user_id = ?`,
        [userId]
      );
      await storage.query(`DELETE FROM rm_history WHERE user_id = ?`, [userId]);
      await storage.query(`DELETE FROM progressions WHERE user_id = ?`, [userId]);
      await storage.query(`DELETE FROM failure_counts WHERE user_id = ?`, [userId]);
      await storage.query(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
      await storage.query(`DELETE FROM plans WHERE user_id = ?`, [userId]);
      await storage.query(`DELETE FROM users WHERE id = ?`, [userId]);
    } else {
      storage.deleteFromStore('users', userId);
    }

    res.json({
      success: true,
      message: '账号及云端数据已永久删除'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
