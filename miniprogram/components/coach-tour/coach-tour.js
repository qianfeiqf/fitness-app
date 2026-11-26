Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    rect: {
      type: Object,
      value: null
    },
    title: {
      type: String,
      value: ''
    },
    desc: {
      type: String,
      value: ''
    },
    stepText: {
      type: String,
      value: ''
    },
    nextText: {
      type: String,
      value: '下一步'
    },
    isLast: {
      type: Boolean,
      value: false
    },
    showSkip: {
      type: Boolean,
      value: true
    }
  },

  data: {
    hasRect: false,
    spotTop: 0,
    spotLeft: 0,
    spotWidth: 0,
    spotHeight: 0,
    spotRadius: 14,
    cardStyle: 'top: 50%; transform: translateY(-50%);'
  },

  observers: {
    'visible, rect': function (visible, rect) {
      if (!visible) return;
      this._layout(rect);
    }
  },

  methods: {
    _layout(rect) {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const winW = info.windowWidth || 375;
      const winH = info.windowHeight || 667;
      const statusH = info.statusBarHeight || 20;

      if (!rect || !rect.width || !rect.height) {
        this.setData({
          hasRect: false,
          cardStyle: 'top: 50%; transform: translateY(-50%);'
        });
        return;
      }

      const pad = rect.pad !== undefined ? rect.pad : 6;
      const spotLeft = Math.max(4, Math.round(rect.left - pad));
      const spotTop = Math.max(statusH + 4, Math.round(rect.top - pad));
      const spotWidth = Math.min(winW - spotLeft - 4, Math.round(rect.width + pad * 2));
      const spotHeight = Math.round(rect.height + pad * 2);
      const spotRadius = rect.radius !== undefined ? rect.radius : 14;

      const spotBottom = spotTop + spotHeight;
      const spaceBelow = winH - spotBottom;
      const spaceAbove = spotTop - (statusH + 44);

      let cardStyle = '';
      if (spaceBelow >= 185 || spaceBelow >= spaceAbove) {
        const cardTop = Math.min(winH - 190, spotBottom + 16);
        cardStyle = `top: ${Math.max(statusH + 48, cardTop)}px;`;
      } else {
        const cardBottom = Math.min(winH - statusH - 52, winH - spotTop + 16);
        cardStyle = `bottom: ${Math.max(24, cardBottom)}px;`;
      }

      this.setData({
        hasRect: true,
        spotTop,
        spotLeft,
        spotWidth,
        spotHeight,
        spotRadius,
        cardStyle
      });
    },

    onNext() {
      this.triggerEvent('next');
    },

    onSkip() {
      this.triggerEvent('skip');
    },

    noop() {}
  }
});
