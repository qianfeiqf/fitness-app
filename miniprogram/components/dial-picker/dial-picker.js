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
      if (!items || items.length === 0) return;

      let idx = items.indexOf(value);
      if (idx < 0) {
        // 找不到精确匹配时，吸附到最接近的数值项，避免回跳到 0
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
          idx = bestIdx;
        } else {
          idx = 0;
        }
      }

      if (idx !== this.data.currentIndex || this.data.pickerValue[0] !== idx) {
        this.setData({
          currentIndex: idx,
          pickerValue: [idx]
        });
      }
    }
  },

  methods: {
    onPickerChange(e) {
      const { items } = this.data;
      if (!items || items.length === 0) return;

      const rawIdx = e.detail && Array.isArray(e.detail.value) ? e.detail.value[0] : 0;
      const idx = Math.max(0, Math.min(rawIdx, items.length - 1));

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
