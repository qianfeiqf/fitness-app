/**
 * 新用户引导页面
 * 3步引导：目标 → 天数 → 经验，完成后进入计划库手动选择计划
 */

const { insert } = require('../../localdb/db.js');

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

    // 按钮状态
    canProceed: false
  },

  onLoad() {
    this.calcNavBarHeight();
    this.updateCanProceed();
  },

  /**
   * 计算自定义导航栏高度，避开胶囊按钮
   */
  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const systemInfo = wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
    this.setData({ navHeight });
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
   * 更新按钮可用状态
   */
  updateCanProceed() {
    const { step, selectedGoal, selectedDays, selectedExperience } = this.data;
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
    } else {
      // 完成引导，保存偏好
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
   * 完成引导 — 保存用户偏好，进入计划库
   */
  completeOnboarding() {
    const { selectedGoal, selectedDays, selectedExperience } = this.data;

    // 保存用户偏好供后续推荐使用
    wx.setStorageSync('user_preference', {
      goal: selectedGoal,
      days: selectedDays,
      experience: selectedExperience,
      completed: true
    });

    wx.setStorageSync('onboarding_completed', true);
    getApp().globalData.needsOnboarding = false;

    wx.showToast({ title: '设置完成', icon: 'success' });

    setTimeout(() => {
      wx.switchTab({ url: '/pages/plans/plans' });
    }, 1000);
  }
});
