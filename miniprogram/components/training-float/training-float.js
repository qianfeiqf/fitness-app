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
    subText: ''
  },

  lifetimes: {
    attached() {
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

    onTapFloat() {
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
