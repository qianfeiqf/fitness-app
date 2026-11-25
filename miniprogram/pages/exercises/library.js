/**
 * 动作库页面
 */

const { find, insert } = require('../../localdb/db.js');

Page({
  data: {
    allExercises: [],
    filteredExercises: [],
    groupedExercises: [],
    searchKeyword: '',
    selectedGroup: '',
    selectedGroupIndex: 0,
    muscleGroups: ['胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'],
    muscleGroupTabs: [
      { title: '全部' },
      { title: '胸部' },
      { title: '背部' },
      { title: '下肢' },
      { title: '硬拉' },
      { title: '肩部' },
      { title: '手臂' },
      { title: '核心' }
    ],
    showAddCustom: false,
    dayOfWeek: null,
    selectedIds: [],
    selectedMap: {},
    customExercise: {
      name: '',
      name_en: '',
      muscle_group: '',
      muscleGroupIndex: 0
    }
  },

  onLoad(options) {
    // 从上一页传递的参数
    if (options.returnUrl) {
      this.setData({ returnUrl: options.returnUrl });
    }
    if (options.dayOfWeek) {
      this.setData({ dayOfWeek: parseInt(options.dayOfWeek) });
    }
    this.loadExercises();
  },

  /**
   * 加载动作库
   */
  loadExercises() {
    const exercises = find('exercises') || [];
    this.setData({ allExercises: exercises });
    this.applyFilters();
  },

  /**
   * 应用筛选
   */
  applyFilters() {
    let filtered = this.data.allExercises;
    const { searchKeyword, selectedGroup } = this.data;

    // 关键词筛选
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(keyword) ||
        (ex.name_en && ex.name_en.toLowerCase().includes(keyword))
      );
    }

    // 肌群筛选
    if (selectedGroup) {
      filtered = filtered.filter(ex => ex.muscle_group === selectedGroup);
    }

    // 按肌群分组
    const groupMap = {};
    const groupOrder = ['胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'];

    filtered.forEach(ex => {
      const group = ex.muscle_group;
      if (!groupMap[group]) {
        groupMap[group] = [];
      }
      groupMap[group].push(ex);
    });

    // 转换为数组并按固定顺序排序
    const grouped = [];
    groupOrder.forEach(group => {
      if (groupMap[group] && groupMap[group].length > 0) {
        grouped.push({ group, exercises: groupMap[group] });
      }
    });

    this.setData({
      filteredExercises: filtered,
      groupedExercises: grouped
    });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilters();
  },

  /**
   * 执行搜索
   */
  onSearch() {
    this.applyFilters();
  },

  /**
   * 清除搜索
   */
  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  /**
   * 切换肌群 Tab
   */
  onGroupTabChange(e) {
    const index = e.detail.index;
    const groups = ['', '胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'];
    this.setData({
      selectedGroupIndex: index,
      selectedGroup: groups[index] || ''
    });
    this.applyFilters();
  },

  /**
   * 勾选/取消勾选动作（支持一次多选）
   */
  onSelectExercise(e) {
    const exerciseId = e.currentTarget.dataset.exerciseId;
    if (!exerciseId) return;
    const { selectedIds, selectedMap } = this.data;
    const nextMap = { ...selectedMap };
    let nextIds;
    if (nextMap[exerciseId]) {
      delete nextMap[exerciseId];
      nextIds = selectedIds.filter(id => id !== exerciseId);
    } else {
      nextMap[exerciseId] = true;
      nextIds = [...selectedIds, exerciseId];
    }
    this.setData({ selectedIds: nextIds, selectedMap: nextMap });
  },

  /**
   * 批量确认添加已选动作
   */
  onConfirmSelect() {
    const { selectedIds, allExercises, dayOfWeek } = this.data;
    if (!selectedIds || selectedIds.length === 0) {
      wx.showToast({ title: '请先选择至少一个动作', icon: 'none' });
      return;
    }
    const exMap = {};
    allExercises.forEach(ex => { exMap[ex.id] = ex; });
    const chosen = selectedIds
      .map(id => exMap[id])
      .filter(Boolean)
      .map(ex => ({ ...ex, dayOfWeek }));

    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage && typeof prevPage.selectExercises === 'function') {
      prevPage.selectExercises(chosen);
    } else if (prevPage && typeof prevPage.selectExercise === 'function') {
      chosen.forEach(ex => prevPage.selectExercise(ex));
    }

    wx.navigateBack();
  },

  /**
   * 显示添加自定义动作弹窗
   */
  onShowAddCustom() {
    this.setData({
      showAddCustom: true,
      customExercise: {
        name: '',
        name_en: '',
        muscle_group: '',
        muscleGroupIndex: 0
      }
    });
  },

  /**
   * 关闭添加弹窗
   */
  onCloseAddCustom() {
    this.setData({ showAddCustom: false });
  },

  /**
   * 输入自定义动作名称
   */
  onInputCustomName(e) {
    this.setData({
      'customExercise.name': e.detail.value
    });
  },

  /**
   * 输入自定义动作英文名
   */
  onInputCustomNameEn(e) {
    this.setData({
      'customExercise.name_en': e.detail.value
    });
  },

  /**
   * 选择肌群
   */
  onSelectMuscleGroup(e) {
    const index = parseInt(e.detail.value);
    const muscleGroups = this.data.muscleGroups;
    this.setData({
      'customExercise.muscle_group': muscleGroups[index],
      'customExercise.muscleGroupIndex': index
    });
  },

  /**
   * 确认添加自定义动作
   */
  onConfirmAddCustom() {
    const { name, name_en, muscle_group } = this.data.customExercise;

    if (!name.trim()) {
      wx.showToast({ title: '请输入动作名称', icon: 'none' });
      return;
    }

    if (!muscle_group) {
      wx.showToast({ title: '请选择肌群', icon: 'none' });
      return;
    }

    const exercise = {
      id: 'cust_' + Date.now(),
      name: name.trim(),
      name_en: name_en ? name_en.trim() : '',
      muscle_group: muscle_group,
      is_system: false,
      alternatives: [],
      created_at: Date.now()
    };

    insert('exercises', exercise);

    this.setData({ showAddCustom: false });
    this.loadExercises();

    wx.showToast({ title: '动作已添加', icon: 'success' });
  },

  /**
   * 阻止事件冒泡
   */
  noop() {}
});
