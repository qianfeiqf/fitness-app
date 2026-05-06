/**
 * 训练中页面 - 核心跟练交互
 */

const { findOne, update, getCollection, insert } = require('../../../localdb/db.js');
const { calculate1RM, calculateAndSave1RM, checkMilestone } = require('../../../services/rm.js');
const { calculateProgression } = require('../../../services/progression.js');
const TDesign = require('../../../utils/tdesign.js');
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
    overallProgressAngle: 0,
    exerciseStatusList: [],

    // 临时替换
    showReplaceModal: false,
    alternativeExercises: []
  },

  onLoad(options) {
    console.log('=== 训练中页面加载 ===', options);

    if (options.sessionId) {
      this.setData({ sessionId: options.sessionId });
      this.loadSession(options.sessionId);
    }

    // 监听App隐藏事件
    wx.eventCenter.on('appHidden', this.onAppHidden, this);
  },

  onUnload() {
    wx.eventCenter.off('appHidden', this.onAppHidden);
  },

  /**
   * 加载会话
   */
  loadSession(sessionId) {
    TDesign.showLoading('加载中...', this);

    const session = findOne('sessions', { id: sessionId });

    if (!session) {
      TDesign.hideLoading();
      TDesign.showError('会话不存在', this);
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

    TDesign.hideLoading();

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

    this.setData({
      currentExercise: {
        ...exercise,
        ...exerciseDetail,
        currentSetNumber: exercise.completed_sets + 1
      },
      currentSetIndex: exercise.completed_sets || 0
    });

    // 更新整体进度
    this.calculateOverallProgress();
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
    const { currentExercise, session, currentSetIndex } = this.data;

    // 记录完成的数据
    const setRecord = {
      id: 'set_' + Date.now(),
      session_id: session.id,
      exercise_id: currentExercise.exercise_id,
      exercise_name: currentExercise.name,
      set_number: currentSetIndex + 1,
      target_weight: currentExercise.target_weight,
      actual_weight: currentExercise.target_weight,
      target_reps: currentExercise.target_reps,
      actual_reps: currentExercise.target_reps,
      rpe: this.data.selectedRPE + 1,
      status: 'completed',
      completed_at: Date.now(),
      created_at: Date.now()
    };

    // 保存到本地
    insert('session_sets', setRecord);

    // 更新session中的完成数组
    const completedSets = [...this.data.completedSets, setRecord];
    this.setData({ completedSets });

    // 计算1RM
    this.checkAndSave1RM(setRecord);

    // 更新动作进度
    this.updateExerciseProgress(currentExercise, currentSetIndex + 1);

    // 震动反馈
    TDesign.vibrateSuccess();

    // 开始倒计时
    this.startRestTimer(currentExercise.rest_seconds || 120);
  },

  /**
   * 手动调整重量/次数
   */
  onAdjustSet(e) {
    const { type, value } = e.currentTarget.dataset;
    const { currentExercise } = this.data;

    if (type === 'weight') {
      this.setData({
        'currentExercise.actual_weight': parseFloat(value) || currentExercise.target_weight
      });
    } else if (type === 'reps') {
      this.setData({
        'currentExercise.actual_reps': parseInt(value) || currentExercise.target_reps
      });
    }
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
      TDesign.vibrate();
    }
  },

  /**
   * 开始休息倒计时
   */
  startRestTimer(seconds) {
    this.setData({
      isResting: true,
      restTimeLeft: seconds,
      restTimeTotal: seconds
    });

    // 保存快照
    this.saveSnapshot();

    // 开始倒计时
    this.restTimer = setInterval(() => {
      const { restTimeLeft } = this.data;

      if (restTimeLeft <= 1) {
        this.onRestComplete();
      } else {
        this.setData({ restTimeLeft: restTimeLeft - 1 });
        this.playRestBeep();
      }
    }, 1000);
  },

  /**
   * 休息结束
   */
  onRestComplete() {
    clearInterval(this.restTimer);

    // 播放完成提示音
    audio.playCompleteSound();
    TDesign.vibrate();

    this.setData({
      isResting: false,
      restTimeLeft: 0
    });

    // 检查是否需要切换动作
    if (this.data.currentExerciseIndex >= this.data.exercises.length) {
      this.onTrainingComplete();
    } else {
      this.setCurrentExercise();
    }
  },

  /**
   * 跳过休息
   */
  onSkipRest() {
    clearInterval(this.restTimer);
    this.onRestComplete();
  },

  /**
   * 增加休息时间
   */
  onAddRestTime() {
    const { restTimeLeft, restTimeTotal } = this.data;
    const newTime = Math.min(restTimeLeft + 30, 300); // 最多5分钟
    this.setData({ restTimeLeft: newTime, restTimeTotal: newTime });
  },

  /**
   * 减少休息时间
   */
  onReduceRestTime() {
    const { restTimeLeft } = this.data;
    const newTime = Math.max(restTimeLeft - 30, 30); // 最少30秒
    this.setData({ restTimeLeft: newTime, restTimeTotal: newTime });
  },

  /**
   * 播放休息提示音
   */
  playRestBeep() {
    // 最后3秒播放提示音
    if (this.data.restTimeLeft <= 3) {
      audio.playCountdownBeep();
      TDesign.vibrateWarning();
    }
  },

  /**
   * 显示动作替换选择
   */
  onReplaceExercise() {
    const { currentExercise } = this.data;

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

      TDesign.showToast({
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
   * 训练完成
   */
  async onTrainingComplete() {
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
   * 暂停训练
   */
  onPauseTraining() {
    const { session } = this.data;

    update('sessions', session.id, {
      status: 'paused',
      paused_at: Date.now(),
      updated_at: Date.now()
    });

    TDesign.showDialog({
      title: '训练已暂停',
      content: '可以稍后继续本次训练',
      confirmText: '好的'
    });
  },

  /**
   * 放弃训练
   */
  async onAbandonTraining() {
    const result = await TDesign.showDialog({
      title: '确认放弃',
      content: '确定要放弃本次训练吗？已记录的数据会保留',
      confirmText: '放弃',
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
