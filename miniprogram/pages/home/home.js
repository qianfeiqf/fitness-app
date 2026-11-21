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
    swiperHeight: 1000,

    // 训练悬浮窗
    trainingFloat: null,

    // 进行中的自由训练会话
    activeFreeSession: null,
    activeFreeSummary: ''
  },

  // 空操作函数（用于阻止事件冒泡）
  noop() {},

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - windowInfo.statusBarHeight);
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
    } else if (!app.globalData.needsOnboarding) {
      // 仅首次打开小程序时提示一次完善身体档案
      this.checkFirstLaunchProfilePrompt();
    }
  },

  onShow() {
    console.log('=== 训练中心页面显示 ===');
    this.checkLoginAndLoadData();
    this.checkTrainingFloat();
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
      // 清除悬浮窗标记，避免训练页加载时混乱
      app.globalData.trainingMinimized = false;
      app.globalData.trainingMinimizedSessionId = null;
      wx.navigateTo({
        url: '/pages/home/training/training?sessionId=' + snapshot.sessionId
      });
    }
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

  /**
   * 首次打开小程序时弹出一次完善身体档案提示（后续不再重复弹出）
   */
  checkFirstLaunchProfilePrompt() {
    try {
      if (wx.getStorageSync('has_prompted_profile')) return;
      const profile = findOne('profiles', {});
      if (profile && profile.weight) {
        wx.setStorageSync('has_prompted_profile', true);
        return;
      }
      wx.setStorageSync('has_prompted_profile', true);
      wx.showModal({
        title: '完善身体档案',
        content: '为了更准确地计算1RM和训练演进，建议填写您的体重（其他信息可选）',
        confirmText: '去填写',
        cancelText: '暂不填写',
        success: (res) => {
          if (res.confirm) {
            const app = getApp();
            app.globalData.profilePrompt = 'profile';
            wx.switchTab({ url: '/pages/profile/profile' });
          }
        }
      });
    } catch (e) {
      console.warn('首次身体档案提示检查失败:', e);
    }
  },

  onHide() {
    console.log('=== 训练中心页面隐藏 ===');
  },

  onUnload() {
    wx.eventCenter.off('unfinishedSessionFound', this.onUnfinishedSessionFound);
    wx.eventCenter.off('syncCompleted', this.onSyncCompleted);
  },

  /**
   * 检查登录状态并加载数据
   */
  async checkLoginAndLoadData(options = {}) {
    const app = getApp();

    if (!app.globalData.isLoggedIn) {
      // 未登录，显示登录引导
      this.setData({
        isLoggedIn: false,
        loading: false
      });
      return;
    }

    if (!this.data.isLoggedIn || !this.data.userInfo || this.data.userInfo.openId !== app.globalData.openId) {
      this.setData({
        isLoggedIn: true,
        userInfo: { openId: app.globalData.openId }
      });
    }

    await this.loadTodayTraining(options);
  },

  /**
   * 加载今日训练 — 支持多计划
   */
  async loadTodayTraining(options = {}) {
    if (!options.silent && !this._hasLoadedOnce) {
      this.setData({ loading: true });
    }
    this._hasLoadedOnce = true;

    try {
      // 同步检查是否有进行中的自由训练（无论有没有固定计划都展示）
      const { session: activeFreeSession, summary: activeFreeSummary } = this._getActiveFreeSessionInfo();

      // 获取所有激活的计划（最新创建/更新的排在最前，确保新建计划立即可见）
      const allPlans = getCollection('plans');
      const activePlans = allPlans
        .filter(p => p.status === 'active')
        .sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));

      if (activePlans.length === 0) {
        this.setData({
          activePlans: [],
          planDataList: [],
          todayPlan: null,
          activeFreeSession,
          activeFreeSummary,
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
        todayPlan: currentData.plan || null,
        todayExercises: currentData.exercises || [],
        todaySession: currentData.session || null,
        todayDate,
        todayWeek,
        estimatedMinutes: currentData.estimatedMinutes,
        totalSets: currentData.totalSets,
        muscleGroups: currentData.muscleGroups,
        streak,
        isRestDay: currentData.isRestDay,
        showDeloadReminder,
        activeFreeSession,
        activeFreeSummary,
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
    const cycleType = plan.cycle_type || 'natural_week';
    if (cycleType === 'natural_week') {
      todayExercises = planExercises.filter(pe => Number(pe.day_of_week) === dayOfWeek);
    } else {
      const cycleDay = this.calculateCycleDay(plan, planExercises);
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
      id: plan.id,
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
   * 点击顶部计划标签切换计划
   */
  onSelectPlanTab(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index === this.data.currentPlanIndex) return;
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
      todayPlan: planData.plan || null,
      todayExercises: planData.exercises || [],
      todaySession: planData.session || null,
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
  calculateCycleDay(plan, planExercises = []) {
    const startDate = new Date(plan.created_at || Date.now());
    const now = new Date();
    const daysPassed = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));

    // 优先使用计划动作中实际配置的 cycle_label 列表轮换（兼容中文标签如「上肢/下肢」和英文 A/B/C/D）
    const uniqueLabels = [...new Set(planExercises.map(pe => pe.cycle_label).filter(Boolean))];
    if (uniqueLabels.length > 0) {
      return uniqueLabels[daysPassed % uniqueLabels.length];
    }

    const cycleLength = plan.cycle_length || 4;
    const dayInCycle = daysPassed % cycleLength;
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
   * 同步完成回调
   */
  onSyncCompleted(result) {
    // 无新增云端拉取数据时不触发重绘，避免进首页约 1 秒后闪屏刷新
    if (result && typeof result.pulled === 'number' && result.pulled === 0) {
      return;
    }
    console.log('同步拉取到新数据，静默刷新首页');
    this.checkLoginAndLoadData({ silent: true });
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
          // 触发全局登录并同步更新首页登录态
          const app = getApp();
          app.wxLogin().then(() => {
            this.checkLoginAndLoadData();
            wx.showToast({ title: '登录成功', icon: 'success' });
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

    // 跳转到计划详情页
    wx.navigateTo({
      url: `/pages/plans/detail/detail?planId=${planId}`
    });
  },

  /**
   * 跳转到计划页
   */
  onGoToPlans() {
    wx.switchTab({
      url: '/pages/plans/plans'
    });
  },

  /**
   * 查找最近一条进行中或暂停中的自由训练会话
   */
  _getActiveFreeSessionInfo() {
    const sessions = getCollection('sessions') || [];
    const activeFree = sessions
      .filter(s => s && s.is_free_workout && (s.status === 'in_progress' || s.status === 'paused' || s.status === 'active'))
      .sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0))[0] || null;

    if (!activeFree) {
      return { session: null, summary: '' };
    }

    const exCount = (activeFree.pending_exercises || []).length;
    const doneSets = (activeFree.completed_sets || []).length;
    const summary = exCount > 0
      ? `已选 ${exCount} 个动作 · 已完成 ${doneSets} 组，点击继续`
      : '尚未添加动作，点击继续自由训练';
    return { session: activeFree, summary };
  },

  /**
   * 一键开始或继续自由训练（存在进行中自由训练时直接续练，不丢失进度）
   */
  onStartFreeWorkout() {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      this.onLogin();
      return;
    }

    const { session: existingFree } = this._getActiveFreeSessionInfo();
    if (existingFree) {
      this.setData({ currentSession: existingFree, isTraining: true });
      wx.navigateTo({
        url: '/pages/home/training/training?sessionId=' + existingFree.id
      });
      return;
    }

    const now = Date.now();
    const todayStr = this.formatDate(new Date(now));
    const session = {
      id: 'sess_' + now + '_' + Math.random().toString(36).substr(2, 6),
      plan_id: null,
      plan_name: '自由训练',
      is_free_workout: true,
      scheduled_date: todayStr,
      status: 'in_progress',
      started_at: now,
      completed_sets: [],
      pending_exercises: [],
      current_exercise_index: 0,
      current_set_index: 0,
      created_at: now,
      updated_at: now,
      sync_status: 'pending'
    };

    insert('sessions', session);
    this.setData({ currentSession: session, isTraining: true });

    wx.navigateTo({
      url: '/pages/home/training/training?sessionId=' + session.id
    });
  }
});
