/**
 * 单次训练详情页
 */

const { findOne, find, update, remove } = require('../../../localdb/db.js');

Page({
  data: {
    sessionId: null,
    session: null,
    sets: [],
    groupedSets: [],
    totalVolume: 0,
    duration: '',
    dateStr: '',
    prCount: 0,
    canResumeToday: false,
    loading: true,
    confirmModal: {
      visible: false,
      title: '',
      content: '',
      confirmText: '确认',
      cancelText: '取消',
      danger: false
    }
  },

  onLoad(options) {
    if (options.sessionId) {
      this.setData({ sessionId: options.sessionId });
      this.loadDetail(options.sessionId);
    }
  },

  onShow() {
    if (this.data.sessionId) {
      this.loadDetail(this.data.sessionId);
    }
  },

  /**
   * 加载训练详情
   */
  loadDetail(sessionId) {
    this.setData({ loading: true });

    const session = findOne('sessions', { id: sessionId });
    if (!session) {
      this.setData({ loading: false });
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }

    // 获取所有组
    const allSets = find('session_sets', { session_id: sessionId })
      .filter(s => s.status === 'completed')
      .sort((a, b) => a.completed_at - b.completed_at);

    // 按动作分组，并将数字 RPE 映射回中文体感
    const rpeLabels = ['', '轻量', '中等', '吃力', '力竭'];
    const exerciseMap = {};
    allSets.forEach(set => {
      if (!exerciseMap[set.exercise_id]) {
        exerciseMap[set.exercise_id] = {
          exercise_id: set.exercise_id,
          exercise_name: set.exercise_name,
          sets: []
        };
      }
      exerciseMap[set.exercise_id].sets.push({
        ...set,
        rpeLabel: set.rpe ? (rpeLabels[set.rpe] || '') : ''
      });
    });

    const groupedSets = Object.values(exerciseMap);

    // 计算总容量
    let totalVolume = 0;
    let prCount = 0;
    allSets.forEach(set => {
      totalVolume += (set.actual_weight || 0) * (set.actual_reps || 0);
      if (set.is_pr) prCount++;
    });

    // 时长
    let duration = '0分钟';
    if (session.total_duration_seconds) {
      const mins = Math.floor(session.total_duration_seconds / 60);
      duration = mins + '分钟';
    } else if (session.started_at && session.completed_at) {
      const mins = Math.floor((session.completed_at - session.started_at) / 1000 / 60);
      duration = mins + '分钟';
    }

    // 日期
    const completedAt = session.completed_at || session.updated_at || Date.now();
    const date = new Date(completedAt);
    const now = new Date();
    const isToday = session.status === 'completed'
      && date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    this.setData({
      session,
      sets: allSets,
      groupedSets,
      totalVolume: Math.round(totalVolume),
      duration,
      dateStr,
      prCount,
      canResumeToday: isToday,
      loading: false
    });
  },

  /**
   * 当天已完成训练重新切回进行中继续补练
   */
  _openConfirmModal({ title, content, confirmText = '确认', cancelText = '取消', danger = false, onConfirm = null }) {
    this._pendingConfirmAction = onConfirm;
    this.setData({
      confirmModal: {
        visible: true,
        title,
        content,
        confirmText,
        cancelText,
        danger
      }
    });
  },

  onConfirmModalCancel() {
    this._pendingConfirmAction = null;
    this.setData({ 'confirmModal.visible': false });
  },

  onConfirmModalOk() {
    const action = this._pendingConfirmAction;
    this._pendingConfirmAction = null;
    this.setData({ 'confirmModal.visible': false });
    if (typeof action === 'function') {
      action();
    }
  },

  onResumeTodayWorkout() {
    const { session, groupedSets } = this.data;
    if (!session) return;

    this._openConfirmModal({
      title: '继续补练',
      content: '将把本次训练重新切回进行中，原有训练时长和已记录组数都会保留，完成后将覆盖更新本次记录。',
      confirmText: '去补练',
      cancelText: '取消',
      onConfirm: () => {
        let pendingExercises = Array.isArray(session.pending_exercises) && session.pending_exercises.length > 0
          ? session.pending_exercises
          : groupedSets.map(g => {
              const lastSet = g.sets[g.sets.length - 1] || {};
              return {
                exercise_id: g.exercise_id,
                name: g.exercise_name,
                exercise_name: g.exercise_name,
                target_sets: g.sets.length,
                completed_sets: g.sets.length,
                target_weight: lastSet.actual_weight || 20,
                target_reps: lastSet.actual_reps || 10,
                rest_seconds: 90,
                warmup_completed: true
              };
            });

        let targetIdx = 0;
        if (session.is_free_workout) {
          targetIdx = pendingExercises.length;
        } else {
          const unfinishedIdx = pendingExercises.findIndex(ex => (ex.completed_sets || 0) < (ex.target_sets || 1));
          targetIdx = unfinishedIdx >= 0 ? unfinishedIdx : Math.max(0, pendingExercises.length - 1);
        }

        const preservedDuration = Number(session.accumulated_duration_seconds || session.total_duration_seconds || 0);

        update('sessions', session.id, {
          status: 'in_progress',
          resumed_at: Date.now(),
          updated_at: Date.now(),
          accumulated_duration_seconds: preservedDuration,
          pending_exercises: pendingExercises,
          current_exercise_index: targetIdx
        });

        wx.navigateTo({
          url: '/pages/home/training/training?sessionId=' + session.id
        });
      }
    });
  },

  /**
   * 删除本次训练记录（同步清理对应的 session_sets）
   */
  onDeleteSession() {
    const { session } = this.data;
    if (!session) return;
    this._openConfirmModal({
      title: '删除训练记录',
      content: '删除后本次训练及所有组记录将无法恢复，确定删除吗？',
      confirmText: '确认删除',
      cancelText: '取消',
      danger: true,
      onConfirm: () => {
        const sets = find('session_sets', { session_id: session.id }) || [];
        sets.forEach(s => remove('session_sets', s.id));
        remove('sessions', session.id);
        wx.showToast({ title: '已删除', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 400);
      }
    });
  },

  onBack() {
    wx.navigateBack();
  }
});
