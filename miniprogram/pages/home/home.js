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

    // 多计划切换
    activePlans: [],
    planDataList: [],
    currentPlanIndex: 0,

    // 今日训练（当前选中计划）
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

    // 本周训练进度
    weekProgress: { plannedDays: 0, completedDays: 0, percent: 0 },
    streak: 0,
    isRestDay: false,

    // UI状态
    loading: true,
    showRecoveryModal: false,
    unfinishedSession: null,

    // Deload 提醒
    showDeloadReminder: false,

    // Swiper 高度
    swiperHeight: 1000
  },

  // 空操作函数（用于阻止事件冒泡）
  noop() {},

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const systemInfo = wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
    this.setData({ navHeight });
  },

  onLoad() {
    this.calcNavBarHeight();
    console.log('=== 训练中心页面加载 ===');

    // 检查是否需要引导
    this.checkOnboardingRedirect();

    // 监听事件（热启动恢复使用事件，冷启动恢复使用 globalData）
    wx.eventCenter.on('unfinishedSessionFound', this.onUnfinishedSessionFound, this);
    wx.eventCenter.on('syncCompleted', this.onSyncCompleted, this);

    // 检查冷启动时 onLaunch 已检测到的未完成会话
    const app = getApp();
    if (app.globalData.unfinishedSession) {
      this.onUnfinishedSessionFound(app.globalData.unfinishedSession);
      delete app.globalData.unfinishedSession;
    }
  },

  onShow() {
    console.log('=== 训练中心页面显示 ===');
    this.checkLoginAndLoadData();
  },

  /**
   * 检查是否需要跳转到引导页
   */
  checkOnboardingRedirect() {
    const app = getApp();
    if (app.globalData.needsOnboarding) {
      wx.redirectTo({
        url: '/pages/onboarding/onboarding'
      });
    }
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
      userInfo: { openId: app.globalData.openId }
    });

    await this.loadTodayTraining();
  },

  /**
   * 加载今日训练 — 支持多计划
   */
  async loadTodayTraining() {
    this.setData({ loading: true });

    try {
      // 获取所有激活的计划
      const allPlans = getCollection('plans');
      const activePlans = allPlans.filter(p => p.status === 'active');

      if (activePlans.length === 0) {
        this.setData({
          activePlans: [],
          planDataList: [],
          todayPlan: null,
          loading: false,
          showDeloadReminder: false
        });
        return;
      }

      // 检查是否需要 Deload 提醒（全局，基于所有计划）
      const showDeloadReminder = this.checkDeloadReminder();

      // 预计算每个计划的数据
      const planDataList = activePlans.map(plan => this._buildPlanData(plan));

      // 全局 streak
      const streak = this.calcStreak();

      // 当前日期
      const now = new Date();
      const todayDate = now.getDate();
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const todayWeek = weekDays[now.getDay()];

      const currentIndex = this.data.currentPlanIndex || 0;
      const safeIndex = Math.min(currentIndex, activePlans.length - 1);
      const currentData = planDataList[safeIndex];

      this.setData({
        activePlans,
        planDataList,
        currentPlanIndex: safeIndex,
        todayPlan: currentData.plan,
        todayExercises: currentData.exercises,
        todaySession: currentData.session,
        todayDate,
        todayWeek,
        estimatedMinutes: currentData.estimatedMinutes,
        totalSets: currentData.totalSets,
        muscleGroups: currentData.muscleGroups,
        streak,
        isRestDay: currentData.isRestDay,
        showDeloadReminder,
        swiperHeight: this.calcSwiperHeight(currentData.exercises.length),
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
   * 构建单个计划的今日数据
   */
  _buildPlanData(plan) {
    const today = new Date().getDay();
    const dayOfWeek = today === 0 ? 7 : today;
    const planExercises = find('plan_exercises', { plan_id: plan.id });

    let todayExercises = [];
    if (plan.cycle_type === 'natural_week') {
      todayExercises = planExercises.filter(pe => pe.day_of_week === dayOfWeek);
    } else {
      const cycleDay = this.calculateCycleDay(plan);
      todayExercises = planExercises.filter(pe => pe.cycle_label === cycleDay);
    }

    const exercisesWithDetails = todayExercises.map(pe => {
      const exercise = findOne('exercises', { id: pe.exercise_id });
      if (!exercise) return null;
      return {
        ...exercise,
        plan_exercise_id: pe.id,
        target_sets: pe.target_sets,
        target_reps: pe.target_reps,
        target_weight: pe.initial_weight,
        rest_seconds: pe.rest_seconds || 120
      };
    }).filter(e => e !== null);

    const todayStr = this.formatDate(new Date());
    const session = findOne('sessions', {
      plan_id: plan.id,
      scheduled_date: todayStr,
      status: { $in: ['in_progress', 'paused'] }
    });

    const totalSets = exercisesWithDetails.reduce((sum, e) => sum + (e.target_sets || 0), 0);
    const estimatedMinutes = exercisesWithDetails.length * 8;
    const muscleSet = new Set(exercisesWithDetails.map(e => e.muscle_group));
    const muscleGroups = Array.from(muscleSet).join('/');
    const weekProgress = this.calcWeekProgress(plan, planExercises);

    return {
      plan,
      exercises: exercisesWithDetails,
      session,
      totalSets,
      estimatedMinutes,
      muscleGroups,
      weekProgress,
      isRestDay: todayExercises.length === 0
    };
  },

  /**
   * 计算 Swiper 高度（基于动作数量）
   */
  calcSwiperHeight(exercisesCount) {
    // 基础高度：周概览(172) + 卡片(520) + 间距(32)
    let h = 724;
    if (exercisesCount > 0) {
      // 动作预览 header(60) + 每个动作项(88)
      h += 60 + exercisesCount * 88;
    }
    return h;
  },

  /**
   * Swiper 切换计划
   */
  onPlanChange(e) {
    const index = e.detail.current;
    this.switchToPlan(index);
  },

  /**
   * 切换到指定计划
   */
  switchToPlan(index) {
    const { planDataList } = this.data;
    if (index < 0 || index >= planDataList.length) return;

    const planData = planDataList[index];
    this.setData({
      currentPlanIndex: index,
      todayPlan: planData.plan,
      todayExercises: planData.exercises,
      todaySession: planData.session,
      estimatedMinutes: planData.estimatedMinutes,
      totalSets: planData.totalSets,
      muscleGroups: planData.muscleGroups,
      isRestDay: planData.isRestDay,
      swiperHeight: this.calcSwiperHeight(planData.exercises.length)
    });
  },

  /**
   * 计算本周训练进度
   */
  calcWeekProgress(activePlan, planExercises) {
    if (!activePlan) {
      return { plannedDays: 0, completedDays: 0, percent: 0 };
    }
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日
    // 计算本周一和本周日
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // 计划训练天数
    let plannedDays = 0;
    if (activePlan.cycle_type === 'natural_week') {
      const uniqueDays = new Set(planExercises.map(pe => pe.day_of_week));
      plannedDays = uniqueDays.size;
    } else {
      const uniqueLabels = new Set(planExercises.map(pe => pe.cycle_label));
      plannedDays = uniqueLabels.size;
    }
    if (plannedDays === 0) plannedDays = 3; // 默认3天

    // 本周已完成训练天数（按日期去重）
    const sessions = find('sessions', s =>
      s.status === 'completed' &&
      s.completed_at >= monday.getTime() &&
      s.completed_at <= sunday.getTime()
    );
    const completedDays = new Set(sessions.map(s => this.formatDate(new Date(s.completed_at)))).size;

    return {
      plannedDays,
      completedDays,
      percent: Math.min(Math.round((completedDays / plannedDays) * 100), 100)
    };
  },

  /**
   * 检查是否需要 Deload 提醒
   * 连续训练满 6 周（42天），且最近 6 周没有 Deload 记录，则提醒
   */
  checkDeloadReminder() {
    const now = Date.now();
    const sixWeeksAgo = now - 42 * 24 * 60 * 60 * 1000;

    // 获取最近 6 周的已完成训练
    const sessions = getCollection('sessions')
      .filter(s => s.status === 'completed' && s.completed_at >= sixWeeksAgo);

    if (sessions.length < 6) {
      return false; // 训练频率不够，不需要 Deload
    }

    // 检查最近 6 周是否有 Deload 记录
    const progressions = getCollection('progressions');
    const hasRecentDeload = progressions.some(p =>
      p.progression_type === 'deload' &&
      p.created_at >= sixWeeksAgo
    );

    return !hasRecentDeload;
  },

  /**
   * 关闭 Deload 提醒
   */
  onDismissDeloadReminder() {
    this.setData({ showDeloadReminder: false });
  },

  /**
   * 计算连续训练 Streak
   */
  calcStreak() {
    const sessions = getCollection('sessions')
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.completed_at - a.completed_at);

    if (sessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 检查今天或昨天是否有训练
    const lastSessionDate = new Date(sessions[0].completed_at);
    lastSessionDate.setHours(0, 0, 0, 0);

    if (lastSessionDate.getTime() !== today.getTime() && lastSessionDate.getTime() !== yesterday.getTime()) {
      return 0; // 如果最近训练不是今天或昨天，streak已断
    }

    const trainedDates = new Set(sessions.map(s => this.formatDate(new Date(s.completed_at))));

    // 从今天开始向前数
    const checkDate = lastSessionDate.getTime() === today.getTime() ? today : yesterday;
    let currentDate = new Date(checkDate);

    while (trainedDates.has(this.formatDate(currentDate))) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  },

  /**
   * 计算当前处于循环的第几天
   */
  calculateCycleDay(plan) {
    // 计算从计划开始到现在过了多少天
    const startDate = new Date(plan.created_at);
    const now = new Date();
    const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    // 从计划配置读取循环长度，默认4天
    const cycleLength = plan.cycle_length || 4;
    const dayInCycle = daysPassed % cycleLength;

    // 将循环日映射为 A/B/C/D... 支持最多14天
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet[dayInCycle] || 'A';
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
   * 开始训练（指定计划）
   */
  onStartTrainingForPlan(e) {
    const planId = e.currentTarget.dataset.planId;
    const planData = this.data.planDataList.find(pd => pd.plan.id === planId);
    if (!planData) return;

    if (planData.exercises.length === 0) {
      wx.showToast({ title: '今日无训练计划', icon: 'none' });
      return;
    }

    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      this.onLogin();
      return;
    }

    const session = this._createSessionForPlan(planData);
    this.setData({ currentSession: session, isTraining: true });
    wx.navigateTo({
      url: '/pages/home/training/training?sessionId=' + session.id
    });
  },

  /**
   * 继续训练（指定计划）
   */
  onResumeTrainingForPlan(e) {
    const sessionId = e.currentTarget.dataset.sessionId;
    if (!sessionId) return;

    const session = findOne('sessions', { id: sessionId });
    if (session) {
      this.setData({ currentSession: session, isTraining: true });
      wx.navigateTo({
        url: '/pages/home/training/training?sessionId=' + session.id
      });
    }
  },

  /**
   * 为指定计划创建训练会话
   */
  _createSessionForPlan(planData) {
    const todayStr = this.formatDate(new Date());
    const session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      plan_id: planData.plan.id,
      plan_name: planData.plan.name,
      scheduled_date: todayStr,
      status: 'in_progress',
      started_at: Date.now(),
      completed_sets: [],
      pending_exercises: planData.exercises.map(e => ({
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
   * 开始训练（兼容旧入口）
   */
  onStartTraining() {
    this.onStartTrainingForPlan({
      currentTarget: { dataset: { planId: this.data.todayPlan?.id } }
    });
  },

  /**
   * 创建训练会话（兼容旧入口）
   */
  createTrainingSession() {
    const pd = this.data.planDataList.find(p => p.plan.id === this.data.todayPlan?.id);
    return this._createSessionForPlan(pd || this.data.planDataList[0]);
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
          }).catch(() => {
            wx.showToast({ title: '登录失败，请重试', icon: 'error' });
          });
        }
      }
    });
  },

  /**
   * 预览计划详情（指定计划）
   */
  onPreviewPlanById(e) {
    const planId = e.currentTarget.dataset.planId;
    const pd = this.data.planDataList.find(p => p.plan.id === planId);
    if (!pd) return;

    wx.showModal({
      title: pd.plan.name,
      content: `训练日: ${pd.exercises.length} 个动作\n预计时长: 约 ${pd.exercises.length * 8} 分钟`,
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
