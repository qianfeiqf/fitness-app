/**
 * 统计页面
 */

const { find, findOne, getCollection } = require('../../localdb/db.js');
const { getBigThreeOverview, get1RMHistory } = require('../../services/rm.js');

Page({
  data: {
    // 三大项概览
    bigThree: [],

    // 容量统计
    weeklyVolume: 0,
    volumeTrend: [],

    // PR记录
    recentPRs: [],

    // 加载状态
    loading: true
  },

  onLoad() {
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    this.setData({ loading: true });

    // 获取三大项1RM概览
    const bigThree = getBigThreeOverview();

    // 计算本周训练容量（从 session_sets 汇总）
    const weeklyVolume = this.calcWeeklyVolume();

    // 计算容量趋势（近7天）
    const volumeTrend = this.calcVolumeTrend();

    // 获取近期PR记录
    const recentPRs = this.getRecentPRs();

    this.setData({
      bigThree,
      weeklyVolume,
      volumeTrend,
      recentPRs,
      loading: false
    });
  },

  /**
   * 计算本周总容量
   */
  calcWeeklyVolume() {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const sessions = find('sessions', s => s.status === 'completed' && s.completed_at >= weekAgo);

    let totalVolume = 0;
    sessions.forEach(session => {
      const sets = find('session_sets', { session_id: session.id });
      sets.forEach(set => {
        if (set.status === 'completed') {
          totalVolume += (set.actual_weight || 0) * (set.actual_reps || 0);
        }
      });
    });

    return totalVolume;
  },

  /**
   * 计算近7天容量趋势
   */
  calcVolumeTrend() {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const result = [];

    // 找出最大容量用于计算百分比
    let maxVolume = 0;
    const rawData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

      const sessions = find('sessions', s =>
        s.status === 'completed' &&
        s.completed_at >= dayStart &&
        s.completed_at <= dayEnd
      );

      let dayVolume = 0;
      sessions.forEach(session => {
        const sets = find('session_sets', { session_id: session.id });
        sets.forEach(set => {
          if (set.status === 'completed') {
            dayVolume += (set.actual_weight || 0) * (set.actual_reps || 0);
          }
        });
      });

      rawData.push({
        date: days[date.getDay()],
        volume: dayVolume
      });

      if (dayVolume > maxVolume) {
        maxVolume = dayVolume;
      }
    }

    // 计算bar高度百分比
    const referenceVolume = maxVolume > 0 ? maxVolume : 15000;
    rawData.forEach(item => {
      result.push({
        date: item.date,
        volume: item.volume,
        barHeight: item.volume > 0 ? Math.round((item.volume / referenceVolume) * 80) : 0
      });
    });

    return result;
  },

  /**
   * 获取近期PR记录
   */
  getRecentPRs() {
    const allRecords = find('rm_history')
      .filter(r => r.is_new_pr)
      .sort((a, b) => b.recorded_at - a.recorded_at)
      .slice(0, 10);

    return allRecords.map(r => {
      const exercise = findOne('exercises', { id: r.exercise_id });
      const date = new Date(r.recorded_at);
      return {
        date: `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
        exercise: exercise ? exercise.name : r.exercise_id,
        value: r.estimated_1rm.toFixed(1) + 'kg',
        type: '1RM'
      };
    });
  },

  /**
   * 查看动作详情
   */
  onViewExerciseDetail(e) {
    const { exerciseId } = e.currentTarget.dataset;
    wx.showToast({
      title: '动作详情暂未开放',
      icon: 'none'
    });
  },

  /**
   * 切换周期
   */
  onChangePeriod(e) {
    const { period } = e.currentTarget.dataset;
    this.setData({ selectedPeriod: period });
    this.loadStats();
  }
});
