/**
 * 计划管理页面
 */

const { find, findOne, insert, update, remove, getCollection, getPlanTemplatesSeedData } = require('../../localdb/db.js');

Page({
  data: {
    plans: [],
    activePlan: null,
    templates: [],
    filteredTemplates: [],
    loading: true,
    showCloneModal: false,
    showTemplateDetailModal: false,
    selectedTemplate: null,
    templateExerciseList: [],
    showTemplateIntroModal: false,
    cloneSource: null,
    filterDays: 0,
    filterOptions: [0, 2, 3, 4, 5, 6],
    filterDifficulty: '',
    filterDifficultyOptions: ['', '入门', '中级', '进阶'],
    difficultyTabs: [
      { title: '全部' },
      { title: '入门' },
      { title: '中级' },
      { title: '进阶' }
    ],
    difficultyTabIndex: 0,
    daysTabs: [
      { title: '全部' },
      { title: '2天' },
      { title: '3天' },
      { title: '4天' },
      { title: '5天' },
      { title: '6天' }
    ],
    daysTabIndex: 0,

    // 计划推荐向导
    showRecommendModal: false,
    recommendStep: 1,
    wizardGoals: [
      { id: 'muscle', name: '增肌塑形', icon: '', desc: '增加肌肉量，改善体型线条' },
      { id: 'fatloss', name: '减脂瘦身', icon: '', desc: '降低体脂率，提升代谢水平' },
      { id: 'strength', name: '力量提升', icon: '', desc: '提升最大力量，突破重量瓶颈' },
      { id: 'general', name: '综合健康', icon: '', desc: '全面提升身体素质，保持健康' }
    ],
    wizardSelectedGoal: null,
    wizardDayOptions: [
      { days: 2, desc: '轻松入门' },
      { days: 3, desc: '经典安排' },
      { days: 4, desc: '进阶训练' },
      { days: 5, desc: '密集训练' },
      { days: 6, desc: '硬核模式' }
    ],
    wizardSelectedDays: null,
    wizardExpOptions: [
      { id: 'beginner', name: '纯新手', tag: '入门', desc: '刚开始接触健身，或从未系统训练过' },
      { id: 'intermediate', name: '有半年经验', tag: '中级', desc: '已经训练过一段时间，熟悉基础动作' },
      { id: 'advanced', name: '老手', tag: '进阶', desc: '系统训练一年以上，追求突破' }
    ],
    wizardSelectedExp: null,
    wizardRecommended: [],
    wizardSelectedPlan: null,

    // 训练悬浮窗
    trainingFloat: null,
    navHeight: 0
  },

  onLoad() {
    this.calcNavBarHeight();
    this.loadPlans();
    this.loadTemplates();
  },

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - windowInfo.statusBarHeight);
    this.setData({ navHeight });
  },

  onShow() {
    this.loadPlans();
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

  /** 阻止弹窗打开时背景页面滚动 */
  preventTouchMove() {},

  /**
   * 跳转到新建计划页面
   */
  onNavigateToCreate() {
    wx.navigateTo({
      url: '/pages/plans/create/create'
    });
  },

  /**
   * 空操作（阻止事件冒泡）
   */
  noop() {},

  /**
   * 加载用户计划
   */
  loadPlans() {
    this.setData({ loading: true });

    const rawPlans = [...(find('plans') || [])];
    const allPlanExercises = find('plan_exercises') || [];

    const plans = rawPlans.map(p => {
      const exList = allPlanExercises.filter(pe => pe.plan_id === p.id);
      const exerciseCount = exList.length;
      let daysCount = 0;
      if ((p.cycle_type || 'natural_week') === 'natural_week') {
        daysCount = new Set(exList.map(pe => pe.day_of_week).filter(Boolean)).size;
      } else {
        daysCount = new Set(exList.map(pe => pe.cycle_label).filter(Boolean)).size;
      }
      let summaryText = '';
      if (daysCount > 0 && exerciseCount > 0) {
        summaryText = `每周 ${daysCount} 天 · ${exerciseCount} 个动作`;
      } else if (exerciseCount > 0) {
        summaryText = `共 ${exerciseCount} 个动作`;
      } else if (p.description) {
        summaryText = p.description;
      } else {
        summaryText = '尚未添加训练动作';
      }
      return { ...p, daysCount, exerciseCount, summaryText };
    });

    // 进行中的计划排在前面
    plans.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (b.created_at || 0) - (a.created_at || 0);
    });

    this.setData({
      plans,
      loading: false
    });
  },

  /**
   * 加载经典计划模板
   */
  loadTemplates() {
    // 尝试从数据库加载
    let dbTemplates = find('plan_templates');

    // 如果数据库中没有模板，使用种子数据初始化
    if (!dbTemplates || dbTemplates.length === 0) {
      const seedTemplates = getPlanTemplatesSeedData();
      seedTemplates.forEach(tpl => {
        insert('plan_templates', tpl);
      });
      dbTemplates = find('plan_templates');
    }

    this.setData({
      templates: dbTemplates,
      filteredTemplates: dbTemplates
    });
  },

  /**
   * 生成默认计划名称：直接使用原名，仅重名时顺延数字（2、3...），不拼「副本」
   */
  _getDefaultPlanName(baseName) {
    const trimmed = (baseName || '').trim() || '我的训练计划';
    const existing = (find('plans') || []).map(p => (p.name || '').trim());
    if (!existing.includes(trimmed)) return trimmed;
    let idx = 2;
    while (existing.includes(`${trimmed} ${idx}`)) { idx++; }
    return `${trimmed} ${idx}`;
  },

  onInputPlanName(e) {
    this.setData({ newPlanName: e.detail.value });
  },

  /**
   * 显示使用模板弹窗
   */
  onShowCloneTemplateModal(e) {
    const { templateId } = e.currentTarget.dataset;
    const template = this.data.templates.find(t => t.id === templateId);

    if (template) {
      this.setData({
        showCloneModal: true,
        cloneSource: { type: 'template', data: template },
        newPlanName: this._getDefaultPlanName(template.name)
      });
    }
  },

  /**
   * 从详情弹窗触发使用模板
   */
  onShowCloneTemplateFromDetail() {
    const template = this.data.selectedTemplate;
    if (template) {
      this.setData({
        showTemplateDetailModal: false,
        showCloneModal: true,
        cloneSource: { type: 'template', data: template },
        newPlanName: this._getDefaultPlanName(template.name)
      });
    }
  },

  /**
   * 从介绍弹窗触发使用模板
   */
  onShowCloneTemplateFromIntro() {
    const template = this.data.selectedTemplate;
    if (template) {
      this.setData({
        showTemplateIntroModal: false,
        showCloneModal: true,
        cloneSource: { type: 'template', data: template },
        newPlanName: this._getDefaultPlanName(template.name)
      });
    }
  },

  /**
   * 取消使用
   */
  onCancelClone() {
    this.setData({
      showCloneModal: false,
      cloneSource: null,
      newPlanName: ''
    });
  },

  /**
   * 确认使用计划
   */
  onConfirmClone() {
    if (!this.data.newPlanName.trim()) {
      wx.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    const { cloneSource } = this.data;
    if (!cloneSource) return;

    let newPlan;

    if (cloneSource.type === 'template') {
      newPlan = this.cloneFromTemplate(cloneSource.data);
    } else if (cloneSource.type === 'plan') {
      newPlan = this.cloneFromPlan(cloneSource.data);
    }

    if (newPlan) {
      insert('plans', newPlan);
      this.setData({
        showCloneModal: false,
        cloneSource: null,
        newPlanName: ''
      });
      this.loadPlans();
      wx.showToast({ title: '计划已添加', icon: 'success' });
      const app = getApp();
      if (app && typeof app.startSync === 'function') {
        app.startSync();
      }
    }
  },

  /**
   * 从模板克隆计划
   */
  cloneFromTemplate(template) {
    const plan = {
      id: 'plan_' + Date.now(),
      name: this.data.newPlanName.trim(),
      status: 'active',
      cycle_type: template.cycle_type || 'natural_week',
      description: template.description,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // 克隆模板动作
    if (template.exercises && template.exercises.length > 0) {
      template.exercises.forEach(ex => {
        const planExercise = {
          id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          plan_id: plan.id,
          exercise_id: ex.exercise_id,
          day_of_week: ex.day_of_week,
          cycle_label: ex.cycle_label,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          initial_weight: ex.initial_weight,
          rest_seconds: ex.rest_seconds || 120,
          created_at: Date.now()
        };
        insert('plan_exercises', planExercise);
      });
    }

    return plan;
  },

  /**
   * 从已有计划克隆
   */
  cloneFromPlan(sourcePlan) {
    const plan = {
      id: 'plan_' + Date.now(),
      name: this.data.newPlanName.trim(),
      status: 'active',
      cycle_type: sourcePlan.cycle_type || 'natural_week',
      description: sourcePlan.description,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // 克隆计划动作
    const sourceExercises = find('plan_exercises', { plan_id: sourcePlan.id });
    if (sourceExercises && sourceExercises.length > 0) {
      sourceExercises.forEach(ex => {
        const planExercise = {
          id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          plan_id: plan.id,
          exercise_id: ex.exercise_id,
          day_of_week: ex.day_of_week,
          cycle_label: ex.cycle_label,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          initial_weight: ex.initial_weight,
          rest_seconds: ex.rest_seconds || 120,
          created_at: Date.now()
        };
        insert('plan_exercises', planExercise);
      });
    }

    return plan;
  },

  /**
   * 删除计划
   */
  onDeletePlan(e) {
    const { planId } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？删除后无法恢复',
      confirmColor: '#8B0000',
      success: (res) => {
        if (res.confirm) {
          // 删除计划下的所有动作
          const planExercises = find('plan_exercises', { plan_id: planId });
          planExercises.forEach(pe => {
            remove('plan_exercises', pe.id);
          });

          // 删除计划
          remove('plans', planId);

          this.loadPlans();
          wx.showToast({ title: '计划已删除', icon: 'success' });
        }
      }
    });
  },

  /**
   * 查看计划详情
   */
  onViewPlanDetail(e) {
    const { planId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/plans/detail/detail?planId=' + planId
    });
  },

  /**
   * 查看模板详情
   */
  onViewTemplateDetail(e) {
    const { templateId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/plans/detail/detail?templateId=' + templateId
    });
  },

  /**
   * 关闭模板详情弹窗
   */
  onCloseTemplateDetail() {
    this.setData({
      showTemplateDetailModal: false,
      selectedTemplate: null,
      templateExerciseList: []
    });
  },

  /**
   * 点击难度胶囊筛选
   */
  onSelectDifficultyPill(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const difficulty = this.data.filterDifficultyOptions[index];
    this.setData({ difficultyTabIndex: index });
    this.applyFilters({ filterDifficulty: difficulty });
  },

  /**
   * 点击训练天数胶囊筛选
   */
  onSelectDaysPill(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const days = this.data.filterOptions[index];
    this.setData({ daysTabIndex: index });
    this.applyFilters({ filterDays: days });
  },

  /**
   * 切换难度 Tab（兼容）
   */
  onDifficultyTabChange(e) {
    const index = e.detail.index;
    const difficulty = this.data.filterDifficultyOptions[index];
    this.setData({ difficultyTabIndex: index });
    this.applyFilters({ filterDifficulty: difficulty });
  },

  /**
   * 切换训练天数 Tab（兼容）
   */
  onDaysTabChange(e) {
    const index = e.detail.index;
    const days = this.data.filterOptions[index];
    this.setData({ daysTabIndex: index });
    this.applyFilters({ filterDays: days });
  },

  /**
   * 应用筛选
   */
  applyFilters({ filterDays, filterDifficulty } = {}) {
    const { templates, filterDays: fd, filterDifficulty: fdif } = this.data;
    const days = filterDays !== undefined ? filterDays : fd;
    const difficulty = filterDifficulty !== undefined ? filterDifficulty : fdif;

    let filteredTemplates = templates;

    // 按天数筛选
    if (days > 0) {
      filteredTemplates = filteredTemplates.filter(t => t.training_days === days);
    }

    // 按难度筛选
    if (difficulty) {
      filteredTemplates = filteredTemplates.filter(t => t.difficulty === difficulty);
    }

    this.setData({
      filterDays: days,
      filterDifficulty: difficulty,
      filteredTemplates
    });
  },

  /**
   * 显示计划详细介绍（从详情弹窗触发，selectedTemplate 已存在）
   */
  onShowTemplateIntro() {
    if (this.data.selectedTemplate) {
      this.setData({
        showTemplateDetailModal: false,
        showTemplateIntroModal: true
      });
    }
  },

  /**
   * 关闭计划介绍弹窗
   */
  onCloseTemplateIntro() {
    this.setData({
      showTemplateIntroModal: false
    });
  },

  /**
   * 打开计划推荐弹窗（4步向导）
   */
  onShowRecommend() {
    this.setData({
      showRecommendModal: true,
      recommendStep: 1,
      wizardSelectedGoal: null,
      wizardSelectedDays: null,
      wizardSelectedExp: null,
      wizardRecommended: [],
      wizardSelectedPlan: null
    });
  },

  // ===== 4步向导 handlers =====

  onWizardSelectGoal(e) {
    this.setData({ wizardSelectedGoal: e.currentTarget.dataset.id });
  },

  onWizardSelectDays(e) {
    this.setData({ wizardSelectedDays: parseInt(e.currentTarget.dataset.days) });
  },

  onWizardSelectExp(e) {
    this.setData({ wizardSelectedExp: e.currentTarget.dataset.id });
  },

  onWizardSelectPlan(e) {
    this.setData({ wizardSelectedPlan: e.currentTarget.dataset.id });
  },

  onWizardPrev() {
    const step = this.data.recommendStep;
    if (step > 1) {
      this.setData({ recommendStep: step - 1 });
    } else {
      this.onCloseRecommend();
    }
  },

  onWizardNext() {
    const { recommendStep, wizardSelectedGoal, wizardSelectedDays, wizardSelectedExp } = this.data;

    if (recommendStep === 1 && !wizardSelectedGoal) {
      wx.showToast({ title: '请选择健身目标', icon: 'none' });
      return;
    }
    if (recommendStep === 2 && !wizardSelectedDays) {
      wx.showToast({ title: '请选择训练天数', icon: 'none' });
      return;
    }
    if (recommendStep === 3 && !wizardSelectedExp) {
      wx.showToast({ title: '请选择训练经验', icon: 'none' });
      return;
    }

    if (recommendStep < 4) {
      this.setData({ recommendStep: recommendStep + 1 });
    }

    if (recommendStep === 3) {
      // 生成推荐
      const recommended = this._generateRecommendations({
        goal: wizardSelectedGoal,
        days: wizardSelectedDays,
        experience: wizardSelectedExp
      });
      this.setData({
        wizardRecommended: recommended,
        wizardSelectedPlan: recommended.length > 0 ? recommended[0].id : null,
        recommendStep: 4
      });
    }
  },

  onWizardApply() {
    const planId = this.data.wizardSelectedPlan;
    if (!planId) return;

    const template = this.data.templates.find(t => t.id === planId);
    if (!template) {
      wx.showToast({ title: '计划不存在', icon: 'error' });
      return;
    }

    // 保存用户偏好
    wx.setStorageSync('user_preference', {
      goal: this.data.wizardSelectedGoal,
      days: this.data.wizardSelectedDays,
      experience: this.data.wizardSelectedExp,
      completed: true
    });

    this.setData({ showRecommendModal: false });
    this.onShowCloneTemplateModal({ currentTarget: { dataset: { templateId: planId } } });
  },

  onCloseRecommend() {
    this.setData({ showRecommendModal: false });
  },

  // ===== 推荐算法 =====

  _generateRecommendations(userPref) {
    const templates = getCollection('plan_templates');
    const { goal, days, experience } = userPref;

    let candidates = templates.filter(t => Math.abs(t.training_days - days) <= 1);

    const diffMap = { beginner: ['入门'], intermediate: ['入门', '中级'], advanced: ['中级', '进阶'] };
    candidates = candidates.filter(t => (diffMap[experience] || ['入门']).includes(t.difficulty));

    const priorityMap = {
      muscle: ['PHUL', 'PPL', '五分化', '阿诺德', '臀腿', '上下肢', '5x5'],
      fatloss: ['全身', '居家', '臀腿', 'PPLR', '上下肢'],
      strength: ['GZCLP', '5/3/1', '5x5', 'Strength', 'Texas', 'nSuns'],
      general: ['全身', '居家', 'PPLR', '上下肢', '5x5']
    };
    const priorities = priorityMap[goal] || [];
    candidates.sort((a, b) => {
      const aS = priorities.findIndex(p => a.name.includes(p));
      const bS = priorities.findIndex(p => b.name.includes(p));
      const aExact = a.training_days === days ? 0 : 1;
      const bExact = b.training_days === days ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (aS === -1 ? 999 : aS) - (bS === -1 ? 999 : bS);
    });

    const diffClassMap = { '入门': 'beginner', '中级': 'intermediate', '进阶': 'advanced' };
    return candidates.slice(0, 3).map(t => ({
      ...t,
      difficultyClass: diffClassMap[t.difficulty] || 'beginner',
      features: this._getPlanFeatures(t)
    }));
  },

  _getPlanFeatures(plan) {
    const features = [];
    if (plan.difficulty === '入门') features.push('新手友好');
    if (plan.difficulty === '进阶') features.push('高强度');
    if (plan.name.includes('5x5') || plan.name.includes('GZCLP') || plan.name.includes('5/3/1')) features.push('经典增力');
    if (plan.name.includes('PHUL')) features.push('力量肌肥大双修');
    if (plan.name.includes('居家')) features.push('居家哑铃');
    if (plan.name.includes('臀腿')) features.push('臀腿塑形');
    if (plan.name.includes('PPL') || plan.name.includes('五分化') || plan.name.includes('阿诺德')) features.push('肌群分化');
    if (plan.training_days <= 3) features.push('时间友好');
    if (!features.length) features.push('系统训练');
    return features.slice(0, 3);
  }
});
