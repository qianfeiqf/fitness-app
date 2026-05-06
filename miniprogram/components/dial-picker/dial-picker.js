/**
 * 刻度拨盘组件
 * 新拟物化风格 — 内凹槽 + DIN 数字 + 中心指示线
 *
 * 定位方案：scroll-top (px)，公式 = (spacer + index * itemH) * pxRatio
 * 解决同值不刷新：先清零再设值
 */

const ITEM_HEIGHT_RPX = 80;
const SPACER_HEIGHT_RPX = 160; // = 容器400rpx的一半 - 项高80rpx的一半 = 160rpx

Component({
  properties: {
    items: { type: Array, value: [] },
    value: { type: Number, value: 0 },
    unit: { type: String, value: '' }
  },

  data: {
    scrollTop: 0,
    currentIndex: 0
  },

  observers: {
    'items, value': function(items, value) {
      if (!items || items.length === 0) return;
      const idx = items.indexOf(value);
      this._snapTo(idx >= 0 ? idx : 0);
    }
  },

  lifetimes: {
    attached() {
      const sys = wx.getSystemInfoSync();
      this._pxRatio = sys.windowWidth / 750;
      wx.nextTick(() => {
        this._snapTo(this.data.currentIndex);
      });
    }
  },

  methods: {
    /**
     * 让第 index 项居中显示
     * 布局：spacer(160rpx) + item0(80rpx) + item1(80rpx) + ... + spacer(160rpx)
     * item N 的顶部位置 = SPACER + N * ITEM_HEIGHT (rpx)
     * 要让 item N 居中（出现在容器 200rpx 处），scrollTop = N * ITEM_HEIGHT (rpx)
     * 注意：spacer 已经把 item0 推到了 160rpx 位置，
     *       scrollTop=0 时 item0 中心 = 160+40 = 200rpx = 容器中心 ✓
     *       scrollTop = N*80rpx 时 itemN 中心 = 160+N*80+40 = 200+N*80 rpx
     *       视口中心 = scrollTop + 200 = N*80 + 200 rpx ✓
     */
    _snapTo(index) {
      const { items } = this.data;
      if (!items || items.length === 0) return;
      index = Math.max(0, Math.min(index, items.length - 1));

      const scrollTopPx = Math.round(index * ITEM_HEIGHT_RPX * this._pxRatio);

      if (scrollTopPx === this.data.scrollTop) {
        // scroll-top 相同时不会触发重渲染，先清零再设回来
        this.setData({ scrollTop: 0 });
        wx.nextTick(() => {
          this.setData({ currentIndex: index, scrollTop: scrollTopPx });
        });
      } else {
        this.setData({ currentIndex: index, scrollTop: scrollTopPx });
      }
    },

    onScroll(e) {
      const { items } = this.data;
      if (!items || items.length === 0) return;

      const scrollTopRpx = e.detail.scrollTop / this._pxRatio;
      let index = Math.round(scrollTopRpx / ITEM_HEIGHT_RPX);
      index = Math.max(0, Math.min(index, items.length - 1));

      if (index !== this.data.currentIndex) {
        this.setData({ currentIndex: index });
      }
    },

    onScrollEnd(e) {
      const { items } = this.data;
      if (!items || items.length === 0) return;

      // CSS snap 已吸附到最近项，只需算出停在了哪
      const scrollTopRpx = e.detail.scrollTop / this._pxRatio;
      let index = Math.round(scrollTopRpx / ITEM_HEIGHT_RPX);
      index = Math.max(0, Math.min(index, items.length - 1));

      this.setData({ currentIndex: index });
      this.triggerEvent('change', { value: items[index] });
    },

    onTapItem(e) {
      const index = e.currentTarget.dataset.index;
      const { items } = this.data;
      if (!items || index === undefined) return;

      this._snapTo(index);
      this.triggerEvent('change', { value: items[index] });
    }
  }
});
