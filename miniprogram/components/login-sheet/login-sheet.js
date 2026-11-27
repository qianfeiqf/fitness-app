Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '登录后继续'
    },
    desc: {
      type: String,
      value: '登录后自动云端同步，换机不丢训练记录'
    }
  },

  data: {
    submitting: false
  },

  methods: {
    noop() {},

    onClose() {
      if (this.data.submitting) return;
      this.triggerEvent('close');
    },

    onConfirmLogin() {
      if (this.data.submitting) return;
      this.setData({ submitting: true });
      const app = getApp();
      app.wxLogin().then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.triggerEvent('success');
      }).catch(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '登录失败，请重试', icon: 'error' });
      });
    }
  }
});
