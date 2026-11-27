/**
 * 新用户引导页面 - 4步向导
 * 
 * 引导流程：
 * 1. 选择健身目标（增肌/减脂/力量/健康）
 * 2. 选择每周训练天数（2-6天）
 * 3. 选择训练经验（新手/中级/老手）
 * 4. 推荐计划并选择
 * 
 * 复用 plans 页面的推荐向导逻辑
 */

const { insert, find, getCollection } = require('../../localdb/db.js');
const UI = require('../../utils/ui.js');

Page({
  data: {
    navHeight: 0,
    
    // 当前步骤（1-4）
    currentStep: 1,
    
    // 步骤1：健身目标
    goals: [
      { id: 'muscle', name: '增肌塑形', desc: '增加肌肉量，改善体型线条' },
      { id: 'fatloss', name: '减脂瘦身', desc: '降低体脂率，提升代谢水平' },
      { id: 'strength', name: '力量提升', desc: '提升最大力量，突破重量瓶颈' },
      { id: 'general', name: '综合健康', desc: '全面提升身体素质，保持健康' }
    ],
    selectedGoal: null,
    
    // 步骤2：训练天数
    dayOptions: [
      { days: 2, desc: '轻松入门' },
      { days: 3, desc: '经典安排' },
      { days: 4, desc: '进阶训练' },
      { days: 5, desc: '密集训练' },
      { days: 6, desc: '硬核模式' }
    ],
    selectedDays: null,
    
    // 步骤3：训练经验
    expOptions: [
      { id: 'beginner', name: '纯新手', tag: '入门', desc: '刚开始接触健身，或从未系统训练过' },
      { id: 'intermediate', name: '有半年经验', tag: '中级', desc: '已经训练过一段时间，熟悉基础动作' },
      { id: 'advanced', name: '老手', tag: '进阶', desc: '系统训练一年以上，追求突破' }
    ],
    selectedExp: null,
    
    // 步骤4：推荐计划
    recommendedPlans: [],
    selectedPlan: null,
    
    // 模板数据
    templates: [],
    
    // 加载状态
    loading: false
  },

  onLoad() {
    this.calcNavBarHeight();
    this.loadTemplates();
    
    // 检查是否已经引导过
    const completed = wx.getStorageSync('onboarding_completed');
    if (completed) {
      // 已引导过，直接跳转到首页
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
  },

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusH = windowInfo.statusBarHeight || 20;
    const navHeight = menuButton && menuButton.bottom
      ? (menuButton.bottom + 14)
      : (statusH + 56);
    this.setData({ navHeight });
  },

  /**
   * 加载计划模板
   */
  loadTemplates() {
    const templates = getCollection('plan_templates') || [];
    
    // 确保模板数据包含介绍
    const enrichedTemplates = templates.map(tpl => {
      const intro = this.getTemplateIntro(tpl.id);
      return { ...tpl, ...intro };
    });
    
    this.setData({ templates: enrichedTemplates });
  },

  /**
   * 获取模板的文字介绍
   */
  getTemplateIntro(templateId) {
    const intros = {
      'tpl_5x5': {
        features: ['经典增力', '新手友好', '时间友好']
      },
      'tpl_starting': {
        features: ['新手友好', '经典增力', '系统训练']
      },
      'tpl_texas': {
        features: ['周期化训练', '中级进阶', '力量突破']
      },
      'tpl_upper_lower': {
        features: ['肌群分化', '均衡发展', '中级进阶']
      },
      'tpl_pplr': {
        features: ['PPL体系', '时间友好', '系统训练']
      },
      'tpl_aba': {
        features: ['变化丰富', '中级进阶', '肌群分化']
      },
      'tpl_nsuns': {
        features: ['高强度', '进阶训练', '容量堆积']
      },
      'tpl_ppl': {
        features: ['PPL体系', '肌群分化', '高频率']
      },
      'tpl_ppl_intense': {
        features: ['高容量', '进阶训练', '高强度']
      }
    };
    return intros[templateId] || { features: ['系统训练'] };
  },

  // ===== 步骤选择处理 =====

  onSelectGoal(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedGoal: id });
  },

  onSelectDays(e) {
    const days = parseInt(e.currentTarget.dataset.days);
    this.setData({ selectedDays: days });
  },

  onSelectExp(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedExp: id });
  },

  onSelectPlan(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedPlan: id });
  },

  // ===== 导航控制 =====

  onNext() {
    const { currentStep, selectedGoal, selectedDays, selectedExp } = this.data;

    // 验证当前步骤
    if (currentStep === 1 && !selectedGoal) {
      wx.showToast({ title: '请选择健身目标', icon: 'none' });
      return;
    }
    if (currentStep === 2 && !selectedDays) {
      wx.showToast({ title: '请选择训练天数', icon: 'none' });
      return;
    }
    if (currentStep === 3 && !selectedExp) {
      wx.showToast({ title: '请选择训练经验', icon: 'none' });
      return;
    }

    if (currentStep < 4) {
      this.setData({ currentStep: currentStep + 1 });
      
      // 进入第4步时生成推荐
      if (currentStep === 3) {
        this.generateRecommendations();
      }
    }
  },

  onPrev() {
    const { currentStep } = this.data;
    if (currentStep > 1) {
      this.setData({ currentStep: currentStep - 1 });
    }
  },

  onSkip() {
    // 跳过引导，直接标记完成并跳转到计划页
    wx.setStorageSync('onboarding_completed', true);
    getApp().globalData.needsOnboarding = false;

    wx.switchTab({ url: '/pages/plans/plans' });
  },

  onGoCreatePlan() {
    // 标记引导完成，跳转到创建计划页
    wx.setStorageSync('onboarding_completed', true);
    getApp().globalData.needsOnboarding = false;

    wx.navigateTo({ url: '/pages/plans/create/create' });
  },

  // ===== 推荐算法 =====

  generateRecommendations() {
    const { selectedGoal, selectedDays, selectedExp, templates } = this.data;

    if (!templates || templates.length === 0) {
      this.setData({ recommendedPlans: [], selectedPlan: null });
      return;
    }

    const diffMap = {
      beginner: ['入门'],
      intermediate: ['入门', '中级'],
      advanced: ['中级', '进阶']
    };
    const allowedDiff = diffMap[selectedExp] || ['入门'];

    // 1. 优先：同时满足天数差 <= 1 且难度匹配
    let candidates = templates.filter(t =>
      Math.abs(t.training_days - selectedDays) <= 1 && allowedDiff.includes(t.difficulty)
    );

    // 2. 一级兜底：放宽难度限制，仅按天数差 <= 1 筛选
    if (candidates.length === 0) {
      candidates = templates.filter(t => Math.abs(t.training_days - selectedDays) <= 1);
    }

    // 3. 二级兜底：按与目标天数最接近的模板兜底，确保永远有推荐结果
    if (candidates.length === 0) {
      candidates = [...templates].sort(
        (a, b) => Math.abs((a.training_days || 3) - selectedDays) - Math.abs((b.training_days || 3) - selectedDays)
      );
    }

    // 根据目标排序
    const priorityMap = {
      muscle: ['5x5', 'PPL', '分化'],
      fatloss: ['PPL', '5x5', '全身'],
      strength: ['5x5', 'Strength', 'Texas'],
      general: ['5x5', 'PPL', '全身']
    };
    const priorities = priorityMap[selectedGoal] || [];

    candidates.sort((a, b) => {
      const aScore = priorities.findIndex(p => a.name.includes(p));
      const bScore = priorities.findIndex(p => b.name.includes(p));
      const scoreDiff = (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
      if (scoreDiff !== 0) return scoreDiff;
      return Math.abs((a.training_days || 3) - selectedDays) - Math.abs((b.training_days || 3) - selectedDays);
    });

    // 取前3个推荐
    const recommended = candidates.slice(0, 3).map(t => {
      const diffClassMap = { '入门': 'beginner', '中级': 'intermediate', '进阶': 'advanced' };
      return {
        ...t,
        difficultyClass: diffClassMap[t.difficulty] || 'beginner'
      };
    });

    this.setData({
      recommendedPlans: recommended,
      selectedPlan: recommended.length > 0 ? recommended[0].id : null
    });
  },

  // ===== 完成引导 =====

  async onComplete() {
    const { selectedPlan, selectedGoal, selectedDays, selectedExp } = this.data;
    
    if (!selectedPlan) {
      wx.showToast({ title: '请选择一个计划', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      // 获取选中的模板
      const template = this.data.templates.find(t => t.id === selectedPlan);
      if (!template) {
        throw new Error('模板不存在');
      }

      // 创建计划
      const plan = await this.createPlanFromTemplate(template);
      
      // 保存用户偏好
      wx.setStorageSync('user_preference', {
        goal: selectedGoal,
        days: selectedDays,
        experience: selectedExp,
        planId: plan.id,
        completed: true
      });

      // 标记引导完成
      wx.setStorageSync('onboarding_completed', true);
      getApp().globalData.needsOnboarding = false;

      // 显示成功提示
      wx.showToast({
        title: '计划创建成功',
        icon: 'success',
        duration: 1500
      });

      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' });
      }, 1500);

    } catch (err) {
      console.error('创建计划失败:', err);
      wx.showToast({ title: '创建失败，请重试', icon: 'error' });
      this.setData({ loading: false });
    }
  },

  /**
   * 从模板创建计划
   */
  createPlanFromTemplate(template) {
    return new Promise((resolve) => {
      const plan = {
        id: 'plan_' + Date.now(),
        name: template.name,
        description: template.description,
        cycle_type: template.cycle_type || 'natural_week',
        status: 'active',
        difficulty: template.difficulty,
        training_days: template.training_days,
        is_system: false,
        source_template_id: template.id,
        created_at: Date.now(),
        updated_at: Date.now(),
        sync_status: 'pending'
      };

      // 保存计划
      insert('plans', plan);

      // 克隆动作
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
            initial_weight: ex.initial_weight || 0,
            increment_step: ex.increment_step || 2.5,
            decrement_rate: ex.decrement_rate || 0.1,
            rest_seconds: ex.rest_seconds || 120,
            created_at: Date.now(),
            updated_at: Date.now(),
            sync_status: 'pending'
          };
          insert('plan_exercises', planExercise);
        });
      }

      resolve(plan);
    });
  }
});
