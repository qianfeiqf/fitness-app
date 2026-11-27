/**
 * 新建/编辑计划页面 — 支持「按星期排课」与「按课表轮换」清晰二选一
 */

const { insert, find, findOne, update, remove } = require('../../../localdb/db.js');

const CYCLE_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F'];

Page({
  data: {
    isEditMode: false,
    editPlanId: null,

    // 计划信息
    planName: '',
    cycleType: 'natural_week', // natural_week | cycle

    // 按星期排课
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

    // 按课表轮换
    cycleSlotLabels: ['A', 'B'],

    // 动作数据（每条动作带 slotKey：星期模式为 "day_1"，轮换模式为 "cycle_A"）
    selectedDaysDisplay: [],
    planExercises: [],
    showExerciseGuide: false,
    guideExercise: null
  },

  onLoad(options) {
    if (options.planId) {
      this.setData({
        isEditMode: true,
        editPlanId: options.planId
      });
      wx.setNavigationBarTitle({ title: '编辑计划' });
      this.loadPlanForEdit(options.planId);
    } else if (options.templateId) {
      wx.setNavigationBarTitle({ title: '使用计划' });
      this.loadTemplateForCreate(options.templateId);
    }
  },

  /**
   * 加载已有计划进行编辑
   */
  loadPlanForEdit(planId) {
    const plan = findOne('plans', { id: planId });
    if (!plan) {
      wx.showToast({ title: '计划不存在', icon: 'error' });
      return;
    }

    const cycleType = plan.cycle_type === 'cycle' ? 'cycle' : 'natural_week';
    const planExercises = find('plan_exercises', { plan_id: planId }) || [];

    const exercisesWithDetails = planExercises.map(pe => {
      const exercise = findOne('exercises', { id: pe.exercise_id });
      if (!exercise) return null;
      const dow = Number(pe.day_of_week) || 1;
      const cLabel = pe.cycle_label || CYCLE_ALPHABET[dow - 1] || 'A';
      return {
        id: pe.exercise_id,
        dayOfWeek: dow,
        cycleLabel: cLabel,
        slotKey: cycleType === 'cycle' ? `cycle_${cLabel}` : `day_${dow}`,
        target_sets: pe.target_sets,
        target_reps: pe.target_reps,
        initial_weight: pe.initial_weight,
        rest_seconds: pe.rest_seconds,
        name: exercise.name,
        muscle_group: exercise.muscle_group
      };
    }).filter(Boolean);

    if (cycleType === 'cycle') {
      const exLabels = [...new Set(exercisesWithDetails.map(e => e.cycleLabel).filter(Boolean))];
      const savedLabels = Array.isArray(plan.cycle_labels) && plan.cycle_labels.length > 0 ? plan.cycle_labels : [];
      const merged = [...new Set([...savedLabels, ...exLabels])];
      const cycleSlotLabels = merged.length >= 2 ? merged : (merged.length === 1 ? [merged[0], merged[0] === 'A' ? 'B' : 'A'] : ['A', 'B']);

      this.setData({
        planName: plan.name,
        cycleType: 'cycle',
        cycleSlotLabels,
        planExercises: exercisesWithDetails
      });
    } else {
      const savedDays = Array.isArray(plan.selected_days) ? plan.selected_days.map(Number).filter(Boolean) : [];
      const exDays = exercisesWithDetails.map(e => e.dayOfWeek).filter(Boolean);
      const selectedDays = [...new Set([...savedDays, ...exDays])].sort((a, b) => a - b);
      const selectedDaysIndex = [false, false, false, false, false, false, false];
      selectedDays.forEach(d => { selectedDaysIndex[d - 1] = true; });

      this.setData({
        planName: plan.name,
        cycleType: 'natural_week',
        selectedDays,
        selectedDaysIndex,
        planExercises: exercisesWithDetails
      });
    }

    this.updateSelectedDaysDisplay();
  },

  /**
   * 从模板加载数据创建计划
   */
  loadTemplateForCreate(templateId) {
    const template = findOne('plan_templates', { id: templateId });
    if (!template) {
      wx.showToast({ title: '模板不存在', icon: 'error' });
      return;
    }

    const cycleType = template.cycle_type === 'cycle' ? 'cycle' : 'natural_week';
    const allExercises = find('exercises') || [];
    const exerciseMap = {};
    allExercises.forEach(ex => { exerciseMap[ex.id] = ex; });

    const exercisesWithDetails = (template.exercises || []).map(ex => {
      const exercise = exerciseMap[ex.exercise_id];
      if (!exercise) return null;
      const dow = Number(ex.day_of_week) || 1;
      const cLabel = ex.cycle_label || CYCLE_ALPHABET[dow - 1] || 'A';
      return {
        id: ex.exercise_id,
        dayOfWeek: dow,
        cycleLabel: cLabel,
        slotKey: cycleType === 'cycle' ? `cycle_${cLabel}` : `day_${dow}`,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        initial_weight: ex.initial_weight,
        rest_seconds: ex.rest_seconds || 120,
        name: exercise.name,
        muscle_group: exercise.muscle_group
      };
    }).filter(Boolean);

    const existingNames = (find('plans') || []).map(p => (p.name || '').trim());
    let defaultName = (template.name || '').trim() || '我的训练计划';
    if (existingNames.includes(defaultName)) {
      let idx = 2;
      while (existingNames.includes(`${defaultName} ${idx}`)) { idx++; }
      defaultName = `${defaultName} ${idx}`;
    }

    if (cycleType === 'cycle') {
      const labels = [...new Set(exercisesWithDetails.map(e => e.cycleLabel).filter(Boolean))];
      this.setData({
        planName: defaultName,
        cycleType: 'cycle',
        cycleSlotLabels: labels.length >= 2 ? labels : ['A', 'B'],
        planExercises: exercisesWithDetails
      });
    } else {
      const selectedDays = [...new Set(exercisesWithDetails.map(e => e.dayOfWeek))].sort((a, b) => a - b);
      const selectedDaysIndex = [false, false, false, false, false, false, false];
      selectedDays.forEach(d => { selectedDaysIndex[d - 1] = true; });
      this.setData({
        planName: defaultName,
        cycleType: 'natural_week',
        selectedDays,
        selectedDaysIndex,
        planExercises: exercisesWithDetails
      });
    }

    this.updateSelectedDaysDisplay();
  },

  onInputPlanName(e) {
    this.setData({ planName: e.detail.value });
  },

  /**
   * 切换排课方式（按星期排课 vs 按课表轮换）
   */
  onSelectScheduleMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.cycleType) return;

    if (mode === 'cycle') {
      // 从星期模式切到轮换模式时，按顺序把已有动作映射到课表 A/B/C...
      const { selectedDays, planExercises } = this.data;
      const dayOrder = selectedDays.length > 0 ? selectedDays : [...new Set(planExercises.map(ex => ex.dayOfWeek).filter(Boolean))].sort((a, b) => a - b);
      const count = Math.min(6, Math.max(2, dayOrder.length));
      const nextLabels = CYCLE_ALPHABET.slice(0, count);
      const dayToLabel = {};
      dayOrder.forEach((d, idx) => {
        if (idx < nextLabels.length) dayToLabel[d] = nextLabels[idx];
      });
      const migrated = planExercises.map(ex => {
        const lbl = dayToLabel[ex.dayOfWeek] || ex.cycleLabel || 'A';
        return { ...ex, cycleLabel: lbl, slotKey: `cycle_${lbl}` };
      });
      this.setData({
        cycleType: 'cycle',
        cycleSlotLabels: nextLabels,
        planExercises: migrated
      });
    } else {
      // 从轮换模式切回星期模式时，映射回默认周几（1, 3, 5...）
      const { cycleSlotLabels, planExercises, selectedDays } = this.data;
      const defaultWeekMap = [1, 3, 5, 2, 4, 6];
      const nextDays = selectedDays.length >= cycleSlotLabels.length
        ? selectedDays
        : defaultWeekMap.slice(0, cycleSlotLabels.length).sort((a, b) => a - b);
      const selectedDaysIndex = [false, false, false, false, false, false, false];
      nextDays.forEach(d => { selectedDaysIndex[d - 1] = true; });
      const labelToDay = {};
      cycleSlotLabels.forEach((lbl, idx) => {
        labelToDay[lbl] = nextDays[idx] || (idx + 1);
      });
      const migrated = planExercises.map(ex => {
        const d = labelToDay[ex.cycleLabel] || ex.dayOfWeek || 1;
        return { ...ex, dayOfWeek: d, slotKey: `day_${d}` };
      });
      this.setData({
        cycleType: 'natural_week',
        selectedDays: nextDays,
        selectedDaysIndex,
        planExercises: migrated
      });
    }

    this.updateSelectedDaysDisplay();
  },

  /**
   * 星期模式：切换训练日
   */
  onToggleDay(e) {
    const day = Number(e.currentTarget.dataset.day);
    const { selectedDays, selectedDaysIndex } = this.data;

    if (selectedDays.includes(day)) {
      const newIndex = [...selectedDaysIndex];
      newIndex[day - 1] = false;
      this.setData({
        selectedDays: selectedDays.filter(d => d !== day),
        selectedDaysIndex: newIndex
      });
    } else {
      const newIndex = [...selectedDaysIndex];
      newIndex[day - 1] = true;
      this.setData({
        selectedDays: [...selectedDays, day].sort((a, b) => a - b),
        selectedDaysIndex: newIndex
      });
    }

    this.updateSelectedDaysDisplay();
  },

  /**
   * 轮换模式：新增一套课表（最多 6 套 A-F）
   */
  onAddCycleSlot() {
    const { cycleSlotLabels } = this.data;
    if (cycleSlotLabels.length >= 6) return;
    const nextLabel = CYCLE_ALPHABET.find(l => !cycleSlotLabels.includes(l));
    if (!nextLabel) return;
    this.setData({
      cycleSlotLabels: [...cycleSlotLabels, nextLabel]
    });
    this.updateSelectedDaysDisplay();
  },

  /**
   * 轮换模式：移除某套课表（最少保留 2 套）
   */
  onRemoveCycleSlot(e) {
    const label = e.currentTarget.dataset.label;
    const { cycleSlotLabels, planExercises } = this.data;
    if (cycleSlotLabels.length <= 2 || !label) return;
    const slotKey = `cycle_${label}`;
    this.setData({
      cycleSlotLabels: cycleSlotLabels.filter(l => l !== label),
      planExercises: planExercises.filter(ex => ex.slotKey !== slotKey)
    });
    this.updateSelectedDaysDisplay();
  },

  /**
   * 更新展示列表（统一星期与轮换两种模式）
   */
  updateSelectedDaysDisplay() {
    const { cycleType, selectedDays, weekDays, cycleSlotLabels, planExercises } = this.data;

    let selectedDaysDisplay = [];
    if (cycleType === 'cycle') {
      selectedDaysDisplay = cycleSlotLabels.map((lbl, idx) => {
        const slotKey = `cycle_${lbl}`;
        const exercises = planExercises.filter(pe => pe.slotKey === slotKey);
        return {
          slotKey,
          cycleLabel: lbl,
          dayOfWeek: idx + 1,
          label: lbl.length <= 2 ? `训练日 ${lbl}` : lbl,
          exercises
        };
      });
    } else {
      selectedDaysDisplay = selectedDays.map(day => {
        const dayInfo = weekDays[day - 1];
        const slotKey = `day_${day}`;
        const exercises = planExercises.filter(pe => pe.slotKey === slotKey);
        return {
          slotKey,
          dayOfWeek: day,
          label: dayInfo.label,
          exercises
        };
      });
    }

    this.setData({ selectedDaysDisplay });
  },

  /**
   * 添加动作
   */
  onAddExercise(e) {
    const slotKey = e.currentTarget.dataset.slotKey;
    this._addingSlotKey = slotKey;
    wx.navigateTo({
      url: '/pages/exercises/library?returnUrl=/pages/plans/create/create'
    });
  },

  /**
   * 批量选择动作回调
   */
  selectExercises(exercisesList) {
    if (!Array.isArray(exercisesList) || exercisesList.length === 0) return;
    const slotKey = this._addingSlotKey || (this.data.selectedDaysDisplay[0] && this.data.selectedDaysDisplay[0].slotKey) || 'day_1';
    const isCycle = slotKey.startsWith('cycle_');
    const cycleLabel = isCycle ? slotKey.replace('cycle_', '') : null;
    const dayOfWeek = isCycle
      ? Math.max(1, this.data.cycleSlotLabels.indexOf(cycleLabel) + 1)
      : (parseInt(slotKey.replace('day_', ''), 10) || 1);

    const additions = exercisesList.map(ex => {
      const { dayOfWeek: _ignored, ...rest } = ex;
      return {
        ...rest,
        slotKey,
        dayOfWeek,
        cycleLabel,
        target_sets: 4,
        target_reps: 8,
        initial_weight: 20,
        rest_seconds: 120
      };
    });

    this.setData({
      planExercises: [...this.data.planExercises, ...additions]
    });
    this.updateSelectedDaysDisplay();
  },

  selectExercise(exercise) {
    this.selectExercises([exercise]);
  },

  onViewExerciseGuide(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId) return;
    const ex = findOne('exercises', { id: exerciseId });
    if (!ex) return;
    this.setData({
      showExerciseGuide: true,
      guideExercise: ex
    });
  },

  onCloseExerciseGuide() {
    this.setData({
      showExerciseGuide: false,
      guideExercise: null
    });
  },

  onRemoveExercise(e) {
    const { slotKey, index } = e.currentTarget.dataset;
    const { planExercises } = this.data;
    const slotList = planExercises.filter(pe => pe.slotKey === slotKey);
    const target = slotList[index];
    if (target) {
      this.setData({
        planExercises: planExercises.filter(pe => pe !== target)
      });
      this.updateSelectedDaysDisplay();
    }
  },

  onUpdateExerciseParam(e) {
    const { slotKey, index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const { planExercises } = this.data;
    const slotList = planExercises.filter(pe => pe.slotKey === slotKey);
    const target = slotList[index];
    if (target) {
      const globalIdx = planExercises.indexOf(target);
      this.setData({
        [`planExercises[${globalIdx}].${field}`]: value
      });
    }
  },

  onSavePlan() {
    const { planName, cycleType, selectedDays, cycleSlotLabels, planExercises } = this.data;

    if (!planName.trim()) {
      wx.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    if (cycleType === 'natural_week' && selectedDays.length === 0) {
      wx.showToast({ title: '请至少选择一个训练日', icon: 'none' });
      return;
    }

    if (cycleType === 'cycle' && cycleSlotLabels.length < 2) {
      wx.showToast({ title: '轮换模式至少保留 2 个训练日', icon: 'none' });
      return;
    }

    const activeSlotKeys = new Set(
      cycleType === 'cycle'
        ? cycleSlotLabels.map(l => `cycle_${l}`)
        : selectedDays.map(d => `day_${d}`)
    );
    const activeExercises = (planExercises || []).filter(ex => activeSlotKeys.has(ex.slotKey));

    if (activeExercises.length === 0) {
      wx.showToast({ title: '请至少添加一个训练动作', icon: 'none' });
      return;
    }

    this.createPlan(activeExercises);
  },

  createPlan(activeExercises) {
    const { isEditMode, editPlanId, planName, cycleType, selectedDays, cycleSlotLabels } = this.data;

    const buildPlanExerciseDoc = (planId, ex) => {
      const parsedSets = parseInt(ex.target_sets, 10);
      const parsedReps = parseInt(ex.target_reps, 10);
      const parsedWeight = parseFloat(ex.initial_weight);
      const parsedRest = parseInt(ex.rest_seconds, 10);
      return {
        id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        plan_id: planId,
        exercise_id: ex.id,
        day_of_week: cycleType === 'cycle' ? (cycleSlotLabels.indexOf(ex.cycleLabel) + 1 || 1) : ex.dayOfWeek,
        cycle_label: cycleType === 'cycle' ? ex.cycleLabel : null,
        target_sets: !Number.isNaN(parsedSets) && parsedSets > 0 ? parsedSets : 4,
        target_reps: !Number.isNaN(parsedReps) && parsedReps > 0 ? parsedReps : 8,
        initial_weight: !Number.isNaN(parsedWeight) && parsedWeight >= 0 ? parsedWeight : 20,
        rest_seconds: !Number.isNaN(parsedRest) && parsedRest > 0 ? parsedRest : 120,
        created_at: Date.now()
      };
    };

    if (isEditMode) {
      update('plans', editPlanId, {
        name: planName.trim(),
        cycle_type: cycleType,
        cycle_length: cycleType === 'cycle' ? cycleSlotLabels.length : 7,
        cycle_labels: cycleType === 'cycle' ? cycleSlotLabels : [],
        selected_days: cycleType === 'natural_week' ? selectedDays : [],
        updated_at: Date.now()
      });

      const oldExercises = find('plan_exercises', { plan_id: editPlanId }) || [];
      oldExercises.forEach(pe => remove('plan_exercises', pe.id));
      activeExercises.forEach(ex => insert('plan_exercises', buildPlanExerciseDoc(editPlanId, ex)));

      wx.showToast({ title: '计划已更新', icon: 'success' });
    } else {
      const plan = {
        id: 'plan_' + Date.now(),
        name: planName.trim(),
        status: 'active',
        cycle_type: cycleType,
        cycle_length: cycleType === 'cycle' ? cycleSlotLabels.length : 7,
        cycle_labels: cycleType === 'cycle' ? cycleSlotLabels : [],
        selected_days: cycleType === 'natural_week' ? selectedDays : [],
        created_at: Date.now(),
        updated_at: Date.now()
      };

      insert('plans', plan);
      activeExercises.forEach(ex => insert('plan_exercises', buildPlanExerciseDoc(plan.id, ex)));

      wx.showToast({ title: '计划已创建', icon: 'success' });

      const app = getApp();
      if (app) {
        app.globalData.focusPlanId = plan.id;
        if (typeof app.startSync === 'function') {
          app.startSync();
        }
      }

      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' });
      }, 600);
      return;
    }

    const app = getApp();
    if (app && typeof app.startSync === 'function') {
      app.startSync();
    }

    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  }
});
