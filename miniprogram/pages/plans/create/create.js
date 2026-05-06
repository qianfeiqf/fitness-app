/**
 * 新建/编辑计划页面
 */

const { insert, find, findOne, update, remove } = require('../../../localdb/db.js');

Page({
  data: {
    isEditMode: false,
    editPlanId: null,

    // 计划信息
    planName: '',
    cycleType: 'natural_week', // natural_week | cycle
    showAdvancedOptions: false, // 高级选项折叠状态

    // 训练安排
    weekDays: [
      { day: 1, label: '周一' },
      { day: 2, label: '周二' },
      { day: 3, label: '周三' },
      { day: 4, label: '周四' },
      { day: 5, label: '周五' },
      { day: 6, label: '周六' },
      { day: 7, label: '周日' }
    ],
    selectedDays: [],
    selectedDaysIndex: [false, false, false, false, false, false, false],
    cycleLength: 4, // 自定义循环长度 2-14
    cycleLengthOptions: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    cycleLabels: ['A', 'B', 'C', 'D'],
    dayLabels: {}, // dayOfWeek -> labelIndex

    // 动作数据
    selectedDaysDisplay: [], // 带动作的显示数据
    planExercises: [] // 待保存的动作数据
  },

  onLoad(options) {
    if (options.planId) {
      // 编辑模式
      this.setData({
        isEditMode: true,
        editPlanId: options.planId
      });
      wx.setNavigationBarTitle({ title: '编辑计划' });
      this.loadPlanForEdit(options.planId);
    }
  },

  /**
   * 加载计划数据进行编辑
   */
  loadPlanForEdit(planId) {
    console.log('loadPlanForEdit called, planId:', planId);
    const plan = findOne('plans', { id: planId });
    console.log('plan found:', plan ? plan.name : 'null', 'selected_days:', plan ? plan.selected_days : 'undefined');
    if (!plan) {
      wx.showToast({ title: '计划不存在', icon: 'error' });
      return;
    }

    // 获取计划动作
    const planExercises = find('plan_exercises', { plan_id: planId });

    // 获取动作详情，转换为创建页面使用的格式
    const exercisesWithDetails = planExercises.map(pe => {
      const exercise = findOne('exercises', { id: pe.exercise_id });
      if (!exercise) return null;
      return {
        id: pe.exercise_id,
        dayOfWeek: pe.day_of_week,
        cycle_label: pe.cycle_label,
        target_sets: pe.target_sets,
        target_reps: pe.target_reps,
        initial_weight: pe.initial_weight,
        rest_seconds: pe.rest_seconds,
        name: exercise.name,
        muscle_group: exercise.muscle_group
      };
    }).filter(e => e !== null);

    // 获取已选训练日（优先从计划中读取，否则从动作反推）
    const selectedDays = plan.selected_days || [...new Set(exercisesWithDetails.map(e => e.dayOfWeek))].sort();
    // 构建索引数组用于快速判断
    const selectedDaysIndex = [false, false, false, false, false, false, false];
    selectedDays.forEach(d => { selectedDaysIndex[d - 1] = true; });

    // 获取循环标签
    const dayLabels = {};
    exercisesWithDetails.forEach(ex => {
      if (ex.cycle_label) {
        const labelIndex = this.data.cycleLabels.indexOf(ex.cycle_label);
        if (labelIndex !== -1) {
          dayLabels[ex.dayOfWeek] = labelIndex;
        }
      }
    });

    // 加载循环长度
    const cycleLength = plan.cycle_length || 4;
    const cycleLabels = this.generateCycleLabels(cycleLength);

    this.setData({
      planName: plan.name,
      cycleType: plan.cycle_type || 'natural_week',
      showAdvancedOptions: plan.cycle_type === 'cycle',
      cycleLength,
      cycleLabels,
      selectedDays,
      selectedDaysIndex,
      dayLabels,
      planExercises: exercisesWithDetails
    });
    console.log('loadPlanForEdit selectedDays:', selectedDays, 'selectedDaysIndex:', selectedDaysIndex);

    this.updateSelectedDaysDisplay();
  },

  /**
   * 输入计划名称
   */
  onInputPlanName(e) {
    this.setData({ planName: e.detail.value });
  },

  /**
   * 切换高级选项
   */
  onToggleAdvanced() {
    this.setData({
      showAdvancedOptions: !this.data.showAdvancedOptions
    });
  },

  /**
   * 循环模式开关
   */
  onCycleModeChange(e) {
    this.setData({
      cycleType: e.detail.value ? 'cycle' : 'natural_week'
    });
    this.updateSelectedDaysDisplay();
  },

  /**
   * 生成循环标签
   */
  generateCycleLabels(length) {
    const labels = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
      labels.push(alphabet[i] || String(i + 1));
    }
    return labels;
  },

  /**
   * 选择循环长度
   */
  onCycleLengthChange(e) {
    const index = parseInt(e.detail.value);
    const cycleLength = this.data.cycleLengthOptions[index];
    const cycleLabels = this.generateCycleLabels(cycleLength);
    this.setData({
      cycleLength,
      cycleLabels,
      dayLabels: {} // 重置标签分配
    });
    this.updateSelectedDaysDisplay();
  },

  /**
   * 切换训练日选择
   */
  onToggleDay(e) {
    const day = e.currentTarget.dataset.day;
    const { selectedDays, selectedDaysIndex } = this.data;

    if (selectedDays.includes(day)) {
      // 取消选择
      const newIndex = [...selectedDaysIndex];
      newIndex[day - 1] = false;
      this.setData({
        selectedDays: selectedDays.filter(d => d !== day),
        selectedDaysIndex: newIndex
      });
    } else {
      // 选中
      const newIndex = [...selectedDaysIndex];
      newIndex[day - 1] = true;
      this.setData({
        selectedDays: [...selectedDays, day].sort(),
        selectedDaysIndex: newIndex
      });
    }

    // 更新显示数据
    this.updateSelectedDaysDisplay();
  },

  /**
   * 选择循环标签
   */
  onSelectDayLabel(e) {
    const day = e.currentTarget.dataset.day;
    const labelIndex = parseInt(e.detail.value);
    const { dayLabels } = this.data;

    this.setData({
      dayLabels: {
        ...dayLabels,
        [day]: labelIndex
      }
    });

    this.updateSelectedDaysDisplay();
  },

  /**
   * 更新已选训练日显示数据
   */
  updateSelectedDaysDisplay() {
    const { selectedDays, weekDays, cycleType, dayLabels, cycleLabels, planExercises } = this.data;

    const selectedDaysDisplay = selectedDays.map(day => {
      const dayInfo = weekDays[day - 1];
      let cycleLabel = '';

      if (cycleType === 'cycle' && dayLabels[day] !== undefined) {
        cycleLabel = cycleLabels[dayLabels[day]];
      }

      // 获取该天的已有动作
      const dayExercises = planExercises
        .filter(pe => pe.dayOfWeek === day)
        .map(pe => ({
          ...pe,
          dayOfWeek: day
        }));

      return {
        dayOfWeek: day,
        label: dayInfo.label,
        cycleLabel,
        exercises: dayExercises
      };
    });

    this.setData({ selectedDaysDisplay });
  },

  /**
   * 添加动作
   */
  onAddExercise(e) {
    const dayOfWeek = e.currentTarget.dataset.day;
    wx.navigateTo({
      url: '/pages/exercises/library?returnUrl=/pages/plans/create/create&dayOfWeek=' + dayOfWeek
    });
  },

  /**
   * 选择动作回调（从动作库返回时调用）
   */
  selectExercise(exercise) {
    const dayOfWeek = exercise.dayOfWeek;
    delete exercise.dayOfWeek; // 移除临时字段

    // 默认参数
    const newExercise = {
      ...exercise,
      dayOfWeek,
      target_sets: 4,
      target_reps: 8,
      initial_weight: 20,
      rest_seconds: 120
    };

    this.setData({
      planExercises: [...this.data.planExercises, newExercise]
    });

    this.updateSelectedDaysDisplay();
  },

  /**
   * 移除动作
   */
  onRemoveExercise(e) {
    const { day, index } = e.currentTarget.dataset;
    const { planExercises } = this.data;

    // 找到该天的动作索引
    const dayExercises = planExercises.filter(pe => pe.dayOfWeek === day);
    if (dayExercises[index]) {
      const exerciseToRemove = dayExercises[index];
      this.setData({
        planExercises: planExercises.filter(pe => pe !== exerciseToRemove)
      });
      this.updateSelectedDaysDisplay();
    }
  },

  /**
   * 更新动作参数
   */
  onUpdateExerciseParam(e) {
    const { day, index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const { planExercises } = this.data;

    // 找到该动作
    const dayExercises = planExercises.filter(pe => pe.dayOfWeek === day);
    if (dayExercises[index]) {
      const exercise = dayExercises[index];
      const exerciseIndex = planExercises.indexOf(exercise);

      this.setData({
        [`planExercises[${exerciseIndex}].${field}`]: parseFloat(value) || 0
      });
    }
  },

  /**
   * 保存计划
   */
  onSavePlan() {
    const { planName, selectedDays } = this.data;

    if (!planName.trim()) {
      wx.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    if (selectedDays.length === 0) {
      wx.showToast({ title: '请至少选择一个训练日', icon: 'none' });
      return;
    }

    this.createPlan();
  },

  /**
   * 创建/更新计划
   */
  createPlan() {
    const { isEditMode, editPlanId, planName, cycleType, cycleLength, dayLabels, cycleLabels, planExercises, selectedDays } = this.data;

    if (isEditMode) {
      // 编辑模式：更新计划
      update('plans', editPlanId, {
        name: planName.trim(),
        cycle_type: cycleType,
        cycle_length: cycleLength,
        selected_days: selectedDays,
        updated_at: Date.now()
      });

      // 删除旧的动作
      const oldExercises = find('plan_exercises', { plan_id: editPlanId });
      oldExercises.forEach(pe => {
        remove('plan_exercises', pe.id);
      });

      // 插入新动作
      planExercises.forEach(ex => {
        const planExercise = {
          id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          plan_id: editPlanId,
          exercise_id: ex.id,
          day_of_week: ex.dayOfWeek,
          cycle_label: cycleType === 'cycle' && dayLabels[ex.dayOfWeek] !== undefined
            ? cycleLabels[dayLabels[ex.dayOfWeek]]
            : null,
          target_sets: ex.target_sets || 4,
          target_reps: ex.target_reps || 8,
          initial_weight: ex.initial_weight || 20,
          rest_seconds: ex.rest_seconds || 120,
          created_at: Date.now()
        };
        insert('plan_exercises', planExercise);
      });

      wx.showToast({ title: '计划已更新', icon: 'success' });
    } else {
      // 新建模式
      const plan = {
        id: 'plan_' + Date.now(),
        name: planName.trim(),
        status: 'active',
        cycle_type: cycleType,
        cycle_length: cycleLength,
        selected_days: selectedDays,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      insert('plans', plan);

      planExercises.forEach(ex => {
        const planExercise = {
          id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          plan_id: plan.id,
          exercise_id: ex.id,
          day_of_week: ex.dayOfWeek,
          cycle_label: cycleType === 'cycle' && dayLabels[ex.dayOfWeek] !== undefined
            ? cycleLabels[dayLabels[ex.dayOfWeek]]
            : null,
          target_sets: ex.target_sets || 4,
          target_reps: ex.target_reps || 8,
          initial_weight: ex.initial_weight || 20,
          rest_seconds: ex.rest_seconds || 120,
          created_at: Date.now()
        };
        insert('plan_exercises', planExercise);
      });

      wx.showToast({ title: '计划已创建', icon: 'success' });
    }

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
