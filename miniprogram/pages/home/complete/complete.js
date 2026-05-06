/**
 * 训练完成页面
 */

const { findOne } = require('../../../localdb/db.js');
const UI = require('../../../utils/ui.js');

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
    if (!options.sessionId) {
      UI.showToast('缺少会话信息', this);
      setTimeout(() => wx.redirectTo({ url: '/pages/home/home' }), 1500);
      return;
    }

    this.setData({ sessionId: options.sessionId });
    this.loadSession(options.sessionId);

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
      UI.showToast('会话数据丢失', this);
      setTimeout(() => wx.redirectTo({ url: '/pages/home/home' }), 1500);
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
  },

  /**
   * 生成并分享训练卡片
   */
  onShareCard() {
    const { session, totalVolume, duration, prCount, completedSets } = this.data;
    if (!session) return;

    wx.showLoading({ title: '生成中...' });

    this.drawShareCard({
      planName: session.plan_name,
      totalVolume,
      duration,
      prCount,
      completedSets
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
          const dpr = Math.min(wx.getSystemInfoSync().pixelRatio, 2);
          const width = 750;
          const height = 1000;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          // 背景
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, width, height);

          // 顶部装饰条
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, 12);

          // 标题
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 44px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('训练完成', width / 2, 100);

          // 计划名
          ctx.fillStyle = '#aaaaaa';
          ctx.font = '28px sans-serif';
          ctx.fillText(data.planName || '今日训练', width / 2, 150);

          // 日期
          const now = new Date();
          const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
          ctx.fillStyle = '#888888';
          ctx.font = '24px sans-serif';
          ctx.fillText(dateStr, width / 2, 190);

          // 数据卡片区域背景
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          roundRect(ctx, 50, 230, 650, 280, 20);
          ctx.fill();

          // 三个核心数据
          const metrics = [
            { label: '完成组数', value: data.completedSets.length + '组' },
            { label: '总容量', value: data.totalVolume + 'kg' },
            { label: '训练时长', value: data.duration }
          ];

          metrics.forEach((m, i) => {
            const x = 120 + i * 210;
            const y = 320;

            // 数值
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(m.value, x, y);

            // 标签
            ctx.fillStyle = '#999999';
            ctx.font = '24px sans-serif';
            ctx.fillText(m.label, x, y + 45);
          });

          // PR 区域
          if (data.prCount > 0) {
            ctx.fillStyle = '#FFFFFF';
            roundRect(ctx, 50, 540, 650, 80, 16);
            ctx.fill();

            ctx.fillStyle = '#1A1A1A';
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`PR 恭喜刷新 ${data.prCount} 个个人纪录！`, width / 2, 590);
          }

          // 动作列表标题
          const listY = data.prCount > 0 ? 680 : 560;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('训练动作', 60, listY);

          // 动作列表（最多展示5个）
          const sets = data.completedSets.slice(0, 5);
          sets.forEach((set, i) => {
            const y = listY + 55 + i * 55;
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            roundRect(ctx, 50, y - 35, 650, 48, 10);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(set.exercise_name, 70, y);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${set.actual_weight}kg × ${set.actual_reps}次`, 670, y);

            if (set.is_pr) {
              ctx.fillStyle = '#ffd700';
              ctx.font = 'bold 20px sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText('PR', 620, y);
            }
          });

          // 底部品牌
          const bottomY = height - 60;
          ctx.fillStyle = '#555555';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('健身训练计划小程序', width / 2, bottomY);

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
