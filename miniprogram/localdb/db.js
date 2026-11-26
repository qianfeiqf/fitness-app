/**
 * LokiJS 本地数据库模块
 * 实现离线优先的数据存储
 */

const { getExercisesSeedData, MUSCLE_SUB_GROUPS } = require('./seed-exercises.js');
const { getPlanTemplatesSeedData } = require('./seed-templates.js');
const EXERCISE_GIFS = require('./exercise-gifs.js');

let db = null;
const DB_NAME = 'fitness_app_db';
const DB_VERSION = 2;

/**
 * 初始化本地数据库
 */
async function initDatabase() {
  return new Promise((resolve) => {
    console.log('初始化本地数据库, DB名称:', DB_NAME, '版本:', DB_VERSION);

    db = createSimpleDB(DB_NAME);
    initCollections();
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

  const instance = {
    _storageKey: storageKey,
    _data: data,

    _save() {
      try {
        wx.setStorageSync(this._storageKey, this._data);
      } catch (e) {
        console.error('保存失败，可能存储空间不足:', e);
      }
    },

    getCollection(colName) {
      if (!this._data[colName]) {
        this._data[colName] = [];
      }
      return this._data[colName];
    },

    addCollection(colName) {
      if (!this._data[colName]) {
        this._data[colName] = [];
        this._save();
      }
      return this._data[colName];
    }
  };

  return instance;
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
    'progressions',
    'failure_counts',
    'sync_queue',
    'settings',
    'plan_templates',
    'goals'
  ];

  collections.forEach(name => {
    db.addCollection(name);
  });
}

/**
 * 增量合并种子数据：
 * - 新用户：写入全部系统动作与经典计划模板
 * - 老用户：按 id 补充新增的系统动作/模板，并回填缺失的动作要领与计划介绍，不覆盖用户自定义数据
 */
function initSeedData() {
  let changed = false;

  // 1. 增量同步系统动作库
  const exercises = db.getCollection('exercises');
  const seedExercises = getExercisesSeedData();
  const exerciseMap = {};
  exercises.forEach(ex => {
    if (ex && ex.id) exerciseMap[ex.id] = ex;
  });

  seedExercises.forEach(seed => {
    const resolvedGifUrl = EXERCISE_GIFS[seed.id] || seed.gif_url || '';
    const resolvedThumbUrl = seed.thumb_url || (resolvedGifUrl && resolvedGifUrl.includes('/exercise-gifs/')
      ? resolvedGifUrl.replace('/exercise-gifs/', '/exercise-thumbs/').replace(/\.gif$/i, '.jpg')
      : '');
    const existing = exerciseMap[seed.id];
    if (!existing) {
      exercises.push({ ...seed, gif_url: resolvedGifUrl, thumb_url: resolvedThumbUrl });
      changed = true;
    } else if (existing.is_system !== false) {
      const fieldsToBackfill = ['sub_muscle', 'equipment', 'target_muscles', 'description', 'tips', 'name_en', 'aliases'];
      fieldsToBackfill.forEach(field => {
        if (!existing[field] && seed[field]) {
          existing[field] = seed[field];
          changed = true;
        }
      });
      if (resolvedGifUrl && existing.gif_url !== resolvedGifUrl) {
        existing.gif_url = resolvedGifUrl;
        changed = true;
      }
      if (resolvedThumbUrl && existing.thumb_url !== resolvedThumbUrl) {
        existing.thumb_url = resolvedThumbUrl;
        changed = true;
      }
      if ((!Array.isArray(existing.alternatives) || existing.alternatives.length === 0) && Array.isArray(seed.alternatives) && seed.alternatives.length > 0) {
        existing.alternatives = [...seed.alternatives];
        changed = true;
      }
    }
  });

  // 2. 增量同步经典计划模板
  const templates = db.getCollection('plan_templates');
  const seedTemplates = getPlanTemplatesSeedData();
  const templateMap = {};
  templates.forEach(tpl => {
    if (tpl && tpl.id) templateMap[tpl.id] = tpl;
  });

  seedTemplates.forEach(seed => {
    const existing = templateMap[seed.id];
    if (!existing) {
      templates.push({ ...seed });
      changed = true;
    } else {
      const metaFields = ['description', 'background', 'suitable_for', 'notes', 'difficulty', 'training_days'];
      metaFields.forEach(field => {
        if ((!existing[field] || existing[field] !== seed[field]) && seed[field]) {
          existing[field] = seed[field];
          changed = true;
        }
      });
    }
  });

  if (changed) {
    // 保持模板按训练天数升序排列（2天 → 3天 → 4天 → 5天 → 6天）
    const orderMap = {};
    seedTemplates.forEach((tpl, idx) => { orderMap[tpl.id] = idx; });
    templates.sort((a, b) => {
      const ia = orderMap[a.id] !== undefined ? orderMap[a.id] : 999;
      const ib = orderMap[b.id] !== undefined ? orderMap[b.id] : 999;
      return ia - ib;
    });
    db._save();
    console.log('种子数据增量同步完成：动作', exercises.length, '个，计划模板', templates.length, '套');
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
 * 持久化当前内存数据库到本地存储
 */
function saveDatabase() {
  if (db) {
    db._save();
  }
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
    updated_at: data.updated_at || Date.now(),
    sync_status: data.sync_status || 'pending'
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
      updated_at: data.updated_at || Date.now(),
      sync_status: data.sync_status || 'pending'
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
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        if ('$in' in value) {
          const docValue = doc[key];
          if (!value.$in.includes(docValue)) {
            return false;
          }
        } else if ('$like' in value) {
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

module.exports = {
  initDatabase,
  getDatabase,
  getCollection,
  saveDatabase,
  insert,
  update,
  findOne,
  find,
  remove,
  generateId,
  MUSCLE_SUB_GROUPS,
  getExercisesSeedData,
  getPlanTemplatesSeedData
};
