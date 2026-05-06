/**
 * 引导页：直接跳转到计划tab
 */

Page({
  data: {
    navHeight: 0
  },

  onLoad() {
    this.calcNavBarHeight();

    wx.setStorageSync('onboarding_completed', true);
    getApp().globalData.needsOnboarding = false;

    setTimeout(() => {
      wx.switchTab({ url: '/pages/plans/plans' });
    }, 500);
  },

  calcNavBarHeight() {
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const systemInfo = wx.getSystemInfoSync();
    const navHeight = menuButton.top + menuButton.height + (menuButton.top - systemInfo.statusBarHeight);
    this.setData({ navHeight });
  }
});
