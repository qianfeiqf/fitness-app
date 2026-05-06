/**
 * 计划服务
 * 通过 storage 策略层统一 MySQL / 内存存储
 */

const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');

const PLANS_STORE = 'plans';
const PLAN_EXERCISES_STORE = 'plan_exercises';

/**
 * 系统模板计划
 */
const TEMPLATES = [
  {
    id: 'tpl_5x5',
    name: '5x5 力量计划',
    description: '经典5x5力量训练计划，每周3次，适合增肌增力',
    difficulty: '入门',
    duration_weeks: 12,
    frequency: '每周3次',
    exercises: [
      { exercise_id: 'ex_020', name: '杠铃深蹲', sets: 5, reps: 5, increment: 2.5, muscle_group: '下肢', day_of_week: 1, cycle_label: 'A', initial_weight: 60, rest_seconds: 180 },
      { exercise_id: 'ex_001', name: '杠铃卧推', sets: 5, reps: 5, increment: 1.25, muscle_group: '胸部', day_of_week: 1, cycle_label: 'A', initial_weight: 50, rest_seconds: 180 },
      { exercise_id: 'ex_010', name: '杠铃划船', sets: 5, reps: 5, increment: 2.5, muscle_group: '背部', day_of_week: 1, cycle_label: 'A', initial_weight: 40, rest_seconds: 120 },
      { exercise_id: 'ex_020', name: '杠铃深蹲', sets: 5, reps: 5, increment: 2.5, muscle_group: '下肢', day_of_week: 3, cycle_label: 'B', initial_weight: 65, rest_seconds: 180 },
      { exercise_id: 'ex_030', name: '传统硬拉', sets: 1, reps: 5, increment: 2.5, muscle_group: '硬拉', day_of_week: 3, cycle_label: 'B', initial_weight: 80, rest_seconds: 240 },
      { exercise_id: 'ex_040', name: '杠铃推举', sets: 5, reps: 5, increment: 1.25, muscle_group: '肩部', day_of_week: 3, cycle_label: 'B', initial_weight: 35, rest_seconds: 120 },
      { exercise_id: 'ex_020', name: '杠铃深蹲', sets: 5, reps: 5, increment: 2.5, muscle_group: '下肢', day_of_week: 5, cycle_label: 'A', initial_weight: 70, rest_seconds: 180 },
      { exercise_id: 'ex_001', name: '杠铃卧推', sets: 5, reps: 5, increment: 1.25, muscle_group: '胸部', day_of_week: 5, cycle_label: 'A', initial_weight: 55, rest_seconds: 180 },
      { exercise_id: 'ex_014', name: '高位下拉', sets: 5, reps: 5, increment: 2.5, muscle_group: '背部', day_of_week: 5, cycle_label: 'A', initial_weight: 45, rest_seconds: 120 }
    ]
  },
  {
    id: 'tpl_ppl',
    name: 'PPL 推拉腿',
    description: 'Push Pull Legs 分化训练，每周6次',
    difficulty: '进阶',
    duration_weeks: 8,
    frequency: '每周6次',
    exercises: [
      { exercise_id: 'ex_001', name: '杠铃卧推', sets: 4, reps: 8, increment: 2.5, muscle_group: '胸部', day_of_week: 1, cycle_label: '推', initial_weight: 50, rest_seconds: 120 },
      { exercise_id: 'ex_005', name: '上斜杠铃卧推', sets: 3, reps: 10, increment: 1.25, muscle_group: '胸部', day_of_week: 1, cycle_label: '推', initial_weight: 40, rest_seconds: 90 },
      { exercise_id: 'ex_008', name: '绳索飞鸟', sets: 3, reps: 12, increment: 1.25, muscle_group: '胸部', day_of_week: 1, cycle_label: '推', initial_weight: 15, rest_seconds: 60 },
      { exercise_id: 'ex_040', name: '杠铃推举', sets: 4, reps: 8, increment: 1.25, muscle_group: '肩部', day_of_week: 1, cycle_label: '推', initial_weight: 35, rest_seconds: 120 },
      { exercise_id: 'ex_042', name: '侧平举', sets: 3, reps: 12, increment: 1.25, muscle_group: '肩部', day_of_week: 1, cycle_label: '推', initial_weight: 8, rest_seconds: 60 },
      { exercise_id: 'ex_010', name: '杠铃划船', sets: 4, reps: 6, increment: 2.5, muscle_group: '背部', day_of_week: 2, cycle_label: '拉', initial_weight: 45, rest_seconds: 120 },
      { exercise_id: 'ex_013', name: '引体向上', sets: 4, reps: 8, increment: 0, muscle_group: '背部', day_of_week: 2, cycle_label: '拉', initial_weight: 20, rest_seconds: 90 },
      { exercise_id: 'ex_044', name: '面拉', sets: 3, reps: 15, increment: 1.25, muscle_group: '肩部', day_of_week: 2, cycle_label: '拉', initial_weight: 20, rest_seconds: 60 },
      { exercise_id: 'ex_050', name: '杠铃弯举', sets: 3, reps: 10, increment: 1.25, muscle_group: '手臂', day_of_week: 2, cycle_label: '拉', initial_weight: 20, rest_seconds: 60 },
      { exercise_id: 'ex_054', name: '绳索下压', sets: 3, reps: 12, increment: 1.25, muscle_group: '手臂', day_of_week: 2, cycle_label: '拉', initial_weight: 25, rest_seconds: 60 },
      { exercise_id: 'ex_020', name: '杠铃深蹲', sets: 4, reps: 8, increment: 2.5, muscle_group: '下肢', day_of_week: 3, cycle_label: '腿', initial_weight: 60, rest_seconds: 180 },
      { exercise_id: 'ex_026', name: '罗马尼亚硬拉', sets: 3, reps: 10, increment: 2.5, muscle_group: '下肢', day_of_week: 3, cycle_label: '腿', initial_weight: 50, rest_seconds: 120 },
      { exercise_id: 'ex_024', name: '腿弯举', sets: 3, reps: 12, increment: 2.5, muscle_group: '下肢', day_of_week: 3, cycle_label: '腿', initial_weight: 30, rest_seconds: 60 },
      { exercise_id: 'ex_025', name: '腿伸展', sets: 3, reps: 12, increment: 2.5, muscle_group: '下肢', day_of_week: 3, cycle_label: '腿', initial_weight: 30, rest_seconds: 60 },
      { exercise_id: 'ex_002', name: '哑铃卧推', sets: 4, reps: 8, increment: 2.5, muscle_group: '胸部', day_of_week: 4, cycle_label: '推', initial_weight: 30, rest_seconds: 120 },
      { exercise_id: 'ex_006', name: '上斜哑铃卧推', sets: 3, reps: 10, increment: 1.25, muscle_group: '胸部', day_of_week: 4, cycle_label: '推', initial_weight: 25, rest_seconds: 90 },
      { exercise_id: 'ex_009', name: '哑铃飞鸟', sets: 3, reps: 12, increment: 1.25, muscle_group: '胸部', day_of_week: 4, cycle_label: '推', initial_weight: 12, rest_seconds: 60 },
      { exercise_id: 'ex_041', name: '哑铃推举', sets: 4, reps: 8, increment: 1.25, muscle_group: '肩部', day_of_week: 4, cycle_label: '推', initial_weight: 20, rest_seconds: 120 },
      { exercise_id: 'ex_045', name: '阿诺德推举', sets: 3, reps: 10, increment: 1.25, muscle_group: '肩部', day_of_week: 4, cycle_label: '推', initial_weight: 15, rest_seconds: 90 },
      { exercise_id: 'ex_011', name: '哑铃划船', sets: 4, reps: 8, increment: 1.25, muscle_group: '背部', day_of_week: 5, cycle_label: '拉', initial_weight: 25, rest_seconds: 120 },
      { exercise_id: 'ex_012', name: '坐姿划船', sets: 4, reps: 10, increment: 2.5, muscle_group: '背部', day_of_week: 5, cycle_label: '拉', initial_weight: 45, rest_seconds: 90 },
      { exercise_id: 'ex_015', name: 'T杆划船', sets: 3, reps: 10, increment: 2.5, muscle_group: '背部', day_of_week: 5, cycle_label: '拉', initial_weight: 30, rest_seconds: 90 },
      { exercise_id: 'ex_051', name: '哑铃弯举', sets: 3, reps: 10, increment: 1.25, muscle_group: '手臂', day_of_week: 5, cycle_label: '拉', initial_weight: 15, rest_seconds: 60 },
      { exercise_id: 'ex_055', name: '过头臂屈伸', sets: 3, reps: 12, increment: 1.25, muscle_group: '手臂', day_of_week: 5, cycle_label: '拉', initial_weight: 20, rest_seconds: 60 },
      { exercise_id: 'ex_021', name: '腿举', sets: 4, reps: 10, increment: 5, muscle_group: '下肢', day_of_week: 6, cycle_label: '腿', initial_weight: 100, rest_seconds: 120 },
      { exercise_id: 'ex_023', name: '保加利亚分腿蹲', sets: 3, reps: 10, increment: 2.5, muscle_group: '下肢', day_of_week: 6, cycle_label: '腿', initial_weight: 20, rest_seconds: 90 },
      { exercise_id: 'ex_027', name: '臀推', sets: 3, reps: 12, increment: 2.5, muscle_group: '下肢', day_of_week: 6, cycle_label: '腿', initial_weight: 60, rest_seconds: 90 },
      { exercise_id: 'ex_029', name: '行走箭步蹲', sets: 3, reps: 10, increment: 2.5, muscle_group: '下肢', day_of_week: 6, cycle_label: '腿', initial_weight: 15, rest_seconds: 60 }
    ]
  },
  {
    id: 'tpl_aba',
    name: 'ABA BAB 上下肢',
    description: '上下肢交替分化，每周4次',
    difficulty: '中级',
    duration_weeks: 8,
    frequency: '每周4次',
    exercises: [
      { exercise_id: 'ex_020', name: '杠铃深蹲', sets: 4, reps: 6, increment: 2.5, muscle_group: '下肢', day_of_week: 1, cycle_label: 'A', initial_weight: 70, rest_seconds: 180 },
      { exercise_id: 'ex_030', name: '传统硬拉', sets: 3, reps: 5, increment: 2.5, muscle_group: '硬拉', day_of_week: 1, cycle_label: 'A', initial_weight: 80, rest_seconds: 180 },
      { exercise_id: 'ex_024', name: '腿弯举', sets: 3, reps: 12, increment: 2.5, muscle_group: '下肢', day_of_week: 1, cycle_label: 'A', initial_weight: 30, rest_seconds: 60 },
      { exercise_id: 'ex_025', name: '腿伸展', sets: 3, reps: 12, increment: 2.5, muscle_group: '下肢', day_of_week: 1, cycle_label: 'A', initial_weight: 30, rest_seconds: 60 },
      { exercise_id: 'ex_010', name: '杠铃划船', sets: 4, reps: 8, increment: 2.5, muscle_group: '背部', day_of_week: 1, cycle_label: 'A', initial_weight: 45, rest_seconds: 120 },
      { exercise_id: 'ex_001', name: '杠铃卧推', sets: 4, reps: 6, increment: 2.5, muscle_group: '胸部', day_of_week: 2, cycle_label: 'B', initial_weight: 55, rest_seconds: 150 },
      { exercise_id: 'ex_005', name: '上斜杠铃卧推', sets: 3, reps: 8, increment: 1.25, muscle_group: '胸部', day_of_week: 2, cycle_label: 'B', initial_weight: 45, rest_seconds: 120 },
      { exercise_id: 'ex_008', name: '绳索飞鸟', sets: 3, reps: 12, increment: 1.25, muscle_group: '胸部', day_of_week: 2, cycle_label: 'B', initial_weight: 15, rest_seconds: 60 },
      { exercise_id: 'ex_040', name: '杠铃推举', sets: 3, reps: 8, increment: 1.25, muscle_group: '肩部', day_of_week: 2, cycle_label: 'B', initial_weight: 40, rest_seconds: 120 },
      { exercise_id: 'ex_042', name: '侧平举', sets: 3, reps: 12, increment: 1.25, muscle_group: '肩部', day_of_week: 2, cycle_label: 'B', initial_weight: 8, rest_seconds: 60 },
      { exercise_id: 'ex_054', name: '绳索下压', sets: 3, reps: 12, increment: 1.25, muscle_group: '手臂', day_of_week: 2, cycle_label: 'B', initial_weight: 25, rest_seconds: 60 },
      { exercise_id: 'ex_021', name: '腿举', sets: 4, reps: 10, increment: 5, muscle_group: '下肢', day_of_week: 4, cycle_label: 'A', initial_weight: 100, rest_seconds: 120 },
      { exercise_id: 'ex_026', name: '罗马尼亚硬拉', sets: 3, reps: 10, increment: 2.5, muscle_group: '下肢', day_of_week: 4, cycle_label: 'A', initial_weight: 55, rest_seconds: 120 },
      { exercise_id: 'ex_027', name: '臀推', sets: 3, reps: 12, increment: 2.5, muscle_group: '下肢', day_of_week: 4, cycle_label: 'A', initial_weight: 60, rest_seconds: 90 },
      { exercise_id: 'ex_013', name: '引体向上', sets: 4, reps: 8, increment: 0, muscle_group: '背部', day_of_week: 4, cycle_label: 'A', initial_weight: 20, rest_seconds: 90 },
      { exercise_id: 'ex_012', name: '坐姿划船', sets: 4, reps: 10, increment: 2.5, muscle_group: '背部', day_of_week: 4, cycle_label: 'A', initial_weight: 50, rest_seconds: 90 },
      { exercise_id: 'ex_002', name: '哑铃卧推', sets: 4, reps: 8, increment: 2.5, muscle_group: '胸部', day_of_week: 5, cycle_label: 'B', initial_weight: 30, rest_seconds: 120 },
      { exercise_id: 'ex_006', name: '上斜哑铃卧推', sets: 3, reps: 10, increment: 1.25, muscle_group: '胸部', day_of_week: 5, cycle_label: 'B', initial_weight: 25, rest_seconds: 90 },
      { exercise_id: 'ex_009', name: '哑铃飞鸟', sets: 3, reps: 12, increment: 1.25, muscle_group: '胸部', day_of_week: 5, cycle_label: 'B', initial_weight: 12, rest_seconds: 60 },
      { exercise_id: 'ex_041', name: '哑铃推举', sets: 3, reps: 8, increment: 1.25, muscle_group: '肩部', day_of_week: 5, cycle_label: 'B', initial_weight: 20, rest_seconds: 120 },
      { exercise_id: 'ex_044', name: '面拉', sets: 3, reps: 15, increment: 1.25, muscle_group: '肩部', day_of_week: 5, cycle_label: 'B', initial_weight: 20, rest_seconds: 60 },
      { exercise_id: 'ex_050', name: '杠铃弯举', sets: 3, reps: 10, increment: 1.25, muscle_group: '手臂', day_of_week: 5, cycle_label: 'B', initial_weight: 20, rest_seconds: 60 }
    ]
  }
];

/**
 * 获取计划列表
 */
async function getPlans(userId) {
  if (storage.isMySQL()) {
    const rows = await storage.query(
      `SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      cycle_type: row.cycle_type,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }
  return storage.findInStore(PLANS_STORE,
    p => p.user_id === userId,
    { sortBy: 'created_at', order: 'desc' }
  );
}

/**
 * 获取系统模板
 */
async function getTemplates() {
  return TEMPLATES;
}

/**
 * 创建计划
 */
async function createPlan(userId, { name, cycle_type = 'natural_week', description = null }) {
  const plan = {
    id: 'plan_' + uuidv4(),
    user_id: userId,
    name,
    description,
    cycle_type,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (storage.isMySQL()) {
    await storage.query(
      `INSERT INTO plans (id, user_id, name, description, cycle_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan.id, plan.user_id, plan.name, plan.description, plan.cycle_type, plan.status, plan.created_at, plan.updated_at]
    );
  } else {
    storage.saveToStore(PLANS_STORE, plan);
  }
  return plan;
}

/**
 * 获取计划详情
 */
async function getPlan(userId, planId) {
  let plan;
  let exercises = [];

  if (storage.isMySQL()) {
    const rows = await storage.query(`SELECT * FROM plans WHERE id = ? AND user_id = ?`, [planId, userId]);
    if (rows.length === 0) return null;
    plan = rows[0];
    const exRows = await storage.query(`SELECT * FROM plan_exercises WHERE plan_id = ? ORDER BY order_index`, [planId]);
    exercises = exRows.map(row => ({
      id: row.id,
      plan_id: row.plan_id,
      exercise_id: row.exercise_id,
      exercise_name: row.exercise_name,
      day_of_week: row.day_of_week,
      cycle_label: row.cycle_label,
      order_index: row.order_index,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      initial_weight: parseFloat(row.initial_weight),
      increment_step: parseFloat(row.increment_step),
      decrement_rate: parseFloat(row.decrement_rate),
      rest_seconds: row.rest_seconds
    }));
  } else {
    plan = storage.findById(PLANS_STORE, planId);
    if (!plan || plan.user_id !== userId) return null;
    exercises = storage.findInStore(PLAN_EXERCISES_STORE,
      pe => pe.plan_id === planId,
      { sortBy: 'order_index', order: 'asc' }
    );
  }

  return { ...plan, exercises };
}

/**
 * 更新计划
 */
async function updatePlan(userId, planId, updates) {
  const existing = await getPlan(userId, planId);
  if (!existing) throw new Error('计划不存在');

  const updatedAt = new Date().toISOString();

  if (storage.isMySQL()) {
    await storage.query(
      `UPDATE plans SET name = ?, description = ?, cycle_type = ?, status = ?, updated_at = ? WHERE id = ?`,
      [updates.name ?? existing.name, updates.description ?? existing.description, updates.cycle_type ?? existing.cycle_type, updates.status ?? existing.status, updatedAt, planId]
    );
  } else {
    storage.updateInStore(PLANS_STORE, planId, { ...updates, updated_at: updatedAt });
  }

  return getPlan(userId, planId);
}

/**
 * 激活计划
 */
async function activatePlan(userId, planId) {
  const existing = await getPlan(userId, planId);
  if (!existing) throw new Error('计划不存在');

  const updatedAt = new Date().toISOString();

  if (storage.isMySQL()) {
    // 停用其他计划
    await storage.query(`UPDATE plans SET status = 'archived', updated_at = ? WHERE user_id = ? AND status = 'active'`, [updatedAt, userId]);
    await storage.query(`UPDATE plans SET status = 'active', updated_at = ? WHERE id = ?`, [updatedAt, planId]);
  } else {
    const activePlans = storage.findInStore(PLANS_STORE,
      p => p.user_id === userId && p.status === 'active'
    );
    for (const p of activePlans) {
      storage.updateInStore(PLANS_STORE, p.id, { status: 'archived', updated_at: updatedAt });
    }
    storage.updateInStore(PLANS_STORE, planId, { status: 'active', updated_at: updatedAt });
  }

  return getPlan(userId, planId);
}

/**
 * 从模板克隆
 */
async function cloneFromTemplate(userId, templateId) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) throw new Error('模板不存在');

  const plan = {
    id: 'plan_' + uuidv4(),
    user_id: userId,
    name: template.name,
    description: template.description || null,
    cycle_type: 'natural_week',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (storage.isMySQL()) {
    await storage.query(
      `INSERT INTO plans (id, user_id, name, description, cycle_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan.id, plan.user_id, plan.name, plan.description, plan.cycle_type, plan.status, plan.created_at, plan.updated_at]
    );
  } else {
    storage.saveToStore(PLANS_STORE, plan);
  }

  for (let i = 0; i < template.exercises.length; i++) {
    const ex = template.exercises[i];
    const pe = {
      id: 'pe_' + uuidv4(),
      plan_id: plan.id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.name,
      day_of_week: ex.day_of_week || Math.floor(i / 3) + 1,
      cycle_label: ex.cycle_label || null,
      order_index: i,
      target_sets: ex.sets,
      target_reps: ex.reps,
      initial_weight: ex.initial_weight || 0,
      increment_step: ex.increment,
      decrement_rate: 0.1,
      rest_seconds: ex.rest_seconds || 120,
      created_at: plan.created_at
    };

    if (storage.isMySQL()) {
      await storage.query(
        `INSERT INTO plan_exercises (id, plan_id, exercise_id, exercise_name, day_of_week, order_index, target_sets, target_reps, initial_weight, increment_step, decrement_rate, rest_seconds, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pe.id, pe.plan_id, pe.exercise_id, pe.exercise_name, pe.day_of_week, pe.order_index, pe.target_sets, pe.target_reps, pe.initial_weight, pe.increment_step, pe.decrement_rate, pe.rest_seconds, pe.created_at]
      );
    } else {
      storage.saveToStore(PLAN_EXERCISES_STORE, pe);
    }
  }

  return plan;
}

module.exports = {
  getPlans,
  getTemplates,
  createPlan,
  getPlan,
  updatePlan,
  activatePlan,
  cloneFromTemplate
};
