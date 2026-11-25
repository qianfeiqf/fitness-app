/**
 * 训练完成页面
 */

const { findOne, getCollection } = require('../../../localdb/db.js');
const { getNextWeightSuggestion } = require('../../../services/progression.js');
const UI = require('../../../utils/ui.js');

Page({
  data: {
    sessionId: null,
    session: null,
    completedSets: [],
    groupedSets: [],
    totalVolume: 0,
    duration: '',
    prCount: 0,
    showConfetti: false,
    // 演进预览数据
    progressions: [],
    showProgressions: false
  },

  onLoad(options) {
    if (!options.sessionId) {
      UI.showToast('缺少会话信息', this);
      setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 1500);
      return;
    }

    this.setData({ sessionId: options.sessionId });
    const session = this.loadSession(options.sessionId);
    if (session && !session.is_free_workout) {
      this.loadProgressions(options.sessionId);
    }

    // 显示庆祝动画
    setTimeout(() => {
      this.setData({ showConfetti: true });
      wx.vibrateLong();
    }, 300);
  },

  /**
   * 加载演进预览数据
   */
  loadProgressions(sessionId) {
    try {
      // 获取本次训练的所有动作
      const sessionSets = getCollection('session_sets').filter(s => s.session_id === sessionId);
      const exerciseIds = [...new Set(sessionSets.map(s => s.exercise_id))];
      
      const progressions = [];
      
      exerciseIds.forEach(exerciseId => {
        const suggestion = getNextWeightSuggestion(exerciseId);
        if (suggestion) {
          // 获取动作信息
          const exercise = findOne('exercises', { id: exerciseId });
          const set = sessionSets.find(s => s.exercise_id === exerciseId);
          
          progressions.push({
            exerciseId,
            exerciseName: exercise ? exercise.name : (set ? set.exercise_name : '未知动作'),
            currentWeight: set ? set.actual_weight : 0,
            nextWeight: suggestion.suggested_weight,
            type: suggestion.progression_type,
            reason: suggestion.reason
          });
        }
      });
      
      // 按重量变化排序（增重优先）
      progressions.sort((a, b) => {
        const typeOrder = { progression: 0, stall: 1, deload: 2, initial: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      });
      
      this.setData({
        progressions,
        showProgressions: progressions.length > 0
      });
      
    } catch (err) {
      console.error('加载演进预览失败:', err);
    }
  },

  /**
   * 获取演进类型的显示文本
   */
  getProgressionTypeText(type) {
    const typeMap = {
      progression: { text: '进阶', icon: '↑', color: '#07C160' },
      stall: { text: '保持', icon: '→', color: '#999999' },
      deload: { text: '减载', icon: '↓', color: '#FF6B6B' },
      initial: { text: '初始', icon: '•', color: '#666666' }
    };
    return typeMap[type] || { text: '保持', icon: '→', color: '#999999' };
  },

  loadSession(sessionId) {
    const session = findOne('sessions', { id: sessionId });

    if (!session) {
      console.error('会话不存在:', sessionId);
      UI.showToast('会话数据丢失', this);
      setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 1500);
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

    // 按动作分组汇总（供页面展示与分享卡片复用）
    const groupMap = {};
    completedSets.forEach(set => {
      const key = set.exercise_id || set.exercise_name;
      if (!groupMap[key]) {
        groupMap[key] = {
          exercise_id: key,
          exercise_name: set.exercise_name || '动作',
          sets: [],
          maxWeight: 0,
          hasPR: false
        };
      }
      groupMap[key].sets.push(set);
      if ((set.actual_weight || 0) > groupMap[key].maxWeight) {
        groupMap[key].maxWeight = set.actual_weight || 0;
      }
      if (set.is_pr || set.milestone) {
        groupMap[key].hasPR = true;
      }
    });
    const groupedSets = Object.values(groupMap);

    // PR数量（通过检查是否有里程碑）
    const prCount = completedSets.filter(set => set.is_pr || set.milestone).length;

    this.setData({
      session,
      completedSets,
      groupedSets,
      totalVolume: Math.round(totalVolume),
      duration,
      prCount
    });
    return session;
  },

  onBackHome() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  onViewStats() {
    wx.switchTab({
      url: '/pages/stats/stats'
    });
  },

  /**
   * 生成并分享训练卡片
   */
  onShareCard() {
    const { session, totalVolume, duration, prCount, completedSets, groupedSets } = this.data;
    if (!session) return;

    wx.showLoading({ title: '生成中...' });

    this.drawShareCard({
      planName: session.plan_name || (session.is_free_workout ? '自由训练' : '今日训练'),
      totalVolume,
      duration,
      prCount,
      completedSets,
      groupedSets
    }).then(filePath => {
      wx.hideLoading();
      wx.showShareImageMenu({
        path: filePath,
        success: () => {
          wx.showToast({ title: '分享成功', icon: 'success' });
        },
        fail: (err) => {
          if (err.errMsg && err.errMsg.includes('cancel')) return;
          // 如果分享菜单失败，提供保存到相册选项
          wx.showModal({
            title: '保存图片',
            content: '是否将训练卡片保存到相册？',
            success: (res) => {
              if (res.confirm) {
                wx.saveImageToPhotosAlbum({
                  filePath,
                  success: () => wx.showToast({ title: '已保存', icon: 'success' }),
                  fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
                });
              }
            }
          });
        }
      });
    }).catch(err => {
      wx.hideLoading();
      console.error('生成分享卡片失败:', err);
      wx.showToast({ title: '生成失败', icon: 'none' });
    });
  },

  /**
   * 使用 Canvas 绘制分享卡片
   */
  drawShareCard(data) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          try {
            if (!res || !res[0]) {
              reject(new Error('canvas not found'));
              return;
            }

            const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          // 高清画布尺寸
          const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
          const dpr = Math.min(windowInfo.pixelRatio, 2);
          const width = 750;
          const height = 1000;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          // 背景（极简炭黑 + 微信绿品牌风格）
          ctx.fillStyle = '#1A1A1A';
          ctx.fillRect(0, 0, width, height);

          // 顶部微信绿装饰条
          ctx.fillStyle = '#07C160';
          ctx.fillRect(0, 0, width, 12);

          // 标题
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 44px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('训练完成', width / 2, 100);

          // 计划名
          ctx.fillStyle = '#BBBBBB';
          ctx.font = '28px sans-serif';
          ctx.fillText(data.planName || '今日训练', width / 2, 150);

          // 日期
          const now = new Date();
          const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
          ctx.fillStyle = '#777777';
          ctx.font = '24px sans-serif';
          ctx.fillText(dateStr, width / 2, 190);

          // 数据卡片区域背景
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          roundRect(ctx, 50, 230, 650, 220, 20);
          ctx.fill();

          // 三个核心数据
          const metrics = [
            { label: '完成组数', value: data.completedSets.length + '组' },
            { label: '总容量', value: data.totalVolume + 'kg' },
            { label: '训练时长', value: data.duration }
          ];

          metrics.forEach((m, i) => {
            const x = 160 + i * 215;
            const y = 330;

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(m.value, x, y);

            ctx.fillStyle = '#999999';
            ctx.font = '24px sans-serif';
            ctx.fillText(m.label, x, y + 48);
          });

          // PR 区域
          if (data.prCount > 0) {
            ctx.fillStyle = '#07C160';
            roundRect(ctx, 50, 480, 650, 76, 16);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`恭喜刷新 ${data.prCount} 个个人纪录 (PR)`, width / 2, 528);
          }

          // 动作列表标题（按动作汇总，避免单动作占满全部行数）
          const listY = data.prCount > 0 ? 610 : 510;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('训练动作', 60, listY);

          const groups = (data.groupedSets || []).slice(0, 6);
          groups.forEach((g, i) => {
            const y = listY + 52 + i * 54;
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            roundRect(ctx, 50, y - 34, 650, 46, 10);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(g.exercise_name, 70, y - 2);

            ctx.fillStyle = '#BBBBBB';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'right';
            const summary = `${g.sets.length}组 · 最高 ${g.maxWeight}kg${g.hasPR ? ' · PR' : ''}`;
            ctx.fillText(summary, 676, y - 2);
          });

          // 底部品牌
          const bottomY = height - 56;
          ctx.fillStyle = '#666666';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('训练记一记', width / 2, bottomY);

          // 生成图片
          wx.canvasToTempFilePath({
            canvas,
            success: (result) => resolve(result.tempFilePath),
            fail: reject
          });
          } catch (err) {
            reject(err);
          }
        });
    });
  }
});

/**
 * 绘制圆角矩形路径
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
