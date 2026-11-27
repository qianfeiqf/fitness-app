const { getCollection } = require('../../localdb/db.js');
const { calculate1RM } = require('../../services/rm.js');

function formatHistoryDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y === now.getFullYear() ? `${m}月${day}日` : `${y}年${m}月${day}日`;
}

function formatWeight(val) {
  const n = Number(val) || 0;
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    exercise: {
      type: Object,
      value: null
    },
    allowDelete: {
      type: Boolean,
      value: false
    },
    initialTab: {
      type: String,
      value: 'guide'
    }
  },

  data: {
    gifLoadError: false,
    activeTab: 'guide',
    historyList: [],
    historySummary: {
      best1RM: 0,
      maxWeight: 0,
      sessionCount: 0
    }
  },

  observers: {
    'visible, exercise, initialTab': function(visible, exercise, initialTab) {
      if (visible && exercise) {
        const { historyList, historySummary } = this._buildExerciseHistory(exercise);
        this.setData({
          gifLoadError: false,
          activeTab: initialTab === 'history' ? 'history' : 'guide',
          historyList,
          historySummary
        });
      }
    }
  },

  methods: {
    noop() {},

    onSwitchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      if (tab && tab !== this.data.activeTab) {
        this.setData({ activeTab: tab });
      }
    },

    _buildExerciseHistory(exercise) {
      const exId = exercise.id || exercise.exercise_id || '';
      const exName = (exercise.name || exercise.exercise_name || '').trim();
      const empty = { historyList: [], historySummary: { best1RM: 0, maxWeight: 0, sessionCount: 0 } };
      if (!exId && !exName) return empty;

      const isMatch = (s) => {
        if (!s) return false;
        if (exId && s.exercise_id === exId) return true;
        if (exName && s.exercise_name && s.exercise_name.trim() === exName) return true;
        return false;
      };

      const sessions = getCollection('sessions') || [];
      const sessionMap = {};
      sessions.forEach(s => { if (s && s.id) sessionMap[s.id] = s; });

      // 按会话聚合已完成组（合并 sessions.completed_sets 与 session_sets，按 set.id 去重）
      const groupMap = {};
      const seenSetIds = new Set();

      const addSet = (set, sess) => {
        if (!isMatch(set)) return;
        const w = Number(set.actual_weight) || 0;
        const r = Number(set.actual_reps) || 0;
        if (r <= 0 && w <= 0) return;
        if (set.id && seenSetIds.has(set.id)) return;
        if (set.id) seenSetIds.add(set.id);

        const sessId = set.session_id || (sess && sess.id) || ('day_' + formatHistoryDate(set.completed_at || set.created_at));
        const ts = (sess && (sess.completed_at || sess.started_at)) || set.completed_at || set.created_at || 0;
        if (!groupMap[sessId]) {
          groupMap[sessId] = {
            sessionId: sessId,
            timestamp: ts,
            planName: (sess && sess.plan_name) || '',
            sets: []
          };
        } else if (ts > groupMap[sessId].timestamp) {
          groupMap[sessId].timestamp = ts;
        }
        groupMap[sessId].sets.push({
          setNumber: set.set_number || (groupMap[sessId].sets.length + 1),
          weight: w,
          reps: r,
          weightText: formatWeight(w),
          est1RM: calculate1RM(w, r),
          completedAt: set.completed_at || set.created_at || 0
        });
      };

      sessions.forEach(sess => {
        if (!sess || sess.status === 'aborted') return;
        if (Array.isArray(sess.completed_sets)) {
          sess.completed_sets.forEach(set => addSet(set, sess));
        }
      });

      const allSessionSets = getCollection('session_sets') || [];
      allSessionSets.forEach(set => {
        if (!set || set.status === 'aborted') return;
        const sess = set.session_id ? sessionMap[set.session_id] : null;
        if (sess && sess.status === 'aborted') return;
        addSet(set, sess);
      });

      // 按时间正序计算每次历史最高 1RM（标注 PR）
      const ascGroups = Object.values(groupMap)
        .filter(g => g.sets.length > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

      let runningBest1RM = 0;
      let overallBest1RM = 0;
      let overallMaxWeight = 0;

      const enriched = ascGroups.map(g => {
        g.sets.sort((a, b) => (a.setNumber - b.setNumber) || (a.completedAt - b.completedAt));
        let sessionBest1RM = 0;
        let sessionMaxWeight = 0;
        g.sets.forEach((s, idx) => {
          s.displayIndex = idx + 1;
          if (s.est1RM > sessionBest1RM) sessionBest1RM = s.est1RM;
          if (s.weight > sessionMaxWeight) sessionMaxWeight = s.weight;
        });

        const isPR = sessionBest1RM > 0 && sessionBest1RM > runningBest1RM;
        if (sessionBest1RM > runningBest1RM) runningBest1RM = sessionBest1RM;
        if (sessionBest1RM > overallBest1RM) overallBest1RM = sessionBest1RM;
        if (sessionMaxWeight > overallMaxWeight) overallMaxWeight = sessionMaxWeight;

        return {
          sessionId: g.sessionId,
          dateText: formatHistoryDate(g.timestamp),
          planName: g.planName,
          setCount: g.sets.length,
          best1RM: formatWeight(sessionBest1RM),
          maxWeight: formatWeight(sessionMaxWeight),
          isPR,
          sets: g.sets
        };
      });

      return {
        historyList: enriched.reverse().slice(0, 30),
        historySummary: {
          best1RM: formatWeight(overallBest1RM),
          maxWeight: formatWeight(overallMaxWeight),
          sessionCount: ascGroups.length
        }
      };
    },

    onGifError() {
      this.setData({ gifLoadError: true });
    },

    onClose() {
      this.triggerEvent('close');
    },

    onDelete() {
      this.triggerEvent('delete', { exercise: this.data.exercise });
    }
  }
});
