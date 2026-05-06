/**
 * 同步服务
 * 实现本地优先 + 云端同步的数据同步机制
 *
 * 基于 CloudBase 最佳实践：
 * - 离线优先：本地数据始终可用
 * - 异步同步：不影响用户操作
 * - 冲突解决：Last-Write-Wins + 人工确认
 * - 指数退避：重试间隔递增
 */

const { getCollection, update, insert, find, findOne, remove } = require('../localdb/db.js');

// 同步配置 - 指数退避配置
const SYNC_CONFIG = {
  maxRetryCount: 5,
  baseRetryInterval: 2000,  // 基础重试间隔 2秒
  maxRetryInterval: 60000,  // 最大重试间隔 60秒
  batchSize: 20,            // 批处理大小
  conflictCooldown: 300000  // 冲突冷却时间 5分钟
};

/**
 * 计算指数退避间隔
 */
function getExponentialBackoff(retryCount) {
  const interval = SYNC_CONFIG.baseRetryInterval * Math.pow(2, retryCount);
  return Math.min(interval, SYNC_CONFIG.maxRetryInterval);
}

/**
 * 添加到同步队列
 */
function addToSyncQueue(entityType, entityId, operation, payload) {
  const syncQueue = getCollection('sync_queue');

  // 检查是否已有相同实体的待同步项
  const existing = syncQueue.find(item =>
    item.entity_type === entityType && item.entity_id === entityId
  );

  if (existing) {
    // 更新已有项
    existing.operation = operation;
    existing.payload = payload;
    existing.updated_at = Date.now();
    existing.retry_count = 0;
    existing.status = 'pending';
    existing.last_error = null;
  } else {
    // 添加新项
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

  saveSyncQueue(syncQueue);
}

/**
 * 保存同步队列到本地存储
 */
function saveSyncQueue(syncQueue) {
  wx.setStorageSync('sync_queue', syncQueue);
}

/**
 * 获取待同步队列（过滤掉还在冷却期的项）
 */
function getPendingSyncItems() {
  const syncQueue = getCollection('sync_queue');
  const now = Date.now();
  return syncQueue.filter(item =>
    item.status === 'pending' &&
    (!item.next_retry_at || item.next_retry_at <= now)
  );
}

/**
 * 处理同步
 */
async function syncAll() {
  console.log('=== 开始同步 ===');

  const pendingItems = getPendingSyncItems();
  console.log('待同步项数量:', pendingItems.length);

  if (pendingItems.length === 0) {
    console.log('没有待同步数据');
    return { success: true, syncedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  // 按批次处理
  for (let i = 0; i < pendingItems.length; i += SYNC_CONFIG.batchSize) {
    const batch = pendingItems.slice(i, i + SYNC_CONFIG.batchSize);

    for (const item of batch) {
      try {
        await syncItem(item);
        markAsSynced(item);
        syncedCount++;
      } catch (err) {
        console.error('同步失败:', item.entity_id, err.message);
        handleSyncError(item, err);
        failedCount++;
      }
    }
  }

  console.log('同步完成: 成功', syncedCount, '失败', failedCount);

  return {
    success: failedCount === 0,
    syncedCount,
    failedCount
  };
}

/**
 * 同步单个项目到云端
 */
async function syncItem(item) {
  const cloudAPI = getCloudAPI();

  switch (item.operation) {
    case 'upsert':
      return await cloudAPI.upsert(item.entity_type, item.entity_id, item.payload);
    case 'delete':
      return await cloudAPI.delete(item.entity_type, item.entity_id);
    default:
      throw new Error('未知操作: ' + item.operation);
  }
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
    saveSyncQueue(syncQueue);
  }

  // 同时更新本地实体的同步状态
  try {
    update(item.entity_type, item.entity_id, { sync_status: 'synced' });
  } catch (err) {
    // 可能实体已被删除，忽略
  }
}

/**
 * 处理同步错误 - 使用指数退避
 */
function handleSyncError(item, err) {
  const syncQueue = getCollection('sync_queue');
  const index = syncQueue.findIndex(i => i.id === item.id);

  if (index !== -1) {
    const retryCount = syncQueue[index].retry_count + 1;
    syncQueue[index].retry_count = retryCount;
    syncQueue[index].last_error = err.message;

    if (retryCount >= SYNC_CONFIG.maxRetryCount) {
      // 超过最大重试次数，标记为冲突需要人工处理
      syncQueue[index].status = 'conflict';
      syncQueue[index].next_retry_at = Date.now() + SYNC_CONFIG.conflictCooldown;
      console.warn('[Sync] 同步项进入冲突状态:', item.entity_id);
    } else {
      // 计算下一次重试时间（指数退避）
      const backoffInterval = getExponentialBackoff(retryCount);
      syncQueue[index].next_retry_at = Date.now() + backoffInterval;
      console.log('[Sync] 下次重试在', backoffInterval / 1000, '秒后:', item.entity_id);
    }

    saveSyncQueue(syncQueue);
  }
}

/**
 * 从云端拉取数据
 */
async function pullFromCloud(since) {
  console.log('从云端拉取数据，自', since);

  const cloudAPI = getCloudAPI();
  const changes = await cloudAPI.getChanges(since);

  // 处理变更
  for (const change of changes) {
    await applyCloudChange(change);
  }

  return changes;
}

/**
 * 应用云端变更
 */
async function applyCloudChange(change) {
  const { entity_type, entity_id, operation, payload, server_updated_at } = change;

  const localEntity = findOne(entity_type, { id: entity_id });

  if (operation === 'upsert') {
    if (!localEntity) {
      // 本地不存在，直接插入
      insert(entity_type, { ...payload, sync_status: 'synced' });
      console.log('[Sync] 插入云端新数据:', entity_type, entity_id);
    } else if (server_updated_at > localEntity.updated_at) {
      // 服务端更新，使用服务端数据
      update(entity_type, entity_id, { ...payload, sync_status: 'synced' });
      console.log('[Sync] 采纳云端更新:', entity_type, entity_id);
    } else if (localEntity.sync_status !== 'synced') {
      // 本地有未同步的变更，存在冲突
      // 根据冲突策略处理（这里使用 Last-Write-Wins + 标记冲突）
      if (localEntity.updated_at > server_updated_at) {
        // 本地优先，重新加入同步队列
        addToSyncQueue(entity_type, entity_id, 'upsert', localEntity);
        console.log('[Sync] 本地优先，重新同步:', entity_type, entity_id);
      } else {
        update(entity_type, entity_id, { ...payload, sync_status: 'synced' });
        console.log('[Sync] 采纳云端更新(时间戳更早):', entity_type, entity_id);
      }
    }
  } else if (operation === 'delete') {
    // 删除操作
    remove(entity_type, entity_id);
    console.log('[Sync] 删除本地数据:', entity_type, entity_id);
  }
}

/**
 * 云托管 API 地址
 */
const { CLOUD_API_BASE } = require('../config/cloud.js');

/**
 * 获取请求 header
 */
function getAuthHeader() {
  const app = getApp();
  const token = app ? app.globalData.accessToken : null;
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

/**
 * 云端 API 请求封装 - 带超时和错误处理
 */
async function cloudRequest(url, method = 'GET', data = null, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('请求超时'));
    }, timeout);

    wx.request({
      url: CLOUD_API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      success: (res) => {
        clearTimeout(timer);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // Token 过期
          const app = getApp();
          if (app) {
            app.globalData.isLoggedIn = false;
            app.globalData.accessToken = null;
            wx.removeStorageSync('accessToken');
          }
          reject(new Error('认证已过期，请重新登录'));
        } else {
          reject(new Error(res.data?.error || `请求失败(${res.statusCode})`));
        }
      },
      fail: (err) => {
        clearTimeout(timer);
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

/**
 * 获取云端API实例
 */
function getCloudAPI() {
  return {
    async upsert(entityType, entityId, payload) {
      console.log('[Cloud API] upsert', entityType, entityId);
      try {
        const result = await cloudRequest('/api/v1/sync/push', 'POST', {
          changes: [{ entity_type: entityType, entity_id: entityId, operation: 'upsert', payload }]
        });
        return result;
      } catch (err) {
        console.error('[Cloud API] upsert 失败:', err.message);
        throw err;
      }
    },

    async delete(entityType, entityId) {
      console.log('[Cloud API] delete', entityType, entityId);
      try {
        const result = await cloudRequest('/api/v1/sync/push', 'POST', {
          changes: [{ entity_type: entityType, entity_id: entityId, operation: 'delete', payload: null }]
        });
        return result;
      } catch (err) {
        console.error('[Cloud API] delete 失败:', err.message);
        throw err;
      }
    },

    async getChanges(since) {
      console.log('[Cloud API] getChanges since', since);
      try {
        const result = await cloudRequest('/api/v1/sync/pull?since=' + (since || 0), 'GET');
        return result.data?.changes || [];
      } catch (err) {
        console.error('[Cloud API] getChanges 失败:', err.message);
        // 网络失败时记录警告，返回空变更
        return [];
      }
    }
  };
}

/**
 * 获取同步状态
 */
function getSyncStatus() {
  const syncQueue = getCollection('sync_queue');
  const pending = syncQueue.filter(item => item.status === 'pending').length;
  // 注意: 'failed' 状态在代码中从未设置，失败项会被标记为 'conflict'
  // 此字段保留用于历史兼容性，始终为0
  const failed = syncQueue.filter(item => item.status === 'failed').length;
  const conflict = syncQueue.filter(item => item.status === 'conflict').length;
  const synced = syncQueue.filter(item => item.status === 'synced').length;

  const app = getApp();
  return {
    pending,
    failed,  // 始终为0，见上方注释
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

  saveSyncQueue(syncQueue);

  return await syncAll();
}

/**
 * 清理已同步项（保留一定数量的历史记录）
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
    saveSyncQueue(syncQueue);
    console.log('[Sync] 清理了', toRemove.length, '条已同步记录');
  }
}

module.exports = {
  addToSyncQueue,
  syncAll,
  pullFromCloud,
  getSyncStatus,
  retryFailedSync,
  cleanSyncedItems,
  SYNC_CONFIG
};
