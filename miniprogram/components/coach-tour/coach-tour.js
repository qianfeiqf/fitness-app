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
      const menuBtn = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      const winW = info.windowWidth || 375;
      const winH = info.windowHeight || 667;
      const statusH = info.statusBarHeight || 20;
      const safeTop = menuBtn && menuBtn.bottom ? (menuBtn.bottom + 12) : (statusH + 54);
      const safeBottom = 24;
      const estCardH = 196;

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
      const maxSpotH = Math.max(40, winH - spotTop - safeBottom);
      const spotHeight = Math.min(maxSpotH, Math.round(rect.height + pad * 2));
      const spotRadius = rect.radius !== undefined ? rect.radius : 14;

      const spotBottom = spotTop + spotHeight;
      const spaceBelow = winH - spotBottom - safeBottom;
      const spaceAbove = spotTop - safeTop;

      let cardStyle = '';
      if (spaceBelow >= estCardH) {
        const cardTop = Math.min(winH - estCardH - safeBottom, spotBottom + 14);
        cardStyle = `top: ${Math.max(safeTop, cardTop)}px;`;
      } else if (spaceAbove >= estCardH) {
        const rawBottom = winH - spotTop + 14;
        const maxBottom = Math.max(safeBottom, winH - safeTop - estCardH);
        const cardBottom = Math.min(maxBottom, Math.max(safeBottom, rawBottom));
        cardStyle = `bottom: ${cardBottom}px;`;
      } else {
        // 超高目标上下均放不下时，安全贴底展示，绝不顶进顶部刘海或微信胶囊
        cardStyle = `bottom: ${safeBottom}px;`;
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
