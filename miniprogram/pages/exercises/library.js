/**
 * 动作库页面
 */

const { find, insert, MUSCLE_SUB_GROUPS } = require('../../localdb/db.js');

Page({
  data: {
    allExercises: [],
    filteredExercises: [],
    groupedExercises: [],
    searchKeyword: '',
    selectedGroup: '',
    selectedGroupIndex: 0,
    subMuscles: [],
    selectedSubMuscle: '全部',
    muscleGroups: ['胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'],
    muscleGroupTabs: [
      { title: '全部' },
      { title: '自定义' },
      { title: '胸部' },
      { title: '背部' },
      { title: '下肢' },
      { title: '硬拉' },
      { title: '肩部' },
      { title: '手臂' },
      { title: '核心' }
    ],
    showAddCustom: false,
    showExerciseDetail: false,
    detailExercise: null,
    gifLoadError: false,
    playingExerciseId: '',
    thumbErrorMap: {},
    dayOfWeek: null,
    selectedIds: [],
    selectedMap: {},
    customExercise: {
      name: '',
      muscle_group: '',
      equipment: ''
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
    const { searchKeyword, selectedGroup, selectedSubMuscle } = this.data;

    // 关键词筛选
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(keyword) ||
        (ex.name_en && ex.name_en.toLowerCase().includes(keyword)) ||
        (ex.aliases && ex.aliases.toLowerCase().includes(keyword)) ||
        (ex.sub_muscle && ex.sub_muscle.toLowerCase().includes(keyword)) ||
        (ex.equipment && ex.equipment.toLowerCase().includes(keyword))
      );
    }

    // 一级肌群筛选（支持快速筛选自定义动作）
    if (selectedGroup === '__custom__') {
      filtered = filtered.filter(ex => ex.is_system === false);
    } else if (selectedGroup) {
      filtered = filtered.filter(ex => ex.muscle_group === selectedGroup);
    }

    // 二级细分筛选
    if (selectedSubMuscle && selectedSubMuscle !== '全部') {
      filtered = filtered.filter(ex => ex.sub_muscle === selectedSubMuscle);
    }

    // 按肌群分组
    const groupMap = {};
    const groupOrder = ['胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'];

    filtered.forEach(ex => {
      const group = ex.muscle_group || '其他';
      if (!groupMap[group]) {
        groupMap[group] = [];
      }
      groupMap[group].push(ex);
    });

    // 转换为数组并按固定顺序排序（兼容自定义其他分组）
    const grouped = [];
    groupOrder.forEach(group => {
      if (groupMap[group] && groupMap[group].length > 0) {
        grouped.push({ group, exercises: groupMap[group] });
      }
    });
    Object.keys(groupMap).forEach(group => {
      if (!groupOrder.includes(group) && groupMap[group].length > 0) {
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
    const groups = ['', '__custom__', '胸部', '背部', '下肢', '硬拉', '肩部', '手臂', '核心'];
    const group = groups[index] || '';
    const subs = (group && group !== '__custom__' && MUSCLE_SUB_GROUPS[group]) ? ['全部', ...MUSCLE_SUB_GROUPS[group]] : [];
    this.setData({
      selectedGroupIndex: index,
      selectedGroup: group,
      subMuscles: subs,
      selectedSubMuscle: '全部'
    });
    this.applyFilters();
  },

  onSelectSubMuscle(e) {
    const sub = e.currentTarget.dataset.sub || '全部';
    this.setData({ selectedSubMuscle: sub });
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
    const preselected = this.data.muscleGroups.includes(this.data.selectedGroup)
      ? this.data.selectedGroup
      : '';
    this.setData({
      showAddCustom: true,
      customExercise: {
        name: '',
        muscle_group: preselected,
        equipment: ''
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
   * 输入常用器械（可选）
   */
  onInputCustomEquipment(e) {
    this.setData({
      'customExercise.equipment': e.detail.value
    });
  },

  /**
   * 选择肌群胶囊
   */
  onSelectMuscleGroup(e) {
    const muscle = e.currentTarget.dataset.muscle || '';
    this.setData({
      'customExercise.muscle_group': muscle
    });
  },

  /**
   * 确认添加自定义动作（同名去重 + 静默云同步）
   */
  onConfirmAddCustom() {
    const { name, muscle_group, equipment } = this.data.customExercise;
    const trimmedName = (name || '').trim();

    if (!trimmedName) {
      wx.showToast({ title: '请输入动作名称', icon: 'none' });
      return;
    }

    if (!muscle_group) {
      wx.showToast({ title: '请选择所属肌群', icon: 'none' });
      return;
    }

    const existing = (this.data.allExercises || []).find(
      ex => ex && ex.name && ex.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      wx.showToast({ title: '动作库中已有同名动作', icon: 'none' });
      return;
    }

    const exercise = {
      id: 'cust_' + Date.now(),
      name: trimmedName,
      muscle_group,
      equipment: (equipment || '').trim(),
      is_system: false,
      alternatives: [],
      created_at: Date.now()
    };

    insert('exercises', exercise);
    const app = getApp();
    if (app && typeof app.startSync === 'function') {
      app.startSync();
    }

    this.setData({ showAddCustom: false });
    this.loadExercises();

    wx.showToast({ title: '自定义动作已添加', icon: 'success' });
  },

  onTogglePreviewGif(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId) return;
    const ex = this.data.allExercises.find(item => item.id === exerciseId);
    if (!ex) return;
    if (!ex.gif_url) {
      this.setData({ showExerciseDetail: true, detailExercise: ex, gifLoadError: false });
      return;
    }
    this.setData({
      playingExerciseId: this.data.playingExerciseId === exerciseId ? '' : exerciseId
    });
  },

  onThumbError(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId || this.data.thumbErrorMap[exerciseId]) return;
    this.setData({ [`thumbErrorMap.${exerciseId}`]: true });
  },

  /**
   * 查看动作要领抽屉
   */
  onViewExerciseDetail(e) {
    const { exerciseId } = e.currentTarget.dataset;
    if (!exerciseId) return;
    const ex = this.data.allExercises.find(item => item.id === exerciseId);
    if (!ex) return;
    this.setData({
      showExerciseDetail: true,
      detailExercise: ex,
      gifLoadError: false
    });
  },

  onGifLoadError() {
    this.setData({ gifLoadError: true });
  },

  onCloseExerciseDetail() {
    this.setData({
      showExerciseDetail: false,
      detailExercise: null,
      gifLoadError: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  noop() {}
});
