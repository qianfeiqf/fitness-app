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
    selectedPeriod: '7',
    periodOptions: [
      { key: '7', label: '7天' },
      { key: '30', label: '30天' },
      { key: '90', label: '90天' },
      { key: '365', label: '1年' }
    ],
    periodTabs: [
      { title: '7天' },
      { title: '30天' },
      { title: '90天' },
      { title: '1年' }
    ],
    periodTabIndex: 0,
    periodVolume: 0,
    volumeTrend: [],

    // PR记录
    recentPRs: [],

    // 1RM趋势图
    chartPeriods: [
      { key: '30', label: '1月' },
      { key: '90', label: '3月' },
      { key: '180', label: '6月' },
      { key: 'all', label: '全部' }
    ],
    chartPeriodTabs: [
      { title: '1月' },
      { title: '3月' },
      { title: '6月' },
      { title: '全部' }
    ],
    chartPeriodTabIndex: 1,
    chartPeriod: '90',

    // 肌群建议
    muscleAdvice: '',

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

    const periodDays = parseInt(this.data.selectedPeriod, 10);

    // 获取三大项1RM概览
    const bigThree = getBigThreeOverview();

    // 计算周期训练容量
    const periodVolume = this.calcPeriodVolume(periodDays);

    // 计算容量趋势
    const volumeTrend = this.calcVolumeTrend(periodDays);

    // 获取近期PR记录
    const recentPRs = this.getRecentPRs();

    // 计算肌群分布和建议
    const { muscleData, muscleAdvice } = this.calcMuscleDistribution();

    this.setData({
      bigThree,
      periodVolume,
      volumeTrend,
      recentPRs,
      muscleAdvice,
      loading: false
    });

    // 延迟绘制图表，等待 DOM 更新
    setTimeout(() => {
      this.drawRMChart();
      this.drawRadarChart(muscleData);
    }, 300);
  },

  /**
   * 计算肌群训练分布（近30天）
   */
  calcMuscleDistribution() {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // 获取近30天的训练组
    const sessions = find('sessions', s =>
      s.status === 'completed' && s.completed_at >= thirtyDaysAgo
    );

    const muscleGroups = ['胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'];
    const muscleVolumes = {};
    muscleGroups.forEach(g => muscleVolumes[g] = 0);

    sessions.forEach(session => {
      const sets = find('session_sets', { session_id: session.id });
      sets.forEach(set => {
        if (set.status === 'completed') {
          const exercise = findOne('exercises', { id: set.exercise_id });
          if (exercise && exercise.muscle_group) {
            const volume = (set.actual_weight || 0) * (set.actual_reps || 0);
            muscleVolumes[exercise.muscle_group] = (muscleVolumes[exercise.muscle_group] || 0) + volume;
          }
        }
      });
    });

    // 找出训练量最小和最大的肌群
    const sorted = muscleGroups
      .map(g => ({ group: g, volume: muscleVolumes[g] || 0 }))
      .sort((a, b) => b.volume - a.volume);

    const max = sorted[0];
    const min = sorted[sorted.length - 1];

    let advice = '';
    if (max.volume > 0 && min.volume === 0) {
      advice = `注意：${min.group} 近30天没有训练记录，建议增加相关训练`;
    } else if (max.volume > 0 && min.volume / max.volume < 0.3) {
      advice = `建议：${min.group} 训练量偏低，可以适当增加以保持肌群均衡发展`;
    } else if (sorted.filter(s => s.volume > 0).length >= 5) {
      advice = '肌群训练分布均衡，继续保持！';
    }

    // 归一化数据（以最大值为100%）
    const maxVolume = max.volume || 1;
    const muscleData = muscleGroups.map(g => ({
      name: g,
      value: muscleVolumes[g] ? Math.min((muscleVolumes[g] / maxVolume) * 100, 100) : 0
    }));

    return { muscleData, muscleAdvice: advice };
  },

  /**
   * 绘制肌群雷达图
   */
  drawRadarChart(muscleData) {
    if (!muscleData) return;

    const query = wx.createSelectorQuery().in(this);
    query.select('#muscleRadarChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        this.renderRadarChart(ctx, width, height, muscleData);
      });
  },

  /**
   * 渲染雷达图
   */
  renderRadarChart(ctx, width, height, muscleData) {
    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const radius = Math.min(width, height) / 2 - 50;
    const count = muscleData.length;

    ctx.clearRect(0, 0, width, height);

    if (muscleData.every(d => d.value === 0)) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据，完成训练后将自动生成', width / 2, height / 2);
      return;
    }

    // 绘制网格（5层）
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      const r = (radius / 5) * i;
      for (let j = 0; j < count; j++) {
        const angle = (Math.PI * 2 / count) * j - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 绘制轴线
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // 绘制数据区域
    ctx.fillStyle = 'rgba(26, 26, 26, 0.15)';
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    muscleData.forEach((d, i) => {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const r = radius * (d.value / 100);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绘制数据点
    muscleData.forEach((d, i) => {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const r = radius * (d.value / 100);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#1A1A1A';
      ctx.fill();
    });

    // 绘制标签
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#666';
    muscleData.forEach((d, i) => {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const labelR = radius + 20;
      const x = centerX + Math.cos(angle) * labelR;
      const y = centerY + Math.sin(angle) * labelR;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.name, x, y);
    });
  },

  /**
   * 计算指定周期总容量
   */
  calcPeriodVolume(periodDays) {
    const now = Date.now();
    const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

    const sessions = find('sessions', s => s.status === 'completed' && s.completed_at >= periodStart);

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
   * 计算容量趋势（支持 7/30/90/365 天）
   */
  calcVolumeTrend(periodDays) {
    // 确定分段策略
    let segmentCount;
    if (periodDays <= 7) {
      segmentCount = 7;
    } else if (periodDays <= 30) {
      segmentCount = 6;
    } else if (periodDays <= 90) {
      segmentCount = 6;
    } else {
      segmentCount = 12;
    }

    const nowDate = new Date();
    nowDate.setHours(23, 59, 59, 999);
    const startDate = new Date(nowDate);
    startDate.setDate(startDate.getDate() - periodDays + 1);
    startDate.setHours(0, 0, 0, 0);

    const totalMs = nowDate.getTime() - startDate.getTime();
    const rawData = [];
    let maxVolume = 0;

    for (let i = 0; i < segmentCount; i++) {
      const segStart = new Date(startDate.getTime() + (i / segmentCount) * totalMs);
      const segEnd = new Date(startDate.getTime() + ((i + 1) / segmentCount) * totalMs);
      if (i === segmentCount - 1) {
        segEnd.setTime(nowDate.getTime());
      }

      const sessions = find('sessions', s =>
        s.status === 'completed' &&
        s.completed_at >= segStart.getTime() &&
        s.completed_at <= segEnd.getTime()
      );

      let segVolume = 0;
      sessions.forEach(session => {
        const sets = find('session_sets', { session_id: session.id });
        sets.forEach(set => {
          if (set.status === 'completed') {
            segVolume += (set.actual_weight || 0) * (set.actual_reps || 0);
          }
        });
      });

      // 生成标签
      let label;
      if (periodDays <= 7) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        label = days[segStart.getDay()];
      } else if (periodDays <= 30) {
        label = `${segStart.getMonth() + 1}-${segStart.getDate()}`;
      } else if (periodDays <= 90) {
        label = `${segStart.getMonth() + 1}/${segStart.getDate()}`;
      } else {
        label = `${segStart.getMonth() + 1}月`;
      }

      rawData.push({ date: label, volume: segVolume });
      if (segVolume > maxVolume) {
        maxVolume = segVolume;
      }
    }

    const referenceVolume = maxVolume > 0 ? maxVolume : 15000;
    return rawData.map(item => ({
      date: item.date,
      volume: item.volume,
      barHeight: item.volume > 0 ? Math.round((item.volume / referenceVolume) * 80) : 0
    }));
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
   * 查看训练历史
   */
  onViewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  /**
   * 切换容量周期 Tab
   */
  onPeriodTabChange(e) {
    const index = e.detail.index;
    const period = this.data.periodOptions[index].key;
    this.setData({ selectedPeriod: period, periodTabIndex: index });
    this.loadStats();
  },

  /**
   * 切换图表时间范围 Tab
   */
  onChartPeriodTabChange(e) {
    const index = e.detail.index;
    const period = this.data.chartPeriods[index].key;
    this.setData({ chartPeriod: period, chartPeriodTabIndex: index });
    this.drawRMChart();
  },

  /**
   * 绘制 1RM 趋势图
   */
  drawRMChart() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#rmTrendChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        this.renderChart(ctx, width, height);
      });
  },

  /**
   * 渲染图表
   */
  renderChart(ctx, width, height) {
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 获取三大项数据
    const bigThreeIds = [
      { name: '卧推', color: '#1A1A1A', id: this.findExerciseId('卧推') },
      { name: '深蹲', color: '#666666', id: this.findExerciseId('深蹲') },
      { name: '硬拉', color: '#999999', id: this.findExerciseId('硬拉') }
    ];

    // 获取时间范围
    const period = this.data.chartPeriod;
    const now = Date.now();
    let startTime = 0;
    if (period !== 'all') {
      startTime = now - parseInt(period) * 24 * 60 * 60 * 1000;
    }

    // 收集数据
    const datasets = bigThreeIds.map(item => {
      if (!item.id) return { ...item, data: [] };
      const records = getCollection('rm_history')
        .filter(r => r.exercise_id === item.id && r.recorded_at >= startTime)
        .sort((a, b) => a.recorded_at - b.recorded_at);

      // 按日期去重，保留每天的最高值
      const dailyMax = {};
      records.forEach(r => {
        const dateKey = this.formatDateKey(r.recorded_at);
        if (!dailyMax[dateKey] || r.estimated_1rm > dailyMax[dateKey].value) {
          dailyMax[dateKey] = { date: dateKey, value: r.estimated_1rm, time: r.recorded_at };
        }
      });

      return {
        ...item,
        data: Object.values(dailyMax)
      };
    }).filter(d => d.data.length > 0);

    if (datasets.length === 0) {
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据，完成训练后将自动生成', width / 2, height / 2);
      return;
    }

    // 计算范围
    let minValue = Infinity, maxValue = -Infinity;
    let minTime = Infinity, maxTime = -Infinity;

    datasets.forEach(ds => {
      ds.data.forEach(d => {
        minValue = Math.min(minValue, d.value);
        maxValue = Math.max(maxValue, d.value);
        minTime = Math.min(minTime, d.time);
        maxTime = Math.max(maxTime, d.time);
      });
    });

    // 留一些边距（至少留 1 防止所有值相等时除以零）
    const valueRange = maxValue - minValue;
    const padding = Math.max(valueRange * 0.1, 0.5);
    const yMin = Math.max(0, minValue - padding);
    const yMax = maxValue + padding;

    const timeRange = maxTime - minTime || 1;

    // 绘制网格线
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + chartHeight * (i / gridLines);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Y轴标签
      const value = yMax - (yMax - yMin) * (i / gridLines);
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(value) + 'kg', padding.left - 8, y + 4);
    }

    // 绘制 X 轴标签
    const xLabels = 4;
    for (let i = 0; i <= xLabels; i++) {
      const x = padding.left + chartWidth * (i / xLabels);
      const time = minTime + timeRange * (i / xLabels);
      const date = new Date(time);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;

      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, padding.top + chartHeight + 20);
    }

    // 绘制折线
    datasets.forEach(ds => {
      if (ds.data.length < 2) return;

      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ds.data.forEach((point, idx) => {
        const x = padding.left + ((point.time - minTime) / timeRange) * chartWidth;
        const y = padding.top + ((yMax - point.value) / (yMax - yMin)) * chartHeight;

        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // 绘制数据点
      ctx.fillStyle = ds.color;
      ds.data.forEach(point => {
        const x = padding.left + ((point.time - minTime) / timeRange) * chartWidth;
        const y = padding.top + ((yMax - point.value) / (yMax - yMin)) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  },

  /**
   * 根据名称查找动作 ID
   */
  findExerciseId(name) {
    const exercises = getCollection('exercises');
    // 精确名称映射，避免 .includes 匹配到错误变体
    const exactMap = { '卧推': '杠铃卧推', '深蹲': '杠铃深蹲', '硬拉': '传统硬拉' };
    const exactName = exactMap[name] || name;
    const ex = exercises.find(e => e.name === exactName);
    return ex ? ex.id : null;
  },

  /**
   * 格式化日期键
   */
  formatDateKey(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
});
