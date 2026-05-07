/**
 * 计划管理页面
 */

const { find, findOne, insert, update, remove, getCollection, getPlanTemplatesSeedData } = require('../../localdb/db.js');

Page({
  data: {
    plans: [],
    activePlan: null,
    templates: [],
    filteredTemplates: [],
    loading: true,
    showCloneModal: false,
    showTemplateDetailModal: false,
    selectedTemplate: null,
    templateExerciseList: [],
    showTemplateIntroModal: false,
    cloneSource: null,
    filterDays: 0,
    filterOptions: [0, 3, 4, 5, 6],
    filterDifficulty: '',
    filterDifficultyOptions: ['', '入门', '中级', '进阶'],
    difficultyTabs: [
      { title: '全部' },
      { title: '入门' },
      { title: '中级' },
      { title: '进阶' }
    ],
    difficultyTabIndex: 0,
    daysTabs: [
      { title: '全部' },
      { title: '3天' },
      { title: '4天' },
      { title: '5天' },
      { title: '6天' }
    ],
    daysTabIndex: 0,

    // 计划推荐向导
    showRecommendModal: false,
    recommendStep: 1,
    wizardGoals: [
      { id: 'muscle', name: '增肌塑形', icon: '\u{1F4AA}', desc: '增加肌肉量，改善体型线条' },
      { id: 'fatloss', name: '减脂瘦身', icon: '\u{1F525}', desc: '降低体脂率，提升代谢水平' },
      { id: 'strength', name: '力量提升', icon: '\u{1F3CB}', desc: '提升最大力量，突破重量瓶颈' },
      { id: 'general', name: '综合健康', icon: '❤', desc: '全面提升身体素质，保持健康' }
    ],
    wizardSelectedGoal: null,
    wizardDayOptions: [
      { days: 2, desc: '轻松入门' },
      { days: 3, desc: '经典安排' },
      { days: 4, desc: '进阶训练' },
      { days: 5, desc: '密集训练' },
      { days: 6, desc: '硬核模式' }
    ],
    wizardSelectedDays: null,
    wizardExpOptions: [
      { id: 'beginner', name: '纯新手', tag: '入门', icon: '\u{1F331}', desc: '刚开始接触健身，或从未系统训练过' },
      { id: 'intermediate', name: '有半年经验', tag: '中级', icon: '\u{1F33F}', desc: '已经训练过一段时间，熟悉基础动作' },
      { id: 'advanced', name: '老手', tag: '进阶', icon: '\u{1F333}', desc: '系统训练一年以上，追求突破' }
    ],
    wizardSelectedExp: null,
    wizardRecommended: [],
    wizardSelectedPlan: null
  },

  onLoad() {
    this.loadPlans();
    this.loadTemplates();
  },

  onShow() {
    this.loadPlans();
  },

  /** 阻止弹窗打开时背景页面滚动 */
  preventTouchMove() {},

  /**
   * 跳转到新建计划页面
   */
  onNavigateToCreate() {
    wx.navigateTo({
      url: '/pages/plans/create/create'
    });
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

    const plans = [...(find('plans') || [])];

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
    // 尝试从数据库加载
    let dbTemplates = find('plan_templates');

    // 如果数据库中没有模板，使用种子数据初始化
    if (!dbTemplates || dbTemplates.length === 0) {
      const seedTemplates = getPlanTemplatesSeedData();
      seedTemplates.forEach(tpl => {
        insert('plan_templates', tpl);
      });
      dbTemplates = find('plan_templates');
    }

    // 确保模板数据包含文字介绍（背景、适用人群、注意事项）
    const enrichedTemplates = dbTemplates.map(tpl => {
      // 查找内置介绍数据
      const intro = this.getTemplateIntro(tpl.id);
      return {
        ...tpl,
        ...intro
      };
    });

    this.setData({
      templates: enrichedTemplates,
      filteredTemplates: enrichedTemplates
    });
  },

  /**
   * 获取模板的文字介绍（背景、适用人群、注意事项）
   */
  getTemplateIntro(templateId) {
    const intros = {
      'tpl_5x5': {
        background: '5×5训练法是力量训练领域历史最悠久、最经典的入门计划之一，由美国运动医学博士Bill Starr于1970年代创立。Bill Starr是力量训练领域的传奇人物，他的著作《The Strongest Shall Survive》奠定了现代力量训练的基础。5×5计划的核心哲学是"少即是多"——每周仅需3天（通常为周一/周三/周五），每次仅需3个杠铃复合动作，却能带来惊人的力量增长。这种极简主义设计让它成为健身房入门者的最佳选择：不需要复杂的分化、不需要花哨的器械，只需要杠铃和恒心。50年来，它帮助了全球数百万健身新手完成了从零到有一定力量基础的蜕变。',
        suitable_for: '健身初学者（训练经验0-1年）；希望系统学习杠铃基础技术的爱好者；时间紧张但追求效率的上班族；想要建立扎实力量基础的任何人群。该计划尤其适合以深蹲、卧推、硬拉三大项为目标、希望在6-12个月内实现显著力量增长的新手。对于女性训练者同样适用，但起始重量需要根据个人情况调整。',
        notes: '新手务必从空杠或极轻重量开始，把前2-3周完全用于技术打磨，不要急于加重。深蹲是整个计划的基石，无论如何不要跳过。饮食方面建议每日热量盈余300-500大卡，蛋白质摄入1.6-2g/kg体重。保证每晚7-9小时睡眠，肌肉在休息时生长。进阶标志：连续3周同一重量能轻松完成5×5，即可增加2.5kg（深蹲/卧推）或5kg（硬拉）。'
      },
      'tpl_starting': {
        background: 'Starting Strength由著名力量教练Mark Rippetoe在2005年出版的同名书籍中系统阐述，被誉为"健身新手的圣经"。Rippetoe是力量训练领域最受尊敬的权威之一，同时也是Aasgaard公司的创始人，致力于推广杠铃训练。他的SS计划基于一个核心洞察：新手期是力量增长的黄金窗口——在这个阶段，身体对训练刺激的反应最为强烈，神经-肌肉适应最为迅速，可以在最短时间内实现最大幅度的力量提升。该计划的独特之处在于坚持只做杠铃复合动作，完全排除孤立动作，相信新手最需要的是建立神经-肌肉协调性和基础力量，而非过早的肌肉分化训练。',
        suitable_for: '完全零基础的新手（建议18-45岁男性优先考虑）；希望系统学习杠铃技术（特别是深蹲和硬拉）的训练者；目标是大幅提升三大项成绩（深蹲/硬拉/卧推1RM）的爱好者；愿意严格遵循计划、不追求花哨训练方式的健身者。该计划对女性的适用性同样很高，但起始重量和递增幅度需要相应调整。',
        notes: '强烈建议在有经验的力量教练或老手指导下进行前2-3个月的训练，特别是深蹲和硬拉的技术学习。起始重量建议：深蹲和卧推从空杠开始，硬拉从60kg开始。每周按2.5kg（深蹲/卧推）和5kg（硬拉）递增。到第三周如果能完成全部5×5，则下周加重；如果无法完成，则退回到本周重量重复一周。每周体重目标是增加0.5-1kg（以肌肉增长为主）。如出现关节疼痛（特别是膝盖和下背部），立即停止并寻求专业指导。'
      },
      'tpl_texas': {
        background: 'Texas Method（德州方法）由Randy DuBose在1980年代创建，得名于他在德克萨斯州的训练营。该计划是5×5计划的自然延伸，专门设计用于帮助已经完成入门阶段的训练者实现从"新手"到"中级"的过渡。Texas Method的核心创新在于其精妙的周期化设计：周一容量日（Volume Day）以5×5的大容量建立训练刺激，周三强度日（Intensity Day）以1×5或更少次数冲击极限重量，周五辅助日（Recovery Day）通过轻量辅助动作补充弱点并促进恢复。这种"容量-强度-辅助"的三日循环完美模拟了力量训练的周期原理，也被称为"周间周期化"。',
        suitable_for: '已完成3-6个月5×5或SS计划的训练者；深蹲/硬拉/卧推三大项已超过1倍体重的中级训练者；希望系统学习周期化训练原理的进阶爱好者；需要每周仅3天训练但不想牺牲力量增长的高阶人群。进入该计划前应已熟练掌握三大项技术动作。',
        notes: '进入该计划前的门槛：深蹲至少1.5倍体重、硬拉至少1.8倍体重、卧推至少1倍体重，且技术动作完全稳定。典型增重幅度：每周约+2.5kg（深蹲/卧推）和+5kg（硬拉），具体根据恢复情况调整。三个训练日的安排建议固定（如周一/周三/周五），便于身体形成恢复节奏。如出现连续2周以上力量停滞或疲劳累积，应主动减量10%休息一周。'
      },
      'tpl_upper_lower': {
        background: '上下肢分化（Upper/Lower）是力量训练和健美领域最经典、应用最广泛的训练分化方式之一。其核心理念是将身体分为"上肢"和"下肢"两个功能系统，通过交替训练实现高频刺激和充分恢复的完美平衡。这种分化方式的优势在于：每次训练可以集中注意力在特定的肌肉群和动作模式上（如上肢日专注于推拉动作，下肢日专注于蹲腿动作），同时保证每周每个部位至少被训练2次。',
        suitable_for: '有1-2年系统训练基础的中级训练者；想要均衡发展上肢（特别是背部厚度和肩部立体感）和下肢（臀腿线条）的健身爱好者；希望通过训练改善体态（圆肩、骨盆前倾等）的人群；每周可投入4天训练的爱好者。',
        notes: '上下肢日的训练量分配建议：上肢日重点练背（划船、引体向上）和卧推，下肢日重点练深蹲和硬拉。每周应至少有一次背部训练以对抗大量卧推带来的前链紧张。建议在上下肢训练间隙加入1-2次20-30分钟低强度有氧（走路、骑行），促进恢复而不影响力量生长。单次训练时间建议控制在75-90分钟内。'
      },
      'tpl_pplr': {
        background: 'PPL（Push Pull Legs）是目前全球最流行、最主流的训练分化体系，源自数十年力量举和健美训练的经验总结。PPLR是该体系的4天压缩版本，将原本每周6天的完整PPL循环压缩为4天，通过精选每个部位的精华动作，确保在有限时间内仍能获得完整的分化训练效果。',
        suitable_for: '每周可投入3-4天训练的上班族、学生党；希望系统训练但无法频繁健身的爱好者；想要增肌但无法每天健身的上班族；已有一定基础（训练经验6个月以上），希望在有限时间内维持和增长肌肉的进阶训练者。',
        notes: '虽然只有4天，但每次训练的内容依然丰富，需要合理安排动作顺序：复合动作（深蹲、卧推、硬拉、划船）优先安排在训练前半段，孤立动作靠后。建议固定每周的训练日，让身体形成恢复节奏。非训练日可以进行20-30分钟低强度有氧或完全休息。饮食方面保持蛋白质摄入1.8-2.2g/kg体重，配合适度的热量盈余以支持肌肉合成。'
      },
      'tpl_aba': {
        background: 'ABA BAB模式是传统上下肢分化的进阶变体，其设计理念来自对训练适应性和长期进步的深刻理解。"A"代表第一循环，"B"代表第二循环，每个循环包含一次上肢训练和一次下肢训练。与简单的上下肢二分法不同，ABA BAB通过在两个循环中变换同一肌群的训练动作，来增加训练的多样性和趣味性，同时避免身体对固定动作模式产生适应。',
        suitable_for: '有2-3年以上系统训练经验的中级训练者；已厌倦单一上下肢分化，希望引入变化的高级爱好者；想要提升肌肉分离度和细节雕刻能力的健美方向训练者；每周有4天稳定训练时间保障的训练者。',
        notes: 'ABA和BAB两个循环的动作安排应有明确差异化：典型设计是A循环侧重力量（更大重量5-6RM、更少次数），B循环侧重容量（适中重量8-12RM、更多组数）。建议提前规划好两个循环的具体动作组合，形成书面记录，避免临时决定。每个月可以微调一次动作选择，保持新鲜感。典型周安排：周一A上肢、周二A下肢、周四B上肢、周五B下肢。'
      },
      'tpl_nsuns': {
        background: 'nSuns LP（Linear Progression）计划由Reddit健身板块用户nSuns在2015年前后创建，是5/3/1计划的激进改良版本。nSuns保留了5/3/1的核心百分比结构，但改为每周递增重量，并加入了大量AMRAP（As Many Reps As Possible）组来堆积训练容量。这种高频高压的训练模式在Reddit健身社区迅速走红。',
        suitable_for: '已完成入门计划、具备扎实力量基础的进阶训练者（建议深蹲/硬拉/卧推达到1倍/1.5倍/1倍体重以上）；每周可投入5天训练、有较强恢复能力的高级爱好者；对训练容量有较高耐受度、追求力量和肌肉双重增长的人群。新手切勿轻易尝试，容易过度训练。',
        notes: '该计划训练量极大，每周累计组数可能达到100-150组，新手冒进容易过度训练。建议在执行前确保睡眠充足（8小时+）和营养到位（蛋白质2g+/kg体重，热量盈余300-500大卡）。主项重量严格按百分比执行，不要因为感觉轻松就擅自加重。每个正式cycle结束后，安排一周减量周（降低40-50%重量）来促进恢复。'
      },
      'tpl_ppl': {
        background: 'PPL（Push Pull Legs）体系是现代健身领域最受欢迎、应用最广泛的分化训练模式之一，其核心理念是按肌肉功能将训练分为三大类：推（Push）日训练胸部、肩部、三头肌；拉（Pull）日训练背部、二头肌；腿（Legs）日训练股四头肌、股二头肌、臀肌、小腿等。这种分化的设计逻辑在于：同一功能肌群在同一天训练后可以有充足的48-72小时恢复时间，同时每周每个部位能获得2次训练刺激。',
        suitable_for: '有2-3年以上系统训练经验的高级训练者；每周有6天稳定时间投入健身的狂热爱好者；追求身体各部位分离度和细节雕刻的健美方向训练者；对训练有高度自律、注重恢复和营养的进阶者。',
        notes: '每周6天的高频率训练对恢复能力要求极高。务必保证每晚8-9小时睡眠、充足蛋白质摄入（2-2.5g/kg体重）和适度热量盈余。标准PPL单部位每次约12-15组，组间休息60-90秒。建议每周至少安排1-2天完全休息，或进行20-30分钟低强度有氧促进恢复。'
      },
      'tpl_ppl_intense': {
        background: 'PPL强化版是标准PPL的高容量变体，专为那些已完成常规PPL计划、希望进一步突破的训练者设计。相比标准PPL每个部位每次训练约12-15组，强化版将每个部位的单次训练容量提升至18-25组，通过更多的动作变体、更多的组数和更高的总训练量来刺激肌肉和力量的额外增长。',
        suitable_for: '有3年以上系统训练经验的高级训练者；已完成至少6个月标准PPL计划、希望挑战更大容量的进阶者；能够保证每天8小时以上睡眠和严格饮食控制的训练者；对肌肉量和分离度都有较高要求、有明确健美目标的资深爱好者。',
        notes: '高容量意味着对身体的压力极大。建议每日蛋白质摄入达到2.2-2.5g/kg体重，碳水化合物摄入也要相应增加以支持训练量。强化版不适合长期（超过12-16周）连续执行，建议执行8-10周后切换回标准PPL或减量休息2-4周。如出现持续疲劳、睡眠质量下降、力量停滞或关节疼痛，应立即降低训练量或安排休息周。'
      }
    };
    return intros[templateId] || {};
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
   * 从详情弹窗触发克隆（无需 dataset）
   */
  onShowCloneTemplateFromDetail() {
    const template = this.data.selectedTemplate;
    if (template) {
      this.setData({
        showTemplateDetailModal: false,
        showCloneModal: true,
        cloneSource: { type: 'template', data: template },
        newPlanName: template.name + ' (副本)'
      });
    }
  },

  /**
   * 从介绍弹窗触发克隆（无需 dataset）
   */
  onShowCloneTemplateFromIntro() {
    const template = this.data.selectedTemplate;
    if (template) {
      this.setData({
        showTemplateIntroModal: false,
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
      wx.showToast({ title: '计划复制成功', icon: 'success' });
    }
  },

  /**
   * 从模板克隆计划
   */
  cloneFromTemplate(template) {
    const plan = {
      id: 'plan_' + Date.now(),
      name: this.data.newPlanName.trim(),
      status: 'active',
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
      status: 'active',
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
   * 删除计划
   */
  onDeletePlan(e) {
    const { planId } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个计划吗？删除后无法恢复',
      confirmColor: '#8B0000',
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
   * 切换难度 Tab
   */
  onDifficultyTabChange(e) {
    const index = e.detail.index;
    const difficulty = this.data.filterDifficultyOptions[index];
    this.setData({ difficultyTabIndex: index });
    this.applyFilters({ filterDifficulty: difficulty });
  },

  /**
   * 切换训练天数 Tab
   */
  onDaysTabChange(e) {
    const index = e.detail.index;
    const days = this.data.filterOptions[index];
    this.setData({ daysTabIndex: index });
    this.applyFilters({ filterDays: days });
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
   * 显示计划详细介绍（从详情弹窗触发，selectedTemplate 已存在）
   */
  onShowTemplateIntro() {
    if (this.data.selectedTemplate) {
      this.setData({
        showTemplateDetailModal: false,
        showTemplateIntroModal: true
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
  },

  /**
   * 打开计划推荐弹窗（4步向导）
   */
  onShowRecommend() {
    this.setData({
      showRecommendModal: true,
      recommendStep: 1,
      wizardSelectedGoal: null,
      wizardSelectedDays: null,
      wizardSelectedExp: null,
      wizardRecommended: [],
      wizardSelectedPlan: null
    });
  },

  // ===== 4步向导 handlers =====

  onWizardSelectGoal(e) {
    this.setData({ wizardSelectedGoal: e.currentTarget.dataset.id });
  },

  onWizardSelectDays(e) {
    this.setData({ wizardSelectedDays: parseInt(e.currentTarget.dataset.days) });
  },

  onWizardSelectExp(e) {
    this.setData({ wizardSelectedExp: e.currentTarget.dataset.id });
  },

  onWizardSelectPlan(e) {
    this.setData({ wizardSelectedPlan: e.currentTarget.dataset.id });
  },

  onWizardPrev() {
    const step = this.data.recommendStep;
    if (step > 1) {
      this.setData({ recommendStep: step - 1 });
    } else {
      this.onCloseRecommend();
    }
  },

  onWizardNext() {
    const { recommendStep, wizardSelectedGoal, wizardSelectedDays, wizardSelectedExp } = this.data;

    if (recommendStep === 1 && !wizardSelectedGoal) {
      wx.showToast({ title: '请选择健身目标', icon: 'none' });
      return;
    }
    if (recommendStep === 2 && !wizardSelectedDays) {
      wx.showToast({ title: '请选择训练天数', icon: 'none' });
      return;
    }
    if (recommendStep === 3 && !wizardSelectedExp) {
      wx.showToast({ title: '请选择训练经验', icon: 'none' });
      return;
    }

    if (recommendStep < 4) {
      this.setData({ recommendStep: recommendStep + 1 });
    }

    if (recommendStep === 3) {
      // 生成推荐
      const recommended = this._generateRecommendations({
        goal: wizardSelectedGoal,
        days: wizardSelectedDays,
        experience: wizardSelectedExp
      });
      this.setData({
        wizardRecommended: recommended,
        wizardSelectedPlan: recommended.length > 0 ? recommended[0].id : null,
        recommendStep: 4
      });
    }
  },

  onWizardApply() {
    const planId = this.data.wizardSelectedPlan;
    if (!planId) return;

    const template = this.data.templates.find(t => t.id === planId);
    if (!template) {
      wx.showToast({ title: '计划不存在', icon: 'error' });
      return;
    }

    // 保存用户偏好
    wx.setStorageSync('user_preference', {
      goal: this.data.wizardSelectedGoal,
      days: this.data.wizardSelectedDays,
      experience: this.data.wizardSelectedExp,
      completed: true
    });

    this.setData({ showRecommendModal: false });
    this.onShowCloneTemplateModal({ currentTarget: { dataset: { templateId: planId } } });
  },

  onCloseRecommend() {
    this.setData({ showRecommendModal: false });
  },

  // ===== 推荐算法 =====

  _generateRecommendations(userPref) {
    const templates = getCollection('plan_templates');
    const { goal, days, experience } = userPref;

    let candidates = templates.filter(t => Math.abs(t.training_days - days) <= 1);

    const diffMap = { beginner: ['入门'], intermediate: ['入门', '中级'], advanced: ['中级', '进阶'] };
    candidates = candidates.filter(t => (diffMap[experience] || ['入门']).includes(t.difficulty));

    const priorityMap = {
      muscle: ['5x5', 'PPL', '分化'],
      fatloss: ['PPL', '5x5', '全身'],
      strength: ['5x5', 'Strength', 'Texas'],
      general: ['5x5', 'PPL', '全身']
    };
    const priorities = priorityMap[goal] || [];
    candidates.sort((a, b) => {
      const aS = priorities.findIndex(p => a.name.includes(p));
      const bS = priorities.findIndex(p => b.name.includes(p));
      return (aS === -1 ? 999 : aS) - (bS === -1 ? 999 : bS);
    });

    const diffClassMap = { '入门': 'beginner', '中级': 'intermediate', '进阶': 'advanced' };
    return candidates.slice(0, 3).map(t => ({
      ...t,
      difficultyClass: diffClassMap[t.difficulty] || 'beginner',
      features: this._getPlanFeatures(t)
    }));
  },

  _getPlanFeatures(plan) {
    const features = [];
    if (plan.difficulty === '入门') features.push('新手友好');
    if (plan.difficulty === '进阶') features.push('高强度');
    if (plan.name.includes('5x5')) features.push('经典增力');
    if (plan.name.includes('PPL')) features.push('肌群分化');
    if (plan.training_days <= 3) features.push('时间友好');
    if (!features.length) features.push('系统训练');
    return features.slice(0, 3);
  }
});
