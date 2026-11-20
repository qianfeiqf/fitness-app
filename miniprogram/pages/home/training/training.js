/**
 * 训练中页面 - 核心跟练交互
 */

const { findOne, update, getCollection, insert, remove } = require('../../../localdb/db.js');
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

    // 倒计时
    isResting: false,
    restTimeLeft: 0,
    restTimeTotal: 120,

    // RPE选择
    showRPEPicker: false,
    rpeOptions: ['轻量', '中等', '吃力', '力竭'],
    selectedRPE: 2,

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

    // 添加动作
    showAddExerciseModal: false,
    addExerciseSearch: '',
    filteredExercises: [],

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
      
      // 检查是否需要填写身体档案（首次训练）
      this.checkAndPromptProfile().then(() => {
        this.loadSession(options.sessionId);
      });
    }

    // 监听App隐藏事件
    wx.eventCenter.on('appHidden', this.onAppHidden, this);
  },

  /**
   * 检查并提示填写身体档案
   * 首次训练前需要填写体重，用于1RM计算和演进算法
   */
  async checkAndPromptProfile() {
    const { findOne } = require('../../../localdb/db.js');
    const profile = findOne('profiles', {});
    
    // 如果没有档案或没有体重，显示提示
    if (!profile || !profile.weight) {
      return new Promise((resolve) => {
        wx.showModal({
          title: '完善身体档案',
          content: '为了更准确地计算1RM和训练演进，请先填写您的体重（其他信息可选）',
          confirmText: '去填写',
          cancelText: '跳过',
          success: (res) => {
            if (res.confirm) {
              // 跳转到个人中心页面填写档案（tabBar页面需用switchTab），并记住当前会话 ID 以便一键返回
              const app = getApp();
              app.globalData.profileFrom = 'training';
              app.globalData.profilePrompt = 'profile';
              app.globalData.profileReturnSessionId = this.data.sessionId;
              wx.switchTab({
                url: '/pages/profile/profile',
                complete: () => {
                  resolve();
                }
              });
            } else {
              // 用户选择跳过，使用默认值继续
              resolve();
            }
          }
        });
      });
    }
    
    return Promise.resolve();
  },

  onShow() {
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
   * 启动训练总时长计时器
   */
  startDurationTimer() {
    if (this.durationTimer) return;
    this.durationTimer = setInterval(() => {
      if (!this.data.isPaused) {
        this.setData({
          trainingDuration: this.data.trainingDuration + 1
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

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const systemInfo = wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
    this.setData({ navHeight });
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

    this.setData({
      session,
      exercises,
      currentExerciseIndex: session.current_exercise_index || 0,
      currentSetIndex: session.current_set_index || 0
    });

    // 计算整体进度
    this.calculateOverallProgress();

    UI.hideLoading();

    // 启动训练总时长计时器
    this.startDurationTimer();

    // 设置当前动作
    if (exercises.length > 0) {
      this.setCurrentExercise();
    }
  },

  /**
   * 设置当前动作
   */
  setCurrentExercise() {
    const { exercises, currentExerciseIndex } = this.data;
    const exercise = exercises[currentExerciseIndex];

    if (!exercise) {
      this.onTrainingComplete();
      return;
    }

    // 获取动作详情
    const exerciseDetail = findOne('exercises', { id: exercise.exercise_id });
    if (!exerciseDetail) {
      console.error('动作数据异常:', exercise.exercise_id);
      UI.showError('动作数据异常', this);
      this.onSkipExercise();
      return;
    }

    // 检查是否需要热身（目标重量 >= 30kg 且未完成热身）
    const needsWarmup = (exercise.target_weight || 0) >= 30 && !exercise.warmup_completed;

    if (needsWarmup) {
      this.showWarmupPanel(exercise, exerciseDetail);
      return;
    }

    // 查找该动作最近一次的训练记录，作为默认值
    const lastRecord = this.getLastExerciseRecord(exercise.exercise_id);

    // 确定实际重量和次数的默认值：优先上次记录，其次目标值
    const defaultWeight = lastRecord ? lastRecord.actual_weight : (exercise.target_weight || 0);
    const defaultReps = lastRecord ? lastRecord.actual_reps : (exercise.target_reps || 0);
    const defaultRPE = lastRecord ? (lastRecord.rpe - 1) : 2; // rpeOptions索引：0=轻量,1=中等,2=吃力,3=力竭

    this.setData({
      currentExercise: {
        ...exercise,
        ...exerciseDetail,
        currentSetNumber: exercise.completed_sets + 1,
        actual_weight: defaultWeight,
        actual_reps: defaultReps
      },
      currentSetIndex: exercise.completed_sets || 0,
      selectedRPE: defaultRPE,
      setNote: '', // 每组备注初始为空
      showWarmup: false,
      weightOptions: this._buildWeightOptions(defaultWeight),
      repOptions: this._buildRepOptions(defaultReps),
      plateHint: this._calcBarbellPlates(defaultWeight, this.data.barWeight)
    });

    // 更新整体进度
    this.calculateOverallProgress();
  },

  /**
   * 显示热身面板
   */
  showWarmupPanel(exercise, exerciseDetail) {
    const targetWeight = exercise.target_weight || 0;
    const barWeight = 20;

    // 计算热身组：空杆×10 → 40%×5 → 60%×3 → 80%×1
    const warmupSets = [];

    // 第一组：空杆（如果目标重量足够大）
    if (targetWeight > barWeight + 10) {
      warmupSets.push({
        weight: barWeight,
        reps: 10,
        label: '空杆激活',
        completed: false
      });
    }

    // 第二组：40%
    const w2 = Math.round((targetWeight * 0.4) * 2) / 2;
    if (w2 > barWeight) {
      warmupSets.push({
        weight: w2,
        reps: 5,
        label: '轻重量适应',
        completed: false
      });
    }

    // 第三组：60%
    const w3 = Math.round((targetWeight * 0.6) * 2) / 2;
    if (w3 > (warmupSets.length > 0 ? warmupSets[warmupSets.length - 1].weight : 0)) {
      warmupSets.push({
        weight: w3,
        reps: 3,
        label: '中等重量预热',
        completed: false
      });
    }

    // 第四组：80%
    const w4 = Math.round((targetWeight * 0.8) * 2) / 2;
    if (w4 > (warmupSets.length > 0 ? warmupSets[warmupSets.length - 1].weight : 0)) {
      warmupSets.push({
        weight: w4,
        reps: 1,
        label: '接近重量激活',
        completed: false
      });
    }

    this.setData({
      showWarmup: true,
      currentExercise: {
        ...exercise,
        ...exerciseDetail
      },
      warmupSets,
      currentWarmupIndex: 0
    });
  },

  /**
   * 完成一组热身
   */
  onCompleteWarmupSet() {
    const { warmupSets, currentWarmupIndex, exercises, currentExerciseIndex } = this.data;

    // 标记当前热身组完成
    warmupSets[currentWarmupIndex].completed = true;

    const nextIndex = currentWarmupIndex + 1;

    this.setData({
      warmupSets,
      currentWarmupIndex: nextIndex
    });

    // 震动反馈
    UI.vibrateSuccess();

    // 如果所有热身组都完成了，自动提示
    if (nextIndex >= warmupSets.length) {
      UI.showToast({
        message: '热身完成！',
        icon: 'check-circle',
        context: this
      });
    }
  },

  /**
   * 跳过热身
   */
  onSkipWarmup() {
    const { exercises, currentExerciseIndex } = this.data;

    exercises[currentExerciseIndex].warmup_completed = true;

    this.setData({
      exercises,
      showWarmup: false
    });

    this.setCurrentExercise();
  },

  /**
   * 热身完成，进入正式训练
   */
  onFinishWarmup() {
    const { exercises, currentExerciseIndex, session } = this.data;

    exercises[currentExerciseIndex].warmup_completed = true;

    // 保存到 session
    update('sessions', session.id, {
      pending_exercises: exercises,
      updated_at: Date.now()
    });

    // 查找该动作最近一次的训练记录，作为默认值
    const exercise = exercises[currentExerciseIndex];
    const exerciseDetail = findOne('exercises', { id: exercise.exercise_id });
    const lastRecord = this.getLastExerciseRecord(exercise.exercise_id);
    const defaultWeight = lastRecord ? lastRecord.actual_weight : (exercise.target_weight || 0);
    const defaultReps = lastRecord ? lastRecord.actual_reps : (exercise.target_reps || 0);
    const defaultRPE = lastRecord ? (lastRecord.rpe - 1) : 2;

    // 合并 calculateOverallProgress 数据，避免二次 setData
    let completedCount = 0;
    const statusList = exercises.map((ex, idx) => {
      const isCompleted = ex.completed_sets >= ex.target_sets;
      if (isCompleted) completedCount++;
      return {
        name: ex.exercise_name,
        status: isCompleted ? 'completed' : (idx === currentExerciseIndex ? 'current' : 'pending')
      };
    });
    const totalAngle = exercises.length > 0 ? (completedCount / exercises.length) * 360 : 0;

    this.setData({
      exercises,
      showWarmup: false,
      currentExercise: {
        ...exercise,
        ...exerciseDetail,
        currentSetNumber: exercise.completed_sets + 1,
        actual_weight: defaultWeight,
        actual_reps: defaultReps
      },
      currentSetIndex: exercise.completed_sets || 0,
      selectedRPE: defaultRPE,
      setNote: '',
      weightOptions: this._buildWeightOptions(defaultWeight),
      repOptions: this._buildRepOptions(defaultReps),
      plateHint: this._calcBarbellPlates(defaultWeight, this.data.barWeight),
      completedExerciseCount: completedCount,
      overallProgressAngle: totalAngle,
      exerciseStatusList: statusList
    });
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

  /**
   * 一键完成当前组
   */
  onCompleteSet() {
    const { currentExercise, session, currentSetIndex, currentExerciseIndex, exercises, completedSets } = this.data;

    // 空值检查
    if (!currentExercise || !session) {
      console.error('currentExercise or session is null');
      UI.showError('数据异常，请重试', this);
      return;
    }

    // 使用用户调整后的实际值（如未调整则使用目标值）
    const actualWeight = currentExercise.actual_weight !== undefined
      ? currentExercise.actual_weight
      : currentExercise.target_weight;
    const actualReps = currentExercise.actual_reps !== undefined
      ? currentExercise.actual_reps
      : currentExercise.target_reps;

    // 记录完成的数据
    const setRecord = {
      id: 'set_' + Date.now(),
      session_id: session.id,
      exercise_id: currentExercise.exercise_id,
      exercise_name: currentExercise.name,
      set_number: currentSetIndex + 1,
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

    // 保存到本地
    insert('session_sets', setRecord);

    // 更新完成数组
    const newCompletedSets = [...completedSets, setRecord];

    // 更新动作进度
    const newExercises = [...exercises];
    newExercises[currentExerciseIndex].completed_sets = currentSetIndex + 1;

    let newExerciseIndex = currentExerciseIndex;
    let newSetIndex = 0;
    if (currentSetIndex + 1 >= currentExercise.target_sets) {
      newExerciseIndex = currentExerciseIndex + 1;
    } else {
      newSetIndex = currentSetIndex + 1;
    }

    // 保存会话状态
    update('sessions', session.id, {
      pending_exercises: newExercises,
      current_exercise_index: newExerciseIndex,
      current_set_index: newSetIndex,
      updated_at: Date.now()
    });

    // 合并 setData — 一次性更新所有状态，避免多次渲染导致闪动
    const restSeconds = currentExercise.rest_seconds || 120;

    // 合并 calculateOverallProgress 数据
    let completedCount = 0;
    const statusList = newExercises.map((ex, idx) => {
      const isCompleted = ex.completed_sets >= ex.target_sets;
      if (isCompleted) completedCount++;
      return {
        name: ex.exercise_name,
        status: isCompleted ? 'completed' : (idx === newExerciseIndex ? 'current' : 'pending')
      };
    });
    const totalAngle = newExercises.length > 0 ? (completedCount / newExercises.length) * 360 : 0;

    this.setData({
      completedSets: newCompletedSets,
      exercises: newExercises,
      currentExerciseIndex: newExerciseIndex,
      currentSetIndex: newSetIndex,
      isResting: true,
      restTimeLeft: restSeconds,
      restTimeTotal: restSeconds,
      restCompleting: false,
      completedExerciseCount: completedCount,
      overallProgressAngle: totalAngle,
      exerciseStatusList: statusList
    });

    // 保存快照
    this.saveSnapshot();

    // 基于截止时间戳启动倒计时
    this.restEndTime = Date.now() + restSeconds * 1000;
    this._startRestInterval();

    // 计算1RM（异步，PR徽章单独更新）
    this.checkAndSave1RM(setRecord);

    // 震动反馈
    UI.vibrateSuccess();
  },

  /**
   * 获取某动作最近一次的训练记录
   */
  getLastExerciseRecord(exerciseId) {
    const allSets = getCollection('session_sets');
    const records = allSets
      .filter(s => s.exercise_id === exerciseId && s.status === 'completed')
      .sort((a, b) => b.completed_at - a.completed_at);
    return records.length > 0 ? records[0] : null;
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
    wx.showModal({
      title: '撤回上一组',
      content: `确定撤回「${lastSet.exercise_name}」第${lastSet.set_number}组 (${lastSet.actual_weight}kg × ${lastSet.actual_reps}次) 吗？`,
      confirmText: '确认撤回',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        this.clearRestTimer();
        this.restEndTime = null;

        remove('session_sets', lastSet.id);
        const nextCompletedSets = completedSets.slice(0, -1);
        const nextExercises = exercises.map(ex => ({ ...ex }));
        let targetExIdx = nextExercises.findIndex(ex => ex.exercise_id === lastSet.exercise_id);
        if (targetExIdx === -1) targetExIdx = Math.max(0, this.data.currentExerciseIndex - 1);

        if (nextExercises[targetExIdx]) {
          nextExercises[targetExIdx].completed_sets = Math.max(0, (nextExercises[targetExIdx].completed_sets || 1) - 1);
        }
        const targetSetIdx = nextExercises[targetExIdx] ? nextExercises[targetExIdx].completed_sets : 0;

        update('sessions', session.id, {
          pending_exercises: nextExercises,
          current_exercise_index: targetExIdx,
          current_set_index: targetSetIdx,
          completed_sets: nextCompletedSets,
          updated_at: Date.now()
        });

        const targetEx = nextExercises[targetExIdx];
        const exerciseDetail = targetEx ? (findOne('exercises', { id: targetEx.exercise_id }) || {}) : {};
        const restoredWeight = lastSet.actual_weight !== undefined ? lastSet.actual_weight : (targetEx ? targetEx.target_weight : 0);
        const restoredReps = lastSet.actual_reps !== undefined ? lastSet.actual_reps : (targetEx ? targetEx.target_reps : 0);
        const restoredRPE = lastSet.rpe ? Math.max(0, lastSet.rpe - 1) : 2;

        this.setData({
          isResting: false,
          restTimeLeft: 0,
          restMinimized: false,
          restCompleting: false,
          completedSets: nextCompletedSets,
          exercises: nextExercises,
          currentExerciseIndex: targetExIdx,
          currentSetIndex: targetSetIdx,
          currentExercise: targetEx ? {
            ...targetEx,
            ...exerciseDetail,
            currentSetNumber: targetSetIdx + 1,
            actual_weight: restoredWeight,
            actual_reps: restoredReps
          } : this.data.currentExercise,
          selectedRPE: restoredRPE,
          setNote: lastSet.note || '',
          weightOptions: this._buildWeightOptions(restoredWeight),
          repOptions: this._buildRepOptions(restoredReps),
          plateHint: this._calcBarbellPlates(restoredWeight, this.data.barWeight)
        });
        this.calculateOverallProgress();
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

    audio.playCompleteSound();
    UI.vibrate();

    if (this.data.currentExerciseIndex >= this.data.exercises.length) {
      this.setData({
        isResting: false,
        restTimeLeft: 0,
        restMinimized: false
      });
      this.onTrainingComplete();
    } else {
      this._restoreFromRest();
    }
  },

  /**
   * 休息结束恢复训练 — 合并 setData 避免闪动
   */
  _restoreFromRest() {
    const { exercises, currentExerciseIndex } = this.data;
    const exercise = exercises[currentExerciseIndex];

    if (!exercise) {
      this.setData({ isResting: false, restTimeLeft: 0, restMinimized: false });
      this.onTrainingComplete();
      return;
    }

    const exerciseDetail = findOne('exercises', { id: exercise.exercise_id });
    if (!exerciseDetail) {
      this.setData({ isResting: false, restTimeLeft: 0, restMinimized: false });
      this.onSkipExercise();
      return;
    }

    const needsWarmup = (exercise.target_weight || 0) >= 30 && !exercise.warmup_completed;

    if (needsWarmup) {
      this.setData({
        isResting: false,
        restTimeLeft: 0,
        restMinimized: false
      });
      this.showWarmupPanel(exercise, exerciseDetail);
      return;
    }

    const lastRecord = this.getLastExerciseRecord(exercise.exercise_id);
    const defaultWeight = lastRecord ? lastRecord.actual_weight : (exercise.target_weight || 0);
    const defaultReps = lastRecord ? lastRecord.actual_reps : (exercise.target_reps || 0);
    const defaultRPE = lastRecord ? (lastRecord.rpe - 1) : 2;

    // 合并 calculateOverallProgress 的数据，避免二次 setData
    let completedCount = 0;
    const statusList = exercises.map((ex, idx) => {
      const isCompleted = ex.completed_sets >= ex.target_sets;
      if (isCompleted) completedCount++;
      return {
        name: ex.exercise_name,
        status: isCompleted ? 'completed' : (idx === currentExerciseIndex ? 'current' : 'pending')
      };
    });
    const totalAngle = exercises.length > 0 ? (completedCount / exercises.length) * 360 : 0;

    this.setData({
      isResting: false,
      restTimeLeft: 0,
      restMinimized: false,
      currentExercise: {
        ...exercise,
        ...exerciseDetail,
        currentSetNumber: exercise.completed_sets + 1,
        actual_weight: defaultWeight,
        actual_reps: defaultReps
      },
      currentSetIndex: exercise.completed_sets || 0,
      selectedRPE: defaultRPE,
      setNote: '',
      showWarmup: false,
      weightOptions: this._buildWeightOptions(defaultWeight),
      repOptions: this._buildRepOptions(defaultReps),
      plateHint: this._calcBarbellPlates(defaultWeight, this.data.barWeight),
      completedExerciseCount: completedCount,
      overallProgressAngle: totalAngle,
      exerciseStatusList: statusList
    });
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
  },

  /**
   * 展开悬浮倒计时为休息弹窗
   */
  onExpandRest() {
    this.setData({ restMinimized: false });
  },

  /**
   * 增加休息时间
   */
  onAddRestTime() {
    const { restTimeLeft } = this.data;
    const newTime = Math.min(restTimeLeft + 30, 300); // 最多5分钟
    this.restEndTime = Date.now() + newTime * 1000;
    this.setData({ restTimeLeft: newTime, restTimeTotal: newTime });
  },

  /**
   * 减少休息时间
   */
  onReduceRestTime() {
    const { restTimeLeft } = this.data;
    const newTime = Math.max(restTimeLeft - 30, 30); // 最少30秒
    this.restEndTime = Date.now() + newTime * 1000;
    this.setData({ restTimeLeft: newTime, restTimeTotal: newTime });
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
   * 添加动作
   */
  onAddExercise() {
    const allExercises = getCollection('exercises');
    this.setData({
      showAddExerciseModal: true,
      addExerciseSearch: '',
      filteredExercises: allExercises
    });
  },

  /**
   * 搜索动作
   */
  onAddExerciseSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    const allExercises = getCollection('exercises');
    const filtered = allExercises.filter(ex =>
      ex.name.toLowerCase().includes(keyword) ||
      (ex.name_en && ex.name_en.toLowerCase().includes(keyword))
    );
    this.setData({
      addExerciseSearch: e.detail.value,
      filteredExercises: filtered
    });
  },

  /**
   * 选择要添加的动作
   */
  onSelectAddExercise(e) {
    const { exerciseId } = e.currentTarget.dataset;
    const exercise = findOne('exercises', { id: exerciseId });

    if (!exercise) return;

    const { exercises, session } = this.data;

    // 添加到动作列表末尾
    const newExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      name: exercise.name,
      target_sets: 3,
      target_reps: 10,
      target_weight: 0,
      rest_seconds: 120,
      completed_sets: 0,
      warmup_completed: true, // 添加的动作默认跳过热身
      muscle_group: exercise.muscle_group,
      is_added: true // 标记为临时添加
    };

    exercises.push(newExercise);

    // 保存到 session
    update('sessions', session.id, {
      pending_exercises: exercises,
      updated_at: Date.now()
    });

    this.setData({
      exercises,
      showAddExerciseModal: false,
      addExerciseSearch: '',
      filteredExercises: []
    });

    UI.showToast({
      message: '已添加 ' + exercise.name,
      icon: 'check-circle',
      context: this
    });

    // 更新整体进度
    this.calculateOverallProgress();
  },

  /**
   * 取消添加动作
   */
  onCancelAddExercise() {
    this.setData({
      showAddExerciseModal: false,
      addExerciseSearch: '',
      filteredExercises: []
    });
  },

  /**
   * 选择要训练的动作
   */
  onSelectExercise(e) {
    const { index } = e.currentTarget.dataset;
    const { exercises, isResting } = this.data;
    const targetExercise = exercises[index];

    // 休息期间不允许切换动作
    if (isResting) {
      UI.showToast({ message: '请先完成休息', icon: 'warning', context: this });
      return;
    }

    // 检查目标动作是否已完成
    if (targetExercise.completed_sets >= targetExercise.target_sets) {
      UI.showToast({
        message: '该动作已完成',
        icon: 'warning',
        context: this
      });
      return;
    }

    // 切换当前动作
    this.setData({
      currentExerciseIndex: index,
      currentSetIndex: targetExercise.completed_sets || 0,
      showExercisePicker: false
    });

    // 更新当前动作
    this.setCurrentExercise();

    // 保存状态
    this.saveSnapshot();

    UI.showToast({
      message: '已切换到 ' + targetExercise.name,
      icon: 'check-circle',
      context: this
    });
  },

  /**
   * 点击状态列表中的动作
   */
  onTapExercise(e) {
    const { index } = e.currentTarget.dataset;
    const { exercises, isResting } = this.data;

    // 休息时不允许切换
    if (isResting) {
      UI.showToast({
        message: '休息中无法切换',
        icon: 'warning',
        context: this
      });
      return;
    }

    const targetExercise = exercises[index];

    // 检查目标动作是否已完成
    if (targetExercise.completed_sets >= targetExercise.target_sets) {
      UI.showToast({
        message: '该动作已完成',
        icon: 'warning',
        context: this
      });
      return;
    }

    // 切换当前动作
    this.setData({
      currentExerciseIndex: index,
      currentSetIndex: targetExercise.completed_sets || 0,
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
    const { session, completedSets, prBadges } = this.data;

    // 标记会话完成
    update('sessions', session.id, {
      status: 'completed',
      completed_at: Date.now(),
      total_duration_seconds: Math.floor((Date.now() - session.started_at) / 1000)
    });

    // 计算演进
    let progressions = [];
    try {
      progressions = await calculateProgression(session.id);
    } catch (err) {
      console.error('计算演进失败:', err);
    }

    this.setData({ isCompleted: true });

    // 显示完成页
    wx.redirectTo({
      url: '/pages/home/complete/complete?sessionId=' + session.id
    });
  },

  /**
   * 收起训练页面 — 返回上一页并显示悬浮窗
   */
  onCollapseTraining() {
    const { session, currentExercise, currentSetIndex } = this.data;
    if (!session) return;

    // 保存当前训练状态到全局
    const app = getApp();
    app.globalData.trainingMinimized = true;
    app.globalData.trainingMinimizedSessionId = session.id;
    app.globalData.trainingSnapshot = {
      sessionId: session.id,
      exerciseName: currentExercise ? currentExercise.name : '',
      currentSet: currentSetIndex + 1,
      totalSets: currentExercise ? currentExercise.target_sets : 0
    };

    // 返回上一页（打开训练前的页面）
    wx.navigateBack({
      fail: () => {
        // 如果没有上一页（直接打开训练页），则回到首页
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
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

    // 暂停训练计时
    this.setData({ isPaused: true });

    update('sessions', session.id, {
      status: 'paused',
      paused_at: Date.now(),
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
      this.setData({ isPaused: false });
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

    this.setData({ isPaused: false });

    update('sessions', session.id, {
      status: 'in_progress',
      resumed_at: Date.now(),
      updated_at: Date.now()
    });

    UI.showToast({ message: '继续训练', icon: 'none' });
  },

  /**
   * 结束训练
   */
  async onAbandonTraining() {
    const result = await UI.showDialog({
      title: '确认结束训练',
      content: '确定要结束本次训练吗？已记录的数据会保留',
      confirmText: '结束训练',
      cancelText: '继续训练'
    });

    if (result.confirm) {
      const { session } = this.data;

      update('sessions', session.id, {
        status: 'aborted',
        aborted_at: Date.now(),
        updated_at: Date.now()
      });

      wx.navigateBack();
    }
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
      updated_at: Date.now(),
      snapshot: true
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
