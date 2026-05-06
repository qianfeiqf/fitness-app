/**
 * 个人中心页面
 */

const { findOne, update, find } = require('../../localdb/db.js');

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
    goalExercises: [
      { id: 'ex_001', name: '卧推' },
      { id: 'ex_020', name: '深蹲' },
      { id: 'ex_030', name: '硬拉' }
    ],
    newGoal: {
      exercise_id: 'ex_001',
      target_weight: 100,
      deadline: ''
    }
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadProfile();
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
    }).catch(err => {
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
    const { getCollection, findOne } = require('../../localdb/db.js');
    const allGoals = getCollection('goals');
    const goals = allGoals.map(goal => {
      const exercise = findOne('exercises', { id: goal.exercise_id });
      // 计算当前进度
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
        progress
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
    const exerciseId = e.detail.value;
    this.setData({
      'newGoal.exercise_id': this.data.goalExercises[exerciseId].id
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

    this.saveProfile({ weight });
  },

  /**
   * 更新身高
   */
  onUpdateHeight(e) {
    const height = parseFloat(e.detail.value) || 0;
    this.setData({ height });

    this.saveProfile({ height });
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
   * 导出数据
   */
  onExportData() {
    this.setData({ exporting: true });

    wx.showModal({
      title: '选择导出格式',
      content: '导出功能开发中',
      showCancel: true,
      confirmText: '确定',
      success: (res) => {
        this.setData({ exporting: false });
      }
    });
  },

  /**
   * 同步数据
   */
  onSyncData() {
    const app = getApp();
    app.startSync();

    wx.showToast({ title: '同步开始...', icon: 'loading', duration: 1000 });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          getApp().globalData.isLoggedIn = false;
          getApp().globalData.userId = null;
          getApp().globalData.openId = null;

          this.setData({
            isLoggedIn: false,
            userInfo: null,
            profile: null
          });

          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }
});
