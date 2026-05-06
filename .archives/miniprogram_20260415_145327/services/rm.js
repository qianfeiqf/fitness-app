/**
 * 1RM 计算服务
 * 实现 Epley 公式及边界条件处理
 */

const { getCollection, findOne, insert, find } = require('../localdb/db.js');

/**
 * 计算 1RM
 * @param {number} weight - 重量(kg)
 * @param {number} reps - 次数
 * @returns {object} - { estimated1RM, isQualified, formula }
 */
function calculate1RM(weight, reps) {
  // 边界条件处理
  if (weight <= 0 || reps <= 0) {
    return {
      estimated1RM: 0,
      isQualified: false,
      formula: null,
      reason: '无效的重量或次数'
    };
  }

  if (reps === 1) {
    // 次数为1，直接将重量视为1RM
    return {
      estimated1RM: weight,
      isQualified: true,
      formula: 'direct',
      reason: '单次直接作为1RM'
    };
  }

  if (reps > 10) {
    // 次数 > 10，标记为非极限组
    return {
      estimated1RM: null,
      isQualified: false,
      formula: null,
      reason: '次数超过10次，不计入1RM统计'
    };
  }

  // Epley 公式: 1RM = weight × (1 + reps/30)
  const estimated1RM = weight * (1 + reps / 30);

  return {
    estimated1RM: Math.round(estimated1RM * 10) / 10, // 保留一位小数
    isQualified: true,
    formula: 'epley',
    reps: reps,
    weight: weight
  };
}

/**
 * 计算并保存 1RM 历史记录
 */
async function calculateAndSave1RM(exerciseId, weight, reps, rpe = null, sessionId = null) {
  const result = calculate1RM(weight, reps);

  if (!result.isQualified) {
    console.log('该组不计入1RM统计:', result.reason);
    return {
      ...result,
      saved: false
    };
  }

  // 检查是否比历史最高更高
  const history = await get1RMHistory(exerciseId, limit = 1);
  const currentBest = history.length > 0 ? history[0].estimated_1rm : 0;

  const isNewPR = result.estimated1RM > currentBest;

  // 保存历史记录
  const record = {
    id: 'rm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    exercise_id: exerciseId,
    estimated_1rm: result.estimated1RM,
    based_weight: weight,
    based_reps: reps,
    rpe: rpe,
    session_id: sessionId,
    is_new_pr: isNewPR,
    recorded_at: Date.now(),
    created_at: Date.now()
  };

  insert('rm_history', record);

  return {
    ...result,
    saved: true,
    isNewPR,
    previousBest: currentBest
  };
}

/**
 * 获取动作的1RM历史
 */
function get1RMHistory(exerciseId, limit = 30) {
  const records = find('rm_history', { exercise_id: exerciseId });

  return records
    .sort((a, b) => b.recorded_at - a.recorded_at)
    .slice(0, limit)
    .map(r => ({
      id: r.id,
      exercise_id: r.exercise_id,
      estimated_1rm: r.estimated_1rm,
      based_weight: r.based_weight,
      based_reps: r.based_reps,
      rpe: r.rpe,
      is_new_pr: r.is_new_pr,
      recorded_at: r.recorded_at
    }));
}

/**
 * 获取动作的最新1RM预估值
 */
function getLatest1RM(exerciseId) {
  const history = get1RMHistory(exerciseId, limit = 1);
  return history.length > 0 ? history[0] : null;
}

/**
 * 获取动作的历史最佳1RM
 */
function getBest1RM(exerciseId) {
  const records = find('rm_history', { exercise_id: exerciseId });

  if (records.length === 0) {
    return null;
  }

  const best = records.reduce((max, r) =>
    r.estimated_1rm > max.estimated_1rm ? r : max
  );

  return {
    id: best.id,
    exercise_id: best.exercise_id,
    estimated_1rm: best.estimated_1rm,
    based_weight: best.based_weight,
    based_reps: best.based_reps,
    recorded_at: best.recorded_at
  };
}

/**
 * 计算相对力量系数（相对于体重）
 */
function calculateRelativeStrength(weight, bodyWeight) {
  if (bodyWeight <= 0) {
    return null;
  }

  return Math.round((weight / bodyWeight) * 100) / 100;
}

/**
 * 检查是否达到里程碑
 */
function checkMilestone(exerciseId, estimated1RM, exerciseName) {
  // 定义里程碑阈值
  const milestones = {
    '胸部': {
      name: '卧推',
      levels: [
        { threshold: 60, label: '60kg', desc: '初学者' },
        { threshold: 80, label: '80kg', desc: '入门' },
        { threshold: 100, label: '100kg', desc: '中级' },
        { threshold: 120, label: '120kg', desc: '高级' },
        { threshold: 140, label: '140kg', desc: '精英' }
      ]
    },
    '下肢': {
      name: '深蹲',
      levels: [
        { threshold: 80, label: '80kg', desc: '初学者' },
        { threshold: 100, label: '100kg', desc: '入门' },
        { threshold: 120, label: '120kg', desc: '中级' },
        { threshold: 150, label: '150kg', desc: '高级' },
        { threshold: 180, label: '180kg', desc: '精英' }
      ]
    },
    '硬拉': {
      name: '硬拉',
      levels: [
        { threshold: 100, label: '100kg', desc: '初学者' },
        { threshold: 140, label: '140kg', desc: '入门' },
        { threshold: 180, label: '180kg', desc: '中级' },
        { threshold: 220, label: '220kg', desc: '高级' },
        { threshold: 260, label: '260kg', desc: '精英' }
      ]
    }
  };

  // 查找动作对应的里程碑配置
  let milestoneConfig = null;
  for (const [group, config] of Object.entries(milestones)) {
    if (exerciseName.includes(config.name)) {
      milestoneConfig = config;
      break;
    }
  }

  if (!milestoneConfig) {
    return null;
  }

  // 检查达到的里程碑
  const achievedLevels = milestoneConfig.levels.filter(
    level => estimated1RM >= level.threshold
  );

  if (achievedLevels.length === 0) {
    return null;
  }

  const latestLevel = achievedLevels[achievedLevels.length - 1];
  const nextLevel = milestoneConfig.levels.find(
    level => level.threshold > estimated1RM
  );

  return {
    exerciseName: milestoneConfig.name,
    currentLevel: latestLevel,
    nextLevel: nextLevel || null,
    isHighestLevel: latestLevel === milestoneConfig.levels[milestoneConfig.levels.length - 1],
    distanceToNext: nextLevel ? nextLevel.threshold - estimated1RM : null
  };
}

/**
 * 格式化1RM展示
 */
function format1RMDisplay(estimated1RM) {
  if (!estimated1RM) {
    return '-';
  }
  return estimated1RM.toFixed(1) + 'kg';
}

/**
 * 获取三大项1RM概览
 */
function getBigThreeOverview() {
  const bigThree = [
    { exerciseName: '卧推', muscleGroup: '胸部' },
    { exerciseName: '深蹲', muscleGroup: '下肢' },
    { exerciseName: '硬拉', muscleGroup: '硬拉' }
  ];

  return bigThree.map(item => {
    // 查找对应的动作ID
    const exercise = find('exercises', {
      name: { $like: item.exerciseName }
    })[0];

    if (!exercise) {
      return {
        exerciseName: item.exerciseName,
        muscleGroup: item.muscleGroup,
        latest1RM: null,
        best1RM: null,
        trend: null
      };
    }

    const latest1RM = getLatest1RM(exercise.id);
    const best1RM = getBest1RM(exercise.id);
    const history = get1RMHistory(exercise.id, limit = 10);

    // 计算趋势
    let trend = null;
    if (history.length >= 2) {
      const recentAvg = history.slice(0, 3).reduce((sum, r) => sum + r.estimated_1rm, 0) / Math.min(3, history.length);
      const olderAvg = history.slice(3, 6).reduce((sum, r) => sum + r.estimated_1rm, 0) / Math.min(3, history.length - 3);

      if (olderAvg > 0) {
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        trend = Math.round(change * 10) / 10;
      }
    }

    return {
      exerciseId: exercise.id,
      exerciseName: item.exerciseName,
      muscleGroup: item.muscleGroup,
      latest1RM: latest1RM ? latest1RM.estimated_1rm : null,
      best1RM: best1RM ? best1RM.estimated_1rm : null,
      trend
    };
  });
}

module.exports = {
  calculate1RM,
  calculateAndSave1RM,
  get1RMHistory,
  getLatest1RM,
  getBest1RM,
  calculateRelativeStrength,
  checkMilestone,
  format1RMDisplay,
  getBigThreeOverview
};
