const UI = require('../../utils/ui.js');
const audio = require('../../utils/audio.js');

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

Component({
  data: {
    visible: false,
    restActive: false,
    restDone: false,
    titleText: '',
    subText: '',
    posTop: null,
    isDragging: false
  },

  lifetimes: {
    attached() {
      this._initDragBounds();
      this.syncState();
    },
    detached() {
      this._stopTimer();
    }
  },

  pageLifetimes: {
    show() {
      this.syncState();
    },
    hide() {
      this._stopTimer();
    }
  },

  methods: {
    _initDragBounds() {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const winH = info.windowHeight || 667;
      const statusH = info.statusBarHeight || 20;
      this._minTop = statusH + 56;
      this._maxTop = Math.max(this._minTop + 80, winH - 92);
      this._defaultTop = Math.max(this._minTop, winH - 104);
    },

    _syncSavedPosition() {
      if (this._minTop === undefined) this._initDragBounds();
      const app = getApp();
      const saved = app && app.globalData ? app.globalData.trainingFloatTop : null;
      if (typeof saved === 'number' && !Number.isNaN(saved)) {
        const clamped = Math.min(this._maxTop, Math.max(this._minTop, saved));
        if (this.data.posTop !== clamped) {
          this.setData({ posTop: clamped });
        }
      }
    },

    syncState() {
      const app = getApp();
      const gd = app && app.globalData ? app.globalData : null;
      if (!gd || !gd.trainingMinimized || !gd.trainingSnapshot) {
        this._stopTimer();
        if (this.data.visible) {
          this.setData({ visible: false });
        }
        return;
      }
      this._syncSavedPosition();

      const snapshot = gd.trainingSnapshot;
      const activeRest = gd.activeRest && gd.activeRest.sessionId === snapshot.sessionId
        ? gd.activeRest
        : null;

      if (activeRest && activeRest.restEndTime) {
        this._renderRestState(snapshot, activeRest);
        const remaining = Math.ceil((activeRest.restEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          this._startTimer();
        } else {
          this._stopTimer();
        }
        return;
      }

      this._stopTimer();
      const subText = snapshot.totalSets > 0
        ? `第 ${snapshot.currentSet}/${snapshot.totalSets} 组`
        : '点击继续训练';

      this.setData({
        visible: true,
        restActive: false,
        restDone: false,
        titleText: snapshot.exerciseName || '进行中的训练',
        subText
      });
    },

    _renderRestState(snapshot, activeRest) {
      const remaining = Math.ceil((activeRest.restEndTime - Date.now()) / 1000);
      const fallbackSub = snapshot.totalSets > 0
        ? `${snapshot.exerciseName || '进行中的训练'} · 第 ${snapshot.currentSet}/${snapshot.totalSets} 组`
        : (snapshot.exerciseName || '点击返回继续训练');
      const subText = activeRest.nextSetPreview
        ? `下一组：${activeRest.nextSetPreview}`
        : fallbackSub;

      if (remaining > 0) {
        this.setData({
          visible: true,
          restActive: true,
          restDone: false,
          titleText: `组间休息 · ${formatTime(remaining)}`,
          subText
        });
      } else {
        if (!activeRest.notified) {
          activeRest.notified = true;
          audio.playCompleteSound();
          UI.vibrate();
        }
        this._stopTimer();
        this.setData({
          visible: true,
          restActive: false,
          restDone: true,
          titleText: '休息结束 · 点击继续',
          subText
        });
      }
    },

    _startTimer() {
      this._stopTimer();
      this._restTimer = setInterval(() => {
        const app = getApp();
        const gd = app && app.globalData ? app.globalData : null;
        if (!gd || !gd.trainingMinimized || !gd.trainingSnapshot) {
          this._stopTimer();
          this.setData({ visible: false });
          return;
        }
        const snapshot = gd.trainingSnapshot;
        const activeRest = gd.activeRest && gd.activeRest.sessionId === snapshot.sessionId
          ? gd.activeRest
          : null;
        if (!activeRest || !activeRest.restEndTime) {
          this.syncState();
          return;
        }
        this._renderRestState(snapshot, activeRest);
      }, 1000);
    },

    _stopTimer() {
      if (this._restTimer) {
        clearInterval(this._restTimer);
        this._restTimer = null;
      }
    },

    onTouchStart(e) {
      if (!e.touches || !e.touches.length) return;
      if (this._minTop === undefined) this._initDragBounds();
      this._touchStartY = e.touches[0].clientY;
      this._startTop = this.data.posTop !== null ? this.data.posTop : this._defaultTop;
      this._moved = false;
    },

    onTouchMove(e) {
      if (!e.touches || !e.touches.length || this._touchStartY === undefined) return;
      const deltaY = e.touches[0].clientY - this._touchStartY;
      if (!this._moved && Math.abs(deltaY) < 8) return;
      this._moved = true;
      const nextTop = Math.min(this._maxTop, Math.max(this._minTop, Math.round(this._startTop + deltaY)));
      this.setData({ posTop: nextTop, isDragging: true });
    },

    onTouchEnd() {
      if (this._moved) {
        this._justDragged = true;
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.trainingFloatTop = this.data.posTop;
        }
        this.setData({ isDragging: false });
        setTimeout(() => { this._justDragged = false; }, 120);
      }
      this._touchStartY = undefined;
      this._moved = false;
    },

    onTapFloat() {
      if (this._justDragged) return;
      this._stopTimer();
      const app = getApp();
      const snapshot = app && app.globalData ? app.globalData.trainingSnapshot : null;
      if (snapshot && snapshot.sessionId) {
        app.globalData.trainingMinimized = false;
        app.globalData.trainingMinimizedSessionId = null;
        wx.navigateTo({
          url: '/pages/home/training/training?sessionId=' + snapshot.sessionId
        });
      }
    }
  }
});
