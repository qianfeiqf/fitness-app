/**
 * 计划管理页面
 */

const { find, findOne, insert, update, remove } = require('../../localdb/db.js');

Page({
  data: {
    plans: [],
    activePlan: null,
    templates: [],
    filteredTemplates: [],
    loading: true,
    showCreateModal: false,
    showCloneModal: false,
    showTemplateDetailModal: false,
    selectedTemplate: null,
    templateExerciseList: [],
    showTemplateIntroModal: false,
    newPlanName: '',
    cloneSource: null,
    filterDays: 0, // 0 表示全部
    filterOptions: [0, 3, 4, 5, 6], // 全部、3天、4天、5天、6天
    filterDifficulty: '', // '' 表示全部
    filterDifficultyOptions: ['', '入门', '中级', '进阶'] // 全部、入门、中级、进阶
  },

  onLoad() {
    this.loadPlans();
    this.loadTemplates();
  },

  onShow() {
    this.loadPlans();
  },

  /**
   * 空操作（阻止事件冒泡）
   */
  noop() {},

  /**
   * 加载用户计划
   */
  loadPlans() {
    this.setData({ loading: true });

    const plans = find('plans') || [];

    // 进行中的计划排在前面
    plans.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (b.created_at || 0) - (a.created_at || 0);
    });

    this.setData({
      plans,
      loading: false
    });
  },

  /**
   * 加载经典计划模板
   */
  loadTemplates() {
    // 内置经典计划列表（硬编码，确保始终有数据）
    const defaultTemplates = [
      // 每周3天
      {
        id: 'tpl_5x5',
        name: '5x5 力量计划',
        description: '经典增肌增力计划，每周3次，适合入门',
        difficulty: '入门',
        training_days: 3,
        background: '5x5计划是力量训练领域最经典的入门计划之一，由著名力量训练专家Bill Starr创立。这种训练方法以其简单高效著称，通过每周3次、每次3个动作的简洁安排，帮助无数初学者在短时间内实现显著的力量增长。',
        suitable_for: '健身初学者、希望建立力量基础的训练者、健身房时间有限的上班族。该计划特别适合那些想要系统训练但不知从何开始的入门者。',
        notes: '新手建议从空杠或较轻重量开始，重点掌握动作技术。深蹲是计划的核心，不要跳过。保证每晚7-8小时睡眠，肌肉在休息时生长。'
      },
      {
        id: 'tpl_stronglifts',
        name: 'StrongLifts 5x5',
        description: 'StrongLifts经典版本，侧重深蹲，适合初学者打基础',
        difficulty: '入门',
        training_days: 3,
        background: 'StrongLifts 5x5由健身教练 Mehdi 创立，是5x5计划的现代版本。相比传统5x5，它更加专注于深蹲、硬拉、卧推三大复合动作，采用AB交替模式，每周仅需3天即可完成全身训练。',
        suitable_for: '健身新手、想要打好力量基础的训练者、时间紧张但希望高效训练的人群。对深蹲和硬拉有较大兴趣的男性训练者尤为适合。',
        notes: '每次训练前做好充分热身，特别是肩部和手腕。A日深蹲后次日可能会有延迟性酸痛，属正常现象。重量选择以能完成5x5为准，避免过轻。'
      },
      {
        id: 'tpl_starting',
        name: 'Starting Strength',
        description: 'Mark Rippetoe经典入门计划，以三大项为核心',
        difficulty: '入门',
        training_days: 3,
        background: 'Starting Strength（SS计划）由著名力量教练 Mark Rippetoe 所著同名书籍中提出，是力量训练领域最具影响力的入门计划之一。该计划基于杠铃训练，通过循序渐进的方式帮助新手在最短时间内掌握三大项并建立力量基础。',
        suitable_for: '完全健身新手、想要系统学习杠铃技术的男性训练者、目标是提升深蹲/硬拉/卧推三大项成绩的训练者。',
        notes: '强烈建议在有经验的人指导下进行，特别是硬拉和深蹲技术。每周体重+0.5kg是合理的增重目标。如出现关节疼痛，应及时降低重量或就医。'
      },
      {
        id: 'tpl_texas',
        name: 'Texas Method',
        description: '进阶每周3天计划，周一容量/周三强度/周五辅助',
        difficulty: '中级',
        training_days: 3,
        background: 'Texas Method（德州方法）是由Randy DuBose创建的进阶训练计划，是5x5计划的自然延伸。该计划将一周三次训练分为：周一容量日（大量训练）、周三强度日（极限重量）、周五辅助日（补充训练），形成完整的训练周期。',
        suitable_for: '已完成入门计划（如5x5、SS）并希望进一步提升力量的训练者。有一定深蹲/硬拉基础，想要系统性进阶的中级训练者。',
        notes: '进入该计划前应已熟练掌握三大项技术。每周重量递增幅度减小（约+2.5kg），更注重恢复。如出现训练过度症状（疲劳累积、力量下降），应安排一周减量休息。'
      },
      // 每周4天
      {
        id: 'tpl_upper_lower',
        name: '上下肢分化（4天）',
        description: '上下肢交替训练，每周4次，平衡发展',
        difficulty: '中级',
        training_days: 4,
        background: '上下肢分化训练是健身领域最经典的训练分化方式之一。通过将身体分为上肢和下肢两个部分交替训练，可以在保证每次训练强度的同时，实现每周4次的高频训练。',
        suitable_for: '有1-2年训练基础、想要均衡发展上下肢围度和力量的训练者。希望改善体态、增强上肢推拉能力的健身爱好者。',
        notes: '注意上下肢训练的配对平衡，避免某一部位过度发达。建议上肢日多练背，下肢日重视股四和臀肌。单次训练控制在90分钟内。'
      },
      {
        id: 'tpl_pplr',
        name: 'PPLR 推拉腿休息',
        description: 'PPL简化版，每周4次，适合时间有限但想全面训练的人群',
        difficulty: '入门',
        training_days: 4,
        background: 'PPLR是经典推（Push）、拉（Pull）、腿（Legs）分化训练休息（Rest）模式的简化版本。原始PPL通常需要每周6天，而PPLR通过压缩每周至4天，让时间有限的训练者也能享受分化训练的好处。',
        suitable_for: '每周可投入3-4天训练的上班族、学生党。想要系统训练但无法频繁健身的人群。希望在较短时间内保持全身训练效果的健身者。',
        notes: '虽然只有4天，但每个部位的训练量足够保持和增长。建议固定训练日（如周一、二、四、五），便于养成习惯。休息日在身体状态好时可进行轻度有氧。'
      },
      {
        id: 'tpl_aba',
        name: 'ABA BAB 上下肢',
        description: '上下肢交替，每周4次，适合中级',
        difficulty: '中级',
        training_days: 4,
        background: 'ABA BAB模式是上下肢分化的变体，A日练上肢、B日练下肢，第二周交替进行。相比简单的上下肢二分法，ABA BAB通过动作编排的变化，让每次训练的重点略有不同，避免适应并促进持续进步。',
        suitable_for: '有2年以上系统训练经验的中级训练者。已掌握主要复合动作技术，想要进一步提升肌肉分离度和力量水平的人群。',
        notes: '两个cycle的动作安排应有差异化，如A日卧推为主、B日肩推为主。注意观察身体的恢复状态，如连续疲劳可临时改为PPLR模式过渡。'
      },
      // 每周5天
      {
        id: 'tpl_nsuns',
        name: 'nSuns 5/3/1 LP',
        description: '基于5/3/1原理的线性递增计划，每周5次，强度递增',
        difficulty: '进阶',
        training_days: 5,
        background: 'nSuns计划由Reddit健身社区的用户nSuns创建，是5/3/1计划的变体。该计划继承了5/3/1的周期训练原理，但采用更激进的线性递增模式，并增加至每周5次训练，以大量的训练容量驱动力量和肌肉增长。',
        suitable_for: '已有扎实力量基础（深蹲/硬拉/卧推至少达到1倍体重）的进阶训练者。对训练容量有较高耐受度、追求快速增长的高级训练者。',
        notes: '该计划训练量极大， recovery nutrition至关重要。建议额外摄入蛋白质和碳水化合物。如出现持续疲劳或力量下降，应跳过一次cycle的增重。'
      },
      // 每周6天
      {
        id: 'tpl_ppl',
        name: 'PPL 推拉腿',
        description: '分化训练，每周6次，适合进阶',
        difficulty: '进阶',
        training_days: 6,
        background: 'PPL（Push Pull Legs）是目前最流行的健身分化训练体系之一，源自力量训练和健美训练的结合。推日训练胸部/肩部/三头肌，拉日训练背部/二头肌，腿日训练下肢，形成完整的每周6天训练循环。',
        suitable_for: '有2-3年以上系统训练经验的高级训练者。每周有充足时间（至少6天）投入健身的爱好者。对身体各部位分离度有较高要求的健美方向训练者。',
        notes: '分化细致意味着单部位每周仅训练2次，注意训练频率带来的恢复压力。建议配合充足的睡眠（8小时+）和高蛋白饮食。如出现过度训练迹象，应及时减少容量或休息。'
      },
      {
        id: 'tpl_ppl_intense',
        name: 'PPL 强化版',
        description: 'PPL高容量版本，每周6次，适合有一定基础的训练者',
        difficulty: '进阶',
        training_days: 6,
        background: 'PPL强化版是在标准PPL基础上增加更多复合动作和辅助动作的高容量版本。每个部位安排更多动作组数和不同的动作变体，以更大的训练量和动作多样性驱动肌肉和力量的进一步增长。',
        suitable_for: '有3年以上系统训练经验的高级训练者。曾有过类似PPL计划训练基础的人群。对肌肉量和分离度都有较高要求的进阶健美/力量训练者。',
        notes: '高容量意味着对营养和恢复的要求更高。建议每日蛋白质摄入达到2g/kg体重。可考虑在非训练日加入20-30分钟低强度有氧促进恢复。'
      }
    ];

    // 尝试从数据库加载，如果没有则使用内置列表
    const dbTemplates = find('plan_templates');
    const templates = (dbTemplates && dbTemplates.length > 0) ? dbTemplates : defaultTemplates;

    this.setData({
      templates,
      filteredTemplates: templates
    });
  },

  /**
   * 显示创建计划弹窗
   */
  onShowCreateModal() {
    this.setData({ showCreateModal: true });
  },

  /**
   * 取消创建
   */
  onCancelCreate() {
    this.setData({
      showCreateModal: false,
      newPlanName: ''
    });
  },

  /**
   * 输入新计划名称
   */
  onInputPlanName(e) {
    this.setData({ newPlanName: e.detail.value });
  },

  /**
   * 创建空白计划
   */
  onCreatePlan() {
    if (!this.data.newPlanName.trim()) {
      wx.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    const plan = {
      id: 'plan_' + Date.now(),
      name: this.data.newPlanName.trim(),
      status: 'active',
      cycle_type: 'natural_week',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    insert('plans', plan);

    this.setData({
      showCreateModal: false,
      newPlanName: ''
    });

    this.loadPlans();
    wx.showToast({ title: '计划已创建', icon: 'success' });
  },

  /**
   * 显示克隆模板弹窗
   */
  onShowCloneTemplateModal(e) {
    const { templateId } = e.currentTarget.dataset;
    const template = this.data.templates.find(t => t.id === templateId);

    if (template) {
      this.setData({
        showCloneModal: true,
        cloneSource: { type: 'template', data: template },
        newPlanName: template.name + ' (副本)'
      });
    }
  },

  /**
   * 显示克隆计划弹窗（克隆已有计划）
   */
  onShowClonePlanModal(e) {
    const { planId } = e.currentTarget.dataset;
    const plan = findOne('plans', { id: planId });

    if (plan) {
      this.setData({
        showCloneModal: true,
        cloneSource: { type: 'plan', data: plan },
        newPlanName: plan.name + ' (副本)'
      });
    }
  },

  /**
   * 取消克隆
   */
  onCancelClone() {
    this.setData({
      showCloneModal: false,
      cloneSource: null,
      newPlanName: ''
    });
  },

  /**
   * 确认克隆
   */
  onConfirmClone() {
    if (!this.data.newPlanName.trim()) {
      wx.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    const { cloneSource } = this.data;
    if (!cloneSource) return;

    let newPlan;

    if (cloneSource.type === 'template') {
      newPlan = this.cloneFromTemplate(cloneSource.data);
    } else if (cloneSource.type === 'plan') {
      newPlan = this.cloneFromPlan(cloneSource.data);
    }

    if (newPlan) {
      insert('plans', newPlan);
      this.setData({
        showCloneModal: false,
        cloneSource: null,
        newPlanName: ''
      });
      this.loadPlans();
      wx.showToast({ title: '计划克隆成功', icon: 'success' });
    }
  },

  /**
   * 从模板克隆计划
   */
  cloneFromTemplate(template) {
    const plan = {
      id: 'plan_' + Date.now(),
      name: this.data.newPlanName.trim(),
      status: 'draft',
      cycle_type: template.cycle_type || 'natural_week',
      description: template.description,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // 克隆模板动作
    if (template.exercises && template.exercises.length > 0) {
      template.exercises.forEach(ex => {
        const planExercise = {
          id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          plan_id: plan.id,
          exercise_id: ex.exercise_id,
          day_of_week: ex.day_of_week,
          cycle_label: ex.cycle_label,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          initial_weight: ex.initial_weight,
          rest_seconds: ex.rest_seconds || 120,
          created_at: Date.now()
        };
        insert('plan_exercises', planExercise);
      });
    }

    return plan;
  },

  /**
   * 从已有计划克隆
   */
  cloneFromPlan(sourcePlan) {
    const plan = {
      id: 'plan_' + Date.now(),
      name: this.data.newPlanName.trim(),
      status: 'draft',
      cycle_type: sourcePlan.cycle_type || 'natural_week',
      description: sourcePlan.description,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    // 克隆计划动作
    const sourceExercises = find('plan_exercises', { plan_id: sourcePlan.id });
    if (sourceExercises && sourceExercises.length > 0) {
      sourceExercises.forEach(ex => {
        const planExercise = {
          id: 'pe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          plan_id: plan.id,
          exercise_id: ex.exercise_id,
          day_of_week: ex.day_of_week,
          cycle_label: ex.cycle_label,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          initial_weight: ex.initial_weight,
          rest_seconds: ex.rest_seconds || 120,
          created_at: Date.now()
        };
        insert('plan_exercises', planExercise);
      });
    }

    return plan;
  },

  /**
   * 激活/停用计划
   */
  onActivatePlan(e) {
    const { planId } = e.currentTarget.dataset;
    const plan = findOne('plans', { id: planId });

    if (!plan) return;

    // 切换激活状态：进行中 <-> 已归档
    const newStatus = plan.status === 'active' ? 'archived' : 'active';
    update('plans', planId, { status: newStatus });

    this.loadPlans();
    wx.showToast({
      title: newStatus === 'active' ? '计划已激活' : '计划已停用',
      icon: 'success'
    });
  },

  /**
   * 删除计划
   */
  onDeletePlan(e) {
    const { planId } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？删除后无法恢复',
      confirmColor: '#e63946',
      success: (res) => {
        if (res.confirm) {
          // 删除计划下的所有动作
          const planExercises = find('plan_exercises', { plan_id: planId });
          planExercises.forEach(pe => {
            remove('plan_exercises', pe.id);
          });

          // 删除计划
          remove('plans', planId);

          this.loadPlans();
          wx.showToast({ title: '计划已删除', icon: 'success' });
        }
      }
    });
  },

  /**
   * 查看计划详情
   */
  onViewPlanDetail(e) {
    const { planId } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/plans/detail/detail?planId=' + planId
    });
  },

  /**
   * 查看模板详情
   */
  onViewTemplateDetail(e) {
    const { templateId } = e.currentTarget.dataset;
    const template = this.data.templates.find(t => t.id === templateId);

    if (template) {
      // 获取动作名称映射
      const exercises = find('exercises') || [];
      const exerciseMap = {};
      exercises.forEach(ex => {
        exerciseMap[ex.id] = ex.name;
      });

      // 构建训练安排展示列表
      const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const exerciseList = [];

      if (template.exercises && template.exercises.length > 0) {
        // 按训练日分组
        const dayGroups = {};
        template.exercises.forEach(ex => {
          const day = ex.day_of_week || 0;
          if (!dayGroups[day]) {
            dayGroups[day] = [];
          }
          // 添加动作名称
          ex.name = exerciseMap[ex.exercise_id] || ex.exercise_id;
          dayGroups[day].push(ex);
        });

        // 转换为展示列表
        Object.keys(dayGroups).sort().forEach(day => {
          exerciseList.push({
            day: parseInt(day),
            dayLabel: dayLabels[parseInt(day)] || '第' + (parseInt(day) + 1) + '天',
            exercises: dayGroups[day]
          });
        });
      }

      this.setData({
        showTemplateDetailModal: true,
        selectedTemplate: template,
        templateExerciseList: exerciseList
      });
    }
  },

  /**
   * 关闭模板详情弹窗
   */
  onCloseTemplateDetail() {
    this.setData({
      showTemplateDetailModal: false,
      selectedTemplate: null,
      templateExerciseList: []
    });
  },

  /**
   * 按训练天数筛选
   */
  onFilterByDays(e) {
    const days = e.currentTarget.dataset.days;
    const { filterDays } = this.data;

    // 如果点击当前已选中的标签，则切换为"全部"
    const newFilterDays = filterDays === days ? 0 : days;

    this.applyFilters({ filterDays: newFilterDays });
  },

  /**
   * 按难度筛选
   */
  onFilterByDifficulty(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    const { filterDifficulty } = this.data;

    // 如果点击当前已选中的标签，则切换为"全部"
    const newFilterDifficulty = filterDifficulty === difficulty ? '' : difficulty;

    this.applyFilters({ filterDifficulty: newFilterDifficulty });
  },

  /**
   * 应用筛选
   */
  applyFilters({ filterDays, filterDifficulty } = {}) {
    const { templates, filterDays: fd, filterDifficulty: fdif } = this.data;
    const days = filterDays !== undefined ? filterDays : fd;
    const difficulty = filterDifficulty !== undefined ? filterDifficulty : fdif;

    let filteredTemplates = templates;

    // 按天数筛选
    if (days > 0) {
      filteredTemplates = filteredTemplates.filter(t => t.training_days === days);
    }

    // 按难度筛选
    if (difficulty) {
      filteredTemplates = filteredTemplates.filter(t => t.difficulty === difficulty);
    }

    this.setData({
      filterDays: days,
      filterDifficulty: difficulty,
      filteredTemplates
    });
  },

  /**
   * 显示计划详细介绍
   */
  onShowTemplateIntro(e) {
    const { templateId } = e.currentTarget.dataset;
    const template = this.data.templates.find(t => t.id === templateId);

    if (template) {
      this.setData({
        showTemplateIntroModal: true,
        selectedTemplate: template
      });
    }
  },

  /**
   * 关闭计划介绍弹窗
   */
  onCloseTemplateIntro() {
    this.setData({
      showTemplateIntroModal: false
    });
  }
});
