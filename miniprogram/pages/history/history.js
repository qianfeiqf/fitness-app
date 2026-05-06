/**
 * 训练历史列表页
 */

const { find, getCollection } = require('../../localdb/db.js');

Page({
  data: {
    sessions: [],
    filteredSessions: [],
    filterPeriod: 'all', // all, month, quarter, year
    periodOptions: [
      { key: 'all', label: '全部' },
      { key: 'month', label: '近1月' },
      { key: 'quarter', label: '近3月' },
      { key: 'year', label: '近1年' }
    ],
    periodTabs: [
      { title: '全部' },
      { title: '近1月' },
      { title: '近3月' },
      { title: '近1年' }
    ],
    periodTabIndex: 0,
    loading: true,
    totalCount: 0,
    totalVolume: 0
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  /**
   * 加载训练历史
   */
  loadHistory() {
    this.setData({ loading: true });

    const allSessions = getCollection('sessions')
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.completed_at - a.completed_at);

    // 计算总容量
    let totalVolume = 0;
    allSessions.forEach(session => {
      const sets = find('session_sets', { session_id: session.id });
      sets.forEach(set => {
        if (set.status === 'completed') {
          totalVolume += (set.actual_weight || 0) * (set.actual_reps || 0);
        }
      });
    });

    this.setData({
      sessions: allSessions,
      totalCount: allSessions.length,
      totalVolume: Math.round(totalVolume),
      loading: false
    });

    this.applyFilter();
  },

  /**
   * 切换时间筛选 Tab
   */
  onPeriodTabChange(e) {
    const index = e.detail.index;
    const key = this.data.periodOptions[index].key;
    this.setData({ filterPeriod: key, periodTabIndex: index });
    this.applyFilter();
  },

  /**
   * 应用筛选
   */
  applyFilter() {
    const { sessions, filterPeriod } = this.data;
    const now = Date.now();
    let cutoff = 0;

    switch (filterPeriod) {
      case 'month':
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'quarter':
        cutoff = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case 'year':
        cutoff = now - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        cutoff = 0;
    }

    const filtered = cutoff > 0
      ? sessions.filter(s => s.completed_at >= cutoff)
      : sessions;

    // 为每条记录计算容量和时长
    const enriched = filtered.map(s => {
      const sets = find('session_sets', { session_id: s.id });
      let volume = 0;
      sets.forEach(set => {
        if (set.status === 'completed') {
          volume += (set.actual_weight || 0) * (set.actual_reps || 0);
        }
      });

      let duration = '0分钟';
      if (s.total_duration_seconds) {
        const mins = Math.floor(s.total_duration_seconds / 60);
        duration = mins + '分钟';
      } else if (s.started_at && s.completed_at) {
        const mins = Math.floor((s.completed_at - s.started_at) / 1000 / 60);
        duration = mins + '分钟';
      }

      const date = new Date(s.completed_at);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      return {
        ...s,
        volume: Math.round(volume),
        duration,
        dateStr,
        setCount: sets.filter(set => set.status === 'completed').length
      };
    });

    this.setData({ filteredSessions: enriched });
  },

  /**
   * 查看训练详情
   */
  onViewDetail(e) {
    const { sessionId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/history/detail/detail?sessionId=' + sessionId
    });
  }
});
