const { getCollection, insert, getPlanTemplatesSeedData } = require('../../localdb/db.js');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    isOnboarding: {
      type: Boolean,
      value: false
    }
  },

  data: {
    recommendStep: 1,
    wizardGoals: [
      { id: 'muscle', name: '增肌塑形', desc: '增加肌肉量，改善体型线条' },
      { id: 'fatloss', name: '减脂瘦身', desc: '降低体脂率，提升代谢水平' },
      { id: 'strength', name: '力量提升', desc: '提升最大力量，突破重量瓶颈' },
      { id: 'general', name: '综合健康', desc: '全面提升身体素质，保持健康' }
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
    wizardSelectedPlan: null
  },

  observers: {
    visible(val) {
      if (val) {
        this.setData({
          recommendStep: 1,
          wizardSelectedGoal: null,
          wizardSelectedDays: null,
          wizardSelectedExp: null,
          wizardRecommended: [],
          wizardSelectedPlan: null
        });
      }
    }
  },

  methods: {
    _markOnboardingDone() {
      if (!this.data.isOnboarding) return;
      wx.setStorageSync('onboarding_completed', true);
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.needsOnboarding = false;
      }
    },

    _getTemplates() {
      let templates = getCollection('plan_templates') || [];
      if (templates.length === 0) {
        const seeds = getPlanTemplatesSeedData() || [];
        seeds.forEach(tpl => insert('plan_templates', tpl));
        templates = getCollection('plan_templates') || [];
      }
      return templates;
    },

    onSelectGoal(e) {
      this.setData({ wizardSelectedGoal: e.currentTarget.dataset.id });
    },

    onSelectDays(e) {
      this.setData({ wizardSelectedDays: parseInt(e.currentTarget.dataset.days, 10) });
    },

    onSelectExp(e) {
      this.setData({ wizardSelectedExp: e.currentTarget.dataset.id });
    },

    onSelectPlan(e) {
      this.setData({ wizardSelectedPlan: e.currentTarget.dataset.id });
    },

    onPrev() {
      const step = this.data.recommendStep;
      if (step > 1) {
        this.setData({ recommendStep: step - 1 });
      } else {
        this.onClose();
      }
    },

    onNext() {
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

      if (recommendStep < 3) {
        this.setData({ recommendStep: recommendStep + 1 });
        return;
      }

      if (recommendStep === 3) {
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

    onApply() {
      const planId = this.data.wizardSelectedPlan;
      if (!planId) return;

      wx.setStorageSync('user_preference', {
        goal: this.data.wizardSelectedGoal,
        days: this.data.wizardSelectedDays,
        experience: this.data.wizardSelectedExp,
        completed: true
      });
      this._markOnboardingDone();
      this.triggerEvent('apply', { templateId: planId });
    },

    onClose() {
      this._markOnboardingDone();
      this.triggerEvent('close');
    },

    _generateRecommendations(userPref) {
      const templates = this._getTemplates();
      const { goal, days, experience } = userPref;

      const diffMap = { beginner: ['入门'], intermediate: ['入门', '中级'], advanced: ['中级', '进阶'] };
      const allowedDiff = diffMap[experience] || ['入门'];

      let candidates = templates.filter(t =>
        Math.abs(t.training_days - days) <= 1 && allowedDiff.includes(t.difficulty)
      );
      if (candidates.length === 0) {
        candidates = templates.filter(t => Math.abs(t.training_days - days) <= 1);
      }
      if (candidates.length === 0) {
        candidates = [...templates];
      }

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
  }
});
