/**
 * 存储策略抽象层
 * 自动选择 MySQL 或内存存储，消除各服务中重复的 if (db && db.getPool) 分支
 */

let db = null;
try { db = require('../db/mysql'); } catch (e) {}

function isMySQL() {
  return !!(db && db.getPool);
}

/**
 * 执行 SQL 查询（MySQL 模式）
 * 内存模式下在 store 中查找
 */
async function query(sql, params = []) {
  if (isMySQL()) {
    return db.query(sql, params);
  }
  throw new Error('内存模式下请使用 store 方法');
}

/**
 * 内存存储容器
 */
const stores = {};

function getStore(name) {
  if (!stores[name]) {
    stores[name] = new Map();
  }
  return stores[name];
}

/**
 * 通用查询：根据条件从 Map 中筛选记录
 * @param {string} storeName - 存储名称
 * @param {Function} filterFn - 过滤函数
 * @param {Object} options - { sortBy, order, limit, offset }
 */
function findInStore(storeName, filterFn, options = {}) {
  const store = getStore(storeName);
  let results = [];
  for (const item of store.values()) {
    if (!filterFn || filterFn(item)) {
      results.push(item);
    }
  }
  if (options.sortBy) {
    const order = options.order === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      const va = a[options.sortBy];
      const vb = b[options.sortBy];
      if (va instanceof Date || (typeof va === 'string' && va.includes('T'))) {
        return order * (new Date(va) - new Date(vb));
      }
      return order * (va - vb);
    });
  }
  const offset = options.offset || 0;
  const limit = options.limit || results.length;
  return results.slice(offset, offset + limit);
}

/**
 * 根据 ID 查找
 */
function findById(storeName, id) {
  return getStore(storeName).get(id) || null;
}

/**
 * 保存记录到 Map
 */
function saveToStore(storeName, item) {
  getStore(storeName).set(item.id, item);
  return item;
}

/**
 * 更新 Map 中的记录
 */
function updateInStore(storeName, id, updates) {
  const store = getStore(storeName);
  const item = store.get(id);
  if (!item) return null;
  Object.assign(item, updates);
  store.set(id, item);
  return item;
}

/**
 * 从 Map 中删除记录
 */
function deleteFromStore(storeName, id) {
  return getStore(storeName).delete(id);
}

module.exports = {
  isMySQL,
  query,
  getStore,
  findInStore,
  findById,
  saveToStore,
  updateInStore,
  deleteFromStore
};
