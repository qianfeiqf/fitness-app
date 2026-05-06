/**
 * 新用户引导页面
 * 3步引导 + 计划推荐
 */

const { find, insert, getCollection } = require('../../localdb/db.js');

Page({
  data: {
    step: 1,

    // 健身目标
    goals: [
      { id: 'muscle', name: '增肌塑形', icon: '\u{1F4AA}', desc: '增加肌肉量，改善体型线条' },
      { id: 'fatloss', name: '减脂瘦身', icon: '\u{1F525}', desc: '降低体脂率，提升代谢水平' },
      { id: 'strength', name: '力量提升', icon: '\u{1F3CB}', desc: '提升最大力量，突破重量瓶颈' },
      { id: 'general', name: '综合健康', icon: '❤', desc: '全面提升身体素质，保持健康' }
    ],
    selectedGoal: null,

    // 训练天数
    dayOptions: [
      { days: 2, desc: '轻松入门' },
      { days: 3, desc: '经典安排' },
      { days: 4, desc: '进阶训练' },
      { days: 5, desc: '密集训练' },
      { days: 6, desc: '硬核模式' }
    ],
    selectedDays: null,

    // 训练经验
    experienceOptions: [
      { id: 'beginner', name: '纯新手', tag: '入门', icon: '\u{1F331}', desc: '刚开始接触健身，或从未系统训练过' },
      { id: 'intermediate', name: '有半年经验', tag: '中级', icon: '\u{1F33F}', desc: '已经训练过一段时间，熟悉基础动作' },
      { id: 'advanced', name: '老手', tag: '进阶', icon: '\u{1F333}', desc: '系统训练一年以上，追求突破' }
    ],
    selectedExperience: null,

    // 推荐计划
    recommendedPlans: [],
    selectedPlan: null,

    // 按钮状态
    canProceed: false
  },

  onLoad() {
    this.updateCanProceed();
  },

  /**
   * 选择健身目标
   */
  onSelectGoal(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedGoal: id });
    this.updateCanProceed();
  },

  /**
   * 选择训练天数
   */
  onSelectDays(e) {
    const days = parseInt(e.currentTarget.dataset.days);
    this.setData({ selectedDays: days });
    this.updateCanProceed();
  },

  /**
   * 选择训练经验
   */
  onSelectExperience(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedExperience: id });
    this.updateCanProceed();
  },

  /**
   * 选择推荐计划
   */
  onSelectPlan(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedPlan: id });
    this.updateCanProceed();
  },

  /**
   * 更新按钮可用状态
   */
  updateCanProceed() {
    const { step, selectedGoal, selectedDays, selectedExperience, selectedPlan } = this.data;
    let canProceed = false;

    switch (step) {
      case 1:
        canProceed = !!selectedGoal;
        break;
      case 2:
        canProceed = !!selectedDays;
        break;
      case 3:
        canProceed = !!selectedExperience;
        break;
      case 4:
        canProceed = !!selectedPlan;
        break;
    }

    this.setData({ canProceed });
  },

  /**
   * 下一步
   */
  onNextStep() {
    const { step } = this.data;

    if (step < 3) {
      this.setData({ step: step + 1 });
      this.updateCanProceed();
    } else if (step === 3) {
      // 生成推荐计划
      this.generateRecommendations();
      this.setData({ step: 4 });
      this.updateCanProceed();
    } else if (step === 4) {
      // 完成引导，创建计划
      this.completeOnboarding();
    }
  },

  /**
   * 上一步
   */
  onPrevStep() {
    const { step } = this.data;
    if (step > 1) {
      this.setData({ step: step - 1 });
      this.updateCanProceed();
    }
  },

  /**
   * 生成推荐计划
   */
  generateRecommendations() {
    const { selectedGoal, selectedDays, selectedExperience } = this.data;
    const templates = getCollection('plan_templates');

    // 筛选符合天数要求的模板
    let candidates = templates.filter(t => {
      // 天数匹配：允许 ±1 天的弹性
      const dayDiff = Math.abs(t.training_days - selectedDays);
      return dayDiff <= 1;
    });

    // 按经验筛选难度
    const difficultyMap = {
      beginner: ['入门'],
      intermediate: ['入门', '中级'],
      advanced: ['中级', '进阶']
    };
    const allowedDifficulties = difficultyMap[selectedExperience] || ['入门'];
    candidates = candidates.filter(t => allowedDifficulties.includes(t.difficulty));

    // 按目标加权排序
    const goalPriority = {
      muscle: ['5x5', 'PPL', '分化'],
      fatloss: ['PPL', '5x5', '全身'],
      strength: ['5x5', 'Strength', 'Texas'],
      general: ['5x5', 'PPL', '全身']
    };
    const priorities = goalPriority[selectedGoal] || [];

    candidates.sort((a, b) => {
      const aScore = priorities.findIndex(p => a.name.includes(p));
      const bScore = priorities.findIndex(p => b.name.includes(p));
      return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
    });

    // 难度映射
    const diffClassMap = { '入门': 'beginner', '中级': 'intermediate', '进阶': 'advanced' };

    // 取前 2-3 个
    const recommended = candidates.slice(0, 3).map(t => ({
      ...t,
      difficultyClass: diffClassMap[t.difficulty] || 'beginner',
      features: this.getPlanFeatures(t)
    }));

    this.setData({
      recommendedPlans: recommended,
      selectedPlan: recommended.length > 0 ? recommended[0].id : null
    });
  },

  /**
   * 获取计划特性标签
   */
  getPlanFeatures(plan) {
    const features = [];
    if (plan.difficulty === '入门') features.push('新手友好');
    if (plan.difficulty === '进阶') features.push('高强度');
    if (plan.name.includes('5x5')) features.push('经典增力');
    if (plan.name.includes('PPL')) features.push('肌群分化');
    if (plan.training_days <= 3) features.push('时间友好');
    if (!features.length) features.push('系统训练');
    return features.slice(0, 3);
  },

  /**
   * 完成引导，创建计划
   */
  completeOnboarding() {
    const { selectedPlan, selectedGoal, selectedDays, selectedExperience } = this.data;

    if (!selectedPlan) return;

    const template = find('plan_templates', { id: selectedPlan })[0];
    if (!template) {
      wx.showToast({ title: '计划模板不存在', icon: 'error' });
      return;
    }

    // 创建计划
    const plan = {
      id: 'plan_' + Date.now(),
      name: template.name,
      status: 'active',
      cycle_type: template.cycle_type || 'natural_week',
      selected_days: [...new Set(template.exercises.map(e => e.day_of_week))].sort(),
      onboarding_info: {
        goal: selectedGoal,
        days: selectedDays,
        experience: selectedExperience
      },
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // 保存到 plans 集合
    insert('plans', plan);

    // 保存计划动作
    template.exercises.forEach(ex => {
      const exercise = find('exercises', { id: ex.exercise_id })[0];
      insert('plan_exercises', {
        id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        plan_id: plan.id,
        exercise_id: ex.exercise_id,
        exercise_name: exercise ? exercise.name : '',
        day_of_week: ex.day_of_week,
        cycle_label: ex.cycle_label || null,
        target_sets: ex.target_sets || 4,
        target_reps: ex.target_reps || 8,
        initial_weight: ex.initial_weight || 20,
        rest_seconds: ex.rest_seconds || 120,
        created_at: Date.now()
      });
    });

    // 标记引导已完成
    wx.setStorageSync('onboarding_completed', true);
    getApp().globalData.needsOnboarding = false;

    wx.showToast({ title: '计划已创建', icon: 'success' });

    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/home' });
    }, 1000);
  }
});
