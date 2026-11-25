Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    exercise: {
      type: Object,
      value: null
    },
    allowDelete: {
      type: Boolean,
      value: false
    }
  },

  data: {
    gifLoadError: false
  },

  observers: {
    'visible, exercise': function(visible) {
      if (visible) {
        this.setData({ gifLoadError: false });
      }
    }
  },

  methods: {
    noop() {},

    onGifError() {
      this.setData({ gifLoadError: true });
    },

    onClose() {
      this.triggerEvent('close');
    },

    onDelete() {
      this.triggerEvent('delete', { exercise: this.data.exercise });
    }
  }
});
