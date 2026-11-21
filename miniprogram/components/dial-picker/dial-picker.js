/**
 * 刻度拨盘组件
 * 基于微信原生 picker-view 实现精准滚轮吸附与自动居中
 */

Component({
  properties: {
    items: { type: Array, value: [] },
    value: { type: Number, value: 0 },
    unit: { type: String, value: '' }
  },

  data: {
    pickerValue: [0],
    currentIndex: 0
  },

  observers: {
    'items, value': function(items, value) {
      this._syncValue(items, value);
    }
  },

  lifetimes: {
    ready() {
      this._isReady = true;
      this._syncValue(this.data.items, this.data.value);
    },
    detached() {
      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
        this._syncTimer = null;
      }
    }
  },

  methods: {
    _findIndex(items, value) {
      if (!items || items.length === 0) return 0;

      let idx = items.indexOf(value);
      if (idx >= 0) return idx;

      const target = Number(value);
      if (!Number.isNaN(target)) {
        let bestIdx = 0;
        let minDiff = Math.abs(Number(items[0]) - target);
        for (let i = 1; i < items.length; i++) {
          const diff = Math.abs(Number(items[i]) - target);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = i;
          }
        }
        return bestIdx;
      }
      return 0;
    },

    /**
     * 同步滚轮位置：
     * 微信原生 picker-view 在 items 首次渲染同帧设 value 会被钳位到 [0]，
     * 必须在下一帧（子节点挂载完成后）再设一次 pickerValue 才能准确滚到目标项。
     */
    _syncValue(items, value) {
      if (!items || items.length === 0) return;

      const idx = this._findIndex(items, value);
      this.setData({ currentIndex: idx });

      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
      }

      wx.nextTick(() => {
        this.setData({ pickerValue: [idx] });
        this._syncTimer = setTimeout(() => {
          this._syncTimer = null;
          if (this.data.currentIndex === idx) {
            this.setData({ pickerValue: [idx] });
          }
        }, 60);
      });
    },

    onPickerChange(e) {
      const { items } = this.data;
      if (!items || items.length === 0) return;

      const rawIdx = e.detail && Array.isArray(e.detail.value) ? e.detail.value[0] : 0;
      const idx = Math.max(0, Math.min(rawIdx, items.length - 1));

      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
        this._syncTimer = null;
      }

      if (idx !== this.data.currentIndex || this.data.pickerValue[0] !== idx) {
        this.setData({
          currentIndex: idx,
          pickerValue: [idx]
        });
      }

      this.triggerEvent('change', { value: items[idx] });
    }
  }
});
