/**
 * 微信小程序隐私保护指引弹窗组件
 * 配合 app.js 中 wx.onNeedPrivacyAuthorization 使用
 */

Component({
  data: {
    visible: false,
    privacyContractName: '《小程序隐私保护指引》'
  },

  lifetimes: {
    attached() {
      this._onNeedPrivacy = this._handleNeedPrivacy.bind(this);
      if (wx.eventCenter) {
        wx.eventCenter.on('needPrivacyAuthorization', this._onNeedPrivacy);
      }

      const app = getApp();
      if (app && app.globalData && app.globalData.pendingPrivacyResolve) {
        this._handleNeedPrivacy({
          contractName: app.globalData.privacyContractName
        });
      }
    },

    detached() {
      if (wx.eventCenter && this._onNeedPrivacy) {
        wx.eventCenter.off('needPrivacyAuthorization', this._onNeedPrivacy);
      }
    }
  },

  methods: {
    _handleNeedPrivacy(payload = {}) {
      this.setData({
        visible: true,
        privacyContractName: payload.contractName || this.data.privacyContractName
      });
    },

    onOpenContract() {
      if (typeof wx.openPrivacyContract === 'function') {
        wx.openPrivacyContract({
          fail: () => {
            wx.showToast({ title: '请在小程序设置中查看隐私指引', icon: 'none' });
          }
        });
      }
    },

    onAgree() {
      const app = getApp();
      this.setData({ visible: false });
      if (app && typeof app.resolvePrivacyAuthorization === 'function') {
        app.resolvePrivacyAuthorization({ buttonId: 'agree-privacy-btn', event: 'agree' });
      }
    },

    onDisagree() {
      const app = getApp();
      this.setData({ visible: false });
      if (app && typeof app.resolvePrivacyAuthorization === 'function') {
        app.resolvePrivacyAuthorization({ event: 'disagree' });
      }
      wx.showToast({ title: '需同意隐私指引后方可使用该功能', icon: 'none' });
    }
  }
});
