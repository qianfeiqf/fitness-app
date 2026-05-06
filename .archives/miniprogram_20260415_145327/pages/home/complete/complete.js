/**
 * 训练完成页面
 */

const { findOne } = require('../../../localdb/db.js');

Page({
  data: {
    sessionId: null,
    session: null,
    completedSets: [],
    totalVolume: 0,
    duration: '',
    prCount: 0,
    showConfetti: false
  },

  onLoad(options) {
    if (options.sessionId) {
      this.setData({ sessionId: options.sessionId });
      this.loadSession(options.sessionId);
    }

    // 显示庆祝动画
    setTimeout(() => {
      this.setData({ showConfetti: true });
      wx.vibrateLong();
    }, 300);
  },

  loadSession(sessionId) {
    const session = findOne('sessions', { id: sessionId });

    if (!session) {
      console.error('会话不存在:', sessionId);
      return;
    }

    // 计算统计数据
    const completedSets = session.completed_sets || [];
    const totalVolume = completedSets.reduce((sum, set) => {
      return sum + (set.actual_weight || 0) * (set.actual_reps || 0);
    }, 0);

    // 计算时长
    let duration = '0分钟';
    if (session.total_duration_seconds) {
      const mins = Math.floor(session.total_duration_seconds / 60);
      duration = mins + '分钟';
    } else if (session.started_at && session.completed_at) {
      const secs = session.completed_at - session.started_at;
      const mins = Math.floor(secs / 1000 / 60);
      duration = mins + '分钟';
    }

    // PR数量（通过检查是否有里程碑）
    const prCount = completedSets.filter(set => set.is_pr || set.milestone).length;

    this.setData({
      session,
      completedSets,
      totalVolume: Math.round(totalVolume),
      duration,
      prCount
    });
  },

  onBackHome() {
    wx.redirectTo({
      url: '/pages/home/home'
    });
  },

  onViewStats() {
    wx.switchTab({
      url: '/pages/stats/stats'
    });
  }
});
