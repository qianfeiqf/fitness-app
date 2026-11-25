/**
 * 个人中心页面
 */

const { findOne, update, getCollection } = require('../../localdb/db.js');

Page({
  data: {
    // 用户信息
    userInfo: null,
    isLoggedIn: false,

    // 身体档案
    profile: null,
    weight: 0,
    height: 0,

    // 导出状态
    exporting: false,

    // 目标设定
    goals: [],
    showGoalModal: false,
    selectedGoalExerciseIndex: 0,
    goalExercises: [
      { id: 'ex_001', name: '卧推' },
      { id: 'ex_020', name: '深蹲' },
      { id: 'ex_030', name: '硬拉' }
    ],
    newGoal: {
      exercise_id: 'ex_001',
      target_weight: 100,
      deadline: ''
    },

    // 账号管理半屏抽屉
    showAccountSheet: false,

    // 训练悬浮窗 & 从训练页引导填写体重的返回入口
    trainingFloat: null,
    returnTrainingSessionId: null
  },

  onLoad() {
    this.calcNavBarHeight();
    this.checkLoginStatus();
  },

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - windowInfo.statusBarHeight);
    this.setData({ navHeight });
  },

  onShow() {
    this.checkLoginStatus();
    this.loadProfile();
    this.checkTrainingFloat();
    this.checkReturnTrainingPrompt();
  },

  /**
   * 检查是否是从训练页引导过来完善体重的
   */
  checkReturnTrainingPrompt() {
    const app = getApp();
    if (app.globalData.profileFrom === 'training' && app.globalData.profileReturnSessionId) {
      this.setData({ returnTrainingSessionId: app.globalData.profileReturnSessionId });
    } else {
      this.setData({ returnTrainingSessionId: null });
    }
  },

  /**
   * 填完体重后一键返回刚才的训练会话
   */
  onReturnToTraining() {
    const app = getApp();
    const sessionId = this.data.returnTrainingSessionId || app.globalData.profileReturnSessionId;
    app.globalData.profileFrom = null;
    app.globalData.profilePrompt = null;
    app.globalData.profileReturnSessionId = null;
    this.setData({ returnTrainingSessionId: null });
    if (sessionId) {
      wx.navigateTo({
        url: '/pages/home/training/training?sessionId=' + sessionId
      });
    }
  },

  /**
   * 检查是否有最小化的训练悬浮窗
   */
  checkTrainingFloat() {
    const app = getApp();
    if (app.globalData.trainingMinimized && app.globalData.trainingSnapshot) {
      this.setData({ trainingFloat: app.globalData.trainingSnapshot });
    } else {
      this.setData({ trainingFloat: null });
    }
  },

  /**
   * 点击悬浮窗返回训练页
   */
  onTapTrainingFloat() {
    const app = getApp();
    const snapshot = app.globalData.trainingSnapshot;
    if (snapshot && snapshot.sessionId) {
      app.globalData.trainingMinimized = false;
      app.globalData.trainingMinimizedSessionId = null;
      wx.navigateTo({
        url: '/pages/home/training/training?sessionId=' + snapshot.sessionId
      });
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const app = getApp();

    if (!app.globalData.isLoggedIn) {
      this.setData({ isLoggedIn: false });
      return;
    }

    this.setData({
      isLoggedIn: true,
      userInfo: app.globalData
    });
  },

  /**
   * 登录
   */
  onLogin() {
    const app = getApp();
    app.wxLogin().then(() => {
      this.checkLoginStatus();
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(() => {
      wx.showToast({ title: '登录失败', icon: 'error' });
    });
  },

  /**
   * 加载身体档案
   */
  loadProfile() {
    const profile = findOne('profiles', {});

    if (profile) {
      this.setData({
        profile,
        weight: profile.weight || 0,
        height: profile.height || 0
      });
    }

    this.loadGoals();
  },

  /**
   * 加载目标
   */
  loadGoals() {
    const allGoals = getCollection('goals');
    const goals = allGoals.map(goal => {
      const exercise = findOne('exercises', { id: goal.exercise_id });
      const rmHistory = getCollection('rm_history')
        .filter(r => r.exercise_id === goal.exercise_id)
        .sort((a, b) => b.recorded_at - a.recorded_at);
      const current1RM = rmHistory.length > 0 ? rmHistory[0].estimated_1rm : 0;
      const progress = goal.target_weight > 0
        ? Math.min(Math.round((current1RM / goal.target_weight) * 100), 100)
        : 0;

      return {
        ...goal,
        exercise_name: exercise ? exercise.name : '未知动作',
        current_1rm: current1RM,
        progress,
        progressStyle: `width: ${progress}%;`
      };
    });

    this.setData({ goals });
  },

  /**
   * 显示添加目标弹窗
   */
  onShowGoalModal() {
    const today = new Date();
    const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    const deadlineStr = this.formatDate(threeMonthsLater);

    this.setData({
      showGoalModal: true,
      selectedGoalExerciseIndex: 0,
      newGoal: {
        exercise_id: 'ex_001',
        target_weight: 100,
        deadline: deadlineStr
      }
    });
  },

  /**
   * 隐藏添加目标弹窗
   */
  onHideGoalModal() {
    this.setData({ showGoalModal: false });
  },

  /**
   * 选择目标动作
   */
  onSelectGoalExercise(e) {
    const idx = parseInt(e.detail.value, 10) || 0;
    this.setData({
      selectedGoalExerciseIndex: idx,
      'newGoal.exercise_id': this.data.goalExercises[idx].id
    });
  },

  /**
   * 输入目标重量
   */
  onInputGoalWeight(e) {
    this.setData({
      'newGoal.target_weight': parseFloat(e.detail.value) || 0
    });
  },

  /**
   * 选择截止日期
   */
  onSelectGoalDeadline(e) {
    this.setData({
      'newGoal.deadline': e.detail.value
    });
  },

  /**
   * 保存目标
   */
  onSaveGoal() {
    const { newGoal } = this.data;
    const { insert } = require('../../localdb/db.js');

    if (!newGoal.target_weight || newGoal.target_weight <= 0) {
      wx.showToast({ title: '请输入目标重量', icon: 'none' });
      return;
    }

    const goal = {
      id: 'goal_' + Date.now(),
      exercise_id: newGoal.exercise_id,
      target_weight: newGoal.target_weight,
      deadline: newGoal.deadline,
      status: 'active',
      created_at: Date.now()
    };

    insert('goals', goal);

    this.setData({ showGoalModal: false });
    wx.showToast({ title: '目标已添加', icon: 'success' });
    this.loadGoals();
    this._triggerSilentSync();
  },

  /**
   * 删除目标
   */
  onDeleteGoal(e) {
    const goalId = e.currentTarget.dataset.id;
    const { remove } = require('../../localdb/db.js');

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个目标吗？',
      success: (res) => {
        if (res.confirm) {
          remove('goals', goalId);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadGoals();
          this._triggerSilentSync();
        }
      }
    });
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 更新体重
   */
  onUpdateWeight(e) {
    const weight = parseFloat(e.detail.value) || 0;
    this.setData({ weight });
    this._profileDirty = true;
    this.saveProfile({ weight });
  },

  /**
   * 更新身高
   */
  onUpdateHeight(e) {
    const height = parseFloat(e.detail.value) || 0;
    this.setData({ height });
    this._profileDirty = true;
    this.saveProfile({ height });
  },

  /**
   * 身体档案失焦时给予轻量已保存反馈并静默同步到云端
   */
  onProfileInputBlur() {
    if (this._profileDirty) {
      this._profileDirty = false;
      wx.showToast({ title: '身体档案已保存', icon: 'success', duration: 1200 });
      this._triggerSilentSync();
    }
  },

  _triggerSilentSync() {
    const app = getApp();
    if (app && typeof app.startSync === 'function') {
      app.startSync();
    }
  },

  /**
   * 保存身体档案
   */
  saveProfile(data) {
    const existingProfile = findOne('profiles', {});

    if (existingProfile) {
      update('profiles', existingProfile.id, {
        ...data,
        updated_at: Date.now()
      });
    } else {
      const db = require('../../localdb/db.js');
      db.insert('profiles', {
        weight: this.data.weight,
        height: this.data.height,
        updated_at: Date.now()
      });
    }
  },

  /**
   * 导出训练数据（支持 Markdown 报告或 JSON 完整备份）
   */
  onExportData() {
    if (this.data.exporting) return;

    wx.showActionSheet({
      itemList: ['导出 Markdown 训练报告', '导出 JSON 完整备份'],
      success: (res) => {
        const format = res.tapIndex === 0 ? 'md' : 'json';
        this._performExport(format);
      }
    });
  },

  _performExport(format) {
    this.setData({ exporting: true });
    try {
      const profile = findOne('profiles', {}) || {};
      const plans = getCollection('plans') || [];
      const sessions = (getCollection('sessions') || []).filter(s => s.status === 'completed');
      const sessionSets = getCollection('session_sets') || [];
      const rmHistory = getCollection('rm_history') || [];
      const goals = getCollection('goals') || [];

      const dateStamp = this.formatDate(new Date());
      let content = '';
      let fileName = '';

      if (format === 'md') {
        fileName = `fitness-report-${dateStamp}.md`;
        const lines = [
          `# 健身训练数据报告 (${dateStamp})`,
          '',
          `- 体重：${profile.weight || '-'} kg`,
          `- 身高：${profile.height || '-'} cm`,
          `- 训练计划数：${plans.length}`,
          `- 累计完成训练：${sessions.length} 次`,
          `- 累计完成组数：${sessionSets.length} 组`,
          '',
          '## 最近 10 次训练记录'
        ];
        if (sessions.length === 0) {
          lines.push('- 暂无已完成训练记录');
        } else {
          sessions.slice(-10).reverse().forEach(s => {
            const d = s.scheduled_date || this.formatDate(new Date(s.completed_at || Date.now()));
            const mins = s.total_duration_seconds ? Math.round(s.total_duration_seconds / 60) : 0;
            lines.push(`- ${d} | ${s.plan_name || '自由训练'} | 时长 ${mins} 分钟`);
          });
        }
        content = lines.join('\n');
      } else {
        fileName = `fitness-backup-${dateStamp}.json`;
        content = JSON.stringify({
          exported_at: new Date().toISOString(),
          profile,
          plans,
          sessions,
          session_sets: sessionSets,
          rm_history: rmHistory,
          goals
        }, null, 2);
      }

      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      fs.writeFileSync(filePath, content, 'utf8');

      if (typeof wx.shareFileMessage === 'function') {
        wx.shareFileMessage({
          filePath,
          fileName,
          success: () => {
            wx.showToast({ title: '导出成功', icon: 'success' });
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.includes('cancel')) return;
            this._copyExportToClipboard(content);
          },
          complete: () => {
            this.setData({ exporting: false });
          }
        });
      } else {
        this._copyExportToClipboard(content);
        this.setData({ exporting: false });
      }
    } catch (err) {
      console.error('导出数据失败:', err);
      this.setData({ exporting: false });
      wx.showToast({ title: '导出失败，请重试', icon: 'none' });
    }
  },

  _copyExportToClipboard(content) {
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  },



  onOpenAccountSheet() {
    this.setData({ showAccountSheet: true });
  },

  onCloseAccountSheet() {
    this.setData({ showAccountSheet: false });
  },

  /**
   * 查看隐私保护指引
   */
  onOpenPrivacyPolicy() {
    if (typeof wx.openPrivacyContract === 'function') {
      wx.openPrivacyContract({
        fail: () => {
          this._showFallbackPrivacyModal();
        }
      });
    } else {
      this._showFallbackPrivacyModal();
    }
  },

  _showFallbackPrivacyModal() {
    wx.showModal({
      title: '隐私保护指引',
      content: '本小程序仅在您主动使用时收集训练计划、训练记录及身高体重等身体档案，用于提供跟练记录、1RM估算与云端同步服务；保存战报图片或导出数据时仅在您确认后访问相册或剪贴板。您可随时在「我的」页面导出数据或注销账号。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 查看用户服务协议
   */
  onOpenUserAgreement() {
    wx.showModal({
      title: '用户服务协议',
      content: '1. 本小程序提供的训练计划、1RM估算与重量演进建议仅作健身参考，不构成医疗或专业康复建议。\n2. 请根据自身身体状况合理安排负荷，训练前充分热身，如有不适请立即停止。\n3. 您的训练数据归您本人所有，可随时导出或通过「注销账号」永久删除。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 退出登录（仅清除登录凭证，保留本地训练数据与计划）
   */
  onLogout() {
    this.setData({ showAccountSheet: false });
    wx.showModal({
      title: '确认退出',
      content: '退出登录后将暂停云端同步，本地训练记录和计划仍会保留。确定退出吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('accessToken');
          const app = getApp();
          app.globalData.isLoggedIn = false;
          app.globalData.userId = null;
          app.globalData.openId = null;
          app.globalData.accessToken = null;
          app.globalData.isOfflineMode = false;

          this.setData({
            isLoggedIn: false,
            userInfo: null
          });

          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  /**
   * 注销账号（永久删除云端与本地数据）
   */
  onDeleteAccount() {
    this.setData({ showAccountSheet: false });
    wx.showModal({
      title: '确认注销账号',
      content: '注销后将永久删除您的云端及本地全部训练计划、训练记录与个人档案，且无法恢复。确定要注销吗？',
      confirmText: '确认注销',
      confirmColor: '#FA5151',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '正在注销...' });
        const app = getApp();
        try {
          if (app.globalData.isCloudReady && !app.globalData.isOfflineMode) {
            await app.deleteCloudUserData();
          }
        } catch (err) {
          console.warn('云端数据清理失败，将继续清理本地数据:', err.errMsg || err.message);
        } finally {
          wx.clearStorageSync();
          app.globalData.isLoggedIn = false;
          app.globalData.userId = null;
          app.globalData.openId = null;
          app.globalData.accessToken = null;
          app.globalData.isOfflineMode = false;
          app.globalData.needsOnboarding = true;
          app.initLocalDatabase();

          this.setData({
            isLoggedIn: false,
            userInfo: null,
            profile: null,
            weight: 0,
            height: 0,
            goals: [],
            returnTrainingSessionId: null
          });
          wx.hideLoading();
          wx.showToast({ title: '账号已注销', icon: 'success' });
        }
      }
    });
  }
});
