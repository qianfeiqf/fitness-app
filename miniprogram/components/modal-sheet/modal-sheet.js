Component({
  options: {
    styleIsolation: 'shared',
    multipleSlots: true
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    description: {
      type: String,
      value: ''
    },
    confirmText: {
      type: String,
      value: '确认'
    },
    cancelText: {
      type: String,
      value: '取消'
    },
    showCancel: {
      type: Boolean,
      value: true
    },
    showConfirm: {
      type: Boolean,
      value: true
    },
    confirmDisabled: {
      type: Boolean,
      value: false
    },
    closeOnMaskTap: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onMaskTap() {
      if (this.data.closeOnMaskTap) {
        this.triggerEvent('close');
      }
    },
    onCancel() {
      this.triggerEvent('cancel');
    },
    onConfirm() {
      if (!this.data.confirmDisabled) {
        this.triggerEvent('confirm');
      }
    },
    noop() {}
  }
});
