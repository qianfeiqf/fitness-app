/**
 * 个人中心页面
 */

const { findOne, update, find } = require('../../localdb/db.js');

Page({
  data: {
    // 用户信息
    userInfo: null,
    isLoggedIn: false,

    // 身体档案
    profile: null,
    weight: 0,
    height: 0,

    // 导出状态
    exporting: false
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    this.loadProfile();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const app = getApp();

    if (!app.globalData.isLoggedIn) {
      this.setData({ isLoggedIn: false });
      return;
    }

    this.setData({
      isLoggedIn: true,
      userInfo: app.globalData
    });
  },

  /**
   * 登录
   */
  onLogin() {
    const app = getApp();
    app.wxLogin().then(() => {
      this.checkLoginStatus();
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch(err => {
      wx.showToast({ title: '登录失败', icon: 'error' });
    });
  },

  /**
   * 加载身体档案
   */
  loadProfile() {
    const profile = findOne('profiles', {});

    if (profile) {
      this.setData({
        profile,
        weight: profile.weight || 0,
        height: profile.height || 0
      });
    }
  },

  /**
   * 更新体重
   */
  onUpdateWeight(e) {
    const weight = parseFloat(e.detail.value) || 0;
    this.setData({ weight });

    this.saveProfile({ weight });
  },

  /**
   * 更新身高
   */
  onUpdateHeight(e) {
    const height = parseFloat(e.detail.value) || 0;
    this.setData({ height });

    this.saveProfile({ height });
  },

  /**
   * 保存身体档案
   */
  saveProfile(data) {
    const existingProfile = findOne('profiles', {});

    if (existingProfile) {
      update('profiles', existingProfile.id, {
        ...data,
        updated_at: Date.now()
      });
    } else {
      const db = require('../../localdb/db.js');
      db.insert('profiles', {
        weight: this.data.weight,
        height: this.data.height,
        updated_at: Date.now()
      });
    }
  },

  /**
   * 导出数据
   */
  onExportData() {
    this.setData({ exporting: true });

    wx.showModal({
      title: '选择导出格式',
      content: '导出功能开发中',
      showCancel: true,
      confirmText: '确定',
      success: (res) => {
        this.setData({ exporting: false });
      }
    });
  },

  /**
   * 同步数据
   */
  onSyncData() {
    const app = getApp();
    app.startSync();

    wx.showToast({ title: '同步开始...', icon: 'loading', duration: 1000 });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          getApp().globalData.isLoggedIn = false;
          getApp().globalData.userId = null;
          getApp().globalData.openId = null;

          this.setData({
            isLoggedIn: false,
            userInfo: null,
            profile: null
          });

          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }
});
