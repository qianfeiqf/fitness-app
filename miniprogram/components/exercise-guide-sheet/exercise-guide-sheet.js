const { getCollection } = require('../../localdb/db.js');
const { calculate1RM } = require('../../services/rm.js');

const HISTORY_PAGE_SIZE = 20;

function formatMonthDay(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

function getYearFromTs(ts) {
  return ts ? new Date(ts).getFullYear() : new Date().getFullYear();
}

function formatWeight(val) {
  const n = Number(val) || 0;
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function estimate1RM(weight, reps) {
  if (weight <= 0 || reps <= 0) return 0;
  const res = calculate1RM(weight, reps);
  if (res && typeof res === 'object' && res.estimated1RM) {
    return res.estimated1RM;
  }
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function formatSetsSummary(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return '';
  const chunks = [];
  sets.forEach(s => {
    const last = chunks[chunks.length - 1];
    if (last && last.weightText === s.weightText && last.reps === s.reps) {
      last.count += 1;
    } else {
      chunks.push({ weightText: s.weightText, reps: s.reps, count: 1 });
    }
  });
  if (chunks.length === 1) {
    const c = chunks[0];
    return c.count > 1 ? `${c.weightText}kg × ${c.reps} × ${c.count}组` : `${c.weightText}kg × ${c.reps}`;
  }
  return chunks
    .map(c => (c.count > 1 ? `${c.weightText}kg × ${c.reps} (${c.count}组)` : `${c.weightText}kg × ${c.reps}`))
    .join(' · ');
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
    historyTotal: 0,
    historyHasMore: false,
    historySummary: {
      best1RM: 0,
      maxWeight: 0,
      sessionCount: 0
    }
  },

  observers: {
    'visible, exercise, initialTab': function(visible, exercise, initialTab) {
      if (visible && exercise) {
        const { fullList, historySummary } = this._buildExerciseHistory(exercise);
        this._allHistoryList = fullList;
        const firstPage = fullList.slice(0, HISTORY_PAGE_SIZE);
        this.setData({
          gifLoadError: false,
          activeTab: initialTab === 'history' ? 'history' : 'guide',
          historyList: firstPage,
          historyTotal: fullList.length,
          historyHasMore: fullList.length > firstPage.length,
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

    onScrollToLower() {
      if (this.data.activeTab !== 'history' || !this.data.historyHasMore) return;
      this.onLoadMoreHistory();
    },

    onLoadMoreHistory() {
      const all = this._allHistoryList || [];
      const currentLen = (this.data.historyList || []).length;
      if (currentLen >= all.length) {
        this.setData({ historyHasMore: false });
        return;
      }
      const nextSlice = all.slice(0, currentLen + HISTORY_PAGE_SIZE);
      this.setData({
        historyList: nextSlice,
        historyHasMore: all.length > nextSlice.length
      });
    },

    _buildExerciseHistory(exercise) {
      const exId = exercise.id || exercise.exercise_id || '';
      const exName = (exercise.name || exercise.exercise_name || '').trim();
      const empty = { fullList: [], historySummary: { best1RM: 0, maxWeight: 0, sessionCount: 0 } };
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

        const ts = (sess && (sess.completed_at || sess.started_at)) || set.completed_at || set.created_at || 0;
        const sessId = set.session_id || (sess && sess.id) || ('day_' + getYearFromTs(ts) + '_' + formatMonthDay(ts));
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
          est1RM: estimate1RM(w, r),
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

      const enrichedAsc = ascGroups.map(g => {
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
          year: getYearFromTs(g.timestamp),
          dateText: formatMonthDay(g.timestamp),
          planName: g.planName,
          setCount: g.sets.length,
          best1RM: formatWeight(sessionBest1RM),
          maxWeight: formatWeight(sessionMaxWeight),
          isPR,
          setsSummary: formatSetsSummary(g.sets)
        };
      });

      // 按时间倒序排列，并为每个年份段的首条记录标记年份分组头
      const descList = enrichedAsc.reverse();
      let prevYear = null;
      descList.forEach(item => {
        item.showYearHeader = item.year !== prevYear;
        prevYear = item.year;
      });

      return {
        fullList: descList,
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
