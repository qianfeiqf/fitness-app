/**
 * 健身训练计划小程序 - 应用入口
 * 数据架构：本地优先（localdb） + 微信云开发（CloudBase NoSQL）双向同步
 */

// 导入本地数据库
const { initDatabase, getCollection } = require('./localdb/db.js');

// 导入同步服务
const syncService = require('./services/sync.js');

// 云开发环境配置
const { CLOUD_ENV_ID } = require('./config/cloud.js');

// ============================================
// 简单的自定义事件总线（替代 wx.eventCenter）
// ============================================
class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(eventName, callback, context) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push({ callback, context });
  }

  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    if (!callback) {
      this.listeners[eventName] = [];
    } else {
      this.listeners[eventName] = this.listeners[eventName].filter(
        listener => listener.callback !== callback
      );
    }
  }

  trigger(eventName, data) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(listener => {
      listener.callback.call(listener.context || null, data);
    });
  }
}

// 全局事件总线实例
const eventBus = new EventBus();

// 兼容 wx.eventCenter 接口
wx.eventCenter = {
  on: (eventName, callback, context) => eventBus.on(eventName, callback, context),
  off: (eventName, callback) => eventBus.off(eventName, callback),
  trigger: (eventName, data) => eventBus.trigger(eventName, data)
};

// 全局触发事件函数
function triggerEvent(eventName, data) {
  eventBus.trigger(eventName, data);
}

App({
  // 全局数据
  globalData: {
    userId: null,
    openId: null,
    isLoggedIn: false,
    isCloudReady: false,
    isOfflineMode: false,
    isSyncing: false,
    lastSyncTime: null,
    dbReady: false,
    needsOnboarding: false,
    unfinishedSession: null,
    cloudEnvId: CLOUD_ENV_ID,
    // 隐私授权回调暂存
    pendingPrivacyResolve: null,
    privacyContractName: '《小程序隐私保护指引》'
  },

  // 小程序初始化
  onLaunch(options) {
    console.log('=== 小程序启动 ===', options);

    // 1. 初始化本地数据库
    this.initLocalDatabase();

    // 2. 初始化微信云开发（CloudBase）
    this.initCloud();

    // 3. 注册微信小程序隐私保护指引监听
    this.initPrivacyListener();

    // 4. 检查登录状态
    this.checkLoginStatus();

    // 5. 检查新用户引导
    this.checkOnboarding();

    // 6. 检查是否有未完成的训练会话
    this.checkUnfinishedSession();
  },

  /**
   * 初始化微信云开发（cloud1-1g20tdh446a011c5）
   */
  initCloud() {
    if (!wx.cloud) {
      console.error('[CloudBase] 请使用 2.2.3 或以上的基础库以使用云能力');
      this.globalData.isCloudReady = false;
      return;
    }

    try {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
      this.globalData.isCloudReady = true;
      console.log('[CloudBase] 初始化成功, env:', CLOUD_ENV_ID);
    } catch (err) {
      console.error('[CloudBase] 初始化失败:', err);
      this.globalData.isCloudReady = false;
    }
  },

  /**
   * 监听微信小程序隐私授权需求（wx.onNeedPrivacyAuthorization）
   */
  initPrivacyListener() {
    if (typeof wx.getPrivacySetting === 'function') {
      wx.getPrivacySetting({
        success: (res) => {
          if (res.privacyContractName) {
            this.globalData.privacyContractName = res.privacyContractName;
          }
        }
      });
    }

    if (typeof wx.onNeedPrivacyAuthorization === 'function') {
      wx.onNeedPrivacyAuthorization((resolve) => {
        this.globalData.pendingPrivacyResolve = resolve;
        triggerEvent('needPrivacyAuthorization', {
          contractName: this.globalData.privacyContractName
        });
      });
    }
  },

  /**
   * 由 privacy-popup 组件回调，通知微信隐私授权结果
   */
  resolvePrivacyAuthorization(result) {
    const resolver = this.globalData.pendingPrivacyResolve;
    this.globalData.pendingPrivacyResolve = null;
    if (typeof resolver === 'function') {
      resolver(result);
    }
  },

  // 初始化本地数据库
  initLocalDatabase() {
    try {
      initDatabase();
      this.globalData.dbReady = true;
    } catch (err) {
      console.error('本地数据库初始化失败:', err);
    }
  },

  // 检查新用户引导
  checkOnboarding() {
    const completed = wx.getStorageSync('onboarding_completed');
    this.globalData.needsOnboarding = !completed;
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && (userInfo.id || userInfo.openId)) {
      this.globalData.userId = userInfo.id || userInfo.openId;
      this.globalData.openId = userInfo.openId || null;
      this.globalData.isOfflineMode = !!userInfo.isOfflineMode;
      this.globalData.isLoggedIn = true;
      console.log('用户已登录:', this.globalData.userId);
    } else {
      console.log('用户未登录');
    }
  },

  // 检查未完成的训练会话（用于杀后台恢复）
  checkUnfinishedSession() {
    try {
      if (!this.globalData.dbReady) return;
      const sessions = getCollection('sessions');
      if (!sessions) return;

      let unfinished = null;
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        if (s.status === 'in_progress' || s.status === 'paused' || s.status === 'active') {
          unfinished = s;
          break;
        }
      }

      if (unfinished) {
        this.globalData.unfinishedSession = unfinished;
      }
    } catch (err) {
      console.error('检查未完成会话失败:', err);
    }
  },

  /**
   * 微信云开发登录（免后端服务器、免配合法域名）
   * 微信云开发自动注入 _openid，数据按「仅创建者可读写」隔离
   */
  async wxLogin() {
    if (!this.globalData.isCloudReady) {
      this.initCloud();
    }

    // 验证云开发连通性（若已部署 getOpenid 云函数可拿到精确 openid，否则直接通过云数据库免鉴权通道登录）
    let openId = null;
    let isOfflineMode = false;

    if (this.globalData.isCloudReady) {
      try {
        // 先轻量探测云数据库连通性，确认当前环境可用
        const cloudDb = wx.cloud.database({ env: CLOUD_ENV_ID });
        await cloudDb.collection('profiles').limit(1).get();
        openId = 'wx_cloud_user';
      } catch (err) {
        // 如果只是集合尚未创建（-502005），仍视为云环境连通但提示建集合；其他网络错误降级离线
        const msg = (err && (err.errMsg || err.message)) || '';
        if (msg.includes('-502005') || msg.includes('collection not exists')) {
          console.warn('[CloudBase] 云环境已连通，但数据库集合尚未创建:', msg);
          openId = 'wx_cloud_user';
        } else {
          console.warn('[CloudBase] 云开发连接失败，降级为本地离线模式:', msg);
          isOfflineMode = true;
        }
      }
    } else {
      isOfflineMode = true;
    }

    const existing = wx.getStorageSync('userInfo');
    const user = {
      id: (existing && existing.id) || (isOfflineMode ? 'local_' + Date.now() : 'cb_' + Date.now()),
      openId: openId || (existing && existing.openId) || ('local_' + Date.now()),
      isNewUser: !existing,
      isOfflineMode
    };

    this.setGlobalUserData(user);

    // 云开发就绪时立即触发一次双向同步（拉取云端历史 + 推送本地记录）
    if (!isOfflineMode) {
      this.startSync();
    }

    return user;
  },

  // 设置全局用户数据
  setGlobalUserData(userInfo) {
    this.globalData.userId = userInfo.id;
    this.globalData.openId = userInfo.openId || null;
    this.globalData.isOfflineMode = !!userInfo.isOfflineMode;
    this.globalData.isLoggedIn = true;

    wx.setStorageSync('userInfo', {
      id: userInfo.id,
      openId: userInfo.openId || null,
      isNewUser: userInfo.isNewUser || false,
      isOfflineMode: !!userInfo.isOfflineMode
    });
  },

  // 发起双向同步（本地 <-> 微信云数据库）
  async startSync() {
    if (this.globalData.isSyncing) {
      return { success: false, reason: 'syncing' };
    }

    if (!this.globalData.isLoggedIn || !this.globalData.isCloudReady || this.globalData.isOfflineMode) {
      console.log('[Sync] 未登录或处于离线模式，跳过云端同步');
      return { success: false, reason: 'offline' };
    }

    this.globalData.isSyncing = true;
    triggerEvent('syncStarted');

    try {
      const result = await syncService.syncAll();
      this.globalData.lastSyncTime = Date.now();
      triggerEvent('syncCompleted', result);
      return result;
    } catch (err) {
      console.error('同步失败:', err);
      triggerEvent('syncFailed', err);
      return { success: false, error: err.message };
    } finally {
      this.globalData.isSyncing = false;
    }
  },

  /**
   * 永久删除当前用户在云数据库中的全部数据（供账号注销使用）
   */
  async deleteCloudUserData() {
    if (!this.globalData.isCloudReady) return;
    await syncService.clearCloudUserData();
  },

  // 小程序进入前台
  onShow() {
    if (this.globalData.isLoggedIn && this.globalData.isCloudReady && !this.globalData.isOfflineMode) {
      this.startSync();
    }
  },

  // 小程序进入后台
  onHide() {
    triggerEvent('appHidden');
  },

  // 全局错误处理
  onError(err) {
    console.error('全局错误:', err);
  }
});
