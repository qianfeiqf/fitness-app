/**
 * 健身训练计划小程序 - 应用入口
 *
 * CloudBase 集成说明：
 * 本项目使用微信云托管（Cloud Hosting）作为后端，使用 REST API 进行通信。
 * 如需迁移到 CloudBase 数据库，可按以下步骤：
 * 1. 在 app.js 中添加 wx.cloud.init({ env: 'your-env-id' })
 * 2. 使用 wx.cloud.database() 替代 localdb/db.js
 * 3. 使用 wx.cloud.callFunction() 调用云函数获取 openid
 */

// 导入本地数据库
const { initDatabase, getDatabase, getCollection } = require('./localdb/db.js');

// 导入同步服务
const syncService = require('./services/sync.js');

// 云托管 API 配置
const { CLOUD_API_BASE } = require('./config/cloud.js');

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
    isSyncing: false,
    lastSyncTime: null,
    dbReady: false,
    needsOnboarding: false,
    unfinishedSession: null,
    accessToken: null,
    // CloudBase 配置占位（未来迁移用）
    cloudBaseEnv: null,
    isCloudBaseEnabled: false
  },

  // 小程序初始化
  onLaunch(options) {
    console.log('=== 小程序启动 ===', options);

    // 1. 初始化本地数据库（同步完成）
    this.initLocalDatabase();

    // 2. 尝试初始化 CloudBase（可选，未来迁移用）
    this.initCloudBase();

    // 3. 检查登录状态
    this.checkLoginStatus();

    // 4. 检查新用户引导
    this.checkOnboarding();

    // 5. 检查是否有未完成的训练会话
    this.checkUnfinishedSession();
  },

  // ============================================
  // CloudBase 初始化（可选，未来迁移用）
  // ============================================
  initCloudBase() {
    // 检查是否已配置 CloudBase
    const cloudBaseConfig = wx.getStorageSync('cloudBaseConfig');
    if (!cloudBaseConfig || !cloudBaseConfig.envId) {
      console.log('[CloudBase] 未配置，跳过初始化');
      return;
    }

    try {
      // 初始化 CloudBase
      wx.cloud.init({
        env: cloudBaseConfig.envId,
        traceUser: true
      });
      this.globalData.cloudBaseEnv = cloudBaseConfig.envId;
      this.globalData.isCloudBaseEnabled = true;
      console.log('[CloudBase] 初始化成功, env:', cloudBaseConfig.envId);
    } catch (err) {
      console.error('[CloudBase] 初始化失败:', err);
      this.globalData.isCloudBaseEnabled = false;
    }
  },

  // 初始化本地数据库
  initLocalDatabase() {
    try {
      console.log('初始化本地数据库...');
      initDatabase();
      this.globalData.dbReady = true;
      console.log('本地数据库初始化完成');
    } catch (err) {
      console.error('本地数据库初始化失败:', err);
    }
  },

  // 检查新用户引导
  checkOnboarding() {
    const completed = wx.getStorageSync('onboarding_completed');
    if (!completed) {
      // 新用户，需要引导
      console.log('新用户，需要引导');
      this.globalData.needsOnboarding = true;
    } else {
      this.globalData.needsOnboarding = false;
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const accessToken = wx.getStorageSync('accessToken');
    if (userInfo && userInfo.openId) {
      this.globalData.userId = userInfo.id;
      this.globalData.openId = userInfo.openId;
      this.globalData.isLoggedIn = true;
      this.globalData.accessToken = accessToken || null;
      console.log('用户已登录:', userInfo.openId);
    } else {
      console.log('用户未登录');
    }
  },

  // 检查未完成的训练会话（用于杀后台恢复）
  checkUnfinishedSession() {
    try {
      // 检查数据库是否就绪
      if (!this.globalData.dbReady) {
        console.log('数据库未就绪，跳过未完成会话检查');
        return;
      }

      const sessions = getCollection('sessions');
      if (!sessions) {
        console.log('sessions集合不存在');
        return;
      }

      // 查找进行中或暂停的会话
      let unfinished = null;
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        if (s.status === 'in_progress' || s.status === 'paused') {
          unfinished = s;
          break;
        }
      }

      if (unfinished) {
        console.log('发现未完成的训练会话:', unfinished.id || unfinished._id);
        // 存储到 globalData，供首页 onLoad 时检查（事件在 onLaunch 触发时页面尚未注册监听）
        this.globalData.unfinishedSession = unfinished;
      }
    } catch (err) {
      console.error('检查未完成会话失败:', err);
    }
  },

  // 微信登录
  async wxLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            console.log('获取到wx.login code:', res.code);
            try {
              // 优先尝试 CloudBase 云函数获取 openid（未来迁移用）
              if (this.globalData.isCloudBaseEnabled) {
                try {
                  const cloudResult = await this.loginWithCloudBase(res.code);
                  if (cloudResult) {
                    console.log('CloudBase 登录成功');
                    resolve(cloudResult);
                    return;
                  }
                } catch (cloudErr) {
                  console.warn('[CloudBase] 登录失败，降级到云托管:', cloudErr.message);
                }
              }

              // 调用云托管认证接口（登录不需要认证token）
              const result = await this.requestCloudAPI({
                url: '/api/v1/auth/wx-login',
                method: 'POST',
                data: { code: res.code }
              }, false);

              if (result.success && result.data) {
                const { accessToken, user } = result.data;
                // 保存 accessToken
                this.globalData.accessToken = accessToken;
                wx.setStorageSync('accessToken', accessToken);
                this.setGlobalUserData(user);
                console.log('云端登录成功, userId:', user.id);
                resolve(user);
              } else {
                reject(new Error(result.error || '登录失败'));
              }
            } catch (err) {
              console.error('云端登录失败，使用离线模式:', err.message);
              // 云端登录失败时，降级为离线模式（本地mock）
              const mockUser = {
                id: 'local_' + Date.now(),
                openId: 'mock_offline_' + res.code,
                isNewUser: true,
                isOfflineMode: true
              };
              this.setGlobalUserData(mockUser);
              resolve(mockUser);
            }
          } else {
            reject(new Error('获取code失败'));
          }
        },
        fail: reject
      });
    });
  },

  // ============================================
  // CloudBase 登录（未来迁移用）
  // 获取 openid 的标准方式
  // ============================================
  async loginWithCloudBase(code) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getOpenid',  // 需要创建云函数返回 openid
        data: { code: code },
        success: res => {
          if (res.result && res.result.openid) {
            const user = {
              id: res.result.openid,
              openId: res.result.openid,
              isNewUser: false,
              isCloudBase: true
            };
            this.setGlobalUserData(user);
            resolve(user);
          } else {
            reject(new Error('CloudBase 未返回 openid'));
          }
        },
        fail: err => {
          reject(err);
        }
      });
    });
  },

  /**
   * 调用云托管 API
   * @param {Object} options - wx.request 选项
   * @param {boolean} needAuth - 是否需要认证 token
   */
  async requestCloudAPI(options, needAuth = true) {
    const { url, method = 'GET', data, header = {} } = options;

    // 附加认证 header
    if (needAuth && this.globalData.accessToken) {
      header['Authorization'] = 'Bearer ' + this.globalData.accessToken;
    }
    header['Content-Type'] = 'application/json';

    return new Promise((resolve, reject) => {
      wx.request({
        url: CLOUD_API_BASE + url,
        method,
        data,
        header,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // Token 过期，清除登录状态
            this.globalData.isLoggedIn = false;
            this.globalData.accessToken = null;
            wx.removeStorageSync('accessToken');
            reject(new Error('认证已过期，请重新登录'));
          } else {
            reject(new Error(res.data?.error || '请求失败'));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'));
        }
      });
    });
  },

  // 设置全局用户数据
  setGlobalUserData(userInfo) {
    this.globalData.userId = userInfo.id;
    this.globalData.openId = userInfo.openId;
    this.globalData.isLoggedIn = true;

    wx.setStorageSync('userInfo', {
      id: userInfo.id,
      openId: userInfo.openId,
      isNewUser: userInfo.isNewUser || false
    });
  },

  // 发起同步
  async startSync() {
    if (this.globalData.isSyncing) {
      console.log('同步正在进行中');
      return;
    }

    if (!this.globalData.isLoggedIn) {
      console.log('用户未登录，跳过同步');
      return;
    }

    this.globalData.isSyncing = true;
    triggerEvent('syncStarted');

    try {
      await syncService.syncAll();
      this.globalData.lastSyncTime = Date.now();
      triggerEvent('syncCompleted');
      console.log('同步完成');
    } catch (err) {
      console.error('同步失败:', err);
      triggerEvent('syncFailed', err);
    } finally {
      this.globalData.isSyncing = false;
    }
  },

  // 小程序进入前台
  onShow() {
    console.log('=== 小程序进入前台 ===');
    // 自动同步
    if (this.globalData.isLoggedIn) {
      this.startSync();
    }
  },

  // 小程序进入后台
  onHide() {
    console.log('=== 小程序进入后台 ===');
    // 触发快照保存
    triggerEvent('appHidden');
  },

  // 全局错误处理
  onError(err) {
    console.error('全局错误:', err);
  }
});
