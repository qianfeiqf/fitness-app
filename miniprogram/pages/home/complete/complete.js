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
   * 使用 Canvas 绘制高质感运动战报分享卡片（自适应高度）
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

            const groups = (data.groupedSets || []).slice(0, 6);
            const extraCount = Math.max(0, (data.groupedSets || []).length - groups.length);
            const hasPR = data.prCount > 0;

            const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
            const dpr = Math.min(windowInfo.pixelRatio || 2, 2);
            const width = 750;
            const listHeaderY = hasPR ? 548 : 454;
            const rowStartY = listHeaderY + 26;
            const rowStep = 78;
            const listEndY = rowStartY + groups.length * rowStep + (extraCount > 0 ? 40 : 0);
            const footerLineY = Math.max(listEndY + 24, 620);
            const height = footerLineY + 104;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            // 1. 深邃炭黑纵向渐变底色
            const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
            bgGrad.addColorStop(0, '#1A1D22');
            bgGrad.addColorStop(0.55, '#121418');
            bgGrad.addColorStop(1, '#0C0E11');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // 2. 右上角柔和翡翠绿径向微光晕
            const glowGrad = ctx.createRadialGradient(width - 60, 70, 10, width - 60, 70, 380);
            glowGrad.addColorStop(0, 'rgba(7, 193, 96, 0.24)');
            glowGrad.addColorStop(0.55, 'rgba(7, 193, 96, 0.06)');
            glowGrad.addColorStop(1, 'rgba(7, 193, 96, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, width, 460);

            // 3. 右上角极淡几何哑铃水印
            drawDumbbellWatermark(ctx, width - 110, 128, 1.85, 'rgba(255, 255, 255, 0.045)');

            // 4. 顶部状态胶囊 + 右侧日期
            ctx.fillStyle = 'rgba(7, 193, 96, 0.16)';
            roundRect(ctx, 50, 56, 212, 42, 21);
            ctx.fill();
            ctx.fillStyle = '#07C160';
            ctx.beginPath();
            ctx.arc(74, 77, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('WORKOUT DONE', 90, 84);

            const now = new Date();
            const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(dateStr, width - 50, 86);

            // 5. 杂志感左对齐主标题 + 副标题
            const rawPlanName = (data.planName || '今日训练').trim();
            const planTitle = rawPlanName.length > 14 ? rawPlanName.slice(0, 14) + '…' : rawPlanName;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(planTitle, 50, 162);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.54)';
            ctx.font = '24px sans-serif';
            ctx.fillText(`${(data.groupedSets || []).length} 个动作 · 共 ${data.completedSets.length} 组`, 50, 204);

            // 6. 三张玻璃感核心数据卡片
            const metrics = [
              { label: '总容量 (kg)', value: String(data.totalVolume), accent: true },
              { label: '完成组数', value: `${data.completedSets.length} 组`, accent: false },
              { label: '训练时长', value: data.duration || '0分钟', accent: false }
            ];
            const cardW = 204;
            const cardH = 152;
            const cardGap = 19;
            metrics.forEach((m, i) => {
              const x = 50 + i * (cardW + cardGap);
              const y = 236;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
              roundRect(ctx, x, y, cardW, cardH, 22);
              ctx.fill();
              ctx.strokeStyle = m.accent ? 'rgba(7, 193, 96, 0.32)' : 'rgba(255, 255, 255, 0.09)';
              ctx.lineWidth = 1.5;
              roundRect(ctx, x, y, cardW, cardH, 22);
              ctx.stroke();

              ctx.fillStyle = m.accent ? '#07C160' : '#FFFFFF';
              ctx.font = 'bold 40px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(m.value, x + cardW / 2, y + 76);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.font = '22px sans-serif';
              ctx.fillText(m.label, x + cardW / 2, y + 120);
            });

            // 7. 破纪录 PR 翡翠绿渐变横条
            if (hasPR) {
              const prGrad = ctx.createLinearGradient(50, 414, width - 50, 414);
              prGrad.addColorStop(0, '#07C160');
              prGrad.addColorStop(1, '#059669');
              ctx.fillStyle = prGrad;
              roundRect(ctx, 50, 414, width - 100, 74, 20);
              ctx.fill();

              drawStar(ctx, 94, 451, 13, '#FFFFFF');
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 28px sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(`刷新 ${data.prCount} 项个人纪录`, 122, 461);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.font = 'bold 22px sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText('NEW PR', width - 78, 459);
            }

            // 8. 训练清单
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('训练清单', 50, listHeaderY);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`共 ${(data.groupedSets || []).length} 项`, width - 50, listHeaderY);

            groups.forEach((g, i) => {
              const y = rowStartY + i * rowStep;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
              roundRect(ctx, 50, y, width - 100, 66, 16);
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
              ctx.lineWidth = 1;
              roundRect(ctx, 50, y, width - 100, 66, 16);
              ctx.stroke();

              // 左侧编号圆点
              ctx.fillStyle = 'rgba(7, 193, 96, 0.16)';
              ctx.beginPath();
              ctx.arc(82, y + 33, 15, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#07C160';
              ctx.font = 'bold 20px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(String(i + 1), 82, y + 40);

              // 动作名
              const exName = (g.exercise_name || '动作').length > 11
                ? g.exercise_name.slice(0, 11) + '…'
                : (g.exercise_name || '动作');
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 25px sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText(exName, 112, y + 42);

              // 右侧汇总与 PR 药丸
              let rightEdge = width - 72;
              if (g.hasPR) {
                const pillW = 54;
                const pillX = rightEdge - pillW;
                ctx.fillStyle = '#07C160';
                roundRect(ctx, pillX, y + 18, pillW, 30, 15);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 18px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('PR', pillX + pillW / 2, y + 39);
                rightEdge = pillX - 14;
              }

              ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
              ctx.font = '23px sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText(`${g.sets.length}组 · 最高 ${g.maxWeight}kg`, rightEdge, y + 41);
            });

            if (extraCount > 0) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
              ctx.font = '22px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`+ 其余 ${extraCount} 个动作`, width / 2, rowStartY + groups.length * rowStep + 22);
            }

            // 9. 底部精致分隔线与品牌落款
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(50, footerLineY);
            ctx.lineTo(width - 50, footerLineY);
            ctx.stroke();

            drawDumbbellWatermark(ctx, 72, footerLineY + 52, 0.45, '#07C160');

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('训练记一记', 104, footerLineY + 61);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('记录进步', width - 50, footerLineY + 60);

            wx.canvasToTempFilePath({
              canvas,
              destWidth: width * dpr,
              destHeight: height * dpr,
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

/**
 * 绘制极简几何哑铃图标/水印
 */
function drawDumbbellWatermark(ctx, cx, cy, scale, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.32);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(26, 0);
  ctx.moveTo(-26, -18);
  ctx.lineTo(-26, 18);
  ctx.moveTo(26, -18);
  ctx.lineTo(26, 18);
  ctx.moveTo(-38, -11);
  ctx.lineTo(-38, 11);
  ctx.moveTo(38, -11);
  ctx.lineTo(38, 11);
  ctx.stroke();
  ctx.restore();
}

/**
 * 绘制五角星（用于 PR 徽章）
 */
function drawStar(ctx, cx, cy, outerR, color) {
  const innerR = outerR * 0.45;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
