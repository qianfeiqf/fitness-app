/**
 * CloudBase 数据库服务
 *
 * 这是未来迁移到 CloudBase 数据库的占位模块。
 * 当前项目使用微信云托管 REST API，本模块提供 CloudBase API 的统一接口。
 *
 * 迁移步骤：
 * 1. 在 CloudBase 控制台创建环境
 * 2. 在 app.js 中添加 wx.cloud.init({ env: 'your-env-id' })
 * 3. 配置集合权限（使用 _openid 进行用户隔离）
 * 4. 将 localdb/db.js 的操作替换为本模块
 *
 * 参考: ~/.claude/skills/cloudbase/references/no-sql-wx-mp-sdk/SKILL.md
 */

// 云数据库实例（初始化后可用）
let db = null;
let _ = null;

/**
 * 初始化 CloudBase 数据库
 * @param {string} envId - CloudBase 环境 ID
 */
function initCloudBase(envId) {
  if (!envId) {
    console.warn('[CloudBase DB] 未提供环境 ID');
    return false;
  }

  try {
    wx.cloud.init({
      env: envId,
      traceUser: true
    });
    db = wx.cloud.database();
    _ = db.command;
    console.log('[CloudBase DB] 初始化成功, env:', envId);
    return true;
  } catch (err) {
    console.error('[CloudBase DB] 初始化失败:', err);
    return false;
  }
}

/**
 * 检查是否已初始化
 */
function isAvailable() {
  return db !== null;
}

/**
 * 获取集合引用
 * @param {string} collectionName - 集合名称
 */
function getCollection(collectionName) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }
  return db.collection(collectionName);
}

// ============================================
// CRUD 操作封装
// ============================================

/**
 * 插入文档
 * @param {string} collectionName - 集合名称
 * @param {Object} data - 文档数据
 *
 * 注意：不要手动设置 _openid，SDK 会自动注入
 */
async function add(collectionName, data) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }

  // 移除 _openid，让 SDK 自动注入
  const { _openid, ...cleanData } = data;

  const res = await db.collection(collectionName).add({
    data: cleanData
  });

  return {
    id: res._id,
    ...cleanData
  };
}

/**
 * 查询单条文档
 * @param {string} collectionName - 集合名称
 * @param {Object} query - 查询条件
 */
async function findOne(collectionName, query) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }

  // 构建查询
  const coll = db.collection(collectionName);
  let queryBuilder = coll;

  // 处理查询条件
  if (query.id) {
    queryBuilder = queryBuilder.doc(query.id);
  } else {
    for (const key in query) {
      if (key === 'id' || key === '_id') continue;
      if (query[key] && typeof query[key] === 'object') {
        // 处理操作符如 $in, $like 等
        if (query[key].$in) {
          queryBuilder = queryBuilder.where({
            [key]: _.in(query[key].$in)
          });
        } else if (query[key].$like) {
          queryBuilder = queryBuilder.where({
            [key]: db.command.regex({
              regexp: query[key].$like
            })
          });
        }
      } else {
        queryBuilder = queryBuilder.where({
          [key]: query[key]
        });
      }
    }
  }

  const res = await queryBuilder.get();

  if (res.data && res.data.length > 0) {
    return { _id: res.data[0]._id, ...res.data[0] };
  }
  return null;
}

/**
 * 查询多条文档
 * @param {string} collectionName - 集合名称
 * @param {Object} query - 查询条件
 * @param {Object} options - 查询选项 { limit, skip, orderBy }
 */
async function find(collectionName, query, options = {}) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }

  let coll = db.collection(collectionName);

  // 应用查询条件
  const conditions = {};
  for (const key in query) {
    if (key === 'id' || key === '_id') continue;
    if (query[key] && typeof query[key] === 'object') {
      if (query[key].$in) {
        conditions[key] = _.in(query[key].$in);
      } else if (query[key].$like) {
        conditions[key] = db.command.regex({
          regexp: query[key].$like
        });
      }
    } else {
      conditions[key] = query[key];
    }
  }

  if (Object.keys(conditions).length > 0) {
    coll = coll.where(conditions);
  }

  // 排序
  if (options.orderBy) {
    const { field, order } = options.orderBy;
    coll = coll.orderBy(field, order || 'asc');
  }

  // 分页
  if (options.skip) {
    coll = coll.skip(options.skip);
  }
  if (options.limit) {
    coll = coll.limit(options.limit);
  }

  const res = await coll.get();

  return res.data.map(doc => ({ _id: doc._id, ...doc }));
}

/**
 * 更新文档
 * @param {string} collectionName - 集合名称
 * @param {string} id - 文档 ID
 * @param {Object} data - 更新数据
 */
async function update(collectionName, id, data) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }

  // 移除不允许客户端更新的字段
  const { _id, _openid, id, ...cleanData } = data;

  const res = await db.collection(collectionName).doc(id).update({
    data: {
      ...cleanData,
      updated_at: Date.now()
    }
  });

  return res.updated > 0;
}

/**
 * 删除文档
 * @param {string} collectionName - 集合名称
 * @param {string} id - 文档 ID
 */
async function remove(collectionName, id) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }

  const res = await db.collection(collectionName).doc(id).remove();
  return res.deleted > 0;
}

/**
 * 统计文档数量
 * @param {string} collectionName - 集合名称
 * @param {Object} query - 查询条件
 */
async function count(collectionName, query = {}) {
  if (!db) {
    throw new Error('CloudBase 数据库未初始化');
  }

  const conditions = {};
  for (const key in query) {
    if (query[key] && typeof query[key] === 'object') {
      if (query[key].$in) {
        conditions[key] = _.in(query[key].$in);
      }
    } else {
      conditions[key] = query[key];
    }
  }

  const coll = Object.keys(conditions).length > 0
    ? db.collection(collectionName).where(conditions)
    : db.collection(collectionName);

  const res = await coll.count();
  return res.total;
}

// ============================================
// 云函数调用封装
// ============================================

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 参数数据
 */
async function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (res.errMsg && res.errMsg.includes('ok')) {
          resolve(res.result);
        } else {
          reject(new Error(res.errMsg || '云函数调用失败'));
        }
      },
      fail: err => {
        reject(new Error(err.errMsg || '云函数调用失败'));
      }
    });
  });
}

/**
 * 获取用户 openid（通过云函数）
 * 用于需要在小程序端获取 openid 的场景
 */
async function getOpenid() {
  try {
    const res = await callFunction('getOpenid', {});
    return res.openid;
  } catch (err) {
    console.error('[CloudBase] 获取 openid 失败:', err);
    return null;
  }
}

module.exports = {
  initCloudBase,
  isAvailable,
  getCollection,
  add,
  findOne,
  find,
  update,
  remove,
  count,
  callFunction,
  getOpenid
};
