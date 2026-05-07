/**
 * LokiJS 本地数据库模块
 * 实现离线优先的数据存储
 */

let db = null;
const DB_NAME = 'fitness_app_db';
const DB_VERSION = 1;

/**
 * 初始化本地数据库
 */
async function initDatabase() {
  return new Promise((resolve, reject) => {
    // 动态导入 lokijs（小程序需要从本地或CDN加载）
    // 微信小程序环境下使用 localStorage 模拟
    console.log('初始化本地数据库, DB名称:', DB_NAME);

    // 使用微信小程序的本地存储模拟LokiJS
    db = createSimpleDB(DB_NAME);

    // 初始化集合
    initCollections();

    // 初始化种子数据（如果集合为空）
    initSeedData();

    resolve(db);
  });
}

/**
 * 创建简单的本地数据库（模拟LokiJS）
 * 微信小程序没有IndexedDB，使用wx.getStorageSync模拟
 */
function createSimpleDB(name) {
  const storageKey = `lokijs_${name}`;
  let data;
  try {
    data = wx.getStorageSync(storageKey) || {};
  } catch (e) {
    console.warn('读取存储失败，使用空数据:', e);
    data = {};
  }

  const db = {
    _storageKey: storageKey,
    _data: data,

    _save() {
      try {
        wx.setStorageSync(this._storageKey, this._data);
      } catch (e) {
        console.error('保存失败，可能存储空间不足:', e);
      }
    },

    // 集合操作
    getCollection(name) {
      if (!this._data[name]) {
        this._data[name] = [];
      }
      return this._data[name];
    },

    // 添加集合
    addCollection(name) {
      if (!this._data[name]) {
        this._data[name] = [];
        this._save();
      }
      return this._data[name];
    }
  };

  return db;
}

/**
 * 初始化集合
 */
function initCollections() {
  const collections = [
    'users',
    'profiles',
    'plans',
    'plan_exercises',
    'sessions',
    'session_sets',
    'exercises',
    'exercise_alternatives',
    'rm_history',
    'sync_queue',
    'settings',
    'plan_templates',
    'goals'
  ];

  collections.forEach(name => {
    db.addCollection(name);
  });

  console.log('集合初始化完成:', Object.keys(db._data));
}

/**
 * 初始化种子数据
 */
function initSeedData() {
  const exercises = db.getCollection('exercises');

  // 如果动作库为空，初始化种子数据
  if (exercises.length === 0) {
    console.log('初始化动作库种子数据...');
    const seedExercises = getExercisesSeedData();
    seedExercises.forEach(ex => {
      db.getCollection('exercises').push(ex);
    });
    db._save();
    console.log('动作库种子数据初始化完成，共', seedExercises.length, '个动作');
  }

  // 如果计划模板为空，初始化模板数据
  const templates = db.getCollection('plan_templates');
  if (templates.length === 0) {
    console.log('初始化计划模板种子数据...');
    const seedTemplates = getPlanTemplatesSeedData();
    seedTemplates.forEach(tpl => {
      db.getCollection('plan_templates').push(tpl);
    });
    db._save();
    console.log('计划模板种子数据初始化完成，共', seedTemplates.length, '个模板');
  }
}

/**
 * 获取数据库实例
 */
function getDatabase() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用initDatabase()');
  }
  return db;
}

/**
 * 获取集合
 */
function getCollection(name) {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db.getCollection(name);
}

/**
 * 插入数据
 */
function insert(collectionName, data) {
  const collection = getCollection(collectionName);
  const id = data.id || generateId();
  const doc = {
    ...data,
    id: id,
    _id: id,
    created_at: data.created_at || Date.now(),
    updated_at: Date.now(),
    sync_status: 'pending'
  };
  collection.push(doc);
  db._save();
  return doc;
}

/**
 * 更新数据
 */
function update(collectionName, id, data) {
  const collection = getCollection(collectionName);
  const index = collection.findIndex(doc => doc._id === id || doc.id === id);
  if (index !== -1) {
    collection[index] = {
      ...collection[index],
      ...data,
      updated_at: Date.now(),
      sync_status: 'pending'
    };
    db._save();
    return collection[index];
  }
  return null;
}

/**
 * 查询单条
 */
function findOne(collectionName, query) {
  const collection = getCollection(collectionName);
  return collection.find(doc => matchQuery(doc, query));
}

/**
 * 查询多条
 */
function find(collectionName, query) {
  const collection = getCollection(collectionName);
  if (!query) {
    return collection;
  }
  return collection.filter(doc => matchQuery(doc, query));
}

/**
 * 删除数据
 */
function remove(collectionName, id) {
  const collection = getCollection(collectionName);
  const index = collection.findIndex(doc => doc._id === id || doc.id === id);
  if (index !== -1) {
    collection.splice(index, 1);
    db._save();
    return true;
  }
  return false;
}

/**
 * 简单查询匹配
 * query格式示例：
 * - { status: 'active' } - 精确匹配
 * - { status: { $in: ['a', 'b'] } } - $in查询
 * - { name: { $like: 'keyword' } } - 模糊匹配
 * - function(doc) { return doc.value > 10 } - 函数查询
 */
function matchQuery(doc, query) {
  if (typeof query === 'function') {
    return query(doc);
  }
  if (typeof query === 'object' && query !== null) {
    for (const key in query) {
      if (!query.hasOwnProperty(key)) continue;

      const value = query[key];

      if (key === '$in') {
        // $in 查询不应该直接出现在这里
        // 应该由外层处理 { field: { $in: [...] } } 格式
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        if ('$in' in value) {
          // 处理 { field: { $in: [values] } } 格式
          const docValue = doc[key];
          if (!value.$in.includes(docValue)) {
            return false;
          }
        } else if ('$like' in value) {
          // 处理 { field: { $like: 'keyword' } } 格式
          const docValue = doc[key];
          if (typeof docValue !== 'string' || !docValue.includes(value.$like)) {
            return false;
          }
        } else if (doc[key] !== value) {
          return false;
        }
      } else if (doc[key] !== value) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 生成唯一ID
 */
function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 动作库种子数据
 */
function getExercisesSeedData() {
  return [
    // ===== 胸部 =====
    { id: 'ex_001', name: '杠铃卧推', name_en: 'Barbell Bench Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_002', 'ex_003', 'ex_004'] },
    { id: 'ex_002', name: '哑铃卧推', name_en: 'Dumbbell Bench Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_001', 'ex_003', 'ex_004'] },
    { id: 'ex_003', name: '机械卧推', name_en: 'Machine Chest Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_001', 'ex_002', 'ex_004'] },
    { id: 'ex_004', name: '俯卧撑', name_en: 'Push-ups', muscle_group: '胸部', is_system: true, alternatives: ['ex_001', 'ex_002', 'ex_003'] },
    { id: 'ex_005', name: '上斜杠铃卧推', name_en: 'Incline Barbell Bench Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_006'] },
    { id: 'ex_006', name: '上斜哑铃卧推', name_en: 'Incline Dumbbell Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_005'] },
    { id: 'ex_007', name: '双杠臂屈伸', name_en: 'Dips', muscle_group: '胸部', is_system: true, alternatives: ['ex_004'] },
    { id: 'ex_008', name: '绳索飞鸟', name_en: 'Cable Fly', muscle_group: '胸部', is_system: true, alternatives: ['ex_009'] },
    { id: 'ex_009', name: '哑铃飞鸟', name_en: 'Dumbbell Fly', muscle_group: '胸部', is_system: true, alternatives: ['ex_008'] },

    // ===== 背部 =====
    { id: 'ex_010', name: '杠铃划船', name_en: 'Barbell Row', muscle_group: '背部', is_system: true, alternatives: ['ex_011', 'ex_012'] },
    { id: 'ex_011', name: '哑铃划船', name_en: 'Dumbbell Row', muscle_group: '背部', is_system: true, alternatives: ['ex_010', 'ex_012'] },
    { id: 'ex_012', name: '坐姿划船', name_en: 'Seated Cable Row', muscle_group: '背部', is_system: true, alternatives: ['ex_010', 'ex_011'] },
    { id: 'ex_013', name: '引体向上', name_en: 'Pull-ups', muscle_group: '背部', is_system: true, alternatives: ['ex_014'] },
    { id: 'ex_014', name: '高位下拉', name_en: 'Lat Pulldown', muscle_group: '背部', is_system: true, alternatives: ['ex_013'] },
    { id: 'ex_015', name: 'T杆划船', name_en: 'T-Bar Row', muscle_group: '背部', is_system: true, alternatives: ['ex_010'] },
    { id: 'ex_016', name: '直臂下压', name_en: 'Straight Arm Pulldown', muscle_group: '背部', is_system: true, alternatives: [] },

    // ===== 下肢 =====
    { id: 'ex_020', name: '杠铃深蹲', name_en: 'Barbell Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_021', 'ex_022', 'ex_023'] },
    { id: 'ex_021', name: '腿举', name_en: 'Leg Press', muscle_group: '下肢', is_system: true, alternatives: ['ex_020', 'ex_022'] },
    { id: 'ex_022', name: '前蹲', name_en: 'Front Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_020', 'ex_023'] },
    { id: 'ex_023', name: '保加利亚分腿蹲', name_en: 'Bulgarian Split Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_020'] },
    { id: 'ex_024', name: '腿弯举', name_en: 'Leg Curl', muscle_group: '下肢', is_system: true, alternatives: [] },
    { id: 'ex_025', name: '腿伸展', name_en: 'Leg Extension', muscle_group: '下肢', is_system: true, alternatives: [] },
    { id: 'ex_026', name: '罗马尼亚硬拉', name_en: 'Romanian Deadlift', muscle_group: '下肢', is_system: true, alternatives: ['ex_030'] },
    { id: 'ex_027', name: '臀推', name_en: 'Hip Thrust', muscle_group: '下肢', is_system: true, alternatives: [] },
    { id: 'ex_028', name: '腿举(哈克机)', name_en: 'Hack Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_021'] },
    { id: 'ex_029', name: '行走箭步蹲', name_en: 'Walking Lunge', muscle_group: '下肢', is_system: true, alternatives: ['ex_023'] },

    // ===== 硬拉（单独分类） =====
    { id: 'ex_030', name: '传统硬拉', name_en: 'Conventional Deadlift', muscle_group: '硬拉', is_system: true, alternatives: ['ex_031', 'ex_032'] },
    { id: 'ex_031', name: '相扑硬拉', name_en: 'Sumo Deadlift', muscle_group: '硬拉', is_system: true, alternatives: ['ex_030', 'ex_032'] },
    { id: 'ex_032', name: '直腿硬拉', name_en: 'Stiff Leg Deadlift', muscle_group: '硬拉', is_system: true, alternatives: ['ex_030', 'ex_026'] },

    // ===== 肩部 =====
    { id: 'ex_040', name: '杠铃推举', name_en: 'Barbell Overhead Press', muscle_group: '肩部', is_system: true, alternatives: ['ex_041'] },
    { id: 'ex_041', name: '哑铃推举', name_en: 'Dumbbell Shoulder Press', muscle_group: '肩部', is_system: true, alternatives: ['ex_040'] },
    { id: 'ex_042', name: '侧平举', name_en: 'Lateral Raise', muscle_group: '肩部', is_system: true, alternatives: [] },
    { id: 'ex_043', name: '前平举', name_en: 'Front Raise', muscle_group: '肩部', is_system: true, alternatives: [] },
    { id: 'ex_044', name: '面拉', name_en: 'Face Pull', muscle_group: '肩部', is_system: true, alternatives: [] },
    { id: 'ex_045', name: '阿诺德推举', name_en: 'Arnold Press', muscle_group: '肩部', is_system: true, alternatives: ['ex_041'] },
    { id: 'ex_046', name: '俯身侧平举', name_en: 'Bent Over Lateral Raise', muscle_group: '肩部', is_system: true, alternatives: ['ex_042'] },

    // ===== 手臂 =====
    { id: 'ex_050', name: '杠铃弯举', name_en: 'Barbell Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_051'] },
    { id: 'ex_051', name: '哑铃弯举', name_en: 'Dumbbell Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_050', 'ex_052'] },
    { id: 'ex_052', name: '锤式弯举', name_en: 'Hammer Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_051'] },
    { id: 'ex_053', name: '集中弯举', name_en: 'Concentration Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_051'] },
    { id: 'ex_054', name: '绳索下压', name_en: 'Cable Pushdown', muscle_group: '手臂', is_system: true, alternatives: ['ex_055'] },
    { id: 'ex_055', name: '过头臂屈伸', name_en: 'Overhead Triceps Extension', muscle_group: '手臂', is_system: true, alternatives: ['ex_054'] },
    { id: 'ex_056', name: '窄距卧推', name_en: 'Close Grip Bench Press', muscle_group: '手臂', is_system: true, alternatives: ['ex_054'] },
    { id: 'ex_057', name: '双杠臂屈伸(臂屈伸)', name_en: 'Triceps Dips', muscle_group: '手臂', is_system: true, alternatives: ['ex_055'] },

    // ===== 核心 =====
    { id: 'ex_060', name: '平板支撑', name_en: 'Plank', muscle_group: '核心', is_system: true, alternatives: ['ex_061'] },
    { id: 'ex_061', name: '卷腹', name_en: 'Crunch', muscle_group: '核心', is_system: true, alternatives: ['ex_060'] },
    { id: 'ex_062', name: '悬垂举腿', name_en: 'Hanging Leg Raise', muscle_group: '核心', is_system: true, alternatives: [] },
    { id: 'ex_063', name: '俄罗斯转体', name_en: 'Russian Twist', muscle_group: '核心', is_system: true, alternatives: [] },
    { id: 'ex_064', name: '死虫式', name_en: 'Dead Bug', muscle_group: '核心', is_system: true, alternatives: [] },
    { id: 'ex_065', name: '登山者', name_en: 'Mountain Climber', muscle_group: '核心', is_system: true, alternatives: [] },
    { id: 'ex_066', name: '农夫行走', name_en: 'Farmer Walk', muscle_group: '核心', is_system: true, alternatives: [] }
  ];
}

/**
 * 计划模板种子数据
 * 按一周训练天数排序
 */
function getPlanTemplatesSeedData() {
  return [
    // ========================================
    // 每周3天计划
    // ========================================

    // ===== 5x5 力量计划 =====
    {
      id: 'tpl_5x5',
      name: '5x5 力量计划',
      description: '经典增肌增力计划，每周3次，适合入门',
      difficulty: '入门',
      training_days: 3,
      cycle_type: 'natural_week',
      exercises: [
        // 周一：深蹲卧推
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 40, rest_seconds: 120 },
        // 周三：深蹲硬拉
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: null, target_sets: 1, target_reps: 5, initial_weight: 80, rest_seconds: 240 },
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 35, rest_seconds: 120 },
        // 周五：深蹲卧推
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 180 },
        { exercise_id: 'ex_014', day_of_week: 5, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 45, rest_seconds: 120 }
      ]
    },

    // ===== Starting Strength =====
    {
      id: 'tpl_starting',
      name: 'Starting Strength',
      description: 'Mark Rippetoe经典入门计划，每周3次，以三大项为核心',
      difficulty: '入门',
      training_days: 3,
      cycle_type: 'natural_week',
      exercises: [
        // 周一：A日
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 50, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 40, rest_seconds: 120 },
        // 周三：B日
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: 'B', target_sets: 3, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: 'B', target_sets: 3, target_reps: 5, initial_weight: 35, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: 'B', target_sets: 3, target_reps: 5, initial_weight: 80, rest_seconds: 240 },
        // 周五：A日
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 55, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 5, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 45, rest_seconds: 120 }
      ]
    },

    // ===== Texas Method =====
    {
      id: 'tpl_texas',
      name: 'Texas Method',
      description: '进阶每周3天计划，周一容量/周三强度/周五恢复',
      difficulty: '中级',
      training_days: 3,
      cycle_type: 'natural_week',
      exercises: [
        // 周一：容量日 - 高组数低重量
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: '容量', target_sets: 5, target_reps: 5, initial_weight: 80, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '容量', target_sets: 5, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 1, cycle_label: '容量', target_sets: 3, target_reps: 8, initial_weight: 60, rest_seconds: 120 },
        // 周三：强度日 - 低组数高重量
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '强度', target_sets: 1, target_reps: 5, initial_weight: 90, rest_seconds: 240 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: '强度', target_sets: 1, target_reps: 5, initial_weight: 100, rest_seconds: 240 },
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: '强度', target_sets: 3, target_reps: 5, initial_weight: 45, rest_seconds: 180 },
        // 周五：辅助日 - 全面辅助训练
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_014', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_042', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周4天计划
    // ========================================

    // ===== 上下肢分化（4天）=====
    {
      id: 'tpl_upper_lower',
      name: '上下肢分化（4天）',
      description: '上下肢交替训练，每周4次，平衡发展上肢和下肢',
      difficulty: '中级',
      training_days: 4,
      cycle_type: 'natural_week',
      exercises: [
        // 周一：下肢A
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: '下肢', target_sets: 4, target_reps: 6, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 1, cycle_label: '下肢', target_sets: 3, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 1, cycle_label: '下肢', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 1, cycle_label: '下肢', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 周二：上肢A
        { exercise_id: 'ex_001', day_of_week: 2, cycle_label: '上肢', target_sets: 4, target_reps: 6, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '上肢', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_040', day_of_week: 2, cycle_label: '上肢', target_sets: 3, target_reps: 8, initial_weight: 40, rest_seconds: 120 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '上肢', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        // 周四：下肢B
        { exercise_id: 'ex_021', day_of_week: 4, cycle_label: '下肢', target_sets: 4, target_reps: 8, initial_weight: 80, rest_seconds: 120 },
        { exercise_id: 'ex_030', day_of_week: 4, cycle_label: '下肢', target_sets: 3, target_reps: 5, initial_weight: 85, rest_seconds: 180 },
        { exercise_id: 'ex_027', day_of_week: 4, cycle_label: '下肢', target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_029', day_of_week: 4, cycle_label: '下肢', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        // 周五：上肢B
        { exercise_id: 'ex_002', day_of_week: 5, cycle_label: '上肢', target_sets: 4, target_reps: 8, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_013', day_of_week: 5, cycle_label: '上肢', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_041', day_of_week: 5, cycle_label: '上肢', target_sets: 3, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_054', day_of_week: 5, cycle_label: '上肢', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 }
      ]
    },

    // ===== Push Pull Legs Rest（4天）=====
    {
      id: 'tpl_pplr',
      name: 'PPLR 推拉腿休息',
      description: 'PPL简化版，每周4次，适合时间有限但想全面训练的人群',
      difficulty: '入门',
      training_days: 4,
      cycle_type: 'natural_week',
      exercises: [
        // 周一：推
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推', target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 10, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 8, initial_weight: 35, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周二：拉
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 8, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周四：腿
        { exercise_id: 'ex_020', day_of_week: 4, cycle_label: '腿', target_sets: 4, target_reps: 6, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 4, cycle_label: '腿', target_sets: 3, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 4, cycle_label: '腿', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 4, cycle_label: '腿', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 周五：全身
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_010', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_040', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 30, rest_seconds: 90 }
      ]
    },

    // ===== ABA BAB 上下肢（原有）=====
    {
      id: 'tpl_aba',
      name: 'ABA BAB 上下肢',
      description: '上下肢交替，每周4次，适合中级',
      difficulty: '中级',
      training_days: 4,
      cycle_type: 'natural_week',
      exercises: [
        // A日：下肢 + 背
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: 'A', target_sets: 4, target_reps: 6, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 80, rest_seconds: 180 },
        { exercise_id: 'ex_024', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: 'A', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        // B日：上肢推
        { exercise_id: 'ex_001', day_of_week: 2, cycle_label: 'B', target_sets: 4, target_reps: 6, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_005', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_008', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_040', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 8, initial_weight: 40, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // A日：下肢 + 背
        { exercise_id: 'ex_021', day_of_week: 4, cycle_label: 'A', target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_026', day_of_week: 4, cycle_label: 'A', target_sets: 3, target_reps: 10, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_027', day_of_week: 4, cycle_label: 'A', target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_013', day_of_week: 4, cycle_label: 'A', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_012', day_of_week: 4, cycle_label: 'A', target_sets: 4, target_reps: 10, initial_weight: 50, rest_seconds: 90 },
        // B日：上肢拉
        { exercise_id: 'ex_002', day_of_week: 5, cycle_label: 'B', target_sets: 4, target_reps: 8, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_009', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_044', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周5天计划
    // ========================================

    // ===== nSuns 5/3/1 LP（5天）=====
    {
      id: 'tpl_nsuns',
      name: 'nSuns 5/3/1 LP',
      description: '基于5/3/1原理的线性递增计划，每周5次，强度递增',
      difficulty: '进阶',
      training_days: 5,
      cycle_type: 'natural_week',
      exercises: [
        // 周一：推A（卧推为主）
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推A', target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 180 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推A', target_sets: 5, target_reps: 5, initial_weight: 45, rest_seconds: 150 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推A', target_sets: 5, target_reps: 5, initial_weight: 35, rest_seconds: 150 },
        { exercise_id: 'ex_008', day_of_week: 1, cycle_label: '推A', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推A', target_sets: 3, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        // 周二：拉A（硬拉为主）
        { exercise_id: 'ex_030', day_of_week: 2, cycle_label: '拉A', target_sets: 5, target_reps: 5, initial_weight: 85, rest_seconds: 240 },
        { exercise_id: 'ex_020', day_of_week: 2, cycle_label: '拉A', target_sets: 5, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉A', target_sets: 5, target_reps: 5, initial_weight: 45, rest_seconds: 150 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉A', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_051', day_of_week: 2, cycle_label: '拉A', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        // 周三：腿A（深蹲为主）
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿A', target_sets: 5, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿A', target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_027', day_of_week: 3, cycle_label: '腿A', target_sets: 3, target_reps: 10, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 周四：推B（推举为主）
        { exercise_id: 'ex_040', day_of_week: 4, cycle_label: '推B', target_sets: 5, target_reps: 5, initial_weight: 40, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 4, cycle_label: '推B', target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 150 },
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: '推B', target_sets: 5, target_reps: 5, initial_weight: 30, rest_seconds: 150 },
        { exercise_id: 'ex_006', day_of_week: 4, cycle_label: '推B', target_sets: 3, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_045', day_of_week: 4, cycle_label: '推B', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        // 周五：拉B（划船为主）
        { exercise_id: 'ex_010', day_of_week: 5, cycle_label: '拉B', target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 180 },
        { exercise_id: 'ex_013', day_of_week: 5, cycle_label: '拉B', target_sets: 5, target_reps: 5, initial_weight: 20, rest_seconds: 150 },
        { exercise_id: 'ex_015', day_of_week: 5, cycle_label: '拉B', target_sets: 5, target_reps: 5, initial_weight: 30, rest_seconds: 150 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: '拉B', target_sets: 3, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_050', day_of_week: 5, cycle_label: '拉B', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周6天计划
    // ========================================

    // ===== PPL 推拉腿（完整版）=====
    {
      id: 'tpl_ppl',
      name: 'PPL 推拉腿',
      description: '分化训练，每周6次，适合进阶',
      difficulty: '进阶',
      training_days: 6,
      cycle_type: 'natural_week',
      exercises: [
        // 推日（周一）
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_008', day_of_week: 1, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 35, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 },
        // 拉日（周二）
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: null, target_sets: 4, target_reps: 6, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: null, target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 2, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 腿日（周三）
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 推日（周四）
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 4, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_009', day_of_week: 4, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 4, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_045', day_of_week: 4, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 90 },
        // 拉日（周五）
        { exercise_id: 'ex_011', day_of_week: 5, cycle_label: null, target_sets: 4, target_reps: 8, initial_weight: 25, rest_seconds: 120 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: null, target_sets: 4, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_015', day_of_week: 5, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 90 },
        { exercise_id: 'ex_051', day_of_week: 5, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 5, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        // 腿日（周六）
        { exercise_id: 'ex_021', day_of_week: 6, cycle_label: null, target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_023', day_of_week: 6, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_027', day_of_week: 6, cycle_label: null, target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_029', day_of_week: 6, cycle_label: null, target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 }
      ]
    },

    // ===== PPL 强化版（6天）=====
    {
      id: 'tpl_ppl_intense',
      name: 'PPL 强化版',
      description: 'PPL高容量版本，每周6次，适合有一定基础的训练者',
      difficulty: '进阶',
      training_days: 6,
      cycle_type: 'natural_week',
      exercises: [
        // 推日1（周一）
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推1', target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_008', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 6, initial_weight: 40, rest_seconds: 150 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_045', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        // 拉日1（周二）
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉1', target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 150 },
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_015', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 腿日1（周三）
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿1', target_sets: 5, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 8, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_027', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 10, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 推日2（周四）
        { exercise_id: 'ex_001', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 10, initial_weight: 30, rest_seconds: 90 },
        { exercise_id: 'ex_006', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        { exercise_id: 'ex_009', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 15, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        // 拉日2（周五）
        { exercise_id: 'ex_011', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 8, initial_weight: 28, rest_seconds: 120 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_016', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_051', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        // 腿日2（周六）
        { exercise_id: 'ex_021', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_030', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 5, initial_weight: 85, rest_seconds: 180 },
        { exercise_id: 'ex_023', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_027', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_029', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 }
      ]
    }
  ];
}

module.exports = {
  initDatabase,
  getDatabase,
  getCollection,
  insert,
  update,
  findOne,
  find,
  remove,
  generateId,
  getPlanTemplatesSeedData
};
