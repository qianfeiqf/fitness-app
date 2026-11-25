/**
 * 系统内置经典训练计划模板（17套，覆盖2/3/4/5/6天与不同目标）
 * 统一内置 description / background / suitable_for / notes
 */

function getPlanTemplatesSeedData() {
  return [
    // ========================================
    // 每周2天计划（1套）
    // ========================================
    {
      id: 'tpl_2day_fullbody',
      name: '每周两天全身高效',
      description: '极简全身复合计划，每周仅练2天，上班族保持身材与力量首选',
      difficulty: '入门',
      training_days: 2,
      cycle_type: 'natural_week',
      background: '大量运动科学研究表明，对于时间紧张的普通人，只要每周能完成2次高质量全身力量训练、覆盖推/拉/蹲/髋铰链四大基础模式，就能获得初学者大部分的力量与肌肉收益。这套计划将核心复合动作浓缩为A/B两个全身日，单次训练约45–55分钟，极易长期坚持。',
      suitable_for: '工作繁忙的上班族、带娃家长、备考学生；每周最多只能抽出2次健身房时间的新手；或者作为减脂期/忙碌阶段的肌肉维持方案。',
      notes: '建议两次训练至少间隔48–72小时（如周二+周五，或周三+周六）。因为每周频率较低，每组正式组建议认真做到离力竭还剩1–2次（中等偏吃力），动作标准后每1–2周尝试小幅增加重量或次数。',
      exercises: [
        // 周二：全身A（深蹲+水平推+水平拉+肩+核心）
        { exercise_id: 'ex_020', day_of_week: 2, cycle_label: '全身A', target_sets: 3, target_reps: 8, initial_weight: 50, rest_seconds: 150 },
        { exercise_id: 'ex_002', day_of_week: 2, cycle_label: '全身A', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_012', day_of_week: 2, cycle_label: '全身A', target_sets: 3, target_reps: 10, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_041', day_of_week: 2, cycle_label: '全身A', target_sets: 3, target_reps: 10, initial_weight: 16, rest_seconds: 90 },
        { exercise_id: 'ex_060', day_of_week: 2, cycle_label: '全身A', target_sets: 3, target_reps: 45, initial_weight: 0, rest_seconds: 60 },
        // 周五：全身B（后链+上斜推+垂直拉+下肢单腿+后束）
        { exercise_id: 'ex_026', day_of_week: 5, cycle_label: '全身B', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 5, cycle_label: '全身B', target_sets: 3, target_reps: 10, initial_weight: 18, rest_seconds: 90 },
        { exercise_id: 'ex_014', day_of_week: 5, cycle_label: '全身B', target_sets: 3, target_reps: 10, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_021', day_of_week: 5, cycle_label: '全身B', target_sets: 3, target_reps: 12, initial_weight: 70, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 5, cycle_label: '全身B', target_sets: 3, target_reps: 15, initial_weight: 15, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周3天计划（6套）
    // ========================================
    {
      id: 'tpl_5x5',
      name: '5x5 力量计划',
      description: '经典增肌增力计划，每周3次，极简三大项打牢基础',
      difficulty: '入门',
      training_days: 3,
      cycle_type: 'natural_week',
      background: '5×5训练法是力量训练领域历史最悠久、最经典的入门计划之一，由美国运动医学博士Bill Starr于1970年代创立，后经StrongLifts等体系广泛普及。其核心哲学是“少即是多”——每周仅需3天、每次3个杠铃复合动作，通过线性渐进超负荷在短时间内打牢全身基础力量。',
      suitable_for: '健身初学者（训练经验0–1年）；希望系统掌握深蹲、卧推、硬拉、推举等杠铃基础技术的爱好者；追求高效、不喜欢花哨分化的训练者。',
      notes: '新手务必从空杠或轻重量开始，前2–3周专注动作规范而非盲目加重。连续稳定完成全部5×5后，下次训练可小幅增加2.5kg（硬拉可加5kg）。保证每晚7–8小时睡眠与充足蛋白质摄入。',
      exercises: [
        // 周一：深蹲卧推划船
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 40, rest_seconds: 120 },
        // 周三：深蹲硬拉推举
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: null, target_sets: 1, target_reps: 5, initial_weight: 80, rest_seconds: 240 },
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 35, rest_seconds: 120 },
        // 周五：深蹲卧推下拉
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 180 },
        { exercise_id: 'ex_014', day_of_week: 5, cycle_label: null, target_sets: 5, target_reps: 5, initial_weight: 45, rest_seconds: 120 }
      ]
    },

    {
      id: 'tpl_starting',
      name: 'Starting Strength',
      description: 'Mark Rippetoe经典入门计划，每周3次，以3×5线性增力为核心',
      difficulty: '入门',
      training_days: 3,
      cycle_type: 'natural_week',
      background: 'Starting Strength由力量教练Mark Rippetoe在2005年同名著作中提出，被公认为杠铃力量入门的标杆方案。它利用新手期神经-肌肉适应最快的黄金窗口，采用精简的3×5组次结构，在避免过度疲劳的前提下快速提升深蹲、卧推、推举与硬拉成绩。',
      suitable_for: '零基础或刚接触自由重量的健身新手；希望快速建立杠铃动作模式与基础力量、同时每次训练耗时控制在50分钟以内的训练者。',
      notes: '3×5的组数少于5×5，因此每一组都要保持高度专注与标准动作。起始重量宁轻勿重，逐次递增2.5kg；当某一动作连续两次无法完成目标次数时，可下调10%重量重新爬坡。',
      exercises: [
        // 周一：A日
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 50, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 40, rest_seconds: 120 },
        // 周三：B日
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: 'B', target_sets: 3, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: 'B', target_sets: 3, target_reps: 5, initial_weight: 35, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: 'B', target_sets: 1, target_reps: 5, initial_weight: 80, rest_seconds: 240 },
        // 周五：A日
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 55, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 5, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 45, rest_seconds: 120 }
      ]
    },

    {
      id: 'tpl_home_dumbbell',
      name: '居家哑铃全身塑形',
      description: '仅需一对可调哑铃与训练凳，每周3天在家完成全身增肌塑形',
      difficulty: '入门',
      training_days: 3,
      cycle_type: 'natural_week',
      background: '没有办健身房卡、通勤太远或下班太晚，是很多人放弃力量训练的主因。这套计划专为家庭场景设计，只使用哑铃和徒手动作，通过高脚杯深蹲、分腿蹲、哑铃卧推、单臂划船与肩臂孤立动作的组合，完整覆盖全身各大肌群。',
      suitable_for: '在家健身的上班族、学生党或宝妈；只有一对可调哑铃（建议单只5–20kg）和一张折叠凳的入门到初级训练者。',
      notes: '居家哑铃重量跨度可能较大，当现有重量能轻松做满12–15次且还没条件加重时，可通过放慢下放速度（3秒离心）或缩短组间休息至60秒来持续提升刺激。',
      exercises: [
        // 周一：全身A
        { exercise_id: 'ex_082', day_of_week: 1, cycle_label: '居家A', target_sets: 4, target_reps: 12, initial_weight: 16, rest_seconds: 90 },
        { exercise_id: 'ex_002', day_of_week: 1, cycle_label: '居家A', target_sets: 3, target_reps: 10, initial_weight: 14, rest_seconds: 90 },
        { exercise_id: 'ex_078', day_of_week: 1, cycle_label: '居家A', target_sets: 3, target_reps: 10, initial_weight: 14, rest_seconds: 90 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '居家A', target_sets: 3, target_reps: 15, initial_weight: 6, rest_seconds: 60 },
        { exercise_id: 'ex_064', day_of_week: 1, cycle_label: '居家A', target_sets: 3, target_reps: 12, initial_weight: 0, rest_seconds: 60 },
        // 周三：全身B
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '居家B', target_sets: 4, target_reps: 10, initial_weight: 16, rest_seconds: 90 },
        { exercise_id: 'ex_004', day_of_week: 3, cycle_label: '居家B', target_sets: 3, target_reps: 12, initial_weight: 0, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 3, cycle_label: '居家B', target_sets: 3, target_reps: 10, initial_weight: 12, rest_seconds: 90 },
        { exercise_id: 'ex_051', day_of_week: 3, cycle_label: '居家B', target_sets: 3, target_reps: 12, initial_weight: 10, rest_seconds: 60 },
        { exercise_id: 'ex_060', day_of_week: 3, cycle_label: '居家B', target_sets: 3, target_reps: 45, initial_weight: 0, rest_seconds: 60 },
        // 周五：全身C
        { exercise_id: 'ex_023', day_of_week: 5, cycle_label: '居家C', target_sets: 3, target_reps: 10, initial_weight: 10, rest_seconds: 90 },
        { exercise_id: 'ex_006', day_of_week: 5, cycle_label: '居家C', target_sets: 3, target_reps: 10, initial_weight: 12, rest_seconds: 90 },
        { exercise_id: 'ex_011', day_of_week: 5, cycle_label: '居家C', target_sets: 3, target_reps: 12, initial_weight: 14, rest_seconds: 90 },
        { exercise_id: 'ex_046', day_of_week: 5, cycle_label: '居家C', target_sets: 3, target_reps: 15, initial_weight: 5, rest_seconds: 60 },
        { exercise_id: 'ex_052', day_of_week: 5, cycle_label: '居家C', target_sets: 3, target_reps: 12, initial_weight: 10, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_glute_leg',
      name: '臀腿塑形强化',
      description: '每周3天，2天臀腿雕塑搭配1天上肢体态平衡，打造紧致饱满线条',
      difficulty: '入门',
      training_days: 3,
      cycle_type: 'natural_week',
      background: '针对以蜜桃臀、紧致大腿线条与优雅直角肩为目标的训练需求，这套计划以臀推、罗马尼亚硬拉、保加利亚分腿蹲和髋外展为核心构建每周2次下肢深度刺激，并在周中穿插1次上肢背肩塑形日，帮助改善圆肩驼背、提升整体比例。',
      suitable_for: '希望重点强化臀部与下肢线条的女性或男性训练者；久坐导致臀肌失忆、骨盆不稳、希望兼顾翘臀与上肢体态改善的健身爱好者。',
      notes: '臀推与分腿蹲建议在正式组前用徒手激活臀肌；发力时专注脚跟与全脚掌蹬地，避免腰部反弓代偿。每周2次臀腿之间至少间隔72小时以保证肌肉恢复生长。',
      exercises: [
        // 周一：臀部主导日
        { exercise_id: 'ex_027', day_of_week: 1, cycle_label: '臀部主导', target_sets: 4, target_reps: 10, initial_weight: 40, rest_seconds: 120 },
        { exercise_id: 'ex_026', day_of_week: 1, cycle_label: '臀部主导', target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_023', day_of_week: 1, cycle_label: '臀部主导', target_sets: 3, target_reps: 10, initial_weight: 10, rest_seconds: 90 },
        { exercise_id: 'ex_085', day_of_week: 1, cycle_label: '臀部主导', target_sets: 3, target_reps: 15, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_103', day_of_week: 1, cycle_label: '臀部主导', target_sets: 3, target_reps: 15, initial_weight: 0, rest_seconds: 60 },
        // 周三：上肢体态平衡日
        { exercise_id: 'ex_014', day_of_week: 3, cycle_label: '上肢体态', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_075', day_of_week: 3, cycle_label: '上肢体态', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_041', day_of_week: 3, cycle_label: '上肢体态', target_sets: 3, target_reps: 12, initial_weight: 10, rest_seconds: 90 },
        { exercise_id: 'ex_042', day_of_week: 3, cycle_label: '上肢体态', target_sets: 3, target_reps: 15, initial_weight: 4, rest_seconds: 60 },
        { exercise_id: 'ex_044', day_of_week: 3, cycle_label: '上肢体态', target_sets: 3, target_reps: 15, initial_weight: 12, rest_seconds: 60 },
        // 周五：下肢综合塑形日
        { exercise_id: 'ex_081', day_of_week: 5, cycle_label: '下肢综合', target_sets: 4, target_reps: 10, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_027', day_of_week: 5, cycle_label: '下肢综合', target_sets: 3, target_reps: 12, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 5, cycle_label: '下肢综合', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_086', day_of_week: 5, cycle_label: '下肢综合', target_sets: 3, target_reps: 15, initial_weight: 25, rest_seconds: 60 },
        { exercise_id: 'ex_085', day_of_week: 5, cycle_label: '下肢综合', target_sets: 3, target_reps: 15, initial_weight: 30, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_gzclp',
      name: 'GZCLP 线性增力',
      description: 'The Fitness Wiki 力荐三阶梯体系，T1冲力量+T2补容量+T3雕细节',
      difficulty: '中级',
      training_days: 3,
      cycle_type: 'natural_week',
      background: 'GZCLP由力量举教练Cody Lefever设计，是国际健身社区（Reddit r/Fitness）口碑极高的线性渐进模板。它独创三阶梯架构：每天1个T1大重量主项（5×3）主攻绝对力量、1个T2中等重量副项（3×10）补充复合容量、以及1–2个T3高次数辅助动作（3×15）兼顾肌肥大与弱项补强。',
      suitable_for: '觉得纯5×5过于枯燥或遇瓶颈的训练者；希望在每周3天里同时收获三大项力量进步与均衡肌肉维度的入门后期至中级训练者。',
      notes: 'T1主项每次成功完成可加2.5kg（下肢5kg），若5×3失败则顺延切换为6×2，再失败切10×1，平滑度过平台期。T3动作做到能轻松完成15次以上时再加重。',
      exercises: [
        // 周一：T1深蹲 + T2卧推 + T3下拉与后束
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: 'Day1', target_sets: 5, target_reps: 3, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: 'Day1', target_sets: 3, target_reps: 10, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_014', day_of_week: 1, cycle_label: 'Day1', target_sets: 3, target_reps: 15, initial_weight: 40, rest_seconds: 60 },
        { exercise_id: 'ex_044', day_of_week: 1, cycle_label: 'Day1', target_sets: 3, target_reps: 15, initial_weight: 18, rest_seconds: 60 },
        // 周三：T1推举 + T2硬拉 + T3划船与侧平举
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: 'Day2', target_sets: 5, target_reps: 3, initial_weight: 40, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: 'Day2', target_sets: 3, target_reps: 10, initial_weight: 70, rest_seconds: 150 },
        { exercise_id: 'ex_011', day_of_week: 3, cycle_label: 'Day2', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_042', day_of_week: 3, cycle_label: 'Day2', target_sets: 3, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        // 周五：T1卧推 + T2深蹲 + T3坐姿划船与手臂
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: 'Day3', target_sets: 5, target_reps: 3, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: 'Day3', target_sets: 3, target_reps: 10, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: 'Day3', target_sets: 3, target_reps: 15, initial_weight: 45, rest_seconds: 60 },
        { exercise_id: 'ex_051', day_of_week: 5, cycle_label: 'Day3', target_sets: 3, target_reps: 15, initial_weight: 10, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_texas',
      name: 'Texas Method',
      description: '中级每周3天经典周期化计划，周一容量 / 周三强度 / 周五辅助',
      difficulty: '中级',
      training_days: 3,
      cycle_type: 'natural_week',
      background: 'Texas Method（德州方法）是5×5与Starting Strength最经典的进阶衔接计划。当训练者无法再每次课都线性加重时，德州方法将一周划分为“容量日（积累刺激）→ 强度日（冲击1×5新高）→ 辅助恢复日”，实现按周为单位的稳定进步。',
      suitable_for: '已完成3–6个月新手线性计划、深蹲/硬拉/卧推进入平台期的中级力量训练者；希望每周只练3天但持续突破三大项极限的人群。',
      notes: '容量日重量通常为强度日5RM的85%–90%，不要贪重导致周三无法恢复。若连续两周强度日卡壳，可适当下调容量日负荷或安排一周减量恢复。',
      exercises: [
        // 周一：容量日
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: '容量', target_sets: 5, target_reps: 5, initial_weight: 80, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '容量', target_sets: 5, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 1, cycle_label: '容量', target_sets: 3, target_reps: 8, initial_weight: 60, rest_seconds: 120 },
        // 周三：强度日
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '强度', target_sets: 1, target_reps: 5, initial_weight: 90, rest_seconds: 240 },
        { exercise_id: 'ex_030', day_of_week: 3, cycle_label: '强度', target_sets: 1, target_reps: 5, initial_weight: 100, rest_seconds: 240 },
        { exercise_id: 'ex_040', day_of_week: 3, cycle_label: '强度', target_sets: 3, target_reps: 5, initial_weight: 45, rest_seconds: 180 },
        // 周五：辅助日
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_014', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_042', day_of_week: 5, cycle_label: '辅助', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周4天计划（5套）
    // ========================================
    {
      id: 'tpl_pplr',
      name: 'PPLR 推拉腿休息',
      description: 'PPL简化4天版，推、拉、腿加一天全身巩固，入门进阶两相宜',
      difficulty: '入门',
      training_days: 4,
      cycle_type: 'natural_week',
      background: '完整版推拉腿（PPL）需要每周6练，对多数人负荷过高。PPLR保留了推、拉、腿按功能分化的清爽逻辑，并在周末前补充一天全身复合巩固日，在4天频率下兼顾肌群刺激频次与充分休息。',
      suitable_for: '每周能安排4天训练的上班族和学生；喜欢推拉腿分化逻辑但没时间一周六练的入门后期及初级增肌人群。',
      notes: '每个训练日先做多关节复合大项，再做单关节孤立动作。周三与周末作为休息日，可适当穿插轻松步行或拉伸促进恢复。',
      exercises: [
        // 周一：推
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推', target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 10, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 8, initial_weight: 35, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 1, cycle_label: '推', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周二：拉
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 8, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 2, cycle_label: '拉', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周四：腿
        { exercise_id: 'ex_020', day_of_week: 4, cycle_label: '腿', target_sets: 4, target_reps: 6, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 4, cycle_label: '腿', target_sets: 3, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 4, cycle_label: '腿', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 4, cycle_label: '腿', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 周五：全身
        { exercise_id: 'ex_001', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_010', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_040', day_of_week: 5, cycle_label: '全身', target_sets: 3, target_reps: 8, initial_weight: 30, rest_seconds: 90 }
      ]
    },

    {
      id: 'tpl_upper_lower',
      name: '上下肢分化（4天）',
      description: '上下肢交替训练，每周4次，每个肌群每周稳定刺激2次',
      difficulty: '中级',
      training_days: 4,
      cycle_type: 'natural_week',
      background: '上下肢分化（Upper/Lower）是健美与力量领域公认性价比最高的四天架构。将身体分为上肢与下肢交替训练，既能让每块肌肉获得每周2次的黄金刺激频率，又保证单次训练时长可控、恢复窗口充足。',
      suitable_for: '有半年以上训练基础、每周可稳定训练4天的中级爱好者；追求上肢厚度、下肢力量与整体体型均衡发展的增肌人群。',
      notes: '推荐“练二休一再练二”（如周一、二、四、五）。上肢日注意推拉容量1:1平衡以防圆肩；单次训练控制在60–75分钟内效率最佳。',
      exercises: [
        // 周一：下肢A
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: '下肢A', target_sets: 4, target_reps: 6, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 1, cycle_label: '下肢A', target_sets: 3, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 1, cycle_label: '下肢A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 1, cycle_label: '下肢A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 周二：上肢A
        { exercise_id: 'ex_001', day_of_week: 2, cycle_label: '上肢A', target_sets: 4, target_reps: 6, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '上肢A', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_040', day_of_week: 2, cycle_label: '上肢A', target_sets: 3, target_reps: 8, initial_weight: 40, rest_seconds: 120 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '上肢A', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        // 周四：下肢B
        { exercise_id: 'ex_021', day_of_week: 4, cycle_label: '下肢B', target_sets: 4, target_reps: 8, initial_weight: 80, rest_seconds: 120 },
        { exercise_id: 'ex_030', day_of_week: 4, cycle_label: '下肢B', target_sets: 3, target_reps: 5, initial_weight: 85, rest_seconds: 180 },
        { exercise_id: 'ex_027', day_of_week: 4, cycle_label: '下肢B', target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_029', day_of_week: 4, cycle_label: '下肢B', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        // 周五：上肢B
        { exercise_id: 'ex_002', day_of_week: 5, cycle_label: '上肢B', target_sets: 4, target_reps: 8, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_013', day_of_week: 5, cycle_label: '上肢B', target_sets: 4, target_reps: 8, initial_weight: 0, rest_seconds: 90 },
        { exercise_id: 'ex_041', day_of_week: 5, cycle_label: '上肢B', target_sets: 3, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_054', day_of_week: 5, cycle_label: '上肢B', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_phul',
      name: 'PHUL 力量与肌肥大',
      description: 'Brandon Campbell经典Powerbuilding四分化，2天冲力量 + 2天冲维度',
      difficulty: '中级',
      training_days: 4,
      cycle_type: 'natural_week',
      background: 'PHUL（Power Hypertrophy Upper Lower）由健身教练Brandon Campbell在Muscle & Strength发布，是全球最具代表性的力量+健美双修（Powerbuilding）四天模板。前半周用3–5次大重量复合动作拉高神经募集与力量上限，后半周切换8–12次多角度器械与孤立动作堆积肌肥大泵感。',
      suitable_for: '既想提升卧推/深蹲/硬拉重量、又想打造饱满肌肉线条的中级训练者；每周有4天稳定训练时间的健身房常客。',
      notes: '力量日（周一、二）请给足2.5–3分钟组间休息确保大重量质量；肌肥大日（周四、五）可适当缩短组间休息至60–90秒，注重目标肌群的离心控制与泵感。',
      exercises: [
        // 周一：上肢力量日
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '上肢力量', target_sets: 4, target_reps: 5, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_006', day_of_week: 1, cycle_label: '上肢力量', target_sets: 3, target_reps: 8, initial_weight: 24, rest_seconds: 120 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: '上肢力量', target_sets: 4, target_reps: 5, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_014', day_of_week: 1, cycle_label: '上肢力量', target_sets: 3, target_reps: 8, initial_weight: 50, rest_seconds: 90 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '上肢力量', target_sets: 3, target_reps: 6, initial_weight: 40, rest_seconds: 150 },
        { exercise_id: 'ex_050', day_of_week: 1, cycle_label: '上肢力量', target_sets: 3, target_reps: 8, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_098', day_of_week: 1, cycle_label: '上肢力量', target_sets: 3, target_reps: 8, initial_weight: 25, rest_seconds: 90 },
        // 周二：下肢力量日
        { exercise_id: 'ex_020', day_of_week: 2, cycle_label: '下肢力量', target_sets: 4, target_reps: 5, initial_weight: 80, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 2, cycle_label: '下肢力量', target_sets: 3, target_reps: 5, initial_weight: 95, rest_seconds: 210 },
        { exercise_id: 'ex_021', day_of_week: 2, cycle_label: '下肢力量', target_sets: 3, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 2, cycle_label: '下肢力量', target_sets: 3, target_reps: 10, initial_weight: 35, rest_seconds: 90 },
        { exercise_id: 'ex_084', day_of_week: 2, cycle_label: '下肢力量', target_sets: 4, target_reps: 10, initial_weight: 40, rest_seconds: 60 },
        // 周四：上肢肌肥大日
        { exercise_id: 'ex_005', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 4, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_070', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 3, target_reps: 12, initial_weight: 40, rest_seconds: 60 },
        { exercise_id: 'ex_012', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 4, target_reps: 10, initial_weight: 50, rest_seconds: 90 },
        { exercise_id: 'ex_078', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 3, target_reps: 10, initial_weight: 24, rest_seconds: 90 },
        { exercise_id: 'ex_091', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 4, target_reps: 15, initial_weight: 10, rest_seconds: 60 },
        { exercise_id: 'ex_097', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 4, cycle_label: '上肢肌肥大', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周五：下肢肌肥大日
        { exercise_id: 'ex_022', day_of_week: 5, cycle_label: '下肢肌肥大', target_sets: 4, target_reps: 10, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_029', day_of_week: 5, cycle_label: '下肢肌肥大', target_sets: 3, target_reps: 12, initial_weight: 16, rest_seconds: 90 },
        { exercise_id: 'ex_025', day_of_week: 5, cycle_label: '下肢肌肥大', target_sets: 3, target_reps: 12, initial_weight: 35, rest_seconds: 60 },
        { exercise_id: 'ex_087', day_of_week: 5, cycle_label: '下肢肌肥大', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_083', day_of_week: 5, cycle_label: '下肢肌肥大', target_sets: 4, target_reps: 15, initial_weight: 30, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_531_bbb',
      name: 'Wendler 5/3/1 BBB',
      description: 'Jim Wendler王牌力量增肌模板，主项渐进搭配5×10高容量辅助',
      difficulty: '进阶',
      training_days: 4,
      cycle_type: 'natural_week',
      background: 'Boring But Big（简称BBB）是力量教练Jim Wendler的5/3/1体系中最负盛名的辅助模板。每天以推举、硬拉、卧推、深蹲四大主项之一为核心完成高强度主组，紧接着做5组×10次的中等重量高容量辅助组，虽“枯燥但极度有效”，能持续多年稳定增力增肌。',
      suitable_for: '已有1年以上杠铃基础、追求长期可持续增长的力量与增肌训练者；讨厌频繁换动作、喜欢极简高效大项训练的进阶爱好者。',
      notes: '核心原则是“从轻开始、缓慢递增”：5×10辅助组建议先用主项1RM的50%左右重量起步，确保5组全部动作标准；每完成一个4周循环后，上肢主项加2.5kg、下肢加5kg。',
      exercises: [
        // 周一：推举日
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推举主项', target_sets: 3, target_reps: 5, initial_weight: 42.5, rest_seconds: 180 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推举BBB', target_sets: 5, target_reps: 10, initial_weight: 27.5, rest_seconds: 90 },
        { exercise_id: 'ex_076', day_of_week: 1, cycle_label: '背部平衡', target_sets: 5, target_reps: 10, initial_weight: 0, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 1, cycle_label: '后束保护', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        // 周二：硬拉日
        { exercise_id: 'ex_030', day_of_week: 2, cycle_label: '硬拉主项', target_sets: 3, target_reps: 5, initial_weight: 100, rest_seconds: 210 },
        { exercise_id: 'ex_030', day_of_week: 2, cycle_label: '硬拉BBB', target_sets: 5, target_reps: 10, initial_weight: 65, rest_seconds: 120 },
        { exercise_id: 'ex_062', day_of_week: 2, cycle_label: '核心强化', target_sets: 5, target_reps: 12, initial_weight: 0, rest_seconds: 60 },
        // 周四：卧推日
        { exercise_id: 'ex_001', day_of_week: 4, cycle_label: '卧推主项', target_sets: 3, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 4, cycle_label: '卧推BBB', target_sets: 5, target_reps: 10, initial_weight: 42.5, rest_seconds: 90 },
        { exercise_id: 'ex_078', day_of_week: 4, cycle_label: '划船平衡', target_sets: 5, target_reps: 10, initial_weight: 24, rest_seconds: 90 },
        { exercise_id: 'ex_054', day_of_week: 4, cycle_label: '三头辅助', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周五：深蹲日
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: '深蹲主项', target_sets: 3, target_reps: 5, initial_weight: 85, rest_seconds: 180 },
        { exercise_id: 'ex_020', day_of_week: 5, cycle_label: '深蹲BBB', target_sets: 5, target_reps: 10, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 5, cycle_label: '后侧辅助', target_sets: 5, target_reps: 10, initial_weight: 35, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_aba',
      name: 'ABA BAB 上下肢',
      description: '差异化上下肢四天交替，A循环冲大重量、B循环多角度塑形',
      difficulty: '中级',
      training_days: 4,
      cycle_type: 'natural_week',
      background: 'ABA BAB模式是传统上下肢分化的进阶变体，通过在前后两个循环中更换自由重量与器械变式，避免神经与关节对单一动作产生审美或结构疲劳，兼顾力量与细节雕刻。',
      suitable_for: '已有1年以上训练基础、希望在4天训练中增加动作丰富度与肌肉全面刺激的中级训练者。',
      notes: '前半周A循环侧重杠铃大重量，后半周B循环侧重哑铃与器械控制；每周固定训练日有助于保持稳定恢复节律。',
      exercises: [
        // 周一：A日下肢+背
        { exercise_id: 'ex_020', day_of_week: 1, cycle_label: 'A', target_sets: 4, target_reps: 6, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_030', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 5, initial_weight: 80, rest_seconds: 180 },
        { exercise_id: 'ex_024', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 1, cycle_label: 'A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: 'A', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        // 周二：B日上肢推
        { exercise_id: 'ex_001', day_of_week: 2, cycle_label: 'B', target_sets: 4, target_reps: 6, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_005', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_008', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_040', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 8, initial_weight: 40, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 2, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 周四：A日下肢+背
        { exercise_id: 'ex_021', day_of_week: 4, cycle_label: 'A', target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_026', day_of_week: 4, cycle_label: 'A', target_sets: 3, target_reps: 10, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_027', day_of_week: 4, cycle_label: 'A', target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_013', day_of_week: 4, cycle_label: 'A', target_sets: 4, target_reps: 8, initial_weight: 0, rest_seconds: 90 },
        { exercise_id: 'ex_012', day_of_week: 4, cycle_label: 'A', target_sets: 4, target_reps: 10, initial_weight: 50, rest_seconds: 90 },
        // 周五：B日上肢塑形
        { exercise_id: 'ex_002', day_of_week: 5, cycle_label: 'B', target_sets: 4, target_reps: 8, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_009', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_044', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 5, cycle_label: 'B', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周5天计划（2套）
    // ========================================
    {
      id: 'tpl_bro_split',
      name: '经典五分化 (Bro Split)',
      description: '胸、背、腿、肩、手臂每天专注一个大部位，商业健身房最经典增肌法',
      difficulty: '中级',
      training_days: 5,
      cycle_type: 'natural_week',
      background: '五分化（胸、背、腿、肩、手各占一天）是黄金健美时代沿用至今最直观的训练结构。每天只轰炸一个部位，可以从上/中/下、自由重量/器械/龙门架多角度充分充血，心理专注度高，且每个部位有一整周的完整恢复时间。',
      suitable_for: '每周有5天固定健身时间、喜欢单一部位强泵感与多角度雕刻细节的健美向增肌爱好者。',
      notes: '因为每个部位一周只练一次，单次训练强度与专注度要拉满，正式组尽量做到接近力竭（余力1次左右）。周三安排练腿隔开上肢推拉，可显著减少肩肘关节疲劳。',
      exercises: [
        // 周一：胸部日
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '胸', target_sets: 4, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 1, cycle_label: '胸', target_sets: 4, target_reps: 10, initial_weight: 22, rest_seconds: 90 },
        { exercise_id: 'ex_070', day_of_week: 1, cycle_label: '胸', target_sets: 3, target_reps: 12, initial_weight: 40, rest_seconds: 60 },
        { exercise_id: 'ex_007', day_of_week: 1, cycle_label: '胸', target_sets: 3, target_reps: 10, initial_weight: 0, rest_seconds: 90 },
        { exercise_id: 'ex_074', day_of_week: 1, cycle_label: '胸', target_sets: 3, target_reps: 15, initial_weight: 12, rest_seconds: 60 },
        // 周二：背部日
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: '背', target_sets: 4, target_reps: 8, initial_weight: 0, rest_seconds: 120 },
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '背', target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_014', day_of_week: 2, cycle_label: '背', target_sets: 3, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_075', day_of_week: 2, cycle_label: '背', target_sets: 3, target_reps: 12, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_016', day_of_week: 2, cycle_label: '背', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        // 周三：腿部日
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿', target_sets: 4, target_reps: 8, initial_weight: 70, rest_seconds: 150 },
        { exercise_id: 'ex_021', day_of_week: 3, cycle_label: '腿', target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿', target_sets: 3, target_reps: 10, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿', target_sets: 3, target_reps: 12, initial_weight: 35, rest_seconds: 60 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿', target_sets: 3, target_reps: 12, initial_weight: 35, rest_seconds: 60 },
        { exercise_id: 'ex_084', day_of_week: 3, cycle_label: '腿', target_sets: 4, target_reps: 15, initial_weight: 40, rest_seconds: 60 },
        // 周四：肩部日
        { exercise_id: 'ex_041', day_of_week: 4, cycle_label: '肩', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 4, cycle_label: '肩', target_sets: 4, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_091', day_of_week: 4, cycle_label: '肩', target_sets: 3, target_reps: 15, initial_weight: 10, rest_seconds: 60 },
        { exercise_id: 'ex_092', day_of_week: 4, cycle_label: '肩', target_sets: 4, target_reps: 15, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_044', day_of_week: 4, cycle_label: '肩', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        // 周五：手臂+核心日
        { exercise_id: 'ex_050', day_of_week: 5, cycle_label: '手臂', target_sets: 4, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_095', day_of_week: 5, cycle_label: '手臂', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_052', day_of_week: 5, cycle_label: '手臂', target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 5, cycle_label: '手臂', target_sets: 4, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 5, cycle_label: '手臂', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_100', day_of_week: 5, cycle_label: '手臂', target_sets: 3, target_reps: 15, initial_weight: 30, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_nsuns',
      name: 'nSuns 5/3/1 LP',
      description: '高容量线性增力计划，每周5次，适合有一定基础的力量突破者',
      difficulty: '进阶',
      training_days: 5,
      cycle_type: 'natural_week',
      background: 'nSuns LP源自5/3/1的激进线性改良版，通过每周5天高频大项与大量高强度复合组，帮助中高级训练者在较短周期内显著拉升卧推、深蹲、硬拉与推举极限。',
      suitable_for: '已完成入门与中级阶段、具备扎实动作基础且恢复能力强的进阶训练者；目标明确冲击三大项成绩的高频训练人群。',
      notes: '总容量大、神经疲劳累积快，执行期间务必保证8小时以上睡眠与充足碳水蛋白质摄入；每连续训练6–8周建议安排一周减量恢复。',
      exercises: [
        // 周一：推A
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推A', target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 180 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推A', target_sets: 5, target_reps: 5, initial_weight: 45, rest_seconds: 150 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推A', target_sets: 5, target_reps: 5, initial_weight: 35, rest_seconds: 150 },
        { exercise_id: 'ex_008', day_of_week: 1, cycle_label: '推A', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推A', target_sets: 3, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        // 周二：拉A
        { exercise_id: 'ex_030', day_of_week: 2, cycle_label: '拉A', target_sets: 5, target_reps: 5, initial_weight: 85, rest_seconds: 240 },
        { exercise_id: 'ex_020', day_of_week: 2, cycle_label: '拉A', target_sets: 5, target_reps: 5, initial_weight: 65, rest_seconds: 180 },
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉A', target_sets: 5, target_reps: 5, initial_weight: 45, rest_seconds: 150 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉A', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_051', day_of_week: 2, cycle_label: '拉A', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        // 周三：腿A
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿A', target_sets: 5, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿A', target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_027', day_of_week: 3, cycle_label: '腿A', target_sets: 3, target_reps: 10, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿A', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 周四：推B
        { exercise_id: 'ex_040', day_of_week: 4, cycle_label: '推B', target_sets: 5, target_reps: 5, initial_weight: 40, rest_seconds: 180 },
        { exercise_id: 'ex_001', day_of_week: 4, cycle_label: '推B', target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 150 },
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: '推B', target_sets: 5, target_reps: 5, initial_weight: 30, rest_seconds: 150 },
        { exercise_id: 'ex_006', day_of_week: 4, cycle_label: '推B', target_sets: 3, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_045', day_of_week: 4, cycle_label: '推B', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        // 周五：拉B
        { exercise_id: 'ex_010', day_of_week: 5, cycle_label: '拉B', target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 180 },
        { exercise_id: 'ex_013', day_of_week: 5, cycle_label: '拉B', target_sets: 5, target_reps: 5, initial_weight: 0, rest_seconds: 150 },
        { exercise_id: 'ex_015', day_of_week: 5, cycle_label: '拉B', target_sets: 5, target_reps: 5, initial_weight: 30, rest_seconds: 150 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: '拉B', target_sets: 3, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_050', day_of_week: 5, cycle_label: '拉B', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 }
      ]
    },

    // ========================================
    // 每周6天计划（3套）
    // ========================================
    {
      id: 'tpl_ppl',
      name: 'PPL 推拉腿',
      description: '经典六天推拉腿循环，每部位每周两练，增肌效率标杆',
      difficulty: '进阶',
      training_days: 6,
      cycle_type: 'natural_week',
      background: 'PPL（Push Pull Legs）是目前全球健身房最受欢迎的六天增肌体系。将动作按推（胸/肩/三头）、拉（背/二头/后束）、腿（臀腿）三分，每周循环两轮，实现高频刺激与协同肌群无重叠恢复。',
      suitable_for: '有1年以上系统训练基础、每周能保障6天训练且睡眠营养充足的增肌爱好者。',
      notes: '周日完整休息；建议每部位每周累计14–18组有效训练，若感到肩肘疲劳，可将第二轮的推日适当换成哑铃与固定器械。',
      exercises: [
        // 推日（周一）
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 10, initial_weight: 40, rest_seconds: 90 },
        { exercise_id: 'ex_008', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 8, initial_weight: 35, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 12, initial_weight: 8, rest_seconds: 60 },
        // 拉日（周二）
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 6, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 8, initial_weight: 0, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 腿日（周三）
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 8, initial_weight: 60, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 10, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 推日（周四）
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 8, initial_weight: 30, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_009', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        { exercise_id: 'ex_045', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 90 },
        // 拉日（周五）
        { exercise_id: 'ex_011', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 8, initial_weight: 25, rest_seconds: 120 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_015', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 90 },
        { exercise_id: 'ex_051', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        // 腿日（周六）
        { exercise_id: 'ex_021', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_023', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_027', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_029', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_arnold',
      name: '阿诺德分化 (Arnold Split)',
      description: '黄金时代经典六天分化：胸背 + 肩臂 + 腿，专攻手臂与上肢立体度',
      difficulty: '进阶',
      training_days: 6,
      cycle_type: 'natural_week',
      background: '阿诺德分化因施瓦辛格而闻名，将每周6天按“胸背、肩臂、腿”循环两轮。相比PPL把手臂放在胸背之后练导致手臂预疲劳，阿诺德分化专门给肩部和手臂安排独立训练日，同时利用胸背拮抗肌搭配带来极佳充血泵感。',
      suitable_for: '觉得PPL模式下手臂与肩部进步较慢、希望重点突破手臂围度与倒三角立体度的进阶健美爱好者。',
      notes: '胸背日与肩臂日容量较高，可尝试同部位拮抗超级组节省时间；务必重视肩袖热身与周日充分恢复，避免连续熬夜硬顶。',
      exercises: [
        // 周一：胸背1
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '胸背1', target_sets: 4, target_reps: 8, initial_weight: 60, rest_seconds: 120 },
        { exercise_id: 'ex_006', day_of_week: 1, cycle_label: '胸背1', target_sets: 4, target_reps: 10, initial_weight: 24, rest_seconds: 90 },
        { exercise_id: 'ex_070', day_of_week: 1, cycle_label: '胸背1', target_sets: 3, target_reps: 12, initial_weight: 45, rest_seconds: 60 },
        { exercise_id: 'ex_013', day_of_week: 1, cycle_label: '胸背1', target_sets: 4, target_reps: 8, initial_weight: 0, rest_seconds: 120 },
        { exercise_id: 'ex_010', day_of_week: 1, cycle_label: '胸背1', target_sets: 4, target_reps: 8, initial_weight: 55, rest_seconds: 120 },
        { exercise_id: 'ex_012', day_of_week: 1, cycle_label: '胸背1', target_sets: 3, target_reps: 12, initial_weight: 50, rest_seconds: 90 },
        // 周二：肩臂1
        { exercise_id: 'ex_040', day_of_week: 2, cycle_label: '肩臂1', target_sets: 4, target_reps: 8, initial_weight: 40, rest_seconds: 120 },
        { exercise_id: 'ex_042', day_of_week: 2, cycle_label: '肩臂1', target_sets: 4, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_092', day_of_week: 2, cycle_label: '肩臂1', target_sets: 3, target_reps: 15, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '肩臂1', target_sets: 4, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_098', day_of_week: 2, cycle_label: '肩臂1', target_sets: 4, target_reps: 10, initial_weight: 25, rest_seconds: 90 },
        { exercise_id: 'ex_052', day_of_week: 2, cycle_label: '肩臂1', target_sets: 3, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        // 周三：腿部1
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 8, initial_weight: 75, rest_seconds: 150 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 10, initial_weight: 60, rest_seconds: 120 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 12, initial_weight: 35, rest_seconds: 60 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 12, initial_weight: 35, rest_seconds: 60 },
        { exercise_id: 'ex_084', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 15, initial_weight: 40, rest_seconds: 60 },
        // 周四：胸背2
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: '胸背2', target_sets: 4, target_reps: 10, initial_weight: 26, rest_seconds: 90 },
        { exercise_id: 'ex_072', day_of_week: 4, cycle_label: '胸背2', target_sets: 4, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_008', day_of_week: 4, cycle_label: '胸背2', target_sets: 3, target_reps: 15, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_014', day_of_week: 4, cycle_label: '胸背2', target_sets: 4, target_reps: 10, initial_weight: 50, rest_seconds: 90 },
        { exercise_id: 'ex_078', day_of_week: 4, cycle_label: '胸背2', target_sets: 4, target_reps: 10, initial_weight: 24, rest_seconds: 90 },
        { exercise_id: 'ex_016', day_of_week: 4, cycle_label: '胸背2', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        // 周五：肩臂2
        { exercise_id: 'ex_045', day_of_week: 5, cycle_label: '肩臂2', target_sets: 4, target_reps: 10, initial_weight: 18, rest_seconds: 90 },
        { exercise_id: 'ex_091', day_of_week: 5, cycle_label: '肩臂2', target_sets: 4, target_reps: 15, initial_weight: 10, rest_seconds: 60 },
        { exercise_id: 'ex_044', day_of_week: 5, cycle_label: '肩臂2', target_sets: 3, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_097', day_of_week: 5, cycle_label: '肩臂2', target_sets: 4, target_reps: 12, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 5, cycle_label: '肩臂2', target_sets: 4, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 5, cycle_label: '肩臂2', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        // 周六：腿部2
        { exercise_id: 'ex_028', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 10, initial_weight: 80, rest_seconds: 120 },
        { exercise_id: 'ex_023', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 16, rest_seconds: 90 },
        { exercise_id: 'ex_027', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_087', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_083', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 15, initial_weight: 30, rest_seconds: 60 }
      ]
    },

    {
      id: 'tpl_ppl_intense',
      name: 'PPL 强化版',
      description: '高容量推拉腿，每周6练冲刺大肌肉量，适合资深进阶训练者',
      difficulty: '进阶',
      training_days: 6,
      cycle_type: 'natural_week',
      background: 'PPL强化版在标准PPL基础上提高每部位单次有效组数与动作覆盖面，第一轮偏重5×5复合力量，第二轮偏重8–15次肌肥大塑形，适合已经适应标准PPL的进阶者突破维度平台。',
      suitable_for: '有2年以上系统训练经验、能够保证充足睡眠和饮食盈余的资深增肌爱好者。',
      notes: '不建议全年连续高容量执行，通常8–10周后建议切换回标准PPL或安排1–2周减量恢复，出现睡眠变差或关节酸痛应及时减量。',
      exercises: [
        // 推日1（周一）
        { exercise_id: 'ex_001', day_of_week: 1, cycle_label: '推1', target_sets: 5, target_reps: 5, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_005', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 8, initial_weight: 45, rest_seconds: 120 },
        { exercise_id: 'ex_008', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 12, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_040', day_of_week: 1, cycle_label: '推1', target_sets: 4, target_reps: 6, initial_weight: 40, rest_seconds: 150 },
        { exercise_id: 'ex_042', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 15, initial_weight: 8, rest_seconds: 60 },
        { exercise_id: 'ex_045', day_of_week: 1, cycle_label: '推1', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        // 拉日1（周二）
        { exercise_id: 'ex_010', day_of_week: 2, cycle_label: '拉1', target_sets: 5, target_reps: 5, initial_weight: 50, rest_seconds: 150 },
        { exercise_id: 'ex_013', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 8, initial_weight: 0, rest_seconds: 120 },
        { exercise_id: 'ex_015', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 10, initial_weight: 30, rest_seconds: 90 },
        { exercise_id: 'ex_044', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 15, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_050', day_of_week: 2, cycle_label: '拉1', target_sets: 4, target_reps: 10, initial_weight: 20, rest_seconds: 60 },
        { exercise_id: 'ex_054', day_of_week: 2, cycle_label: '拉1', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        // 腿日1（周三）
        { exercise_id: 'ex_020', day_of_week: 3, cycle_label: '腿1', target_sets: 5, target_reps: 5, initial_weight: 70, rest_seconds: 180 },
        { exercise_id: 'ex_026', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 8, initial_weight: 55, rest_seconds: 150 },
        { exercise_id: 'ex_027', day_of_week: 3, cycle_label: '腿1', target_sets: 3, target_reps: 10, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_024', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_025', day_of_week: 3, cycle_label: '腿1', target_sets: 4, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        // 推日2（周四）
        { exercise_id: 'ex_001', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 8, initial_weight: 50, rest_seconds: 120 },
        { exercise_id: 'ex_002', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 10, initial_weight: 30, rest_seconds: 90 },
        { exercise_id: 'ex_006', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 12, initial_weight: 25, rest_seconds: 60 },
        { exercise_id: 'ex_009', day_of_week: 4, cycle_label: '推2', target_sets: 3, target_reps: 15, initial_weight: 12, rest_seconds: 60 },
        { exercise_id: 'ex_041', day_of_week: 4, cycle_label: '推2', target_sets: 4, target_reps: 8, initial_weight: 20, rest_seconds: 120 },
        // 拉日2（周五）
        { exercise_id: 'ex_011', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 8, initial_weight: 28, rest_seconds: 120 },
        { exercise_id: 'ex_012', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 10, initial_weight: 45, rest_seconds: 90 },
        { exercise_id: 'ex_016', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 12, initial_weight: 30, rest_seconds: 60 },
        { exercise_id: 'ex_051', day_of_week: 5, cycle_label: '拉2', target_sets: 4, target_reps: 10, initial_weight: 15, rest_seconds: 60 },
        { exercise_id: 'ex_055', day_of_week: 5, cycle_label: '拉2', target_sets: 3, target_reps: 12, initial_weight: 20, rest_seconds: 60 },
        // 腿日2（周六）
        { exercise_id: 'ex_021', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 10, initial_weight: 100, rest_seconds: 120 },
        { exercise_id: 'ex_030', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 5, initial_weight: 85, rest_seconds: 180 },
        { exercise_id: 'ex_023', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 20, rest_seconds: 90 },
        { exercise_id: 'ex_027', day_of_week: 6, cycle_label: '腿2', target_sets: 4, target_reps: 12, initial_weight: 60, rest_seconds: 90 },
        { exercise_id: 'ex_029', day_of_week: 6, cycle_label: '腿2', target_sets: 3, target_reps: 10, initial_weight: 15, rest_seconds: 60 }
      ]
    }
  ];
}

module.exports = {
  getPlanTemplatesSeedData
};
