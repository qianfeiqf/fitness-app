/**
 * 演进逻辑服务
 * 实现训练计划的自动演进判定树
 */

const { getCollection, findOne, find, update, insert } = require('../localdb/db.js');

/**
 * 训练演进判定
 * 每次 Session 变更为 Completed 时触发
 */
async function calculateProgression(sessionId) {
  console.log('计算演进, sessionId:', sessionId);

  const session = findOne('sessions', { id: sessionId });
  if (!session) {
    throw new Error('Session不存在');
  }

  const sessionSets = find('session_sets', { session_id: sessionId });
  const completedSets = sessionSets.filter(s => s.status === 'completed');

  // 按动作分组
  const setsByExercise = {};
  completedSets.forEach(set => {
    if (!setsByExercise[set.exercise_id]) {
      setsByExercise[set.exercise_id] = [];
    }
    setsByExercise[set.exercise_id].push(set);
  });

  const progressions = [];

  // 对每个动作计算演进
  for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
    const progression = await calculateExerciseProgression(exerciseId, sets);
    if (progression) {
      progressions.push(progression);
    }
  }

  return progressions;
}

/**
 * 计算单个动作的演进
 */
async function calculateExerciseProgression(exerciseId, completedSets) {
  console.log('计算动作演进:', exerciseId);

  // 获取动作信息
  const exercise = findOne('exercises', { id: exerciseId });
  if (!exercise) {
    console.warn('动作不存在:', exerciseId);
    return null;
  }

  // 获取该动作的计划配置
  const planExercise = findOne('plan_exercises', {
    exercise_id: exerciseId,
    plan_id: getCurrentActivePlanId()
  });

  if (!planExercise) {
    console.log('该动作无计划配置，跳过演进');
    return null;
  }

  // 计算本 session 的表现
  const lastSet = completedSets[completedSets.length - 1];
  const bestSet = findBestSet(completedSets);

  const targetVolume = planExercise.target_weight * planExercise.target_reps;
  const actualVolume = bestSet.actual_weight * bestSet.actual_reps;
  const isTargetAchieved = actualVolume >= targetVolume;

  // 获取历史失败记录
  const history = getExerciseHistory(exerciseId);
  const consecutiveFailures = calculateConsecutiveFailures(history);

  // 判断演进方向
  let progressionType = null;
  let newWeight = planExercise.initial_weight;
  let reason = '';

  if (isTargetAchieved) {
    // 正向演进
    progressionType = 'progression';
    const incrementStep = getIncrementStep(planExercise, exercise);
    newWeight = lastSet.actual_weight + incrementStep;
    reason = `达成目标(${targetVolume}kg)，重量增加${incrementStep}kg`;

    // 重置失败计数
    updateFailureCount(exerciseId, 0);

  } else if (consecutiveFailures === 0) {
    // 首次失败，停滞保留
    progressionType = 'stall';
    newWeight = lastSet.actual_weight;
    reason = '首次未达成目标，保持重量';

    // 增加失败计数
    updateFailureCount(exerciseId, 1);

  } else {
    // 连续失败，触发Deload
    progressionType = 'deload';
    const decrementRate = planExercise.decrement_rate || 0.1;
    newWeight = lastSet.actual_weight * (1 - decrementRate);
    reason = `连续${consecutiveFailures + 1}次未达成，触发Deload，减载${(decrementRate * 100).toFixed(0)}%`;

    // 增加失败计数
    updateFailureCount(exerciseId, consecutiveFailures + 1);
  }

  // 检查高阶干预（当重量达到体重的1.4倍时）
  const profile = findOne('profiles', {});
  const bodyWeight = profile ? profile.weight : 70;
  const weightRatio = newWeight / bodyWeight;

  if (weightRatio >= 1.4 && planExercise.increment_step >= 2.5) {
    // 建议降低递增步幅
    reason += '（系统建议：递减步幅降至1.25kg进行微调）';
  }

  // 保存演进记录
  const progressionRecord = {
    id: 'prog_' + Date.now(),
    exercise_id: exerciseId,
    session_id: completedSets[0].session_id,
    progression_type: progressionType,
    previous_weight: lastSet.actual_weight,
    new_weight: newWeight,
    increment: newWeight - lastSet.actual_weight,
    reason,
    body_weight: bodyWeight,
    weight_ratio: weightRatio,
    created_at: Date.now()
  };

  insert('progressions', progressionRecord);

  return progressionRecord;
}

/**
 * 找出最佳的一组（按容量）
 */
function findBestSet(sets) {
  return sets.reduce((best, current) => {
    const currentVolume = current.actual_weight * current.actual_reps;
    const bestVolume = best.actual_weight * best.actual_reps;
    return currentVolume > bestVolume ? current : best;
  }, sets[0]);
}

/**
 * 获取动作历史表现
 */
function getExerciseHistory(exerciseId, limit = 10) {
  const sessions = getCollection('sessions');
  const completedSessions = sessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => b.completed_at - a.completed_at)
    .slice(0, limit);

  const history = [];

  completedSessions.forEach(session => {
    const sets = find('session_sets', {
      session_id: session.id,
      exercise_id: exerciseId,
      status: 'completed'
    });

    if (sets.length > 0) {
      const bestSet = findBestSet(sets);
      const planExercise = findOne('plan_exercises', {
        exercise_id: exerciseId,
        plan_id: session.plan_id
      });

      const targetVolume = planExercise
        ? planExercise.target_weight * planExercise.target_reps
        : 0;
      const actualVolume = bestSet.actual_weight * bestSet.actual_reps;

      history.push({
        session_id: session.id,
        date: session.completed_at,
        target_achieved: actualVolume >= targetVolume,
        actual_volume: actualVolume,
        best_set: bestSet
      });
    }
  });

  return history;
}

/**
 * 计算连续失败次数
 */
function calculateConsecutiveFailures(history) {
  let consecutiveFailures = 0;

  for (const record of history) {
    if (!record.target_achieved) {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return consecutiveFailures;
}

/**
 * 更新失败计数
 */
function updateFailureCount(exerciseId, count) {
  let failureRecord = findOne('failure_counts', { exercise_id: exerciseId });

  if (failureRecord) {
    update('failure_counts', failureRecord._id, { count });
  } else {
    insert('failure_counts', {
      exercise_id: exerciseId,
      count
    });
  }
}

/**
 * 获取递增步幅
 * 根据动作类型和当前重量级别调整
 */
function getIncrementStep(planExercise, exercise) {
  let baseStep = planExercise.increment_step || 2.5;

  // 上肢动作递减步幅
  if (['手臂', '肩部', '胸部'].includes(exercise.muscle_group)) {
    baseStep = planExercise.increment_step || 1.25;
  }

  // 检查是否需要微调（高阶干预）
  const profile = findOne('profiles', {});
  const bodyWeight = profile ? profile.weight : 70;
  const currentWeight = planExercise.initial_weight;

  if (currentWeight / bodyWeight >= 1.4) {
    // 重量达到体重的1.4倍，降低递增步幅
    baseStep = 1.25;
  }

  return baseStep;
}

/**
 * 获取当前激活的计划ID
 */
function getCurrentActivePlanId() {
  const activePlan = findOne('plans', { status: 'active' });
  return activePlan ? activePlan.id : null;
}

/**
 * 获取下一次训练的重量建议
 */
function getNextWeightSuggestion(exerciseId) {
  const planExercise = findOne('plan_exercises', {
    exercise_id: exerciseId,
    plan_id: getCurrentActivePlanId()
  });

  if (!planExercise) {
    return null;
  }

  // 获取最新的演进记录
  const progressions = getCollection('progressions')
    .filter(p => p.exercise_id === exerciseId)
    .sort((a, b) => b.created_at - a.created_at);

  if (progressions.length > 0) {
    const latestProgression = progressions[0];
    return {
      exercise_id: exerciseId,
      suggested_weight: latestProgression.new_weight,
      progression_type: latestProgression.progression_type,
      reason: latestProgression.reason
    };
  }

  // 没有演进记录，返回初始配置
  return {
    exercise_id: exerciseId,
    suggested_weight: planExercise.initial_weight,
    progression_type: 'initial',
    reason: '初始重量配置'
  };
}

module.exports = {
  calculateProgression,
  calculateExerciseProgression,
  getExerciseHistory,
  getNextWeightSuggestion
};
