/**
 * 训练中心首页 - 今日训练面板
 */

const { getCollection, findOne, find, insert, update, getDatabase } = require('../../localdb/db.js');
const { calculateAndSave1RM, checkMilestone } = require('../../services/rm.js');
const { calculateProgression } = require('../../services/progression.js');

Page({
  data: {
    // 用户信息
    userInfo: null,
    isLoggedIn: false,

    // 今日训练
    todayPlan: null,
    todaySession: null,
    todayExercises: [],

    // 计算属性（需初始化）
    todayDate: '',
    todayWeek: '',
    estimatedMinutes: 0,
    totalSets: 0,
    muscleGroups: '',

    // 训练状态
    isTraining: false,
    currentSession: null,

    // UI状态
    loading: true,
    showRecoveryModal: false,
    unfinishedSession: null
  },

  // 空操作函数（用于阻止事件冒泡）
  noop() {},

  onLoad() {
    console.log('=== 训练中心页面加载 ===');

    // 监听事件
    wx.eventCenter.on('unfinishedSessionFound', this.onUnfinishedSessionFound, this);
    wx.eventCenter.on('syncCompleted', this.onSyncCompleted, this);
  },

  onShow() {
    console.log('=== 训练中心页面显示 ===');
    this.checkLoginAndLoadData();
  },

  onHide() {
    console.log('=== 训练中心页面隐藏 ===');
    // 保存快照
    if (this.data.currentSession) {
      this.saveSessionSnapshot();
    }
  },

  onUnload() {
    wx.eventCenter.off('unfinishedSessionFound', this.onUnfinishedSessionFound);
    wx.eventCenter.off('syncCompleted', this.onSyncCompleted);
  },

  /**
   * 检查登录状态并加载数据
   */
  async checkLoginAndLoadData() {
    const app = getApp();

    if (!app.globalData.isLoggedIn) {
      // 未登录，显示登录引导
      this.setData({
        isLoggedIn: false,
        loading: false
      });
      return;
    }

    this.setData({
      isLoggedIn: true,
      userInfo: app.globalData
    });

    await this.loadTodayTraining();
  },

  /**
   * 加载今日训练
   */
  async loadTodayTraining() {
    this.setData({ loading: true });

    try {
      // 获取当前激活的计划
      const activePlan = findOne('plans', { status: 'active' });

      if (!activePlan) {
        this.setData({
          todayPlan: null,
          loading: false
        });
        return;
      }

      // 获取今日应该训练的内容
      const today = new Date().getDay(); // 0=周日, 1=周一...
      const dayOfWeek = today === 0 ? 7 : today; // 转换为1-7

      // 查询今日的训练动作
      const planExercises = find('plan_exercises', { plan_id: activePlan.id });

      // 根据周期类型筛选今日动作
      let todayExercises = [];

      if (activePlan.cycle_type === 'natural_week') {
        // 自然周模式：按dayOfWeek筛选
        todayExercises = planExercises.filter(pe => pe.day_of_week === dayOfWeek);
      } else {
        // 训练日循环模式：根据当前处于第几天计算
        const cycleDay = this.calculateCycleDay(activePlan);
        todayExercises = planExercises.filter(pe => pe.cycle_label === cycleDay);
      }

      // 获取动作详情
      const exercisesWithDetails = todayExercises.map(pe => {
        const exercise = findOne('exercises', { id: pe.exercise_id });
        if (!exercise) {
          console.warn('动作不存在:', pe.exercise_id);
          return null;
        }
        return {
          ...exercise,
          plan_exercise_id: pe.id,
          target_sets: pe.target_sets,
          target_reps: pe.target_reps,
          target_weight: pe.initial_weight,
          rest_seconds: pe.rest_seconds || 120
        };
      }).filter(e => e !== null);

      // 检查今日是否已有进行中的会话
      const todayStr = this.formatDate(new Date());
      const existingSession = findOne('sessions', {
        plan_id: activePlan.id,
        scheduled_date: todayStr,
        status: { $in: ['in_progress', 'paused'] }
      });

      // 计算统计数据
      const now = new Date();
      const todayDate = now.getDate();
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const todayWeek = weekDays[now.getDay()];

      // 估算时长和总组数
      const totalSets = exercisesWithDetails.reduce((sum, e) => sum + (e.target_sets || 0), 0);
      const estimatedMinutes = exercisesWithDetails.length * 8; // 每个动作约8分钟

      // 肌群去重
      const muscleSet = new Set(exercisesWithDetails.map(e => e.muscle_group));
      const muscleGroups = Array.from(muscleSet).join('/');

      this.setData({
        todayPlan: activePlan,
        todayExercises: exercisesWithDetails,
        todaySession: existingSession,
        todayDate,
        todayWeek,
        estimatedMinutes,
        totalSets,
        muscleGroups,
        loading: false
      });

    } catch (err) {
      console.error('加载今日训练失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 计算当前处于循环的第几天
   */
  calculateCycleDay(plan) {
    // 计算从计划开始到现在过了多少天
    const startDate = new Date(plan.created_at);
    const now = new Date();
    const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    // 假设一个循环是A-B-A-B...共4天
    const cycleLength = 4;
    const dayInCycle = daysPassed % cycleLength;

    return dayInCycle < 2 ? 'A' : 'B';
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 未完成会话恢复提示
   */
  onUnfinishedSessionFound(session) {
    console.log('发现未完成会话:', session);
    this.setData({
      showRecoveryModal: true,
      unfinishedSession: session
    });
  },

  /**
   * 恢复训练
   */
  onRecoverTraining() {
    const session = this.data.unfinishedSession;
    if (session) {
      this.setData({
        currentSession: session,
        isTraining: true,
        showRecoveryModal: false
      });
      wx.navigateTo({
        url: '/pages/home/training/training?sessionId=' + session.id
      });
    }
  },

  /**
   * 放弃训练
   */
  onAbandonTraining() {
    const session = this.data.unfinishedSession;
    if (session) {
      update('sessions', session.id, {
        status: 'aborted',
        aborted_at: Date.now()
      });
    }
    this.setData({
      showRecoveryModal: false,
      unfinishedSession: null
    });
    this.loadTodayTraining();
  },

  /**
   * 开始训练
   */
  onStartTraining() {
    if (!this.data.todayPlan || this.data.todayExercises.length === 0) {
      wx.showToast({
        title: '今日无训练计划',
        icon: 'none'
      });
      return;
    }

    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      this.onLogin();
      return;
    }

    // 创建新的训练会话
    const session = this.createTrainingSession();

    this.setData({
      currentSession: session,
      isTraining: true
    });

    wx.navigateTo({
      url: '/pages/home/training/training?sessionId=' + session.id
    });
  },

  /**
   * 创建训练会话
   */
  createTrainingSession() {
    const todayStr = this.formatDate(new Date());

    const session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      plan_id: this.data.todayPlan.id,
      plan_name: this.data.todayPlan.name,
      scheduled_date: todayStr,
      status: 'in_progress',
      started_at: Date.now(),
      completed_sets: [],
      pending_exercises: this.data.todayExercises.map(e => ({
        exercise_id: e.id,
        exercise_name: e.name,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: e.target_weight,
        rest_seconds: e.rest_seconds,
        completed_sets: 0
      })),
      current_exercise_index: 0,
      current_set_index: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
      sync_status: 'pending'
    };

    insert('sessions', session);
    return session;
  },

  /**
   * 保存会话快照
   */
  saveSessionSnapshot() {
    if (!this.data.currentSession) return;

    update('sessions', this.data.currentSession.id, {
      status: this.data.currentSession.status,
      pending_exercises: this.data.currentSession.pending_exercises,
      current_exercise_index: this.data.currentSession.current_exercise_index,
      current_set_index: this.data.currentSession.current_set_index,
      updated_at: Date.now(),
      snapshot: true
    });
  },

  /**
   * 同步完成回调
   */
  onSyncCompleted() {
    console.log('同步完成，刷新数据');
    this.loadTodayTraining();
  },

  /**
   * 跳转到登录
   */
  onLogin() {
    wx.showModal({
      title: '提示',
      content: '请先登录后再开始训练',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 触发全局登录
          const app = getApp();
          app.wxLogin().then(() => {
            this.loadTodayTraining();
          });
        }
      }
    });
  },

  /**
   * 预览计划详情
   */
  onPreviewPlan() {
    if (!this.data.todayPlan) return;

    wx.showModal({
      title: this.data.todayPlan.name,
      content: `训练日: ${this.data.todayExercises.length} 个动作\n预计时长: 约 ${this.data.todayExercises.length * 8} 分钟`,
      showCancel: true,
      confirmText: '查看详情',
      cancelText: '关闭'
    });
  },

  /**
   * 跳转到计划页
   */
  onGoToPlans() {
    wx.switchTab({
      url: '/pages/plans/plans'
    });
  }
});
