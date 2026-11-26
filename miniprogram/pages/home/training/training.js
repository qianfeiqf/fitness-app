/**
 * 训练中页面 - 核心跟练交互
 */

const { findOne, update, getCollection, insert, remove, MUSCLE_SUB_GROUPS } = require('../../../localdb/db.js');
const { calculate1RM, calculateAndSave1RM, checkMilestone } = require('../../../services/rm.js');
const { calculateProgression } = require('../../../services/progression.js');
const UI = require('../../../utils/ui.js');
const audio = require('../../../utils/audio.js');

Page({
  data: {
    // 会话信息
    sessionId: null,
    session: null,

    // 当前动作
    currentExercise: null,
    currentExerciseIndex: 0,
    currentSetIndex: 0,

    // 动作列表
    exercises: [],

    // 热身与正式组双 Tab 状态
    activeStage: 'formal',
    warmupSets: [],
    currentWarmupIndex: 0,
    warmupCompletedCount: 0,
    formalSets: [],

    // 倒计时
    isResting: false,
    restTimeLeft: 0,
    restTimeTotal: 120,
    nextSetPreview: '',

    // RPE选择
    showRPEPicker: false,
    rpeOptions: ['轻量', '中等', '吃力', '力竭'],
    selectedRPE: 1,

    // UI状态
    isCompleted: false,
    completedSets: [],
    prBadges: [],

    // 整体进度
    completedExerciseCount: 0,
    exerciseStatusList: [],

    // 临时替换
    showReplaceModal: false,
    alternativeExercises: [],

    // 组备注
    setNote: '',

    // 休息计时器状态
    restCompleting: false,
    restMinimized: false,

    // 热身组
    showWarmup: false,
    warmupSets: [],
    currentWarmupIndex: 0,

    // 跳过动作
    showSkipModal: false,
    skipReasons: ['身体不适/疼痛', '器械被占用', '时间不够', '其他原因'],
    selectedSkipReason: -1,

    // 添加动作（支持肌群筛选 + 多选批量添加 + 自定义动作）
    showAddExerciseModal: false,
    addExerciseSearch: '',
    addMuscleGroups: ['全部', '胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'],
    selectedAddMuscle: '全部',
    addSubMuscles: [],
    selectedAddSubMuscle: '全部',
    filteredExercises: [],
    selectedAddIds: [],
    selectedAddMap: {},
    selectedAddConfigs: {},
    canAddCustomExercise: false,

    // 自由训练模式
    isFreeWorkout: false,
    freeAllDone: false,

    // 横向动作栏自动滚动与全部动作抽屉
    exerciseScrollIntoView: '',
    showExerciseListModal: false,
    showFinishModal: false,
    showConfirmSheet: false,
    confirmSheetTitle: '',
    confirmSheetDesc: '',
    confirmSheetConfirmText: '确认',
    confirmSheetCancelText: '取消',
    confirmSheetDanger: false,
    showExerciseDetail: false,
    detailExercise: null,
    gifLoadError: false,
    playingExerciseId: '',
    thumbErrorMap: {},

    // 更多操作面板
    showMoreActions: false,

    // 刻度拨盘数据
    weightOptions: [],
    repOptions: [],

    // 训练总时长
    trainingDuration: 0,
    isPaused: false,

    // 杠铃配重片换算
    barWeight: 20,
    plateHint: ''
  },

  onLoad(options) {
    this.calcNavBarHeight();
    console.log('=== 训练中页面加载 ===', options);

    if (options.sessionId) {
      this.setData({ sessionId: options.sessionId });
      this.loadSession(options.sessionId);
    }

    // 监听App隐藏事件
    wx.eventCenter.on('appHidden', this.onAppHidden, this);
  },

  onShow() {
    const app = getApp();
    if (app && app.globalData && this.data.sessionId && app.globalData.trainingMinimizedSessionId === this.data.sessionId) {
      app.globalData.trainingMinimized = false;
      app.globalData.trainingMinimizedSessionId = null;
    }
    if (this.data.isResting && this.restEndTime && !this.data.restCompleting) {
      const remaining = Math.ceil((this.restEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        this.setData({ restCompleting: true, restTimeLeft: 0 });
        this.onRestComplete();
      } else {
        this.setData({ restTimeLeft: remaining });
        this._startRestInterval();
      }
    }
  },

  onHide() {
    this.clearRestTimer();
    this.saveSnapshot();
  },

  onUnload() {
    this.clearRestTimer();
    this.stopDurationTimer();
    this._clearWarmupAutoSwitchTimer();
    this._minimizeToFloat();
    wx.eventCenter.off('appHidden', this.onAppHidden);
  },

  _startRestInterval() {
    this.clearRestTimer();
    this.restTimer = setInterval(() => {
      if (this.data.restCompleting) return;
      const remaining = this.restEndTime
        ? Math.ceil((this.restEndTime - Date.now()) / 1000)
        : this.data.restTimeLeft - 1;
      if (remaining <= 0) {
        this.setData({ restCompleting: true, restTimeLeft: 0 });
        this.onRestComplete();
      } else {
        this.setData({ restTimeLeft: remaining });
        this.playRestBeep();
      }
    }, 1000);
  },

  clearRestTimer() {
    if (this.restTimer) {
      clearInterval(this.restTimer);
      this.restTimer = null;
    }
  },

  /**
   * 计算当前累计有效训练时长（秒），不含补练/暂停间隔
   */
  _getCurrentTotalDurationSeconds() {
    const base = this.baseDurationSeconds || 0;
    const seg = this.segmentStartedAt && !this.data.isPaused
      ? Math.max(0, Math.floor((Date.now() - this.segmentStartedAt) / 1000))
      : 0;
    return base + seg;
  },

  /**
   * 启动训练总时长计时器
   */
  startDurationTimer() {
    if (this.durationTimer) return;
    this.durationTimer = setInterval(() => {
      if (!this.data.isPaused) {
        this.setData({
          trainingDuration: this._getCurrentTotalDurationSeconds()
        });
      }
    }, 1000);
  },

  /**
   * 停止训练总时长计时器
   */
  stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  },

  // 空操作函数（用于阻止事件冒泡）
  noop() {},

  /**
   * 打开统一极简二次确认抽屉（替代微信原生 wx.showModal）
   */
  _openConfirmSheet({ title, desc, confirmText = '确认', cancelText = '取消', danger = false, onConfirm }) {
    this._confirmSheetCallback = onConfirm || null;
    this.setData({
      showConfirmSheet: true,
      confirmSheetTitle: title || '',
      confirmSheetDesc: desc || '',
      confirmSheetConfirmText: confirmText,
      confirmSheetCancelText: cancelText,
      confirmSheetDanger: !!danger
    });
  },

  onCancelConfirmSheet() {
    this._confirmSheetCallback = null;
    this.setData({ showConfirmSheet: false });
  },

  onApproveConfirmSheet() {
    const cb = this._confirmSheetCallback;
    this._confirmSheetCallback = null;
    this.setData({ showConfirmSheet: false });
    if (typeof cb === 'function') cb();
  },

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - windowInfo.statusBarHeight);
    this.setData({
      navHeight,
      navTop: menuButton.top,
      navMenuHeight: menuButton.height
    });
  },

  /**
   * 顶部自定义返回按钮（自动收起为全局悬浮条并返回）
   */
  onBackFromTraining() {
    this._minimizeToFloat();
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
  },

  /**
   * 加载会话
   */
  loadSession(sessionId) {
    UI.showLoading('加载中...', this);

    const session = findOne('sessions', { id: sessionId });

    if (!session) {
      UI.hideLoading();
      UI.showError('会话不存在', this);
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    const exercises = session.pending_exercises || [];
    const isFreeWorkout = !!session.is_free_workout;
    const existingSets = session.completed_sets || [];
    const startIdx = session.current_exercise_index || 0;
    const freeAllDone = exercises.length > 0 && startIdx >= exercises.length;

    // 分段累计时长初始化：恢复/补练时沿用原累计时长，不把离开间隔算进去
    this.baseDurationSeconds = Number(session.accumulated_duration_seconds || session.total_duration_seconds || 0);
    this.segmentStartedAt = (this.baseDurationSeconds === 0 && session.started_at && !session.completed_at)
      ? session.started_at
      : Date.now();

    this.setData({
      session,
      exercises,
      isFreeWorkout,
      freeAllDone,
      completedSets: existingSets,
      currentExerciseIndex: startIdx,
      currentSetIndex: session.current_set_index || 0,
      trainingDuration: this._getCurrentTotalDurationSeconds()
    });

    // 计算整体进度
    this.calculateOverallProgress();

    UI.hideLoading();

    // 启动训练总时长计时器
    this.startDurationTimer();

    // 设置当前动作；自由训练空列表时自动打开多选动作抽屉
    if (exercises.length > 0 && !freeAllDone) {
      this.setCurrentExercise();
    } else if (isFreeWorkout && exercises.length === 0) {
      this.onAddExercise();
    }

    // 若全局存在当前会话的组间休息倒计时，无缝恢复
    this._restoreGlobalRestState(session.id);
  },

  /**
   * 设置当前动作
   */
  /**
   * 初始化或对齐某动作的平铺正式组列表
   */
  _ensureFormalSets(exercise, completedSets = []) {
    const exRecords = completedSets.filter(s => s && s.exercise_id === exercise.exercise_id);
    const recordMap = {};
    exRecords.forEach(r => { recordMap[r.id] = r; });

    if (Array.isArray(exercise.formal_sets) && exercise.formal_sets.length > 0) {
      return exercise.formal_sets.map(s => {
        if (s.completed && s.recordId && !recordMap[s.recordId]) {
          return { ...s, completed: false, recordId: null };
        }
        if (s.recordId && recordMap[s.recordId]) {
          const rec = recordMap[s.recordId];
          return { ...s, completed: true, weight: rec.actual_weight, reps: rec.actual_reps };
        }
        return { ...s };
      });
    }

    const totalSets = Math.max(1, exercise.target_sets || 3, exRecords.length);
    const lastDone = exRecords.length > 0 ? exRecords[exRecords.length - 1] : null;
    const fallbackWeight = lastDone ? lastDone.actual_weight : (exercise.target_weight || 0);
    const fallbackReps = lastDone ? lastDone.actual_reps : (exercise.target_reps || 10);

    const list = [];
    for (let i = 0; i < totalSets; i++) {
      if (i < exRecords.length) {
        const rec = exRecords[i];
        list.push({
          weight: rec.actual_weight,
          reps: rec.actual_reps,
          completed: true,
          recordId: rec.id,
          userEdited: true
        });
      } else {
        list.push({
          weight: fallbackWeight,
          reps: fallbackReps,
          completed: false,
          recordId: null,
          userEdited: false
        });
      }
    }
    return list;
  },

  setCurrentExercise() {
    const { exercises, currentExerciseIndex, isFreeWorkout, completedSets } = this.data;
    const exercise = exercises[currentExerciseIndex];

    if (!exercise) {
      this.setData({ freeAllDone: exercises.length > 0, currentExercise: null, formalSets: [] });
      return;
    }

    const exerciseDetail = findOne('exercises', { id: exercise.exercise_id }) || {
      id: exercise.exercise_id,
      name: exercise.exercise_name || exercise.name || '自定义动作',
      muscle_group: exercise.muscle_group || '自由训练',
      alternatives: []
    };

    const formalSets = this._ensureFormalSets(exercise, completedSets);
    const warmupSets = this._ensureWarmupSets(exercise);
    const doneCount = formalSets.filter(s => s.completed).length;
    const nextIdx = formalSets.findIndex(s => !s.completed);
    const activeIdx = nextIdx >= 0 ? nextIdx : formalSets.length;
    const isDone = nextIdx === -1;

    const warmupCompletedCount = warmupSets.filter(s => s.completed).length;
    const currentWarmupIndex = this._findNextWarmupIndex(warmupSets);
    const defaultStage = (!isFreeWorkout && (exercise.target_weight || 0) >= 30 && !exercise.warmup_completed && doneCount === 0)
      ? 'warmup'
      : 'formal';

    const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? {
      ...ex,
      formal_sets: formalSets,
      warmup_sets: warmupSets,
      target_sets: formalSets.length,
      completed_sets: doneCount
    } : ex);

    const exRecords = completedSets.filter(s => s && s.exercise_id === exercise.exercise_id);
    const lastInSession = exRecords.length > 0 ? exRecords[exRecords.length - 1] : null;
    const defaultRPE = doneCount === 0 ? 1 : (lastInSession && lastInSession.rpe ? (lastInSession.rpe - 1) : 1);

    const activeRow = formalSets[activeIdx] || formalSets[formalSets.length - 1] || { weight: 0, reps: 10 };
    this.setData({
      exercises: nextExercises,
      formalSets,
      warmupSets,
      warmupCompletedCount,
      currentWarmupIndex,
      activeStage: defaultStage,
      showWarmup: false,
      currentExercise: {
        ...nextExercises[currentExerciseIndex],
        ...exerciseDetail,
        isDone,
        currentSetNumber: isDone ? formalSets.length : activeIdx + 1,
        actual_weight: activeRow.weight,
        actual_reps: activeRow.reps
      },
      currentSetIndex: activeIdx,
      selectedRPE: defaultRPE,
      setNote: '',
      freeAllDone: false,
      exerciseScrollIntoView: 'ex-chip-' + currentExerciseIndex
    });

    this.calculateOverallProgress();
  },

  /**
   * 初始化或沿用某动作的热身组列表（切 Tab 或切动作不重置）
   */
  _ensureWarmupSets(exercise) {
    if (Array.isArray(exercise.warmup_sets) && exercise.warmup_sets.length > 0) {
      return exercise.warmup_sets.map(s => ({ ...s }));
    }

    const targetWeight = exercise.target_weight || 0;
    const barWeight = 20;
    const warmupSets = [];

    if (targetWeight > barWeight + 10) {
      warmupSets.push({ weight: barWeight, reps: 10, label: '空杆激活', completed: false });
    }
    const w2 = Math.round((targetWeight * 0.4) * 2) / 2;
    if (w2 > barWeight) {
      warmupSets.push({ weight: w2, reps: 5, label: '轻重量适应', completed: false });
    }
    const w3 = Math.round((targetWeight * 0.6) * 2) / 2;
    if (w3 > (warmupSets.length > 0 ? warmupSets[warmupSets.length - 1].weight : 0)) {
      warmupSets.push({ weight: w3, reps: 3, label: '中等重量预热', completed: false });
    }
    const w4 = Math.round((targetWeight * 0.8) * 2) / 2;
    if (w4 > (warmupSets.length > 0 ? warmupSets[warmupSets.length - 1].weight : 0)) {
      warmupSets.push({ weight: w4, reps: 1, label: '接近重量激活', completed: false });
    }
    if (warmupSets.length === 0) {
      const halfWeight = Math.max(0, Math.round((targetWeight * 0.5) * 2) / 2);
      warmupSets.push({ weight: halfWeight, reps: 10, label: '轻重量热身', completed: false });
    }
    return warmupSets;
  },

  /**
   * 持久化热身组列表回当前动作和会话
   */
  _syncWarmupSets(warmupSets) {
    const { exercises, currentExerciseIndex, session } = this.data;
    const warmupCompletedCount = warmupSets.filter(s => s.completed).length;
    const currentWarmupIndex = this._findNextWarmupIndex(warmupSets);
    const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? { ...ex, warmup_sets: warmupSets } : ex);

    if (session) {
      update('sessions', session.id, {
        pending_exercises: nextExercises,
        updated_at: Date.now()
      });
    }
    this.setData({
      exercises: nextExercises,
      warmupSets,
      warmupCompletedCount,
      currentWarmupIndex
    });
  },

  /**
   * 热身组 / 正式组双 Tab 互切
   */
  onSwitchStage(e) {
    const stage = e.currentTarget.dataset.stage;
    if (!stage || stage === this.data.activeStage) return;
    this._clearWarmupAutoSwitchTimer();

    if (stage === 'formal') {
      const { exercises, currentExerciseIndex, session } = this.data;
      if (exercises[currentExerciseIndex] && !exercises[currentExerciseIndex].warmup_completed) {
        const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? { ...ex, warmup_completed: true } : ex);
        if (session) {
          update('sessions', session.id, { pending_exercises: nextExercises, updated_at: Date.now() });
        }
        this.setData({ exercises: nextExercises, activeStage: 'formal' });
        return;
      }
    }
    this.setData({ activeStage: stage });
  },

  /**
   * 计算下一个未完成的热身组索引
   */
  _findNextWarmupIndex(sets) {
    const idx = sets.findIndex(s => !s.completed);
    return idx >= 0 ? idx : sets.length;
  },

  onWarmupWeightInput(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || !this.data.warmupSets[idx]) return;
    this.setData({ [`warmupSets[${idx}].weight`]: e.detail.value });
  },

  onWarmupRepsInput(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || !this.data.warmupSets[idx]) return;
    this.setData({ [`warmupSets[${idx}].reps`]: e.detail.value });
  },

  onWarmupInputBlur(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const sets = this.data.warmupSets;
    if (Number.isNaN(idx) || !sets[idx]) return;
    const rawW = parseFloat(sets[idx].weight);
    const rawR = parseInt(sets[idx].reps, 10);
    const nextSets = sets.map((s, i) => i === idx ? {
      ...s,
      weight: Number.isNaN(rawW) || rawW < 0 ? 0 : rawW,
      reps: Number.isNaN(rawR) || rawR < 1 ? 1 : rawR
    } : s);
    this._syncWarmupSets(nextSets);
  },

  _clearWarmupAutoSwitchTimer() {
    if (this._warmupAutoSwitchTimer) {
      clearTimeout(this._warmupAutoSwitchTimer);
      this._warmupAutoSwitchTimer = null;
    }
  },

  _scheduleAutoSwitchToFormal() {
    this._clearWarmupAutoSwitchTimer();
    const targetExerciseIndex = this.data.currentExerciseIndex;
    UI.showToast({ message: '热身完成', icon: 'check-circle', context: this });
    this._warmupAutoSwitchTimer = setTimeout(() => {
      this._warmupAutoSwitchTimer = null;
      if (this.data.activeStage === 'warmup' && this.data.currentExerciseIndex === targetExerciseIndex) {
        this.onFinishWarmup();
      }
    }, 450);
  },

  onToggleWarmupSet(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const { warmupSets: sets, currentWarmupIndex } = this.data;
    if (Number.isNaN(idx) || !sets[idx]) return;
    // 仅允许取消已完成组或勾选当前高亮的下一组，其余未轮到的组静默忽略
    if (!sets[idx].completed && idx !== currentWarmupIndex) return;
    const nextSets = sets.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s);
    this._syncWarmupSets(nextSets);
    if (nextSets[idx].completed) {
      UI.vibrateSuccess();
      if (this._findNextWarmupIndex(nextSets) >= nextSets.length) {
        this._scheduleAutoSwitchToFormal();
      }
    } else {
      this._clearWarmupAutoSwitchTimer();
    }
  },

  onAddWarmupSet() {
    const warmupSets = [...this.data.warmupSets];
    const last = warmupSets[warmupSets.length - 1];
    warmupSets.push({
      weight: last ? (parseFloat(last.weight) || 20) : 20,
      reps: last ? (parseInt(last.reps, 10) || 5) : 5,
      label: '自定义热身',
      completed: false
    });
    this._syncWarmupSets(warmupSets);
  },

  onDeleteWarmupSet(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const warmupSets = [...this.data.warmupSets];
    if (warmupSets.length <= 1 || Number.isNaN(idx)) return;
    warmupSets.splice(idx, 1);
    this._syncWarmupSets(warmupSets);
  },

  onCompleteWarmupSet() {
    const { warmupSets, currentWarmupIndex } = this.data;
    if (!warmupSets[currentWarmupIndex]) return;
    const nextSets = warmupSets.map((s, i) => i === currentWarmupIndex ? { ...s, completed: true } : s);
    this._syncWarmupSets(nextSets);
    UI.vibrateSuccess();
    if (this._findNextWarmupIndex(nextSets) >= nextSets.length) {
      this._scheduleAutoSwitchToFormal();
    }
  },

  onFinishWarmup() {
    this._clearWarmupAutoSwitchTimer();
    const { exercises, currentExerciseIndex, session } = this.data;
    if (!exercises[currentExerciseIndex]) return;
    const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? { ...ex, warmup_completed: true } : ex);
    if (session) {
      update('sessions', session.id, { pending_exercises: nextExercises, updated_at: Date.now() });
    }
    this.setData({ exercises: nextExercises, activeStage: 'formal' });
  },

  /**
   * 计算整体进度
   */
  calculateOverallProgress() {
    const { exercises, currentExerciseIndex } = this.data;

    // 计算已完成的动作数量
    let completedCount = 0;
    const statusList = exercises.map((ex, idx) => {
      const isCompleted = ex.completed_sets >= ex.target_sets;
      const isCurrent = idx === currentExerciseIndex;
      if (isCompleted) completedCount++;

      return {
        name: ex.exercise_name,
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
      };
    });

    // 计算环形进度角度 (每个动作占 360/exercises.length 度)
    const totalAngle = exercises.length > 0 ? (completedCount / exercises.length) * 360 : 0;

    this.setData({
      completedExerciseCount: completedCount,
      overallProgressAngle: totalAngle,
      exerciseStatusList: statusList
    });
  },

  onFormalWeightInput(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || !this.data.formalSets[idx]) return;
    this.setData({
      [`formalSets[${idx}].weight`]: e.detail.value,
      [`formalSets[${idx}].userEdited`]: true
    });
  },

  onFormalRepsInput(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx) || !this.data.formalSets[idx]) return;
    this.setData({
      [`formalSets[${idx}].reps`]: e.detail.value,
      [`formalSets[${idx}].userEdited`]: true
    });
  },

  onFormalInputBlur(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const { formalSets, exercises, currentExerciseIndex, completedSets, session } = this.data;
    if (Number.isNaN(idx) || !formalSets[idx] || !session) return;

    const rawW = parseFloat(formalSets[idx].weight);
    const rawR = parseInt(formalSets[idx].reps, 10);
    const weight = Number.isNaN(rawW) || rawW < 0 ? 0 : rawW;
    const reps = Number.isNaN(rawR) || rawR < 1 ? 1 : rawR;

    const nextFormalSets = formalSets.map((s, i) => {
      if (i === idx) return { ...s, weight, reps, userEdited: true };
      if (!formalSets[idx].completed && i > idx && !s.completed && !s.userEdited) {
        return { ...s, weight, reps };
      }
      return s;
    });

    let nextCompletedSets = completedSets;
    const row = nextFormalSets[idx];
    if (row.completed && row.recordId) {
      update('session_sets', row.recordId, {
        actual_weight: weight,
        actual_reps: reps,
        updated_at: Date.now()
      });
      nextCompletedSets = completedSets.map(s => s.id === row.recordId ? { ...s, actual_weight: weight, actual_reps: reps } : s);
    }

    const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? { ...ex, formal_sets: nextFormalSets } : ex);
    update('sessions', session.id, {
      pending_exercises: nextExercises,
      completed_sets: nextCompletedSets,
      updated_at: Date.now()
    });

    this.setData({
      formalSets: nextFormalSets,
      exercises: nextExercises,
      completedSets: nextCompletedSets
    });
  },

  onToggleFormalSet(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const { formalSets, currentSetIndex } = this.data;
    if (Number.isNaN(idx) || !formalSets[idx]) return;
    if (formalSets[idx].completed) {
      this._uncompleteFormalSetAt(idx);
    } else if (idx === currentSetIndex) {
      this._completeFormalSetAt(idx);
    }
  },

  _uncompleteFormalSetAt(idx) {
    const { formalSets, exercises, currentExerciseIndex, completedSets, session } = this.data;
    const row = formalSets[idx];
    if (!row || !row.completed || !session) return;

    if (row.recordId) {
      remove('session_sets', row.recordId);
    }
    const nextCompletedSets = completedSets.filter(s => s.id !== row.recordId);
    const nextFormalSets = formalSets.map((s, i) => i === idx ? { ...s, completed: false, recordId: null } : s);
    const doneCount = nextFormalSets.filter(s => s.completed).length;
    const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? {
      ...ex,
      formal_sets: nextFormalSets,
      completed_sets: doneCount,
      target_sets: nextFormalSets.length
    } : ex);

    update('sessions', session.id, {
      pending_exercises: nextExercises,
      completed_sets: nextCompletedSets,
      updated_at: Date.now()
    });

    this.setData({
      exercises: nextExercises,
      completedSets: nextCompletedSets
    });
    this.setCurrentExercise();
    wx.showToast({ title: `已取消第 ${idx + 1} 组`, icon: 'none' });
  },

  onAddFormalSet() {
    const { formalSets, exercises, currentExerciseIndex, session } = this.data;
    if (!session || !exercises[currentExerciseIndex]) return;
    if (formalSets.length >= 20) {
      wx.showToast({ title: '最多 20 组', icon: 'none' });
      return;
    }

    const last = formalSets[formalSets.length - 1];
    const nextFormalSets = [
      ...formalSets,
      {
        weight: last ? (parseFloat(last.weight) || 0) : (exercises[currentExerciseIndex].target_weight || 0),
        reps: last ? (parseInt(last.reps, 10) || 10) : (exercises[currentExerciseIndex].target_reps || 10),
        completed: false,
        recordId: null,
        userEdited: false
      }
    ];

    const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? {
      ...ex,
      formal_sets: nextFormalSets,
      target_sets: nextFormalSets.length
    } : ex);

    update('sessions', session.id, {
      pending_exercises: nextExercises,
      updated_at: Date.now()
    });

    this.setData({ exercises: nextExercises, freeAllDone: false });
    this.setCurrentExercise();
  },

  onDeleteFormalSet(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const { formalSets, exercises, currentExerciseIndex, completedSets, session } = this.data;
    if (formalSets.length <= 1 || Number.isNaN(idx) || !formalSets[idx] || !session) return;

    const doDelete = () => {
      const targetRow = formalSets[idx];
      let nextCompletedSets = completedSets;
      if (targetRow.completed && targetRow.recordId) {
        remove('session_sets', targetRow.recordId);
        nextCompletedSets = completedSets.filter(s => s.id !== targetRow.recordId);
      }
      const nextFormalSets = formalSets.filter((_, i) => i !== idx);
      const doneCount = nextFormalSets.filter(s => s.completed).length;
      const nextExercises = exercises.map((ex, i) => i === currentExerciseIndex ? {
        ...ex,
        formal_sets: nextFormalSets,
        target_sets: nextFormalSets.length,
        completed_sets: doneCount
      } : ex);

      update('sessions', session.id, {
        pending_exercises: nextExercises,
        completed_sets: nextCompletedSets,
        updated_at: Date.now()
      });

      this.setData({
        exercises: nextExercises,
        completedSets: nextCompletedSets
      });
      this.setCurrentExercise();
    };

    if (formalSets[idx].completed) {
      this._openConfirmSheet({
        title: '删除已完成组',
        desc: `删除后将清除第 ${idx + 1} 组的训练记录`,
        confirmText: '确认删除',
        cancelText: '取消',
        danger: true,
        onConfirm: doDelete
      });
    } else {
      doDelete();
    }
  },

  onCompleteSet() {
    const { formalSets, currentSetIndex } = this.data;
    const idx = (formalSets[currentSetIndex] && !formalSets[currentSetIndex].completed)
      ? currentSetIndex
      : formalSets.findIndex(s => !s.completed);
    if (idx < 0) return;
    this._completeFormalSetAt(idx);
  },

  _completeFormalSetAt(idx) {
    const { currentExercise, session, currentExerciseIndex, exercises, completedSets, formalSets } = this.data;

    if (!currentExercise || !session || !formalSets[idx]) {
      console.error('currentExercise or session is null');
      UI.showError('数据异常，请重试', this);
      return;
    }

    const row = formalSets[idx];
    const rawW = parseFloat(row.weight);
    const rawR = parseInt(row.reps, 10);
    const actualWeight = Number.isNaN(rawW) || rawW < 0 ? 0 : rawW;
    const actualReps = Number.isNaN(rawR) || rawR < 1 ? 1 : rawR;

    const setRecord = {
      id: 'set_' + Date.now() + '_' + idx,
      session_id: session.id,
      exercise_id: currentExercise.exercise_id,
      exercise_name: currentExercise.name,
      set_number: idx + 1,
      target_weight: currentExercise.target_weight,
      actual_weight: actualWeight,
      target_reps: currentExercise.target_reps,
      actual_reps: actualReps,
      rpe: this.data.selectedRPE + 1,
      note: this.data.setNote || '',
      status: 'completed',
      completed_at: Date.now(),
      created_at: Date.now()
    };

    insert('session_sets', setRecord);
    const newCompletedSets = [...completedSets, setRecord];

    const nextFormalSets = formalSets.map((s, i) => {
      if (i === idx) {
        return { ...s, weight: actualWeight, reps: actualReps, completed: true, recordId: setRecord.id, userEdited: true };
      }
      if (i > idx && !s.completed && !s.userEdited) {
        return { ...s, weight: actualWeight, reps: actualReps };
      }
      return s;
    });

    const doneCount = nextFormalSets.filter(s => s.completed).length;
    const nextUndoneSetIdx = nextFormalSets.findIndex(s => !s.completed);
    const newExercises = exercises.map((ex, i) => i === currentExerciseIndex ? {
      ...ex,
      formal_sets: nextFormalSets,
      target_sets: nextFormalSets.length,
      completed_sets: doneCount
    } : ex);

    let newExerciseIndex = currentExerciseIndex;
    let newSetIndex = nextUndoneSetIdx >= 0 ? nextUndoneSetIdx : nextFormalSets.length;
    if (nextUndoneSetIdx === -1) {
      let nextUndoneIdx = newExercises.findIndex((ex, i) => i > currentExerciseIndex && (ex.completed_sets || 0) < (ex.target_sets || 1));
      if (nextUndoneIdx === -1) {
        nextUndoneIdx = newExercises.findIndex((ex) => (ex.completed_sets || 0) < (ex.target_sets || 1));
      }
      newExerciseIndex = nextUndoneIdx !== -1 ? nextUndoneIdx : newExercises.length;
      newSetIndex = nextUndoneIdx !== -1 ? (newExercises[nextUndoneIdx].completed_sets || 0) : 0;
    }

    update('sessions', session.id, {
      pending_exercises: newExercises,
      current_exercise_index: newExerciseIndex,
      current_set_index: newSetIndex,
      updated_at: Date.now()
    });

    const restPrefs = wx.getStorageSync('exercise_rest_prefs') || {};
    const restSeconds = currentExercise.rest_seconds || restPrefs[currentExercise.exercise_id] || 120;
    let completedCount = 0;
    const statusList = newExercises.map((ex, i) => {
      const isCompleted = ex.completed_sets >= ex.target_sets;
      if (isCompleted) completedCount++;
      return {
        name: ex.exercise_name,
        status: isCompleted ? 'completed' : (i === newExerciseIndex ? 'current' : 'pending')
      };
    });
    const totalAngle = newExercises.length > 0 ? (completedCount / newExercises.length) * 360 : 0;

    const isWorkoutAllDone = newExerciseIndex >= newExercises.length;
    if (isWorkoutAllDone) {
      this.clearRestTimer();
      this.restEndTime = null;
      this._clearGlobalRestState();
      this.setData({
        completedSets: newCompletedSets,
        exercises: newExercises,
        formalSets: nextFormalSets,
        currentExerciseIndex: newExerciseIndex,
        currentSetIndex: newSetIndex,
        isResting: false,
        restTimeLeft: 0,
        restMinimized: false,
        completedExerciseCount: completedCount,
        overallProgressAngle: totalAngle,
        exerciseStatusList: statusList,
        freeAllDone: true,
        currentExercise: null
      });
      this.saveSnapshot();
      this.checkAndSave1RM(setRecord);
      UI.vibrateSuccess();
      return;
    }

    // 记录当前组间休息归属的动作，用于调整时长后按动作记忆
    this.restingExerciseId = currentExercise.exercise_id;
    this.restingPlanExerciseId = currentExercise.plan_exercise_id || null;

    // 生成休息弹窗中的「下一组预告」
    let nextSetPreview = '';
    const nextEx = newExercises[newExerciseIndex];
    if (nextEx) {
      const nextExSets = Array.isArray(nextEx.formal_sets) && nextEx.formal_sets.length > 0 ? nextEx.formal_sets : null;
      const nextRow = nextExSets ? (nextExSets[newSetIndex] || nextExSets.find(s => !s.completed)) : null;
      const w = nextRow ? nextRow.weight : (nextEx.target_weight || 0);
      const r = nextRow ? nextRow.reps : (nextEx.target_reps || 10);
      const totalS = nextExSets ? nextExSets.length : (nextEx.target_sets || 1);
      nextSetPreview = `${nextEx.exercise_name || nextEx.name} 第${Math.min(newSetIndex + 1, totalS)}/${totalS}组 · ${w}kg×${r}`;
    }

    this.setData({
      completedSets: newCompletedSets,
      exercises: newExercises,
      formalSets: nextFormalSets,
      currentExerciseIndex: newExerciseIndex,
      currentSetIndex: newSetIndex,
      isResting: true,
      restTimeLeft: restSeconds,
      restTimeTotal: restSeconds,
      restCompleting: false,
      nextSetPreview,
      completedExerciseCount: completedCount,
      overallProgressAngle: totalAngle,
      exerciseStatusList: statusList
    });

    this.saveSnapshot();
    this.restEndTime = Date.now() + restSeconds * 1000;
    this._syncGlobalRestState({ restTimeTotal: restSeconds, nextSetPreview, restMinimized: false });
    this._startRestInterval();
    this.checkAndSave1RM(setRecord);
    UI.vibrateSuccess();
  },

  /**
   * 获取某动作最近一次的训练记录（含上次同会话完成的组数）
   */
  getLastExerciseRecord(exerciseId) {
    const allSets = getCollection('session_sets');
    const records = allSets
      .filter(s => s.exercise_id === exerciseId && s.status === 'completed')
      .sort((a, b) => b.completed_at - a.completed_at);
    if (records.length === 0) return null;
    const latest = records[0];
    const sameSessionCount = latest.session_id
      ? records.filter(s => s.session_id === latest.session_id).length
      : 0;
    return {
      ...latest,
      sets_count: Math.min(20, Math.max(1, sameSessionCount || 3))
    };
  },

  /**
   * 构建重量拨盘选项：从 0 到 maxWeight，步进 2.5
   */
  _buildWeightOptions(currentWeight) {
    const maxWeight = Math.max(currentWeight + 50, 150);
    const items = [];
    for (let w = 0; w <= maxWeight; w += 2.5) {
      items.push(parseFloat(w.toFixed(1)));
    }
    return items;
  },

  /**
   * 构建次数拨盘选项：从 0 到 30
   */
  _buildRepOptions(currentReps) {
    const maxReps = Math.max(currentReps + 10, 30);
    const items = [];
    for (let r = 0; r <= maxReps; r++) {
      items.push(r);
    }
    return items;
  },

  /**
   * 重量拨盘变化
   */
  onWeightChange(e) {
    const value = e.detail.value;
    this.setData({
      'currentExercise.actual_weight': value,
      plateHint: this._calcBarbellPlates(value, this.data.barWeight)
    });
  },

  /**
   * 计算杠铃单边配重片组合
   */
  _calcBarbellPlates(totalWeight, barWeight = 20) {
    const w = parseFloat(totalWeight) || 0;
    if (w < barWeight) return '';
    if (w === barWeight) return `空杆 (${barWeight}kg)`;
    let perSide = Math.round(((w - barWeight) / 2) * 100) / 100;
    const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const picked = [];
    for (const p of plates) {
      while (perSide + 0.001 >= p) {
        picked.push(p);
        perSide = Math.round((perSide - p) * 100) / 100;
      }
    }
    if (picked.length === 0) return '';
    const suffix = perSide > 0.01 ? ` (+${perSide})` : '';
    return `单边: ${picked.join(' + ')}kg${suffix} (${barWeight}kg杆)`;
  },

  /**
   * 切换标准杆(20kg) / 女子杆(15kg)
   */
  onToggleBarWeight() {
    const nextBar = this.data.barWeight === 20 ? 15 : 20;
    const currentWeight = this.data.currentExercise ? this.data.currentExercise.actual_weight : 0;
    this.setData({
      barWeight: nextBar,
      plateHint: this._calcBarbellPlates(currentWeight, nextBar)
    });
  },

  /**
   * 撤回上一组已完成记录（防止健身房手滑误点）
   */
  onUndoLastSet() {
    const { completedSets, exercises, session } = this.data;
    if (!completedSets || completedSets.length === 0 || !session) {
      wx.showToast({ title: '暂无可撤回的组记录', icon: 'none' });
      return;
    }
    const lastSet = completedSets[completedSets.length - 1];
    this._openConfirmSheet({
      title: '撤回上一组',
      desc: `${lastSet.exercise_name} 第${lastSet.set_number}组 · ${lastSet.actual_weight}kg × ${lastSet.actual_reps}次`,
      confirmText: '确认撤回',
      cancelText: '取消',
      danger: false,
      onConfirm: () => {
        this.clearRestTimer();
        this.restEndTime = null;
        this._clearGlobalRestState();

        remove('session_sets', lastSet.id);
        const nextCompletedSets = completedSets.slice(0, -1);
        const nextExercises = exercises.map(ex => ({ ...ex }));
        let targetExIdx = nextExercises.findIndex(ex => ex.exercise_id === lastSet.exercise_id);
        if (targetExIdx === -1) targetExIdx = Math.max(0, this.data.currentExerciseIndex - 1);

        if (nextExercises[targetExIdx]) {
          const targetEx = nextExercises[targetExIdx];
          if (Array.isArray(targetEx.formal_sets)) {
            targetEx.formal_sets = targetEx.formal_sets.map(s =>
              s.recordId === lastSet.id ? { ...s, completed: false, recordId: null } : s
            );
            targetEx.completed_sets = targetEx.formal_sets.filter(s => s.completed).length;
          } else {
            targetEx.completed_sets = Math.max(0, (targetEx.completed_sets || 1) - 1);
          }
        }
        const targetSetIdx = nextExercises[targetExIdx] ? nextExercises[targetExIdx].completed_sets : 0;

        update('sessions', session.id, {
          pending_exercises: nextExercises,
          current_exercise_index: targetExIdx,
          current_set_index: targetSetIdx,
          completed_sets: nextCompletedSets,
          updated_at: Date.now()
        });

        this.setData({
          isResting: false,
          restTimeLeft: 0,
          restMinimized: false,
          restCompleting: false,
          completedSets: nextCompletedSets,
          exercises: nextExercises,
          currentExerciseIndex: targetExIdx,
          currentSetIndex: targetSetIdx
        });
        this.setCurrentExercise();
        wx.showToast({ title: '已撤回上一组', icon: 'success' });
      }
    });
  },

  /**
   * 次数拨盘变化
   */
  onRepChange(e) {
    const value = e.detail.value;
    this.setData({
      'currentExercise.actual_reps': value
    });
  },

  /**
   * 输入组备注
   */
  onSetNoteChange(e) {
    this.setData({
      setNote: e.detail.value
    });
  },

  /**
   * 更新动作进度
   */
  updateExerciseProgress(exercise, completedSets) {
    const { exercises, currentExerciseIndex, session } = this.data;

    // 更新pending_exercises
    exercises[currentExerciseIndex].completed_sets = completedSets;

    // 更新current_exercise_index（如果当前动作完成）
    let newExerciseIndex = currentExerciseIndex;
    let newSetIndex = 0;

    if (completedSets >= exercise.target_sets) {
      // 当前动作完成，切换到下一个
      newExerciseIndex = currentExerciseIndex + 1;
      newSetIndex = 0;
    }

    // 保存会话状态
    update('sessions', session.id, {
      pending_exercises: exercises,
      current_exercise_index: newExerciseIndex,
      current_set_index: newSetIndex,
      updated_at: Date.now()
    });

    this.setData({
      exercises,
      currentExerciseIndex: newExerciseIndex,
      currentSetIndex: newSetIndex
    });
  },

  /**
   * 检查并保存1RM
   */
  async checkAndSave1RM(setRecord) {
    const result = await calculateAndSave1RM(
      setRecord.exercise_id,
      setRecord.actual_weight,
      setRecord.actual_reps,
      setRecord.rpe,
      setRecord.session_id
    );

    if (result.isNewPR) {
      // 检测到新PR
      const milestone = checkMilestone(
        setRecord.exercise_id,
        result.estimated1RM,
        setRecord.exercise_name
      );

      const prBadge = {
        type: '1RM',
        value: result.estimated1RM,
        exerciseName: setRecord.exercise_name,
        milestone: milestone
      };

      const prBadges = [...this.data.prBadges, prBadge];
      this.setData({ prBadges });

      // PR 音效和震动反馈
      audio.playPRSound();
      UI.vibrate();
    }
  },

  /**
   * 同步组间休息状态到全局，确保离开页面后悬浮条继续倒计时且返回可无缝续上
   */
  _syncGlobalRestState(overrides = {}) {
    const app = getApp();
    if (!app || !app.globalData) return;
    const { session, restTimeTotal, nextSetPreview, restMinimized } = this.data;
    if (!session || !this.restEndTime) return;
    app.globalData.activeRest = {
      sessionId: session.id,
      restEndTime: this.restEndTime,
      restTimeTotal: overrides.restTimeTotal !== undefined ? overrides.restTimeTotal : restTimeTotal,
      nextSetPreview: overrides.nextSetPreview !== undefined ? overrides.nextSetPreview : nextSetPreview,
      restMinimized: overrides.restMinimized !== undefined ? overrides.restMinimized : restMinimized,
      notified: false
    };
  },

  /**
   * 清除当前会话的全局休息状态
   */
  _clearGlobalRestState() {
    const app = getApp();
    if (app && app.globalData && app.globalData.activeRest) {
      if (!this.data.session || app.globalData.activeRest.sessionId === this.data.session.id) {
        app.globalData.activeRest = null;
      }
    }
  },

  /**
   * 重新进入训练页时从全局恢复未到期的组间休息倒计时
   */
  _restoreGlobalRestState(sessionId) {
    const app = getApp();
    const activeRest = app && app.globalData ? app.globalData.activeRest : null;
    if (!activeRest || activeRest.sessionId !== sessionId || !activeRest.restEndTime) return;
    const remaining = Math.ceil((activeRest.restEndTime - Date.now()) / 1000);
    if (remaining > 0) {
      this.restEndTime = activeRest.restEndTime;
      this.setData({
        isResting: true,
        restTimeLeft: remaining,
        restTimeTotal: activeRest.restTimeTotal || remaining,
        nextSetPreview: activeRest.nextSetPreview || '',
        restMinimized: !!activeRest.restMinimized,
        restCompleting: false
      });
      this._startRestInterval();
    } else {
      app.globalData.activeRest = null;
    }
  },

  /**
   * 开始休息倒计时
   */
  startRestTimer(seconds) {
    this.restEndTime = Date.now() + seconds * 1000;
    // 重置完成标记
    this.setData({
      isResting: true,
      restTimeLeft: seconds,
      restTimeTotal: seconds,
      restCompleting: false
    });
    this._syncGlobalRestState({ restTimeTotal: seconds, restMinimized: false });

    // 保存快照
    this.saveSnapshot();

    // 启动倒计时
    this._startRestInterval();
  },

  /**
   * 休息结束
   */
  onRestComplete() {
    this.clearRestTimer();
    this.restEndTime = null;
    this._clearGlobalRestState();

    audio.playCompleteSound();
    UI.vibrate();

    if (this.data.currentExerciseIndex >= this.data.exercises.length) {
      this.setData({
        isResting: false,
        restTimeLeft: 0,
        restMinimized: false,
        freeAllDone: true,
        currentExercise: null
      });
    } else {
      this._restoreFromRest();
    }
  },

  /**
   * 休息结束恢复训练 — 合并 setData 避免闪动
   */
  _restoreFromRest() {
    this.setData({
      isResting: false,
      restTimeLeft: 0,
      restMinimized: false
    });
    this.setCurrentExercise();
  },

  /**
   * 跳过休息
   */
  onSkipRest() {
    this.clearRestTimer();
    this.onRestComplete();
  },

  /**
   * 我准备好了 — 提前结束休息
   */
  onReadyToGo() {
    this.clearRestTimer();
    this.setData({ restMinimized: false });
    this.onRestComplete();
  },

  /**
   * 收起休息弹窗为悬浮倒计时
   */
  onMinimizeRest() {
    this.setData({ restMinimized: true });
    this._syncGlobalRestState({ restMinimized: true });
  },

  /**
   * 展开悬浮倒计时为休息弹窗
   */
  onExpandRest() {
    this.setData({ restMinimized: false });
    this._syncGlobalRestState({ restMinimized: false });
  },

  /**
   * 按动作持久化记忆最新调整的组间休息总时长（当前会话下一组及未来训练均生效）
   */
  _saveExerciseRestPreference(newTotalSeconds) {
    const exId = this.restingExerciseId || (this.data.currentExercise && this.data.currentExercise.exercise_id);
    if (!exId || !newTotalSeconds) return;

    try {
      const prefs = wx.getStorageSync('exercise_rest_prefs') || {};
      prefs[exId] = newTotalSeconds;
      wx.setStorageSync('exercise_rest_prefs', prefs);
    } catch (e) {
      console.warn('保存动作休息偏好失败:', e);
    }

    const { exercises, session, currentExercise } = this.data;
    const nextExercises = (exercises || []).map(ex =>
      ex.exercise_id === exId ? { ...ex, rest_seconds: newTotalSeconds } : ex
    );
    const updatePayload = { exercises: nextExercises };
    if (currentExercise && currentExercise.exercise_id === exId) {
      updatePayload['currentExercise.rest_seconds'] = newTotalSeconds;
    }
    this.setData(updatePayload);

    if (session) {
      update('sessions', session.id, {
        pending_exercises: nextExercises,
        updated_at: Date.now()
      });
    }
    if (this.restingPlanExerciseId) {
      update('plan_exercises', this.restingPlanExerciseId, {
        rest_seconds: newTotalSeconds
      });
    }
  },

  /**
   * 增加休息时间（直接基于总时间 +30s，剩余时间同步 +30s）
   */
  onAddRestTime() {
    const { restTimeLeft, restTimeTotal } = this.data;
    const baseTotal = restTimeTotal || restTimeLeft || 90;
    const newTotal = Math.min(baseTotal + 30, 300); // 最多5分钟
    const delta = newTotal - baseTotal;
    if (delta <= 0) return;
    const newLeft = restTimeLeft + delta;
    this.restEndTime = Date.now() + newLeft * 1000;
    this.setData({ restTimeLeft: newLeft, restTimeTotal: newTotal });
    this._syncGlobalRestState({ restTimeTotal: newTotal });
    this._saveExerciseRestPreference(newTotal);
  },

  /**
   * 减少休息时间（直接基于总时间 -30s，剩余时间同步 -30s）
   */
  onReduceRestTime() {
    const { restTimeLeft, restTimeTotal } = this.data;
    const baseTotal = restTimeTotal || restTimeLeft || 90;
    const newTotal = Math.max(baseTotal - 30, 30); // 最少30秒
    const delta = baseTotal - newTotal;
    if (delta <= 0) return;
    const newLeft = Math.max(0, restTimeLeft - delta);
    this._saveExerciseRestPreference(newTotal);
    if (newLeft <= 0) {
      this.setData({ restTimeLeft: 0, restTimeTotal: newTotal, restCompleting: true });
      this.onRestComplete();
      return;
    }
    this.restEndTime = Date.now() + newLeft * 1000;
    this.setData({ restTimeLeft: newLeft, restTimeTotal: newTotal });
    this._syncGlobalRestState({ restTimeTotal: newTotal });
  },

  /**
   * 播放休息提示音
   */
  playRestBeep() {
    // 最后3秒播放提示音
    if (this.data.restTimeLeft <= 3) {
      audio.playCountdownBeep();
      UI.vibrateWarning();
    }
  },

  /**
   * 显示动作替换选择
   */
  onReplaceExercise() {
    const { currentExercise } = this.data;

    // 空值检查
    if (!currentExercise) {
      UI.showError('数据异常', this);
      return;
    }

    // 获取替代动作
    const alternatives = currentExercise.alternatives || [];
    const alternativeExercises = alternatives.map(altId => {
      return findOne('exercises', { id: altId });
    }).filter(Boolean);

    this.setData({
      showReplaceModal: true,
      alternativeExercises
    });
  },

  /**
   * 选择替代动作
   */
  onSelectAlternative(e) {
    const { exerciseId } = e.currentTarget.dataset;
    const exercise = findOne('exercises', { id: exerciseId });

    if (exercise) {
      const { currentExercise, exercises, currentExerciseIndex } = this.data;

      // 标记为替代动作
      exercises[currentExerciseIndex] = {
        ...currentExercise,
        exercise_id: exercise.id,
        name: exercise.name,
        is_alternative: true,
        original_exercise_id: currentExercise.exercise_id
      };

      this.setData({
        exercises,
        currentExercise: exercises[currentExerciseIndex],
        showReplaceModal: false
      });

      UI.showToast({
        message: '已替换为' + exercise.name,
        icon: 'check-circle',
        context: this
      });
    }
  },

  /**
   * 取消替换
   */
  onCancelReplace() {
    this.setData({ showReplaceModal: false });
  },

  /**
   * 跳过动作
   */
  /**
   * 移除当前动作
   */
  onRemoveCurrentExercise() {
    this._removeExerciseAt(this.data.currentExerciseIndex);
  },

  /**
   * 长按顶部动作卡片快捷移除
   */
  onLongPressExercise(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    this._removeExerciseAt(idx);
  },

  /**
   * 移除指定索引的动作（支持同步清理该动作已记录的组数据）
   */
  _removeExerciseAt(targetIndex) {
    const { exercises, currentExerciseIndex, session, isFreeWorkout, completedSets, isResting } = this.data;
    if (isResting) {
      UI.showToast({ message: '休息中无法移除动作', icon: 'warning', context: this });
      return;
    }
    const target = exercises[targetIndex];
    if (!target || !session) return;
    if (!isFreeWorkout && exercises.length <= 1) {
      wx.showToast({ title: '这是最后一个动作，如需结束请点击底部完成', icon: 'none' });
      return;
    }

    const recordIds = new Set(
      (Array.isArray(target.formal_sets) ? target.formal_sets : [])
        .map(s => s && s.recordId)
        .filter(Boolean)
    );
    const matchedSets = completedSets.filter(s =>
      recordIds.size > 0
        ? recordIds.has(s.id)
        : (s && s.exercise_id === target.exercise_id)
    );
    const doneCount = matchedSets.length || (target.completed_sets || 0);
    const exName = target.exercise_name || target.name || '该动作';
    const modalContent = doneCount > 0
      ? `「${exName}」已记录 ${doneCount} 组，移除将同步删除这 ${doneCount} 组记录，确定移除吗？`
      : `确定从本次训练中移除「${exName}」吗？`;

    this._openConfirmSheet({
      title: '移除动作',
      desc: doneCount > 0 ? `「${exName}」已记录 ${doneCount} 组，移除后同步清除` : `将「${exName}」移出本次训练`,
      confirmText: '确认移除',
      cancelText: '取消',
      danger: true,
      onConfirm: () => {
        const removeIdSet = new Set(matchedSets.map(s => s.id));
        matchedSets.forEach(s => remove('session_sets', s.id));
        const nextCompletedSets = completedSets.filter(s => !removeIdSet.has(s.id));
        const nextExercises = exercises.filter((_, i) => i !== targetIndex);
        let nextIdx = 0;
        if (nextExercises.length > 0) {
          if (targetIndex < currentExerciseIndex) {
            nextIdx = currentExerciseIndex - 1;
          } else {
            nextIdx = Math.min(currentExerciseIndex, nextExercises.length - 1);
          }
        }

        update('sessions', session.id, {
          pending_exercises: nextExercises,
          completed_sets: nextCompletedSets,
          current_exercise_index: nextIdx,
          current_set_index: 0,
          updated_at: Date.now()
        });
        this.setData({
          exercises: nextExercises,
          completedSets: nextCompletedSets,
          currentExerciseIndex: nextIdx,
          currentSetIndex: 0,
          showMoreActions: false
        });
        if (nextExercises.length === 0) {
          this.setData({ currentExercise: null, formalSets: [], warmupSets: [], freeAllDone: false });
        } else {
          this.setCurrentExercise();
        }
        wx.showToast({ title: '已移除动作', icon: 'none' });
      }
    });
  },

  onSkipExercise() {
    this.setData({
      showSkipModal: true,
      selectedSkipReason: -1
    });
  },

  /**
   * 选择跳过原因
   */
  onSelectSkipReason(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ selectedSkipReason: index });
  },

  /**
   * 确认跳过动作
   */
  onConfirmSkip() {
    const { exercises, currentExerciseIndex, session, selectedSkipReason, skipReasons } = this.data;

    const reason = skipReasons[selectedSkipReason];

    // 标记当前动作已跳过
    exercises[currentExerciseIndex].skipped = true;
    exercises[currentExerciseIndex].completed_sets = exercises[currentExerciseIndex].target_sets;
    exercises[currentExerciseIndex].skip_reason = reason;

    // 保存到 session
    update('sessions', session.id, {
      pending_exercises: exercises,
      updated_at: Date.now()
    });

    this.setData({
      exercises,
      showSkipModal: false,
      selectedSkipReason: -1
    });

    UI.showToast({
      message: '已跳过该动作',
      icon: 'check-circle',
      context: this
    });

    // 移动到下一个动作
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      this.clearRestTimer();
      this.onTrainingComplete();
    } else {
      this.setData({
        currentExerciseIndex: nextIndex,
        currentSetIndex: 0
      });
      this.setCurrentExercise();
    }
  },

  /**
   * 取消跳过
   */
  onCancelSkip() {
    this.setData({
      showSkipModal: false,
      selectedSkipReason: -1
    });
  },

  /**
   * 添加动作（支持按肌群筛选、一次多选多个动作或输入自定义动作）
   */
  onAddExercise() {
    const allExercises = getCollection('exercises') || [];
    this.setData({
      showAddExerciseModal: true,
      addExerciseSearch: '',
      selectedAddMuscle: '全部',
      addSubMuscles: [],
      selectedAddSubMuscle: '全部',
      selectedAddIds: [],
      selectedAddMap: {},
      selectedAddConfigs: {},
      canAddCustomExercise: false,
      filteredExercises: allExercises
    });
  },

  _filterAddExercises(keyword, muscle, subMuscle = '全部') {
    const allExercises = getCollection('exercises') || [];
    const kw = (keyword || '').trim().toLowerCase();
    const filtered = allExercises.filter(ex => {
      const matchMuscle = !muscle || muscle === '全部' || ex.muscle_group === muscle;
      const matchSub = !subMuscle || subMuscle === '全部' || ex.sub_muscle === subMuscle;
      const matchKw = !kw ||
        (ex.name && ex.name.toLowerCase().includes(kw)) ||
        (ex.name_en && ex.name_en.toLowerCase().includes(kw)) ||
        (ex.aliases && ex.aliases.toLowerCase().includes(kw)) ||
        (ex.sub_muscle && ex.sub_muscle.toLowerCase().includes(kw)) ||
        (ex.equipment && ex.equipment.toLowerCase().includes(kw)) ||
        (ex.muscle_group && ex.muscle_group.toLowerCase().includes(kw));
      return matchMuscle && matchSub && matchKw;
    });
    const exactMatch = kw && allExercises.some(ex => ex.name && ex.name.toLowerCase() === kw);
    return { filtered, canAddCustom: !!kw && !exactMatch };
  },

  onSelectAddMuscle(e) {
    const muscle = e.currentTarget.dataset.muscle || '全部';
    const subs = (muscle !== '全部' && MUSCLE_SUB_GROUPS[muscle]) ? ['全部', ...MUSCLE_SUB_GROUPS[muscle]] : [];
    const { filtered, canAddCustom } = this._filterAddExercises(this.data.addExerciseSearch, muscle, '全部');
    this.setData({
      selectedAddMuscle: muscle,
      addSubMuscles: subs,
      selectedAddSubMuscle: '全部',
      filteredExercises: filtered,
      canAddCustomExercise: canAddCustom
    });
  },

  onSelectAddSubMuscle(e) {
    const sub = e.currentTarget.dataset.sub || '全部';
    const { filtered, canAddCustom } = this._filterAddExercises(this.data.addExerciseSearch, this.data.selectedAddMuscle, sub);
    this.setData({
      selectedAddSubMuscle: sub,
      filteredExercises: filtered,
      canAddCustomExercise: canAddCustom
    });
  },

  /**
   * 搜索动作
   */
  onAddExerciseSearch(e) {
    const raw = e.detail.value || '';
    const { filtered, canAddCustom } = this._filterAddExercises(raw, this.data.selectedAddMuscle, this.data.selectedAddSubMuscle);
    this.setData({
      addExerciseSearch: raw,
      filteredExercises: filtered,
      canAddCustomExercise: canAddCustom
    });
  },

  /**
   * 勾选/取消勾选动作（支持一次多选多个）
   */
  onToggleAddExercise(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId) return;
    const { selectedAddIds, selectedAddMap, selectedAddConfigs } = this.data;
    const nextMap = { ...selectedAddMap };
    const nextConfigs = { ...selectedAddConfigs };
    let nextIds;
    if (nextMap[exerciseId]) {
      delete nextMap[exerciseId];
      delete nextConfigs[exerciseId];
      nextIds = selectedAddIds.filter(id => id !== exerciseId);
    } else {
      nextMap[exerciseId] = true;
      nextIds = [...selectedAddIds, exerciseId];
      const lastRecord = this.getLastExerciseRecord(exerciseId);
      nextConfigs[exerciseId] = {
        sets: lastRecord ? (lastRecord.sets_count || 3) : 3,
        reps: lastRecord ? (lastRecord.actual_reps || 10) : 10,
        weight: lastRecord ? (lastRecord.actual_weight || 20) : 20
      };
    }
    this.setData({
      selectedAddIds: nextIds,
      selectedAddMap: nextMap,
      selectedAddConfigs: nextConfigs
    });
  },

  /**
   * 调整单个待添加动作的组数（- / +）
   */
  onStepAddSets(e) {
    const { exerciseId, delta } = e.currentTarget.dataset;
    const cfg = this.data.selectedAddConfigs[exerciseId];
    if (!cfg) return;
    const nextSets = Math.min(20, Math.max(1, (parseInt(cfg.sets, 10) || 3) + parseInt(delta, 10)));
    this.setData({
      [`selectedAddConfigs.${exerciseId}.sets`]: nextSets
    });
  },

  /**
   * 自定义输入单个待添加动作的重量/次数/组数
   */
  onUpdateAddConfig(e) {
    const { exerciseId, field } = e.currentTarget.dataset;
    if (!exerciseId || !field) return;
    const raw = e.detail.value;
    this.setData({
      [`selectedAddConfigs.${exerciseId}.${field}`]: raw
    });
  },

  /**
   * 直接添加自定义动作名称
   */
  onAddCustomExercise() {
    const customName = (this.data.addExerciseSearch || '').trim();
    if (!customName) return;
    const customExercise = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: customName,
      muscle_group: this.data.selectedAddMuscle === '全部' ? '自由训练' : this.data.selectedAddMuscle,
      is_custom: true
    };
    this._appendExercisesToSession([customExercise]);
  },

  /**
   * 确认批量添加已选动作
   */
  onConfirmAddExercises() {
    const { selectedAddIds } = this.data;
    if (!selectedAddIds || selectedAddIds.length === 0) {
      if (this.data.canAddCustomExercise) {
        this.onAddCustomExercise();
        return;
      }
      wx.showToast({ title: '请先选择至少一个动作', icon: 'none' });
      return;
    }
    const toAdd = selectedAddIds
      .map(id => findOne('exercises', { id }))
      .filter(Boolean);
    if (toAdd.length === 0) return;
    this._appendExercisesToSession(toAdd);
  },

  /**
   * 将一个或多个动作加入当前训练会话（应用各自自定义的组数/次数/重量）
   */
  _appendExercisesToSession(exerciseList) {
    const { exercises, session, currentExerciseIndex, freeAllDone, selectedAddConfigs } = this.data;
    const restPrefs = wx.getStorageSync('exercise_rest_prefs') || {};
    const prevLen = exercises.length;
    const nextExercises = [...exercises];

    exerciseList.forEach(exercise => {
      const cfg = selectedAddConfigs[exercise.id];
      const lastRecord = cfg ? null : this.getLastExerciseRecord(exercise.id);
      const targetSets = cfg
        ? Math.min(20, Math.max(1, parseInt(cfg.sets, 10) || 3))
        : (lastRecord ? (lastRecord.sets_count || 3) : 3);
      const targetReps = cfg ? Math.max(1, parseInt(cfg.reps, 10) || 10) : (lastRecord ? (lastRecord.actual_reps || 10) : 10);
      const targetWeight = cfg ? Math.max(0, parseFloat(cfg.weight) || 0) : (lastRecord ? (lastRecord.actual_weight || 20) : 20);
      nextExercises.push({
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        name: exercise.name,
        target_sets: targetSets,
        target_reps: targetReps,
        target_weight: targetWeight,
        rest_seconds: restPrefs[exercise.id] || 90,
        completed_sets: 0,
        warmup_completed: true,
        muscle_group: exercise.muscle_group || '自由训练',
        is_custom: !!exercise.is_custom,
        is_added: true
      });
    });

    const shouldJumpToNew = prevLen === 0 || freeAllDone || currentExerciseIndex >= prevLen;
    const nextIdx = shouldJumpToNew ? prevLen : currentExerciseIndex;

    update('sessions', session.id, {
      pending_exercises: nextExercises,
      current_exercise_index: nextIdx,
      current_set_index: shouldJumpToNew ? 0 : this.data.currentSetIndex,
      updated_at: Date.now()
    });

    this.setData({
      exercises: nextExercises,
      currentExerciseIndex: nextIdx,
      currentSetIndex: shouldJumpToNew ? 0 : this.data.currentSetIndex,
      freeAllDone: false,
      showAddExerciseModal: false,
      addExerciseSearch: '',
      selectedAddIds: [],
      selectedAddMap: {},
      selectedAddConfigs: {},
      filteredExercises: []
    });

    if (shouldJumpToNew) {
      this.setCurrentExercise();
    } else {
      this.calculateOverallProgress();
    }

    const tip = exerciseList.length === 1
      ? `已添加 ${exerciseList[0].name}`
      : `已添加 ${exerciseList.length} 个动作`;
    wx.showToast({ title: tip, icon: 'success' });
  },

  /**
   * 为当前动作（或刚完成的最后一个动作）再加一组
   */
  onAddExtraSet() {
    const { exercises, currentExerciseIndex, freeAllDone, session, completedSets } = this.data;
    if (!exercises || exercises.length === 0 || !session) return;
    const targetIdx = freeAllDone ? exercises.length - 1 : currentExerciseIndex;
    const target = exercises[targetIdx];
    if (!target) return;

    const baseSets = this._ensureFormalSets(target, completedSets);
    if (baseSets.length >= 20) {
      wx.showToast({ title: '最多 20 组', icon: 'none' });
      return;
    }
    const last = baseSets[baseSets.length - 1];
    const nextFormalSets = [
      ...baseSets,
      {
        weight: last ? (parseFloat(last.weight) || 0) : (target.target_weight || 0),
        reps: last ? (parseInt(last.reps, 10) || 10) : (target.target_reps || 10),
        completed: false,
        recordId: null,
        userEdited: false
      }
    ];

    const nextExercises = exercises.map((ex, i) =>
      i === targetIdx ? { ...ex, formal_sets: nextFormalSets, target_sets: nextFormalSets.length } : ex
    );

    update('sessions', session.id, {
      pending_exercises: nextExercises,
      current_exercise_index: targetIdx,
      current_set_index: nextFormalSets.length - 1,
      updated_at: Date.now()
    });

    this.setData({
      exercises: nextExercises,
      currentExerciseIndex: targetIdx,
      freeAllDone: false
    });
    this.setCurrentExercise();
    wx.showToast({ title: '已增加 1 组', icon: 'none' });
  },

  /**
   * 减少当前动作的组数（未完成组直接减；已完成动作支持确认后撤销最后一组并减组）
   */
  onReduceExtraSet() {
    const { exercises, currentExerciseIndex, session, completedSets } = this.data;
    if (!exercises || exercises.length === 0 || !session) return;
    const target = exercises[currentExerciseIndex];
    if (!target) return;

    const currentTargetSets = target.target_sets || 3;
    const doneSets = target.completed_sets || 0;

    // 情况1：还有未完成的剩余组，直接减少目标组数
    if (currentTargetSets > doneSets && currentTargetSets > 1) {
      const nextTargetSets = currentTargetSets - 1;
      const nextExercises = exercises.map((ex, i) =>
        i === currentExerciseIndex ? { ...ex, target_sets: nextTargetSets } : ex
      );
      update('sessions', session.id, {
        pending_exercises: nextExercises,
        updated_at: Date.now()
      });
      this.setData({ exercises: nextExercises });
      this.setCurrentExercise();
      wx.showToast({ title: '已减少 1 组', icon: 'none' });
      return;
    }

    // 情况2：当前动作已全部做完（或已无多余未完成组），支持撤销该动作最近完成的1组并减组
    if (doneSets > 0) {
      this._openConfirmSheet({
        title: '减少一组',
        desc: `将撤销「${target.exercise_name || target.name}」第 ${doneSets} 组记录并减少 1 组`,
        confirmText: '确认减少',
        cancelText: '取消',
        danger: true,
        onConfirm: () => {
          // 找到该动作最后一条已完成记录并删除
          const nextCompletedSets = [...completedSets];
          for (let i = nextCompletedSets.length - 1; i >= 0; i--) {
            if (nextCompletedSets[i].exercise_id === target.exercise_id) {
              remove('session_sets', nextCompletedSets[i].id);
              nextCompletedSets.splice(i, 1);
              break;
            }
          }
          const nextDone = Math.max(0, doneSets - 1);
          const nextTargetSets = Math.max(1, currentTargetSets - 1);
          const nextExercises = exercises.map((ex, i) =>
            i === currentExerciseIndex ? { ...ex, completed_sets: nextDone, target_sets: nextTargetSets } : ex
          );
          update('sessions', session.id, {
            pending_exercises: nextExercises,
            completed_sets: nextCompletedSets,
            updated_at: Date.now()
          });
          this.setData({
            exercises: nextExercises,
            completedSets: nextCompletedSets
          });
          this.setCurrentExercise();
          wx.showToast({ title: '已撤销并减少 1 组', icon: 'success' });
        }
      });
      return;
    }

    wx.showToast({ title: '最少保留 1 组', icon: 'none' });
  },

  /**
   * 统一完成训练入口（弹出三层视觉权重的半屏确认抽屉）
   */
  onFinishTraining() {
    this.setData({ showFinishModal: true });
  },

  onCancelFinishModal() {
    this.setData({ showFinishModal: false });
  },

  onConfirmFinishAndSave() {
    this.setData({ showFinishModal: false });
    this.onTrainingComplete();
  },

  onConfirmDiscardEmpty() {
    this.setData({ showFinishModal: false });
    this._discardCurrentSession();
  },

  onRequestDiscardTraining() {
    const count = (this.data.completedSets || []).length;
    this.setData({ showFinishModal: false });
    this._openConfirmSheet({
      title: '放弃本次训练',
      desc: `当前已记录 ${count} 组，放弃后不计入历史记录`,
      confirmText: '确认放弃',
      cancelText: '返回',
      danger: true,
      onConfirm: () => {
        this._discardCurrentSession();
      }
    });
  },

  /**
   * 作废当前训练会话并返回
   */
  _discardCurrentSession() {
    this._isDiscarding = true;
    this.clearRestTimer();
    this.restEndTime = null;
    this._clearGlobalRestState();
    const { session } = this.data;
    if (session) {
      update('sessions', session.id, {
        status: 'aborted',
        aborted_at: Date.now(),
        updated_at: Date.now()
      });
      const app = getApp();
      if (app && app.globalData && app.globalData.trainingMinimizedSessionId === session.id) {
        app.globalData.trainingMinimized = false;
        app.globalData.trainingMinimizedSessionId = null;
        app.globalData.trainingSnapshot = null;
      }
    }
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
  },

  /**
   * 取消添加动作
   */
  onCancelAddExercise() {
    this.setData({
      showAddExerciseModal: false,
      addExerciseSearch: '',
      selectedAddIds: [],
      selectedAddMap: {},
      filteredExercises: [],
      playingExerciseId: ''
    });
  },

  /**
   * 选择要训练的动作
   */
  onSelectExercise(e) {
    const { index } = e.currentTarget.dataset;
    const { exercises, isResting } = this.data;
    const targetExercise = exercises[index];
    if (!targetExercise) return;

    // 休息期间不允许切换动作
    if (isResting) {
      UI.showToast({ message: '请先完成休息', icon: 'warning', context: this });
      return;
    }

    // 允许切回已完成动作继续加组或减组
    this.setData({
      currentExerciseIndex: index,
      currentSetIndex: targetExercise.completed_sets || 0,
      freeAllDone: false,
      showExercisePicker: false
    });

    this.setCurrentExercise();
    this.saveSnapshot();

    UI.showToast({
      message: '已切换到 ' + (targetExercise.name || targetExercise.exercise_name),
      icon: 'check-circle',
      context: this
    });
  },

  /**
   * 点击状态列表中的动作（支持切回已完成的动作继续加组/减组）
   */
  onOpenExerciseListModal() {
    if (!this.data.exercises || this.data.exercises.length === 0) {
      this.onAddExercise();
      return;
    }
    this.setData({ showExerciseListModal: true });
  },

  onCloseExerciseListModal() {
    this.setData({ showExerciseListModal: false });
  },

  onAddExerciseFromList() {
    this.setData({ showExerciseListModal: false });
    this.onAddExercise();
  },

  onSelectExerciseFromDrawer(e) {
    this.setData({ showExerciseListModal: false });
    this.onTapExercise(e);
  },

  onRemoveExerciseFromDrawer(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(idx)) return;
    this._removeExerciseAt(idx);
  },

  onTapExercise(e) {
    const { index } = e.currentTarget.dataset;
    const { exercises, isResting } = this.data;

    if (isResting) {
      UI.showToast({
        message: '休息中无法切换',
        icon: 'warning',
        context: this
      });
      return;
    }

    const targetExercise = exercises[index];
    if (!targetExercise) return;

    // 切换当前动作并退出完成引导态
    this.setData({
      currentExerciseIndex: index,
      currentSetIndex: targetExercise.completed_sets || 0,
      freeAllDone: false,
      showExercisePicker: false
    });

    // 更新当前动作
    this.setCurrentExercise();

    // 保存状态
    this.saveSnapshot();
  },

  /**
   * 打开RPE选择器
   */
  onOpenRPEPicker() {
    this.setData({ showRPEPicker: true });
  },

  /**
   * 选择RPE
   */
  onSelectRPE(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      selectedRPE: parseInt(value),
      showRPEPicker: false
    });
  },

  /**
   * 切换更多操作面板
   */
  onToggleMoreActions() {
    this.setData({
      showMoreActions: !this.data.showMoreActions
    });
  },

  /**
   * 训练完成
   */
  async onTrainingComplete() {
    this.clearRestTimer();
    this.restEndTime = null;
    this._clearGlobalRestState();
    const { session, completedSets, exercises } = this.data;
    const totalDurationSeconds = Math.max(60, this._getCurrentTotalDurationSeconds());
    const shouldCalcProgression = !this.data.isFreeWorkout && !session.progression_calculated;

    // 标记会话完成并保存完整记录（覆盖更新，不把补练间隔计入时长）
    update('sessions', session.id, {
      status: 'completed',
      completed_sets: completedSets,
      pending_exercises: exercises,
      completed_at: Date.now(),
      accumulated_duration_seconds: totalDurationSeconds,
      total_duration_seconds: totalDurationSeconds,
      progression_calculated: session.progression_calculated || shouldCalcProgression
    });

    // 固定计划模式仅首次结算计算重量演进，避免补练重复推高目标；自由训练不干扰计划演进
    if (shouldCalcProgression) {
      try {
        await calculateProgression(session.id);
      } catch (err) {
        console.error('计算演进失败:', err);
      }
    }

    // 清理全局收起浮窗状态，避免完成后首页/其他 Tab 残留浮窗
    const app = getApp();
    if (app && app.globalData && app.globalData.trainingMinimizedSessionId === session.id) {
      app.globalData.trainingMinimized = false;
      app.globalData.trainingMinimizedSessionId = null;
      app.globalData.trainingSnapshot = null;
    }

    // 异步同步到云端
    if (app && typeof app.startSync === 'function') {
      app.startSync();
    }

    this.setData({ isCompleted: true });

    // 显示完成页
    wx.redirectTo({
      url: '/pages/home/complete/complete?sessionId=' + session.id
    });
  },

  /**
   * 自动收起训练状态为全局悬浮窗（离开页面但未完成/放弃时调用）
   */
  _minimizeToFloat() {
    const { session, currentExercise, currentSetIndex, isFreeWorkout, exercises, completedSets } = this.data;
    if (!session || this.data.isCompleted || this._isDiscarding) return;

    const latest = findOne('sessions', { id: session.id });
    if (!latest || latest.status === 'completed' || latest.status === 'aborted') return;

    // 自由训练 0 动作且 0 组时直接返回，静默作废空会话，不挂空壳悬浮条
    if (isFreeWorkout && (!exercises || exercises.length === 0) && (!completedSets || completedSets.length === 0)) {
      update('sessions', session.id, {
        status: 'aborted',
        aborted_at: Date.now(),
        updated_at: Date.now()
      });
      const app = getApp();
      if (app && app.globalData && app.globalData.trainingMinimizedSessionId === session.id) {
        app.globalData.trainingMinimized = false;
        app.globalData.trainingMinimizedSessionId = null;
        app.globalData.trainingSnapshot = null;
      }
      return;
    }

    this.saveSnapshot();

    const app = getApp();
    if (app && app.globalData) {
      app.globalData.trainingMinimized = true;
      app.globalData.trainingMinimizedSessionId = session.id;
      app.globalData.trainingSnapshot = {
        sessionId: session.id,
        exerciseName: currentExercise ? currentExercise.name : (isFreeWorkout ? '自由训练' : '进行中的训练'),
        currentSet: currentSetIndex + 1,
        totalSets: currentExercise ? currentExercise.target_sets : 0
      };
    }
  },

  /**
   * 暂停训练
   */
  async onPauseTraining() {
    const { session } = this.data;

    // 空值检查
    if (!session) {
      UI.showError('数据异常', this);
      return;
    }

    // 暂停训练计时，冻结当前累计时长
    this.baseDurationSeconds = this._getCurrentTotalDurationSeconds();
    this.segmentStartedAt = null;
    this.setData({ isPaused: true });

    update('sessions', session.id, {
      status: 'paused',
      paused_at: Date.now(),
      accumulated_duration_seconds: this.baseDurationSeconds,
      updated_at: Date.now()
    });

    const result = await UI.showDialog({
      title: '训练已暂停',
      content: '可以稍后继续本次训练',
      confirmText: '好的',
      cancelText: '取消'
    });

    // 只有点击"取消"才恢复训练，点击"好的"保持暂停状态
    if (!result.confirm) {
      this.onResumeTraining();
    }
  },

  /**
   * 继续训练
   */
  async onResumeTraining() {
    const { session } = this.data;

    if (!session) {
      UI.showError('数据异常', this);
      return;
    }

    this.segmentStartedAt = Date.now();
    this.setData({ isPaused: false });

    update('sessions', session.id, {
      status: 'in_progress',
      resumed_at: Date.now(),
      updated_at: Date.now()
    });

    UI.showToast({ message: '继续训练', icon: 'none' });
  },

  /**
   * App隐藏时保存快照
   */
  onAppHidden() {
    console.log('训练页面收到appHidden事件');
    this.saveSnapshot();
  },

  /**
   * 保存快照
   */
  saveSnapshot() {
    const { session, exercises, currentExerciseIndex, currentSetIndex } = this.data;

    update('sessions', session.id, {
      pending_exercises: exercises,
      current_exercise_index: currentExerciseIndex,
      current_set_index: currentSetIndex,
      completed_sets: this.data.completedSets,
      accumulated_duration_seconds: this._getCurrentTotalDurationSeconds(),
      updated_at: Date.now(),
      snapshot: true
    });
  },

  /**
   * 查看当前动作的要领说明（不打断训练计时）
   */
  onViewCurrentExerciseDetail() {
    const cur = this.data.currentExercise;
    if (!cur) return;
    const detail = findOne('exercises', { id: cur.exercise_id }) || cur;
    this.setData({
      showExerciseDetail: true,
      detailExercise: detail,
      gifLoadError: false
    });
  },

  /**
   * 在选动作抽屉中查看任意动作要领
   */
  onTogglePreviewGif(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId) return;
    const detail = findOne('exercises', { id: exerciseId });
    if (!detail) return;
    if (!detail.gif_url) {
      this.setData({ showExerciseDetail: true, detailExercise: detail, gifLoadError: false });
      return;
    }
    this.setData({
      playingExerciseId: this.data.playingExerciseId === exerciseId ? '' : exerciseId
    });
  },

  onThumbError(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId || this.data.thumbErrorMap[exerciseId]) return;
    this.setData({ [`thumbErrorMap.${exerciseId}`]: true });
  },

  onViewExerciseDetail(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId) return;
    const detail = findOne('exercises', { id: exerciseId });
    if (!detail) return;
    this.setData({
      showExerciseDetail: true,
      detailExercise: detail,
      gifLoadError: false
    });
  },

  onGifLoadError() {
    this.setData({ gifLoadError: true });
  },

  onCloseExerciseDetail() {
    this.setData({
      showExerciseDetail: false,
      detailExercise: null,
      gifLoadError: false
    });
  },

  /**
   * 格式化时间显示
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
});
