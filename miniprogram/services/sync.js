/**
 * 同步服务（微信云开发 CloudBase NoSQL 版）
 * 实现本地优先（localdb） + 微信云数据库（cloud1-1g20tdh446a011c5）双向同步
 *
 * - 离线优先：所有写操作先落本地 localdb，不阻塞 UI
 * - 微信原生通道：通过 wx.cloud.database() 免鉴权读写，自动按 _openid 隔离用户数据
 * - 分页拉取：突破小程序端单次查询 20 条限制
 * - 指数退避：弱网失败自动重试
 */

const { getCollection, saveDatabase, update, insert, findOne, remove } = require('../localdb/db.js');
const { CLOUD_ENV_ID, SYNC_COLLECTIONS } = require('../config/cloud.js');

const SYNC_CONFIG = {
  maxRetryCount: 5,
  baseRetryInterval: 2000,
  maxRetryInterval: 60000,
  batchSize: 20,
  conflictCooldown: 300000
};

const LAST_PULL_TS_KEY = 'last_sync_pull_timestamp';
const PAGE_SIZE = 20;

/**
 * 获取云数据库实例
 */
function getCloudDB() {
  if (!wx.cloud) {
    throw new Error('当前基础库不支持微信云开发');
  }
  return wx.cloud.database({ env: CLOUD_ENV_ID });
}

/**
 * 计算指数退避间隔
 */
function getExponentialBackoff(retryCount) {
  const interval = SYNC_CONFIG.baseRetryInterval * Math.pow(2, retryCount);
  return Math.min(interval, SYNC_CONFIG.maxRetryInterval);
}

/**
 * 清洗准备写入云数据库的文档（移除云端保留字段 _id / _openid / sync_status）
 */
function sanitizeForCloud(payload, entityId) {
  const clean = {};
  const source = payload || {};
  Object.keys(source).forEach(key => {
    if (key === '_id' || key === '_openid' || key === 'sync_status') return;
    if (source[key] !== undefined) {
      clean[key] = source[key];
    }
  });
  clean.id = clean.id || entityId;
  clean.updated_at = clean.updated_at || Date.now();
  clean.created_at = clean.created_at || clean.updated_at;
  return clean;
}

/**
 * 添加到同步队列
 */
function addToSyncQueue(entityType, entityId, operation, payload) {
  const syncQueue = getCollection('sync_queue');

  const existing = syncQueue.find(item =>
    item.entity_type === entityType && item.entity_id === entityId && item.status !== 'synced'
  );

  if (existing) {
    existing.operation = operation;
    existing.payload = payload;
    existing.updated_at = Date.now();
    existing.retry_count = 0;
    existing.status = 'pending';
    existing.last_error = null;
    existing.next_retry_at = null;
  } else {
    syncQueue.push({
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      entity_type: entityType,
      entity_id: entityId,
      operation,
      payload,
      created_at: Date.now(),
      updated_at: Date.now(),
      retry_count: 0,
      status: 'pending',
      last_error: null,
      next_retry_at: null
    });
  }

  saveDatabase();
}

/**
 * 自动扫描业务集合中 sync_status === 'pending' 的记录并补入同步队列
 */
function collectPendingChangesToQueue() {
  const syncQueue = getCollection('sync_queue');
  const activeKeySet = new Set(
    syncQueue
      .filter(item => item.status === 'pending' || item.status === 'conflict')
      .map(item => `${item.entity_type}:${item.entity_id}`)
  );

  let enqueued = 0;
  for (const collectionName of SYNC_COLLECTIONS) {
    const docs = getCollection(collectionName);
    for (const doc of docs) {
      if (doc && doc.id && doc.sync_status === 'pending') {
        const key = `${collectionName}:${doc.id}`;
        if (!activeKeySet.has(key)) {
          syncQueue.push({
            id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            entity_type: collectionName,
            entity_id: doc.id,
            operation: 'upsert',
            payload: doc,
            created_at: Date.now(),
            updated_at: Date.now(),
            retry_count: 0,
            status: 'pending',
            last_error: null,
            next_retry_at: null
          });
          activeKeySet.add(key);
          enqueued++;
        }
      }
    }
  }

  if (enqueued > 0) {
    saveDatabase();
  }
}

/**
 * 获取待同步队列
 */
function getPendingSyncItems() {
  const syncQueue = getCollection('sync_queue');
  const now = Date.now();
  const orderMap = {};
  SYNC_COLLECTIONS.forEach((name, idx) => {
    orderMap[name] = idx;
  });

  return syncQueue
    .filter(item =>
      item.status === 'pending' &&
      SYNC_COLLECTIONS.includes(item.entity_type) &&
      (!item.next_retry_at || item.next_retry_at <= now)
    )
    .sort((a, b) => {
      const orderA = orderMap[a.entity_type] !== undefined ? orderMap[a.entity_type] : 99;
      const orderB = orderMap[b.entity_type] !== undefined ? orderMap[b.entity_type] : 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.created_at || 0) - (b.created_at || 0);
    });
}

/**
 * 同步单条记录到云数据库
 */
async function syncItemToCloud(cloudDb, item) {
  const col = cloudDb.collection(item.entity_type);
  const docId = String(item.entity_id);

  if (item.operation === 'delete') {
    try {
      await col.doc(docId).remove();
    } catch (err) {
      const msg = (err && (err.errMsg || err.message)) || '';
      // 文档本就不存在时视为删除成功
      if (!msg.includes('not exist') && !msg.includes('document with _id')) {
        throw err;
      }
    }
    return;
  }

  // Upsert：使用 doc(docId).set({ data }) 实现幂等写入，微信自动附带 _openid
  const cleanData = sanitizeForCloud(item.payload, docId);
  await col.doc(docId).set({ data: cleanData });
}

/**
 * 处理双向同步：先推送本地变更，再增量拉取云端变更
 */
async function syncAll() {
  console.log('=== [CloudBase] 开始双向同步 ===');
  const cloudDb = getCloudDB();

  collectPendingChangesToQueue();
  const pendingItems = getPendingSyncItems();
  console.log('[CloudBase] 待推送记录数:', pendingItems.length);

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pendingItems) {
    try {
      await syncItemToCloud(cloudDb, item);
      markAsSynced(item);
      syncedCount++;
    } catch (err) {
      console.error('[CloudBase] 推送失败:', item.entity_type, item.entity_id, err.errMsg || err.message);
      handleSyncError(item, err);
      failedCount++;
    }
  }

  cleanSyncedItems(100);

  // 拉取云端增量更新
  let pulledCount = 0;
  try {
    const lastPullTs = wx.getStorageSync(LAST_PULL_TS_KEY) || 0;
    const pullResult = await pullFromCloud(lastPullTs);
    pulledCount = pullResult.pulledCount;
    wx.setStorageSync(LAST_PULL_TS_KEY, pullResult.syncTimestamp);
  } catch (err) {
    console.warn('[CloudBase] 拉取云端变更失败:', err.errMsg || err.message);
  }

  console.log('[CloudBase] 同步完成: 推送成功', syncedCount, '失败', failedCount, '拉取', pulledCount);

  return {
    success: failedCount === 0,
    syncedCount,
    failedCount,
    pulledCount
  };
}

/**
 * 标记为已同步
 */
function markAsSynced(item) {
  const syncQueue = getCollection('sync_queue');
  const index = syncQueue.findIndex(i => i.id === item.id);

  if (index !== -1) {
    syncQueue[index].status = 'synced';
    syncQueue[index].synced_at = Date.now();
    syncQueue[index].last_error = null;
    syncQueue[index].next_retry_at = null;
  }

  try {
    const existing = findOne(item.entity_type, { id: item.entity_id });
    if (existing) {
      update(item.entity_type, item.entity_id, {
        sync_status: 'synced',
        updated_at: existing.updated_at || Date.now()
      });
    } else {
      saveDatabase();
    }
  } catch (err) {
    saveDatabase();
  }
}

/**
 * 处理同步错误 - 指数退避
 */
function handleSyncError(item, err) {
  const syncQueue = getCollection('sync_queue');
  const index = syncQueue.findIndex(i => i.id === item.id);

  if (index !== -1) {
    const retryCount = syncQueue[index].retry_count + 1;
    syncQueue[index].retry_count = retryCount;
    syncQueue[index].last_error = (err && (err.errMsg || err.message)) || '同步失败';

    if (retryCount >= SYNC_CONFIG.maxRetryCount) {
      syncQueue[index].status = 'conflict';
      syncQueue[index].next_retry_at = Date.now() + SYNC_CONFIG.conflictCooldown;
    } else {
      syncQueue[index].next_retry_at = Date.now() + getExponentialBackoff(retryCount);
    }

    saveDatabase();
  }
}

/**
 * 从云数据库分页拉取增量变更（自动按当前用户的 _openid 隔离）
 */
async function pullFromCloud(since = 0) {
  const cloudDb = getCloudDB();
  const _ = cloudDb.command;
  const syncTimestamp = Date.now();
  let pulledCount = 0;

  for (const collectionName of SYNC_COLLECTIONS) {
    let skip = 0;
    while (true) {
      let rows = [];
      try {
        let query = cloudDb.collection(collectionName);
        if (since > 0) {
          query = query.where({ updated_at: _.gt(since) });
        }
        const res = await query.skip(skip).limit(PAGE_SIZE).get();
        rows = (res && res.data) || [];
      } catch (err) {
        const msg = (err && (err.errMsg || err.message)) || '';
        // 集合尚未创建时跳过该集合，不中断其他集合同步
        if (msg.includes('-502005') || msg.includes('collection not exists')) {
          console.warn(`[CloudBase] 集合 ${collectionName} 尚未创建，跳过拉取`);
          break;
        }
        throw err;
      }

      for (const row of rows) {
        applyCloudDoc(collectionName, row);
        pulledCount++;
      }

      if (rows.length < PAGE_SIZE) {
        break;
      }
      skip += PAGE_SIZE;
    }
  }

  return { pulledCount, syncTimestamp };
}

/**
 * 将云端文档合并到本地 localdb（Last-Write-Wins）
 */
function applyCloudDoc(collectionName, cloudDoc) {
  const entityId = cloudDoc.id || cloudDoc._id;
  if (!entityId) return;

  const cloudUpdatedAt = cloudDoc.updated_at || cloudDoc.created_at || Date.now();
  const localEntity = findOne(collectionName, { id: entityId });

  const normalized = { ...cloudDoc, id: entityId, sync_status: 'synced', updated_at: cloudUpdatedAt };
  delete normalized._openid;

  if (!localEntity) {
    insert(collectionName, normalized);
  } else if (cloudUpdatedAt > (localEntity.updated_at || 0)) {
    update(collectionName, entityId, normalized);
  } else if (localEntity.sync_status !== 'synced' && (localEntity.updated_at || 0) > cloudUpdatedAt) {
    addToSyncQueue(collectionName, entityId, 'upsert', localEntity);
  }
}

/**
 * 永久清除当前用户在云数据库中的全部数据（供账号注销调用）
 */
async function clearCloudUserData() {
  const cloudDb = getCloudDB();

  for (const collectionName of SYNC_COLLECTIONS) {
    while (true) {
      let rows = [];
      try {
        const res = await cloudDb.collection(collectionName).limit(PAGE_SIZE).get();
        rows = (res && res.data) || [];
      } catch (err) {
        const msg = (err && (err.errMsg || err.message)) || '';
        if (msg.includes('-502005') || msg.includes('collection not exists')) {
          break;
        }
        throw err;
      }

      if (rows.length === 0) break;

      for (const row of rows) {
        await cloudDb.collection(collectionName).doc(row._id).remove();
      }
    }
  }
}

/**
 * 获取同步状态
 */
function getSyncStatus() {
  const syncQueue = getCollection('sync_queue');
  const pending = syncQueue.filter(item => item.status === 'pending').length;
  const failed = syncQueue.filter(item => item.status === 'failed').length;
  const conflict = syncQueue.filter(item => item.status === 'conflict').length;
  const synced = syncQueue.filter(item => item.status === 'synced').length;

  const app = getApp();
  return {
    pending,
    failed,
    conflict,
    synced,
    total: syncQueue.length,
    isSyncing: app ? app.globalData.isSyncing : false
  };
}

/**
 * 重试失败的同步项
 */
async function retryFailedSync() {
  const syncQueue = getCollection('sync_queue');
  const failedItems = syncQueue.filter(item => item.status === 'failed' || item.status === 'conflict');

  for (const item of failedItems) {
    item.status = 'pending';
    item.retry_count = 0;
    item.next_retry_at = null;
  }

  saveDatabase();
  return await syncAll();
}

/**
 * 清理已同步项
 */
function cleanSyncedItems(keepCount = 100) {
  const syncQueue = getCollection('sync_queue');
  const syncedItems = syncQueue
    .filter(item => item.status === 'synced')
    .sort((a, b) => (b.synced_at || 0) - (a.synced_at || 0));

  if (syncedItems.length > keepCount) {
    const toRemove = syncedItems.slice(keepCount);
    toRemove.forEach(item => {
      const index = syncQueue.findIndex(i => i.id === item.id);
      if (index !== -1) {
        syncQueue.splice(index, 1);
      }
    });
    saveDatabase();
  }
}

module.exports = {
  addToSyncQueue,
  syncAll,
  pullFromCloud,
  clearCloudUserData,
  getSyncStatus,
  retryFailedSync,
  cleanSyncedItems,
  SYNC_CONFIG
};
