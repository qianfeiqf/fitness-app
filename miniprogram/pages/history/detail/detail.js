/**
 * 单次训练详情页
 */

const { findOne, find } = require('../../../localdb/db.js');

Page({
  data: {
    sessionId: null,
    session: null,
    sets: [],
    groupedSets: [],
    totalVolume: 0,
    duration: '',
    dateStr: '',
    prCount: 0,
    loading: true
  },

  onLoad(options) {
    if (options.sessionId) {
      this.setData({ sessionId: options.sessionId });
      this.loadDetail(options.sessionId);
    }
  },

  /**
   * 加载训练详情
   */
  loadDetail(sessionId) {
    this.setData({ loading: true });

    const session = findOne('sessions', { id: sessionId });
    if (!session) {
      this.setData({ loading: false });
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }

    // 获取所有组
    const allSets = find('session_sets', { session_id: sessionId })
      .filter(s => s.status === 'completed')
      .sort((a, b) => a.completed_at - b.completed_at);

    // 按动作分组
    const exerciseMap = {};
    allSets.forEach(set => {
      if (!exerciseMap[set.exercise_id]) {
        exerciseMap[set.exercise_id] = {
          exercise_id: set.exercise_id,
          exercise_name: set.exercise_name,
          sets: []
        };
      }
      exerciseMap[set.exercise_id].sets.push(set);
    });

    const groupedSets = Object.values(exerciseMap);

    // 计算总容量
    let totalVolume = 0;
    let prCount = 0;
    allSets.forEach(set => {
      totalVolume += (set.actual_weight || 0) * (set.actual_reps || 0);
      if (set.is_pr) prCount++;
    });

    // 时长
    let duration = '0分钟';
    if (session.total_duration_seconds) {
      const mins = Math.floor(session.total_duration_seconds / 60);
      duration = mins + '分钟';
    } else if (session.started_at && session.completed_at) {
      const mins = Math.floor((session.completed_at - session.started_at) / 1000 / 60);
      duration = mins + '分钟';
    }

    // 日期
    const date = new Date(session.completed_at);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    this.setData({
      session,
      sets: allSets,
      groupedSets,
      totalVolume: Math.round(totalVolume),
      duration,
      dateStr,
      prCount,
      loading: false
    });
  },

  onBack() {
    wx.navigateBack();
  }
});
