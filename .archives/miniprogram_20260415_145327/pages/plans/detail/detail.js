/**
 * 计划详情页面
 */

const { findOne, find, update, remove } = require('../../../localdb/db.js');

Page({
  data: {
    planId: null,
    plan: null,
    exercises: [],
    groupedExercises: {},
    loading: true
  },

  onLoad(options) {
    if (options.planId) {
      this.setData({ planId: options.planId });
      this.loadPlan(options.planId);
    }
  },

  /**
   * 加载计划详情
   */
  loadPlan(planId) {
    this.setData({ loading: true });

    const plan = findOne('plans', { id: planId });

    if (!plan) {
      wx.showToast({ title: '计划不存在', icon: 'error' });
      wx.navigateBack();
      return;
    }

    // 获取计划动作
    const planExercises = find('plan_exercises', { plan_id: planId });

    // 获取动作详情并按日期分组
    const exercisesWithDetails = planExercises.map(pe => {
      const exercise = findOne('exercises', { id: pe.exercise_id });
      return {
        ...pe,
        exercise_name: exercise ? exercise.name : '未知动作',
        muscle_group: exercise ? exercise.muscle_group : '',
        name_en: exercise ? exercise.name_en : ''
      };
    }).filter(e => e !== null);

    // 按星期几分组
    const grouped = {};
    const weekDays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    exercisesWithDetails.forEach(ex => {
      const day = ex.day_of_week;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(ex);
    });

    this.setData({
      plan,
      exercises: exercisesWithDetails,
      groupedExercises: grouped,
      loading: false
    });
  },

  /**
   * 空操作
   */
  noop() {},

  /**
   * 激活计划
   */
  onActivatePlan() {
    const { plan } = this.data;

    // 先停用当前计划
    const plans = find('plans') || [];
    plans.forEach(p => {
      if (p.status === 'active') {
        update('plans', p.id, { status: 'archived' });
      }
    });

    // 激活当前计划
    update('plans', plan.id, { status: 'active' });

    wx.showToast({ title: '计划已激活', icon: 'success' });

    // 刷新数据
    this.loadPlan(plan.id);
  },

  /**
   * 删除计划
   */
  onDeletePlan() {
    const { plan } = this.data;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？删除后无法恢复',
      confirmColor: '#e63946',
      success: (res) => {
        if (res.confirm) {
          // 删除计划下的所有动作
          const planExercises = find('plan_exercises', { plan_id: plan.id });
          planExercises.forEach(pe => {
            remove('plan_exercises', pe.id);
          });

          // 删除计划
          remove('plans', plan.id);

          wx.showToast({ title: '计划已删除', icon: 'success' });

          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  },

  /**
   * 返回
   */
  onBack() {
    wx.navigateBack();
  }
});
