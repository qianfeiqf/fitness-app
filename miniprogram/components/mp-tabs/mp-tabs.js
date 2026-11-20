Component({
  properties: {
    tabs: {
      type: Array,
      value: []
    },
    activeTab: {
      type: Number,
      value: 0
    }
  },

  methods: {
    onTapTab(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index) || index === this.data.activeTab) return;
      this.setData({ activeTab: index });
      this.triggerEvent('change', { index, tab: this.data.tabs[index] });
    }
  }
});
