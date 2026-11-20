/**
 * 计划详情页面
 * 支持用户计划(planId)和经典模板(templateId)两种模式
 */

const { findOne, find, update, remove } = require('../../../localdb/db.js');

Page({
  data: {
    planId: null,
    templateId: null,
    isTemplate: false,
    plan: null,
    exercises: [],
    groupedExercises: {},
    weekSchedule: [],
    loading: true,
    showIntro: false
  },

  onLoad(options) {
    if (options.planId) {
      this.setData({ planId: options.planId, isTemplate: false });
      this.loadPlan(options.planId);
    } else if (options.templateId) {
      this.setData({ templateId: options.templateId, isTemplate: true });
      this.loadTemplate(options.templateId);
    }
  },

  /**
   * 加载用户计划详情
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
        name_en: exercise ? exercise.name_en : '',
        video_url: exercise ? exercise.video_url : ''
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

    // 构建完整的周训练安排（带休息日）
    const weekSchedule = this.buildWeekSchedule(grouped, weekDays);

    this.setData({
      plan,
      exercises: exercisesWithDetails,
      groupedExercises: grouped,
      weekSchedule,
      loading: false
    });
  },

  /**
   * 加载经典模板详情
   */
  loadTemplate(templateId) {
    this.setData({ loading: true });

    const template = findOne('plan_templates', { id: templateId });

    if (!template) {
      wx.showToast({ title: '计划不存在', icon: 'error' });
      wx.navigateBack();
      return;
    }

    // 获取动作名称映射
    const exercises = find('exercises') || [];
    const exerciseMap = {};
    exercises.forEach(ex => {
      exerciseMap[ex.id] = ex;
    });

    // 构建带详情的动作列表
    const exercisesWithDetails = (template.exercises || []).map(ex => {
      const exercise = exerciseMap[ex.exercise_id];
      return {
        ...ex,
        exercise_name: exercise ? exercise.name : (ex.name || '未知动作'),
        muscle_group: exercise ? exercise.muscle_group : '',
        name_en: exercise ? exercise.name_en : '',
        video_url: exercise ? exercise.video_url : ''
      };
    });

    // 按星期几分组
    const grouped = {};
    const weekDays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    exercisesWithDetails.forEach(ex => {
      const day = ex.day_of_week || 0;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(ex);
    });

    // 构建完整的周训练安排（带休息日）
    const weekSchedule = this.buildWeekSchedule(grouped, weekDays);

    // 构建 plan 对象用于页面展示
    const plan = {
      id: template.id,
      name: template.name,
      description: template.description,
      status: 'template',
      cycle_type: template.cycle_type || 'natural_week',
      training_days: template.training_days,
      difficulty: template.difficulty,
      background: template.background,
      suitable_for: template.suitable_for,
      notes: template.notes
    };

    this.setData({
      plan,
      exercises: exercisesWithDetails,
      groupedExercises: grouped,
      weekSchedule,
      loading: false
    });
  },

  /**
   * 构建完整的周训练安排（包含休息日）
   */
  buildWeekSchedule(grouped, weekDays) {
    const schedule = [];
    for (let day = 1; day <= 7; day++) {
      const exercises = grouped[day] || [];
      schedule.push({
        day,
        dayName: weekDays[day],
        isRest: exercises.length === 0,
        exercises
      });
    }
    return schedule;
  },

  /**
   * 切换介绍显示
   */
  onToggleIntro() {
    this.setData({ showIntro: !this.data.showIntro });
  },

  /**
   * 查看动作教学视频
   */
  onViewVideo(e) {
    const { videoUrl, exerciseName } = e.currentTarget.dataset;
    if (videoUrl) {
      wx.navigateTo({
        url: '/pages/exercises/video/video?url=' + encodeURIComponent(videoUrl) + '&name=' + encodeURIComponent(exerciseName)
      });
    } else {
      wx.showToast({ title: '暂无教学视频', icon: 'none' });
    }
  },

  /**
   * 使用此模板（模板模式）
   */
  onUseTemplate() {
    const { templateId, plan } = this.data;
    wx.navigateTo({
      url: '/pages/plans/create/create?templateId=' + templateId
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
   * 编辑计划
   */
  onEditPlan() {
    const { plan } = this.data;
    wx.navigateTo({
      url: '/pages/plans/create/create?planId=' + plan.id
    });
  },

  /**
   * 删除计划
   */
  onDeletePlan() {
    const { plan } = this.data;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？删除后无法恢复',
      confirmColor: '#8B0000',
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
