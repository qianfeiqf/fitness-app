/**
 * 系统内置动作库种子数据（88个高频动作，含一级大部位与二级细分部位）
 */

const MUSCLE_SUB_GROUPS = {
  "胸部": [
    "上胸",
    "中胸",
    "下胸"
  ],
  "背部": [
    "背阔肌",
    "中上背",
    "下背"
  ],
  "下肢": [
    "大腿前侧",
    "大腿后侧",
    "臀部",
    "小腿"
  ],
  "硬拉": [
    "后链综合",
    "大腿内侧",
    "上背锁定"
  ],
  "肩部": [
    "前束",
    "中束",
    "后束"
  ],
  "手臂": [
    "二头肌",
    "三头肌",
    "小臂"
  ],
  "核心": [
    "上腹",
    "下腹",
    "侧腹",
    "深层稳定"
  ]
};

function getExercisesSeedData() {
  return [
  {
    "id": "ex_001",
    "name": "杠铃卧推",
    "name_en": "Barbell Bench Press",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "杠铃",
    "target_muscles": "胸大肌中束 · 三角肌前束、肱三头肌",
    "description": "仰卧于平凳，双脚踩实地面，肩胛骨向后下方收紧并微弓上背。双手握距略宽于肩，将杠铃缓慢下放至胸骨中下段轻触，随后垂直略向头侧发力推起。",
    "tips": "下放吸气、推起呼气；手肘与躯干保持约45°–60°夹角，避免90°外展伤肩。",
    "is_system": true,
    "alternatives": [
      "ex_002",
      "ex_003",
      "ex_071",
      "ex_004"
    ]
  },
  {
    "id": "ex_002",
    "name": "哑铃卧推",
    "name_en": "Dumbbell Bench Press",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "哑铃",
    "target_muscles": "胸大肌中束 · 三角肌前束、肱三头肌",
    "description": "仰卧平凳，双手持哑铃置于胸侧，沉肩收紧肩胛骨。控制下放至大臂略低于躯干感受胸肌拉伸，再沿微弧线向上推起至双铃接近但不相撞。",
    "tips": "下放吸气、推起呼气；全程保持小臂垂直地面，手腕保持中立不向后翻折。",
    "is_system": true,
    "alternatives": [
      "ex_001",
      "ex_003",
      "ex_071",
      "ex_004"
    ]
  },
  {
    "id": "ex_003",
    "name": "机械卧推",
    "name_en": "Machine Chest Press",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "固定器械",
    "target_muscles": "胸大肌中束 · 三角肌前束、肱三头肌",
    "description": "调节座椅高度使握把与胸中部齐平，背部与头紧贴靠垫、肩胛下沉。双手向前推出至肘部微屈，停顿一秒后有控制地还原。",
    "tips": "推出呼气、还原吸气；轨迹固定非常适合新手找胸肌发力感或力竭冲刺，切忌耸肩借力。",
    "is_system": true,
    "alternatives": [
      "ex_001",
      "ex_002",
      "ex_071"
    ]
  },
  {
    "id": "ex_004",
    "name": "俯卧撑",
    "name_en": "Push-ups",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "徒手",
    "target_muscles": "胸大肌 · 三角肌前束、肱三头肌、核心",
    "description": "双手撑地略宽于肩，收紧核心与臀部使头、背、腿成一条直线。屈肘缓慢下放至胸部接近地面，再推地撑起还原。",
    "tips": "下放吸气、推起呼气；避免塌腰或撅臀，新手可先从跪姿或上斜俯卧撑开始。",
    "is_system": true,
    "alternatives": [
      "ex_001",
      "ex_002",
      "ex_003"
    ]
  },
  {
    "id": "ex_005",
    "name": "上斜杠铃卧推",
    "name_en": "Incline Barbell Bench Press",
    "muscle_group": "胸部",
    "sub_muscle": "上胸",
    "equipment": "杠铃",
    "target_muscles": "胸大肌上束 · 三角肌前束、肱三头肌",
    "description": "将凳背调至30°上斜角，双脚踩稳并收紧肩胛。双手略宽于肩握杠，缓慢下放至锁骨下方约2–3指处，随后稳定推起。",
    "tips": "凳子角度以30°为佳，超过45°会过多借用三角肌前束；下放吸气、推起呼气。",
    "is_system": true,
    "alternatives": [
      "ex_006",
      "ex_072"
    ]
  },
  {
    "id": "ex_006",
    "name": "上斜哑铃卧推",
    "name_en": "Incline Dumbbell Press",
    "muscle_group": "胸部",
    "sub_muscle": "上胸",
    "equipment": "哑铃",
    "target_muscles": "胸大肌上束 · 三角肌前束、肱三头肌",
    "description": "在30°上斜凳仰卧，沉肩挺胸，双手持哑铃置于上胸两侧。控制下放至胸上束充分拉伸，再向上向内推起至双臂接近伸直。",
    "tips": "起重量时可先将哑铃放于膝上借力上翻；避免推起时肩部前伸离开靠背。",
    "is_system": true,
    "alternatives": [
      "ex_005",
      "ex_072"
    ]
  },
  {
    "id": "ex_007",
    "name": "双杠臂屈伸",
    "name_en": "Dips",
    "muscle_group": "胸部",
    "sub_muscle": "下胸",
    "equipment": "徒手",
    "target_muscles": "胸大肌下束 · 肱三头肌、三角肌前束",
    "description": "双手撑于双杠，躯干略微前倾约20°–30°，双脚交叉微屈。缓慢屈肘下放至大臂与地面平行，感受下胸拉伸后推起还原。",
    "tips": "前倾练胸、直立练三头；下放不要过深以免拉伤肩关节前囊，起升呼气。",
    "is_system": true,
    "alternatives": [
      "ex_073",
      "ex_004"
    ]
  },
  {
    "id": "ex_008",
    "name": "绳索飞鸟",
    "name_en": "Cable Fly",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "龙门架",
    "target_muscles": "胸大肌中束与内侧 · 三角肌前束",
    "description": "将龙门架滑轮调至与胸齐平或略高，前后脚站稳、躯干微前倾。双肘保持微屈固定角度，以胸肌发力将双把手在胸前划弧夹拢并顶峰收缩1秒。",
    "tips": "全程保持手肘角度不变，想象环抱一棵大树，避免变成推举动作；夹拢呼气。",
    "is_system": true,
    "alternatives": [
      "ex_070",
      "ex_009",
      "ex_074"
    ]
  },
  {
    "id": "ex_009",
    "name": "哑铃飞鸟",
    "name_en": "Dumbbell Fly",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "哑铃",
    "target_muscles": "胸大肌中束 · 三角肌前束",
    "description": "仰卧平凳，双手持轻中重量哑铃举于胸上方，肘部微屈。控制双臂向两侧划弧打开至大臂与躯干齐平，再靠胸肌收缩弧形合拢。",
    "tips": "切忌使用过大重量导致肘部下沉拉伤肩关节；打开吸气、合拢呼气。",
    "is_system": true,
    "alternatives": [
      "ex_008",
      "ex_070"
    ]
  },
  {
    "id": "ex_070",
    "name": "蝴蝶机夹胸",
    "name_en": "Pec Deck Fly",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "固定器械",
    "target_muscles": "胸大肌中束与内侧 · 三角肌前束",
    "description": "调好座椅使握把与胸中部同高，背部紧贴靠垫、沉肩挺胸。手肘微屈固定，用大臂内侧带动把手在胸前合拢，顶峰挤压胸肌1秒后慢放。",
    "tips": "还原时不要让肩胛骨完全散开或手臂过度后甩；合拢呼气、打开吸气。",
    "is_system": true,
    "alternatives": [
      "ex_008",
      "ex_009"
    ]
  },
  {
    "id": "ex_071",
    "name": "史密斯平板卧推",
    "name_en": "Smith Machine Bench Press",
    "muscle_group": "胸部",
    "sub_muscle": "中胸",
    "equipment": "史密斯机",
    "target_muscles": "胸大肌中束 · 三角肌前束、肱三头肌",
    "description": "将平凳摆正于史密斯架下，使杠铃落点位于胸骨中下段。解开安全挂钩后缓慢下放至轻触胸口，再发力垂直推起。",
    "tips": "轨道固定更安全，适合独自训练冲重量或强化胸肌孤立感；提前设好底部安全限位。",
    "is_system": true,
    "alternatives": [
      "ex_001",
      "ex_002",
      "ex_003"
    ]
  },
  {
    "id": "ex_072",
    "name": "史密斯上斜卧推",
    "name_en": "Smith Machine Incline Press",
    "muscle_group": "胸部",
    "sub_muscle": "上胸",
    "equipment": "史密斯机",
    "target_muscles": "胸大肌上束 · 三角肌前束、肱三头肌",
    "description": "在史密斯架下放置30°上斜凳，调整位置使杠铃垂直落在上胸锁骨下方。沉肩收背，控制离心下放2–3秒后发力推起。",
    "tips": "避免臀部离开凳面借力，手肘保持在杠铃正下方；推起呼气、下放吸气。",
    "is_system": true,
    "alternatives": [
      "ex_005",
      "ex_006"
    ]
  },
  {
    "id": "ex_073",
    "name": "下斜哑铃卧推",
    "name_en": "Decline Dumbbell Press",
    "muscle_group": "胸部",
    "sub_muscle": "下胸",
    "equipment": "哑铃",
    "target_muscles": "胸大肌下束 · 肱三头肌、胸大肌中束",
    "description": "双脚勾稳15°–20°下斜凳，双手持哑铃置于下胸两侧。控制下放至胸肌充分拉伸，再垂直向上推起至双臂接近伸直。",
    "tips": "下斜角度无需过大，15°即可精准刺激下胸且减少头部充血不适。",
    "is_system": true,
    "alternatives": [
      "ex_007",
      "ex_002"
    ]
  },
  {
    "id": "ex_074",
    "name": "龙门架低位夹胸",
    "name_en": "Low-to-High Cable Fly",
    "muscle_group": "胸部",
    "sub_muscle": "上胸",
    "equipment": "龙门架",
    "target_muscles": "胸大肌上束 · 三角肌前束",
    "description": "将滑轮调至最低位，双手掌心朝前握把，弓步站稳、挺胸收腹。保持肘部微屈，从身体两侧斜向上划弧夹拢至锁骨前方并停顿挤压。",
    "tips": "注意力放在上胸收缩，避免过度耸肩或用手臂猛甩借力；上夹呼气。",
    "is_system": true,
    "alternatives": [
      "ex_008",
      "ex_006"
    ]
  },
  {
    "id": "ex_010",
    "name": "杠铃划船",
    "name_en": "Barbell Row",
    "muscle_group": "背部",
    "sub_muscle": "中上背",
    "equipment": "杠铃",
    "target_muscles": "背阔肌、斜方肌中下束 · 菱形肌、竖脊肌、肱二头肌",
    "description": "双脚与肩同宽，屈髋俯身约45°，保持脊柱中立与核心绷紧。双手略宽于肩握杠，用手肘向后上方带动将杠铃贴近大腿拉向肚脐附近。",
    "tips": "避免弓背或靠惯性猛甩起身；拉起呼气、慢放吸气，顶峰夹紧肩胛骨。",
    "is_system": true,
    "alternatives": [
      "ex_011",
      "ex_012",
      "ex_015",
      "ex_075"
    ]
  },
  {
    "id": "ex_011",
    "name": "哑铃划船",
    "name_en": "Dumbbell Row",
    "muscle_group": "背部",
    "sub_muscle": "中上背",
    "equipment": "哑铃",
    "target_muscles": "背阔肌、菱形肌 · 肱二头肌、三角肌后束",
    "description": "俯身或斜撑于凳面，保持背部平直、核心收紧。双手或单手持哑铃垂于肩下，向髋部方向后拉至肘部略过躯干，停顿1秒后缓慢下放。",
    "tips": "想着把肘关节往裤兜方向拉，而不是竖直往上提，能更好刺激背阔肌。",
    "is_system": true,
    "alternatives": [
      "ex_010",
      "ex_012",
      "ex_078"
    ]
  },
  {
    "id": "ex_012",
    "name": "坐姿划船",
    "name_en": "Seated Cable Row",
    "muscle_group": "背部",
    "sub_muscle": "中上背",
    "equipment": "龙门架",
    "target_muscles": "背阔肌、斜方肌中束 · 菱形肌、肱二头肌",
    "description": "坐姿双脚蹬实踏板，膝盖微屈，保持躯干直立挺胸。双手握V柄将把手拉向腹部下沿，同时肩胛骨向后夹紧，再有控制地向前伸展还原。",
    "tips": "回放时允许肩胛适度前伸充分拉伸背阔肌，但腰椎切忌前后大幅晃动借力。",
    "is_system": true,
    "alternatives": [
      "ex_010",
      "ex_075",
      "ex_080"
    ]
  },
  {
    "id": "ex_013",
    "name": "引体向上",
    "name_en": "Pull-ups",
    "muscle_group": "背部",
    "sub_muscle": "背阔肌",
    "equipment": "徒手",
    "target_muscles": "背阔肌、大圆肌 · 肱二头肌、斜方肌下束",
    "description": "正手略宽于肩握单杠，先沉肩启动肩胛下回旋，再将胸口向上拉向横杠直至下巴过杠。顶峰略停后缓慢控制下放至手臂接近伸直。",
    "tips": "上拉呼气、下放吸气；避免蹬腿摆荡，做不满次数可用弹力带或辅助引体机过渡。",
    "is_system": true,
    "alternatives": [
      "ex_014",
      "ex_076"
    ]
  },
  {
    "id": "ex_014",
    "name": "高位下拉",
    "name_en": "Lat Pulldown",
    "muscle_group": "背部",
    "sub_muscle": "背阔肌",
    "equipment": "龙门架",
    "target_muscles": "背阔肌、大圆肌 · 肱二头肌、菱形肌",
    "description": "膝盖固定于护垫下，正手约1.2–1.5倍肩宽握杆，躯干微后倾约10°–15°。先沉肩再向下拉动横杆至锁骨上方，顶峰停顿后缓慢放回。",
    "tips": "避免身体大幅后仰借力或耸肩拉杆；手肘垂直向下收，下拉呼气。",
    "is_system": true,
    "alternatives": [
      "ex_013",
      "ex_077"
    ]
  },
  {
    "id": "ex_015",
    "name": "T杆划船",
    "name_en": "T-Bar Row",
    "muscle_group": "背部",
    "sub_muscle": "中上背",
    "equipment": "杠铃",
    "target_muscles": "中背部厚度（斜方肌中下束、菱形肌） · 背阔肌",
    "description": "跨站于地雷管/T杆两侧，屈髋俯身约45°并锁紧核心。双手握窄柄将重量沿弧线拉向胸腹交界处，挤压背部中缝后有控制地下放。",
    "tips": "使用较小直径杠铃片可增大行程；全程保持下背平直不圆腰。",
    "is_system": true,
    "alternatives": [
      "ex_010",
      "ex_075"
    ]
  },
  {
    "id": "ex_016",
    "name": "直臂下压",
    "name_en": "Straight Arm Pulldown",
    "muscle_group": "背部",
    "sub_muscle": "背阔肌",
    "equipment": "龙门架",
    "target_muscles": "背阔肌 · 肱三头肌长头、核心",
    "description": "面对高位滑轮站立，屈髋微前倾、背部挺直。双手握直杆或绳索，保持肘部微屈锁定，用背阔肌发力将把手划弧下压至大腿前侧。",
    "tips": "极佳的背阔肌孤立激活/收尾动作，避免手臂屈伸代偿，下压时沉肩呼气。",
    "is_system": true,
    "alternatives": [
      "ex_014",
      "ex_077"
    ]
  },
  {
    "id": "ex_075",
    "name": "坐姿机械划船",
    "name_en": "Machine Chest-Supported Row",
    "muscle_group": "背部",
    "sub_muscle": "中上背",
    "equipment": "固定器械",
    "target_muscles": "背阔肌、菱形肌、斜方肌中束 · 三角肌后束",
    "description": "调整胸垫与座椅高度，胸部紧贴护垫消除下背代偿。双手握把沉肩向后拉动，顶峰夹紧肩胛骨1秒，缓慢放回至充分拉伸。",
    "tips": "对下背零压力，非常适合练腿后或高容量背部训练日安全冲刺大重量。",
    "is_system": true,
    "alternatives": [
      "ex_012",
      "ex_010"
    ]
  },
  {
    "id": "ex_076",
    "name": "反手引体向上",
    "name_en": "Chin-ups",
    "muscle_group": "背部",
    "sub_muscle": "背阔肌",
    "equipment": "徒手",
    "target_muscles": "背阔肌下沿、肱二头肌 · 大圆肌",
    "description": "反手（掌心朝向自己）与肩同宽握杠，沉肩挺胸将身体垂直拉起至上胸靠近横杠，再控制2–3秒缓慢下放。",
    "tips": "因肱二头肌协同更强，通常比正手引体更易上手，兼具练背与粗手臂效果。",
    "is_system": true,
    "alternatives": [
      "ex_013",
      "ex_014"
    ]
  },
  {
    "id": "ex_077",
    "name": "单臂绳索下拉",
    "name_en": "Single-Arm Cable Pulldown",
    "muscle_group": "背部",
    "sub_muscle": "背阔肌",
    "equipment": "龙门架",
    "target_muscles": "背阔肌 · 大圆肌、核心抗侧屈",
    "description": "单膝跪姿或坐姿面对高位滑轮，单手握D形把手。先沉肩再沿身体侧前方将手肘向下拉向骨盆侧面，顶峰停顿挤压背阔肌。",
    "tips": "单侧训练有助于纠正左右背阔肌不对称；动作末端可微侧倾躯干增强收缩感。",
    "is_system": true,
    "alternatives": [
      "ex_014",
      "ex_016"
    ]
  },
  {
    "id": "ex_078",
    "name": "单臂哑铃划船",
    "name_en": "Single-Arm Dumbbell Row",
    "muscle_group": "背部",
    "sub_muscle": "背阔肌",
    "equipment": "哑铃",
    "target_muscles": "背阔肌、斜方肌中束 · 菱形肌、核心",
    "description": "一手一膝支撑于平凳（或三点俯身撑凳），另一脚踩实地面，脊柱保持水平中立。持铃手自然下垂后向髋部方向划弧拉起，缓慢下放。",
    "tips": "切忌借旋转躯干甩起哑铃；视线看斜前方地面，保持颈椎与背部同直线。",
    "is_system": true,
    "alternatives": [
      "ex_011",
      "ex_010"
    ]
  },
  {
    "id": "ex_079",
    "name": "山羊挺身",
    "name_en": "Back Extension",
    "muscle_group": "背部",
    "sub_muscle": "下背",
    "equipment": "固定器械",
    "target_muscles": "竖脊肌、臀大肌 · 腘绳肌",
    "description": "将罗马椅护垫调至髋关节折叠处下方，双脚卡稳。保持背部平直屈髋缓慢下俯，再用臀部与下背发力挺身至躯干与下肢成一直线。",
    "tips": "起至身体成直线即可，切忌过度反弓腰椎挤压椎间盘；进阶可抱杠铃片负重。",
    "is_system": true,
    "alternatives": [
      "ex_026",
      "ex_032"
    ]
  },
  {
    "id": "ex_080",
    "name": "宽距坐姿划船",
    "name_en": "Wide-Grip Seated Row",
    "muscle_group": "背部",
    "sub_muscle": "中上背",
    "equipment": "龙门架",
    "target_muscles": "斜方肌中下束、菱形肌、三角肌后束 · 背阔肌",
    "description": "使用宽距横杆，坐姿挺胸收腹。将横杆拉向胸口下沿，双肘略向外展开约45°–60°，充分夹紧上背肩胛骨后慢放。",
    "tips": "比窄距划船更侧重上背厚度与后束立体感，全程保持沉肩不耸肩。",
    "is_system": true,
    "alternatives": [
      "ex_012",
      "ex_075"
    ]
  },
  {
    "id": "ex_020",
    "name": "杠铃深蹲",
    "name_en": "Barbell Squat",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "杠铃",
    "target_muscles": "股四头肌、臀大肌 · 腘绳肌、核心、内收肌",
    "description": "将杠铃稳置于上斜方肌，双脚略宽于肩、脚尖微外展。深吸气绷紧核心，屈髋屈膝同时下蹲至大腿与地面平行或略低，再全脚掌发力蹬起。",
    "tips": "膝盖方向始终与脚尖一致避免内扣；下蹲吸气闭气稳核心，站起过粘滞点后呼气。",
    "is_system": true,
    "alternatives": [
      "ex_081",
      "ex_021",
      "ex_022",
      "ex_028"
    ]
  },
  {
    "id": "ex_021",
    "name": "腿举",
    "name_en": "Leg Press",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "固定器械",
    "target_muscles": "股四头肌、臀大肌 · 腘绳肌",
    "description": "背部与臀部紧贴靠垫，双脚与肩同宽踩于踏板中段。解开安全锁后缓慢屈膝下放至大腿接近胸口，再用全脚掌发力推起至膝盖微屈。",
    "tips": "切忌在最高点完全锁死膝关节；下放时臀部与下背不可离开靠垫卷尾骨。",
    "is_system": true,
    "alternatives": [
      "ex_020",
      "ex_028",
      "ex_081"
    ]
  },
  {
    "id": "ex_022",
    "name": "前蹲",
    "name_en": "Front Squat",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "杠铃",
    "target_muscles": "股四头肌 · 核心、上背部、臀大肌",
    "description": "将杠铃架于三角肌前束与锁骨凹槽处，抬高手肘使大臂近似平行地面。保持躯干更直立的姿态垂直下蹲到底部，随后稳定蹬起。",
    "tips": "手腕柔韧不足可改用交叉臂握杠；全程手肘保持上抬防止杠铃向前滑落。",
    "is_system": true,
    "alternatives": [
      "ex_020",
      "ex_082",
      "ex_028"
    ]
  },
  {
    "id": "ex_023",
    "name": "保加利亚分腿蹲",
    "name_en": "Bulgarian Split Squat",
    "muscle_group": "下肢",
    "sub_muscle": "臀部",
    "equipment": "哑铃",
    "target_muscles": "臀大肌、股四头肌 · 臀中肌、核心稳定",
    "description": "背对凳子站立，一脚脚背轻放凳面，前脚向前跨出约一大步。核心收紧垂直下蹲至后膝接近地面，前脚全脚掌发力推地站起。",
    "tips": "躯干微前倾更练臀，躯干直立更练股四头肌；重心压在前脚而非后脚。",
    "is_system": true,
    "alternatives": [
      "ex_029",
      "ex_020"
    ]
  },
  {
    "id": "ex_024",
    "name": "腿弯举",
    "name_en": "Leg Curl",
    "muscle_group": "下肢",
    "sub_muscle": "大腿后侧",
    "equipment": "固定器械",
    "target_muscles": "腘绳肌（大腿后侧） · 腓肠肌",
    "description": "坐姿调整护垫紧压大腿上方与脚踝后侧，膝关节与器械转轴对齐。大腿后侧发力向下勾腿至最大幅度，顶峰停顿1秒后缓慢放回。",
    "tips": "全程臀部紧贴座椅不借力抬起，离心阶段控制2–3秒感受后侧拉伸。",
    "is_system": true,
    "alternatives": [
      "ex_087",
      "ex_026"
    ]
  },
  {
    "id": "ex_025",
    "name": "腿伸展",
    "name_en": "Leg Extension",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "固定器械",
    "target_muscles": "股四头肌（大腿前侧）",
    "description": "坐姿背部贴紧靠垫，调整滚轴位于脚踝正上方、膝盖对齐器械转轴。股四头肌发力向上踢直双腿，顶峰收紧停顿1秒后有控制地下放。",
    "tips": "动作全程平稳不猛甩，膝盖不适者可减轻重量并略微缩短底部屈膝角度。",
    "is_system": true,
    "alternatives": [
      "ex_020",
      "ex_028"
    ]
  },
  {
    "id": "ex_026",
    "name": "罗马尼亚硬拉",
    "name_en": "Romanian Deadlift",
    "muscle_group": "下肢",
    "sub_muscle": "大腿后侧",
    "equipment": "杠铃",
    "target_muscles": "腘绳肌、臀大肌 · 竖脊肌",
    "description": "双手握杠（或哑铃）站立，膝盖保持微屈约15°锁定。背部挺直，将臀部水平向后推，杠铃贴紧大腿滑至小腿中段感受后侧强烈拉伸，再夹臀挺髋站起。",
    "tips": "核心要点是“屈髋而非下蹲”；切忌圆背，下放至臀部不再后移即可拉起。",
    "is_system": true,
    "alternatives": [
      "ex_032",
      "ex_024",
      "ex_079"
    ]
  },
  {
    "id": "ex_027",
    "name": "臀推",
    "name_en": "Hip Thrust",
    "muscle_group": "下肢",
    "sub_muscle": "臀部",
    "equipment": "杠铃",
    "target_muscles": "臀大肌 · 腘绳肌、核心",
    "description": "上背肩胛骨下沿靠于平凳，杠铃加护垫置于髋部折叠处，双脚踩实使顶峰时小腿垂直地面。臀部发力向上顶髋至躯干与大腿成直线，夹臀停顿1秒后慢放。",
    "tips": "全程保持下巴微收、肋骨下沉，避免顶腰反弓代偿臀部发力。",
    "is_system": true,
    "alternatives": [
      "ex_026",
      "ex_023"
    ]
  },
  {
    "id": "ex_028",
    "name": "腿举(哈克机)",
    "name_en": "Hack Squat",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "固定器械",
    "target_muscles": "股四头肌 · 臀大肌",
    "description": "肩部抵实护垫、背部全程紧贴靠板，双脚踩在踏板中下部。解锁后控制下蹲至膝关节充分折叠，再用股四头肌发力蹬起至微屈。",
    "tips": "下背负担极小，可安全深蹲至更大幅度；同样避免顶端锁死膝盖。",
    "is_system": true,
    "alternatives": [
      "ex_020",
      "ex_021",
      "ex_081"
    ]
  },
  {
    "id": "ex_029",
    "name": "行走箭步蹲",
    "name_en": "Walking Lunge",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "哑铃",
    "target_muscles": "臀大肌、股四头肌 · 腘绳肌、核心平衡",
    "description": "双手自然垂持哑铃，向前迈出稳定一步，垂直下蹲至前后膝均约90°。以前脚全脚掌发力蹬地起身，顺势迈出另一条腿交替前行。",
    "tips": "步幅略大侧重臀部，步幅适中侧重股四头肌；保持上身稳定不左右摇晃。",
    "is_system": true,
    "alternatives": [
      "ex_023",
      "ex_082"
    ]
  },
  {
    "id": "ex_081",
    "name": "史密斯深蹲",
    "name_en": "Smith Machine Squat",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "史密斯机",
    "target_muscles": "股四头肌、臀大肌 · 腘绳肌",
    "description": "将杠铃置于上背，双脚略向前站半步使身体轻靠杠铃轨道。核心收紧缓慢下蹲至大腿平行地面以下，随后稳定蹬起。",
    "tips": "双脚站位靠前一点可更精准刺激股四头肌并减少下背压力，新手易上手。",
    "is_system": true,
    "alternatives": [
      "ex_020",
      "ex_028",
      "ex_021"
    ]
  },
  {
    "id": "ex_082",
    "name": "高脚杯深蹲",
    "name_en": "Goblet Squat",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "哑铃",
    "target_muscles": "股四头肌、臀大肌 · 核心",
    "description": "双手捧住一只哑铃的一端紧贴胸前，双脚略宽于肩、脚尖外展。挺胸收腹下蹲至手肘接近膝盖内侧，再全脚掌发力站起。",
    "tips": "极佳的居家与新手深蹲教学动作，前置负重自然帮助保持上身直立不倒腰。",
    "is_system": true,
    "alternatives": [
      "ex_020",
      "ex_022"
    ]
  },
  {
    "id": "ex_083",
    "name": "坐姿提踵",
    "name_en": "Seated Calf Raise",
    "muscle_group": "下肢",
    "sub_muscle": "小腿",
    "equipment": "固定器械",
    "target_muscles": "比目鱼肌（小腿深层） · 腓肠肌",
    "description": "坐姿将护垫压于大腿近膝处，前脚掌踩在踏板边缘。缓慢下放脚跟至充分拉伸，再发力踮高脚尖，顶峰停顿1–2秒。",
    "tips": "小腿训练切忌弹震借力，底部与顶部各停顿1秒效果成倍提升。",
    "is_system": true,
    "alternatives": [
      "ex_084"
    ]
  },
  {
    "id": "ex_084",
    "name": "站姿提踵",
    "name_en": "Standing Calf Raise",
    "muscle_group": "下肢",
    "sub_muscle": "小腿",
    "equipment": "固定器械",
    "target_muscles": "腓肠肌（小腿表层） · 比目鱼肌",
    "description": "双肩顶住器械护垫（或手持哑铃站于台阶边缘），膝盖微屈锁定。脚跟下沉拉伸小腿，随后发力垫起至最高点并停顿挤压。",
    "tips": "大脚趾根部发力蹬起，避免脚踝向外翻；每组做足12–20次高次数刺激。",
    "is_system": true,
    "alternatives": [
      "ex_083"
    ]
  },
  {
    "id": "ex_085",
    "name": "坐姿髋外展",
    "name_en": "Seated Hip Abduction",
    "muscle_group": "下肢",
    "sub_muscle": "臀部",
    "equipment": "固定器械",
    "target_muscles": "臀中肌、臀小肌 · 臀大肌上沿",
    "description": "坐于外展机，双腿外侧紧贴护垫，躯干直立或略前倾。用臀部外侧发力将双膝向两侧打开至最大幅度，顶峰停顿1秒后慢放。",
    "tips": "改善臀部凹陷、饱满上臀的经典动作；全程控制节奏不要甩动配重片。",
    "is_system": true,
    "alternatives": [
      "ex_027",
      "ex_023"
    ]
  },
  {
    "id": "ex_086",
    "name": "坐姿髋内收",
    "name_en": "Seated Hip Adduction",
    "muscle_group": "下肢",
    "sub_muscle": "大腿前侧",
    "equipment": "固定器械",
    "target_muscles": "大腿内收肌群",
    "description": "坐姿双腿内侧贴紧护垫，打开至舒适拉伸幅度。大腿内侧发力将双膝平稳夹拢，顶峰停顿1秒后再缓慢放开。",
    "tips": "强化大腿内侧能提升深蹲稳定性，切忌贪重猛夹以免拉伤腹股沟。",
    "is_system": true,
    "alternatives": [
      "ex_031",
      "ex_020"
    ]
  },
  {
    "id": "ex_087",
    "name": "俯卧腿弯举",
    "name_en": "Lying Leg Curl",
    "muscle_group": "下肢",
    "sub_muscle": "大腿后侧",
    "equipment": "固定器械",
    "target_muscles": "腘绳肌 · 腓肠肌",
    "description": "俯卧于器械垫面，髋部紧压软垫，脚踝后侧勾住滚轴。腘绳肌发力将滚轴向臀部方向勾起，顶峰停顿后控制2秒下放。",
    "tips": "向上勾腿时切忌屁股翘离垫面借力下背；脚背放松或微勾均可。",
    "is_system": true,
    "alternatives": [
      "ex_024",
      "ex_026"
    ]
  },
  {
    "id": "ex_030",
    "name": "传统硬拉",
    "name_en": "Conventional Deadlift",
    "muscle_group": "硬拉",
    "sub_muscle": "后链综合",
    "equipment": "杠铃",
    "target_muscles": "后链肌群（臀大肌、腘绳肌、竖脊肌） · 背阔肌、斜方肌、握力",
    "description": "双脚约与髋同宽，杠铃位于脚掌正中上方。屈髋俯身握杠，收紧背阔肌拉直杠铃消除空隙，深吸气锁紧核心，腿部蹬地同时挺髋将杠铃贴腿拉起。",
    "tips": "拉起前先把杠铃“拉紧”，全程保持杠铃贴近小腿与大腿，切忌圆背硬扯。",
    "is_system": true,
    "alternatives": [
      "ex_031",
      "ex_088",
      "ex_026"
    ]
  },
  {
    "id": "ex_031",
    "name": "相扑硬拉",
    "name_en": "Sumo Deadlift",
    "muscle_group": "硬拉",
    "sub_muscle": "大腿内侧",
    "equipment": "杠铃",
    "target_muscles": "内收肌、臀大肌、股四头肌 · 竖脊肌、腘绳肌",
    "description": "双脚宽站距并外展脚尖约30°–45°，双手在双腿内侧垂直握杠。挺胸沉髋使躯干更直立，双膝向外推开同时发力蹬地锁髋站起。",
    "tips": "相比传统硬拉对下背剪切力更小、行程更短；启动时避免臀部过早抬高。",
    "is_system": true,
    "alternatives": [
      "ex_030",
      "ex_088"
    ]
  },
  {
    "id": "ex_032",
    "name": "直腿硬拉",
    "name_en": "Stiff Leg Deadlift",
    "muscle_group": "硬拉",
    "sub_muscle": "后链综合",
    "equipment": "杠铃",
    "target_muscles": "腘绳肌、竖脊肌 · 臀大肌",
    "description": "双脚与髋同宽，膝盖保持近乎伸直但微松不锁死。保持脊柱中立，从地面或高位屈髋缓慢下放杠铃，感受大腿后侧深度拉伸后发力挺髋拉起。",
    "tips": "对柔韧性要求较高，重量应明显轻于传统硬拉，切忌为了触地而弯腰弓背。",
    "is_system": true,
    "alternatives": [
      "ex_026",
      "ex_030"
    ]
  },
  {
    "id": "ex_088",
    "name": "六角杠硬拉",
    "name_en": "Trap Bar Deadlift",
    "muscle_group": "硬拉",
    "sub_muscle": "后链综合",
    "equipment": "六角杠",
    "target_muscles": "股四头肌、臀大肌、腘绳肌 · 竖脊肌、斜方肌",
    "description": "站入六角杠中央，双脚与肩同宽，双手抓握两侧中立握把。沉肩挺胸、核心绷紧，双腿发力垂直蹬地站起至自然锁定，再沿原路径下放。",
    "tips": "重心与身体重合，对下背极其友好且最容易掌握，非常适合新手与运动表现训练。",
    "is_system": true,
    "alternatives": [
      "ex_030",
      "ex_031"
    ]
  },
  {
    "id": "ex_089",
    "name": "架上硬拉",
    "name_en": "Rack Pull",
    "muscle_group": "硬拉",
    "sub_muscle": "上背锁定",
    "equipment": "杠铃",
    "target_muscles": "上背部、斜方肌、竖脊肌 · 臀大肌、握力",
    "description": "将杠铃置于深蹲架安全杠上（约膝盖下方或齐平高度）。站姿收紧背部与核心，直接发力挺髋拉起至站直锁定，强化硬拉后半程与上背厚度。",
    "tips": "可用于突破硬拉锁定瓶颈，切忌在顶端过度后仰挤压腰椎。",
    "is_system": true,
    "alternatives": [
      "ex_030",
      "ex_010"
    ]
  },
  {
    "id": "ex_040",
    "name": "杠铃推举",
    "name_en": "Barbell Overhead Press",
    "muscle_group": "肩部",
    "sub_muscle": "前束",
    "equipment": "杠铃",
    "target_muscles": "三角肌前束、中束 · 肱三头肌、上胸、核心",
    "description": "站姿双脚与肩同宽，双手略宽于肩握杠置于锁骨前方，夹紧臀部与核心。头部微后让开路径，将杠铃垂直推举过头顶并微向前探头稳定锁定。",
    "tips": "全程夹臀收腹防止过度反弓下背；上推呼气、下放吸气，小臂保持垂直地面。",
    "is_system": true,
    "alternatives": [
      "ex_041",
      "ex_090",
      "ex_045"
    ]
  },
  {
    "id": "ex_041",
    "name": "哑铃推举",
    "name_en": "Dumbbell Shoulder Press",
    "muscle_group": "肩部",
    "sub_muscle": "前束",
    "equipment": "哑铃",
    "target_muscles": "三角肌前束、中束 · 肱三头肌",
    "description": "坐姿（凳背约75°–85°）或站姿，双手持哑铃举至耳侧，大臂略微向前收约30°（肩胛骨平面）。稳定向上推起至接近伸直，缓慢下放至大臂略低于水平。",
    "tips": "肘部略微前收比完全向两侧打开更保护肩峰，避免耸肩或顶端碰撞哑铃。",
    "is_system": true,
    "alternatives": [
      "ex_040",
      "ex_090",
      "ex_045"
    ]
  },
  {
    "id": "ex_042",
    "name": "侧平举",
    "name_en": "Lateral Raise",
    "muscle_group": "肩部",
    "sub_muscle": "中束",
    "equipment": "哑铃",
    "target_muscles": "三角肌中束",
    "description": "站姿或坐姿，双手持轻中重量哑铃置于体侧，沉肩、肘部微屈。用三角肌中束发力将双臂向侧前方约20°方向抬起至与肩同高，缓慢控制下放。",
    "tips": "选宁轻勿重的重量，保持沉肩不耸肩；想象用手肘向外推而非用手腕往上拎。",
    "is_system": true,
    "alternatives": [
      "ex_091",
      "ex_093"
    ]
  },
  {
    "id": "ex_043",
    "name": "前平举",
    "name_en": "Front Raise",
    "muscle_group": "肩部",
    "sub_muscle": "前束",
    "equipment": "哑铃",
    "target_muscles": "三角肌前束 · 胸大肌上束",
    "description": "站姿核心收紧，双手（或交替）持哑铃垂于大腿前侧，肘部微屈。用肩前束发力向前上方抬起至与肩同高，停顿片刻后慢放还原。",
    "tips": "避免身体前后摇晃借力；卧推和推举已充分练到前束，前平举可作为轻量补充。",
    "is_system": true,
    "alternatives": [
      "ex_041",
      "ex_045"
    ]
  },
  {
    "id": "ex_044",
    "name": "面拉",
    "name_en": "Face Pull",
    "muscle_group": "肩部",
    "sub_muscle": "后束",
    "equipment": "龙门架",
    "target_muscles": "三角肌后束、肩袖外旋肌 · 斜方肌中下束、菱形肌",
    "description": "滑轮调至额头高度，双手握绳索两端末端后退拉紧。向眉心与双耳方向水平后拉，同时打开双肘并做肩外旋（大拇指指向身后），顶峰停顿1秒。",
    "tips": "保护肩关节与改善圆肩体态的王牌动作，选轻重量追求标准外旋与后束酸胀感。",
    "is_system": true,
    "alternatives": [
      "ex_092",
      "ex_046",
      "ex_094"
    ]
  },
  {
    "id": "ex_045",
    "name": "阿诺德推举",
    "name_en": "Arnold Press",
    "muscle_group": "肩部",
    "sub_muscle": "前束",
    "equipment": "哑铃",
    "target_muscles": "三角肌前束、中束 · 肱三头肌",
    "description": "坐姿双手持哑铃举于胸前、掌心朝向自己。向上推起的同时平稳向外旋转手腕并打开双肘，至顶端掌心朝前；下放时沿原轨迹内旋还原。",
    "tips": "旋转过程流畅不卡顿，能兼顾前束与中束的更长行程刺激；重量略轻于普通哑铃推举。",
    "is_system": true,
    "alternatives": [
      "ex_041",
      "ex_040"
    ]
  },
  {
    "id": "ex_046",
    "name": "俯身侧平举",
    "name_en": "Bent Over Lateral Raise",
    "muscle_group": "肩部",
    "sub_muscle": "后束",
    "equipment": "哑铃",
    "target_muscles": "三角肌后束 · 菱形肌、斜方肌中束",
    "description": "屈髋俯身至躯干接近水平，背部挺直，双手持轻哑铃自然下垂。肘部微屈，用后束发力向两侧后上方划弧抬起，停顿后缓慢下放。",
    "tips": "避免过度向后夹肩胛骨变成划船，想着把双臂向远处两侧扫开。",
    "is_system": true,
    "alternatives": [
      "ex_092",
      "ex_094",
      "ex_044"
    ]
  },
  {
    "id": "ex_090",
    "name": "机械推肩",
    "name_en": "Machine Shoulder Press",
    "muscle_group": "肩部",
    "sub_muscle": "前束",
    "equipment": "固定器械",
    "target_muscles": "三角肌前束、中束 · 肱三头肌",
    "description": "调节座椅使握把与肩部齐平，背部紧贴靠垫、沉肩收腹。双手向上推起至手臂接近伸直，缓慢控制下放至大臂略低于水平。",
    "tips": "固定轨迹安全稳定，非常适合新手入门或在自由重量推举后继续力竭增肌。",
    "is_system": true,
    "alternatives": [
      "ex_041",
      "ex_040"
    ]
  },
  {
    "id": "ex_091",
    "name": "绳索侧平举",
    "name_en": "Cable Lateral Raise",
    "muscle_group": "肩部",
    "sub_muscle": "中束",
    "equipment": "龙门架",
    "target_muscles": "三角肌中束",
    "description": "侧对龙门架，滑轮调至腕部高度，远侧手抓握把手横过体前。沉肩并保持肘部微屈，向侧方平稳抬臂至与肩同高，再缓慢放回。",
    "tips": "相比哑铃，绳索在动作底端仍保持持续张力，对打造饱满肩宽效果极佳。",
    "is_system": true,
    "alternatives": [
      "ex_042"
    ]
  },
  {
    "id": "ex_092",
    "name": "反向蝴蝶机",
    "name_en": "Reverse Pec Deck Fly",
    "muscle_group": "肩部",
    "sub_muscle": "后束",
    "equipment": "固定器械",
    "target_muscles": "三角肌后束 · 菱形肌、斜方肌中束",
    "description": "面对靠垫坐好，胸部轻贴靠板，调好座椅使握把与肩同高。保持手臂微屈、沉肩，向两侧后方划弧打开至手臂与躯干平齐，顶峰停顿后慢放。",
    "tips": "不要过度向后甩臂夹背，把张力留在肩部后侧；打开呼气、还原吸气。",
    "is_system": true,
    "alternatives": [
      "ex_044",
      "ex_046",
      "ex_094"
    ]
  },
  {
    "id": "ex_093",
    "name": "直立划船",
    "name_en": "Upright Row",
    "muscle_group": "肩部",
    "sub_muscle": "中束",
    "equipment": "杠铃",
    "target_muscles": "三角肌中束、斜方肌上束 · 肱二头肌",
    "description": "站姿略宽于肩握杠铃（或哑铃/绳索），挺胸收腹。以双肘为引导向两侧上方拉起至大臂接近水平、杠铃至下胸附近，随后有控制地下放。",
    "tips": "宽握比窄握更减少肩峰撞击风险；若肩部有弹响不适，请改用侧平举替代。",
    "is_system": true,
    "alternatives": [
      "ex_042",
      "ex_091"
    ]
  },
  {
    "id": "ex_094",
    "name": "坐姿哑铃后束飞鸟",
    "name_en": "Seated Bent-Over Rear Delt Fly",
    "muscle_group": "肩部",
    "sub_muscle": "后束",
    "equipment": "哑铃",
    "target_muscles": "三角肌后束 · 斜方肌中束",
    "description": "坐于凳端，屈髋前俯使胸口接近大腿，双手持轻哑铃置于小腿两侧。保持沉肩微屈肘，向两侧划弧抬起至与肩平齐后缓慢下放。",
    "tips": "坐姿能完全消除下肢和腰部借力，更适合孤立雕刻三角肌后束。",
    "is_system": true,
    "alternatives": [
      "ex_046",
      "ex_092",
      "ex_044"
    ]
  },
  {
    "id": "ex_050",
    "name": "杠铃弯举",
    "name_en": "Barbell Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "杠铃",
    "target_muscles": "肱二头肌 · 肱肌、前臂屈肌",
    "description": "站姿与肩同宽，反手与肩同宽握直杆或曲杆，大臂紧贴体侧。保持上身稳定，屈肘将杠铃弯举至胸前，顶峰收紧二头肌1秒后缓慢下放。",
    "tips": "避免晃腰借力或手肘大幅前移；手腕不适者推荐优先使用EZ曲杆。",
    "is_system": true,
    "alternatives": [
      "ex_051",
      "ex_095",
      "ex_096"
    ]
  },
  {
    "id": "ex_051",
    "name": "哑铃弯举",
    "name_en": "Dumbbell Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "哑铃",
    "target_muscles": "肱二头肌 · 肱肌、前臂",
    "description": "站姿或坐姿，双手持哑铃垂于体侧，大臂贴紧躯干。交替或同时屈肘上举，并在上举过程中自然外旋手腕使掌心朝上，顶峰停顿后慢放。",
    "tips": "全程控制离心下放2秒，手肘稳定在躯干两侧不前后摆动。",
    "is_system": true,
    "alternatives": [
      "ex_050",
      "ex_052",
      "ex_097"
    ]
  },
  {
    "id": "ex_052",
    "name": "锤式弯举",
    "name_en": "Hammer Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "哑铃",
    "target_muscles": "肱肌、肱桡肌 · 肱二头肌长头",
    "description": "站姿双手持哑铃，全程保持掌心相对（对握/中立握）。固定大臂于体侧，屈肘将哑铃向上弯举至肩前高度，停顿后缓慢下放。",
    "tips": "能同时增厚大臂外侧线条与前臂围度，且对手腕关节非常友好。",
    "is_system": true,
    "alternatives": [
      "ex_051",
      "ex_096"
    ]
  },
  {
    "id": "ex_053",
    "name": "集中弯举",
    "name_en": "Concentration Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "哑铃",
    "target_muscles": "肱二头肌肌峰 · 肱肌",
    "description": "坐于凳边双腿分开，单手持哑铃将肘部后侧稳靠在同侧大腿内侧。完全孤立屈肘将哑铃弯举向肩部，顶峰强烈挤压二头肌后缓慢放回。",
    "tips": "几乎零借力，是打磨二头肌顶峰收缩感的经典收尾动作。",
    "is_system": true,
    "alternatives": [
      "ex_095",
      "ex_051"
    ]
  },
  {
    "id": "ex_054",
    "name": "绳索下压",
    "name_en": "Cable Pushdown",
    "muscle_group": "手臂",
    "sub_muscle": "三头肌",
    "equipment": "龙门架",
    "target_muscles": "肱三头肌外侧头、内侧头 · 长头",
    "description": "面对高位滑轮站立，身体微前倾，大臂紧夹于躯干两侧。握住绳索或直杆，以肘部为轴向下压至手臂伸直，使用绳索时底端可微向外分开挤压三头。",
    "tips": "全程保持大臂固定不动，只动小臂；下压呼气、还原吸气。",
    "is_system": true,
    "alternatives": [
      "ex_099",
      "ex_055"
    ]
  },
  {
    "id": "ex_055",
    "name": "过头臂屈伸",
    "name_en": "Overhead Triceps Extension",
    "muscle_group": "手臂",
    "sub_muscle": "三头肌",
    "equipment": "龙门架",
    "target_muscles": "肱三头肌长头 · 外侧头、内侧头",
    "description": "背对龙门架（或坐姿双手托哑铃于头后），将大臂抬起贴近双耳。保持肘部朝前固定，缓慢屈肘下放至三头肌长头充分拉伸，再发力伸直手臂。",
    "tips": "过头角度能最大程度拉伸占手臂体积最大的三头肌长头，切忌肘部过度外张。",
    "is_system": true,
    "alternatives": [
      "ex_098",
      "ex_054"
    ]
  },
  {
    "id": "ex_056",
    "name": "窄距卧推",
    "name_en": "Close Grip Bench Press",
    "muscle_group": "手臂",
    "sub_muscle": "三头肌",
    "equipment": "杠铃",
    "target_muscles": "肱三头肌 · 胸大肌中内侧、三角肌前束",
    "description": "仰卧平凳，双手采用与肩同宽的握距（不必过窄以免伤腕），肘部贴近躯干。控制杠铃下放至下胸位置，随后用三头肌主导发力推起。",
    "tips": "三头肌最佳复合增力动作，可承载较大重量；握距保持与肩同宽最护腕。",
    "is_system": true,
    "alternatives": [
      "ex_057",
      "ex_054"
    ]
  },
  {
    "id": "ex_057",
    "name": "双杠臂屈伸(臂屈伸)",
    "name_en": "Triceps Dips",
    "muscle_group": "手臂",
    "sub_muscle": "三头肌",
    "equipment": "徒手",
    "target_muscles": "肱三头肌 · 胸大肌下束、三角肌前束",
    "description": "双手撑于双杠，保持躯干尽量垂直地面、双肘向后贴近身体。缓慢屈肘下放至大臂平行地面，再用肱三头肌发力撑起还原。",
    "tips": "与练胸版相比，躯干越直立、肘部越贴身，三头肌参与比例越高。",
    "is_system": true,
    "alternatives": [
      "ex_056",
      "ex_054"
    ]
  },
  {
    "id": "ex_095",
    "name": "牧师凳弯举",
    "name_en": "Preacher Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "杠铃",
    "target_muscles": "肱二头肌短头、肱肌",
    "description": "坐于牧师凳，将腋窝轻贴斜板顶端、大臂后侧完全贴实斜垫。握EZ曲杆或哑铃缓慢下放至肘部微屈（不完全锁死），再孤立弯举起。",
    "tips": "斜板彻底杜绝借力，但底部切忌突然松劲甩到底以免拉伤二头肌远端肌腱。",
    "is_system": true,
    "alternatives": [
      "ex_050",
      "ex_053"
    ]
  },
  {
    "id": "ex_096",
    "name": "绳索弯举",
    "name_en": "Cable Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "龙门架",
    "target_muscles": "肱二头肌 · 肱肌",
    "description": "将滑轮调至最低位，站姿面对龙门架，反手握直杆或曲杆，大臂贴紧体侧。平稳弯举至顶峰挤压1秒，再控制缓慢放回底端。",
    "tips": "绳索提供全程恒定阻力，尤其在底端与顶峰都能保持二头肌持续发力。",
    "is_system": true,
    "alternatives": [
      "ex_050",
      "ex_051"
    ]
  },
  {
    "id": "ex_097",
    "name": "上斜哑铃弯举",
    "name_en": "Incline Dumbbell Curl",
    "muscle_group": "手臂",
    "sub_muscle": "二头肌",
    "equipment": "哑铃",
    "target_muscles": "肱二头肌长头 · 肱肌",
    "description": "仰靠在45°–60°上斜凳上，双臂自然垂于躯干后侧，感受二头肌长头拉伸。固定大臂位置，屈肘向上弯举至顶峰后缓慢下放。",
    "tips": "双臂在躯干后方能获得极佳的拉伸位刺激，选轻中重量保证大臂不前移。",
    "is_system": true,
    "alternatives": [
      "ex_051",
      "ex_050"
    ]
  },
  {
    "id": "ex_098",
    "name": "仰卧杠铃臂屈伸",
    "name_en": "Skull Crushers",
    "muscle_group": "手臂",
    "sub_muscle": "三头肌",
    "equipment": "杠铃",
    "target_muscles": "肱三头肌长头与外侧头",
    "description": "仰卧平凳，双手窄距握EZ曲杆举于胸上方，大臂略向头侧倾斜约15°固定。屈肘将曲杆缓慢下放至额头上方或头顶后方，再发力伸肘推起。",
    "tips": "俗称“碎颅者”，使用EZ曲杆更舒适；大臂微后倾可让顶峰也保持张力。",
    "is_system": true,
    "alternatives": [
      "ex_055",
      "ex_054"
    ]
  },
  {
    "id": "ex_099",
    "name": "单臂绳索下压",
    "name_en": "Single-Arm Cable Pushdown",
    "muscle_group": "手臂",
    "sub_muscle": "三头肌",
    "equipment": "龙门架",
    "target_muscles": "肱三头肌 · 肘部稳定",
    "description": "单手握高位滑轮D形把手（或直接握绳球），大臂夹紧体侧。单臂发力下压至伸直并停顿挤压三头肌，再有控制地还原。",
    "tips": "单侧孤立有助于平衡左右臂力量差异，可正握或反握切换不同角度刺激。",
    "is_system": true,
    "alternatives": [
      "ex_054",
      "ex_055"
    ]
  },
  {
    "id": "ex_104",
    "name": "杠铃腕弯举",
    "name_en": "Barbell Wrist Curl",
    "muscle_group": "手臂",
    "sub_muscle": "小臂",
    "equipment": "杠铃",
    "target_muscles": "前臂屈肌（小臂内侧） · 握力",
    "description": "坐于平凳，双前臂平放于大腿或凳面上、手腕伸出边缘，掌心朝上握杠铃。控制让杠铃沿指尖略微滚落充分拉伸，再以手腕屈曲发力向上卷起至顶峰停顿1秒。",
    "tips": "全程保持前臂贴紧支撑面不动，避免用肘部借力；每组12–20次高次数感受小臂酸胀。",
    "is_system": true,
    "alternatives": [
      "ex_105",
      "ex_106"
    ]
  },
  {
    "id": "ex_105",
    "name": "反握腕弯举",
    "name_en": "Barbell Reverse Wrist Curl",
    "muscle_group": "手臂",
    "sub_muscle": "小臂",
    "equipment": "杠铃",
    "target_muscles": "前臂伸肌（小臂外侧）",
    "description": "坐姿将双前臂贴于大腿或凳面，掌心朝下（正握）握轻重量杠铃或哑铃。以手腕为轴缓慢下放至充分屈腕，再发力向上伸腕抬起，顶峰略停后慢放。",
    "tips": "前臂伸肌相对薄弱，务必选轻重量控制动作流畅，能有效平衡小臂肌力、预防网球肘。",
    "is_system": true,
    "alternatives": [
      "ex_104",
      "ex_106"
    ]
  },
  {
    "id": "ex_106",
    "name": "杠铃反握弯举",
    "name_en": "Barbell Reverse Curl",
    "muscle_group": "手臂",
    "sub_muscle": "小臂",
    "equipment": "杠铃",
    "target_muscles": "肱桡肌（小臂上侧）、肱肌 · 肱二头肌",
    "description": "站姿与肩同宽，双手正握（掌心朝下）杠铃或EZ曲杆，大臂紧贴躯干两侧。保持手腕中立不塌腕，屈肘将杠铃弯举至胸前，控制2秒缓慢下放。",
    "tips": "打造小臂粗壮线条的王牌复合动作，重量通常为普通杠铃弯举的60%–70%，避免晃腰借力。",
    "is_system": true,
    "alternatives": [
      "ex_052",
      "ex_104"
    ]
  },
  {
    "id": "ex_060",
    "name": "平板支撑",
    "name_en": "Plank",
    "muscle_group": "核心",
    "sub_muscle": "深层稳定",
    "equipment": "徒手",
    "target_muscles": "腹横肌、腹直肌 · 肩带稳定、臀部",
    "description": "前臂与脚尖撑地，肘部位于肩正下方。收紧腹部、微卷骨盆并夹紧臀部，使头、背、臀、脚跟呈一条直线，保持均匀呼吸。",
    "tips": "切忌塌腰代偿（一旦腰酸即停）；质量大于时长，主动收紧全身45–60秒即可。",
    "is_system": true,
    "alternatives": [
      "ex_064",
      "ex_102"
    ]
  },
  {
    "id": "ex_061",
    "name": "卷腹",
    "name_en": "Crunch",
    "muscle_group": "核心",
    "sub_muscle": "上腹",
    "equipment": "徒手",
    "target_muscles": "腹直肌上段",
    "description": "仰卧屈膝，双脚踩地，双手轻贴耳侧或交叉于胸前。呼气时下背贴地不动，用腹肌发力将肩胛骨卷离地面，顶峰停顿1秒后缓慢回落。",
    "tips": "不要双手抱头猛拉颈椎；重点是“胸椎卷曲”而非整个上身坐起。",
    "is_system": true,
    "alternatives": [
      "ex_100",
      "ex_103"
    ]
  },
  {
    "id": "ex_062",
    "name": "悬垂举腿",
    "name_en": "Hanging Leg Raise",
    "muscle_group": "核心",
    "sub_muscle": "下腹",
    "equipment": "徒手",
    "target_muscles": "腹直肌下段、髂腰肌 · 握力",
    "description": "双手正握单杠悬垂，沉肩稳住身体不摆荡。呼气时用下腹发力带动骨盆向胸口卷起（进阶直腿、入门屈膝），控制缓慢下放。",
    "tips": "关键在于动作末端让骨盆向上卷曲，否则只练到了髋屈肌而腹肌感觉不强。",
    "is_system": true,
    "alternatives": [
      "ex_103",
      "ex_100"
    ]
  },
  {
    "id": "ex_063",
    "name": "俄罗斯转体",
    "name_en": "Russian Twist",
    "muscle_group": "核心",
    "sub_muscle": "侧腹",
    "equipment": "徒手",
    "target_muscles": "腹内外斜肌 · 腹直肌",
    "description": "坐姿屈膝，上身微后倾约45°并保持背部挺直（双脚可轻触地或悬空）。双手抱拳或持轻片，以胸椎带动躯干左右有控制地转动。",
    "tips": "保持挺胸不弓腰，用侧腹带动躯干旋转而不是只左右摆动手臂。",
    "is_system": true,
    "alternatives": [
      "ex_102",
      "ex_061"
    ]
  },
  {
    "id": "ex_064",
    "name": "死虫式",
    "name_en": "Dead Bug",
    "muscle_group": "核心",
    "sub_muscle": "深层稳定",
    "equipment": "徒手",
    "target_muscles": "腹横肌、核心抗伸展稳定",
    "description": "仰卧抬起双臂指向天花板，双腿屈膝呈90°桌面位，下背紧贴地面。呼气同时缓慢伸展对侧手臂与腿接近地面但不触地，再收回换边。",
    "tips": "全程下背不可离开地面拱起；对改善腰部稳定和三大项核心发力帮助极大。",
    "is_system": true,
    "alternatives": [
      "ex_060",
      "ex_103"
    ]
  },
  {
    "id": "ex_065",
    "name": "登山者",
    "name_en": "Mountain Climber",
    "muscle_group": "核心",
    "sub_muscle": "深层稳定",
    "equipment": "徒手",
    "target_muscles": "核心肌群、髋屈肌 · 心肺耐力",
    "description": "高平板俯卧撑姿势撑地，双手在肩正下方。核心绷紧，交替将左右膝盖快速或有控制地提向胸口，保持臀部高度稳定。",
    "tips": "避免屁股越撅越高，想要更强腹肌刺激可放慢节奏、提膝时停顿挤压核心。",
    "is_system": true,
    "alternatives": [
      "ex_060",
      "ex_064"
    ]
  },
  {
    "id": "ex_066",
    "name": "农夫行走",
    "name_en": "Farmer Walk",
    "muscle_group": "核心",
    "sub_muscle": "侧腹",
    "equipment": "哑铃",
    "target_muscles": "核心抗侧屈、斜方肌上束 · 前臂握力、全身稳定",
    "description": "双手（或单手负重）提大重量哑铃或壶铃垂于体侧，挺胸沉肩、收紧核心。保持躯干完全直立不左右摇晃，稳健快步前行20–40米。",
    "tips": "单手提铃（手提箱行走）能加倍刺激对侧腹斜肌与核心抗侧屈能力。",
    "is_system": true,
    "alternatives": [
      "ex_102",
      "ex_060"
    ]
  },
  {
    "id": "ex_100",
    "name": "龙门架绳索卷腹",
    "name_en": "Cable Crunch",
    "muscle_group": "核心",
    "sub_muscle": "上腹",
    "equipment": "龙门架",
    "target_muscles": "腹直肌（可渐进负重）",
    "description": "跪于高位滑轮前，双手握绳索贴于耳侧，臀部坐稳微离脚跟保持髋部固定。呼气时用腹肌发力将上背向下卷曲，肘部靠近大腿前侧，慢放还原。",
    "tips": "打造立体腹肌块的最佳可负重核心动作；切忌靠屈髋磕头借力。",
    "is_system": true,
    "alternatives": [
      "ex_061",
      "ex_101"
    ]
  },
  {
    "id": "ex_101",
    "name": "健腹轮",
    "name_en": "Ab Wheel Rollout",
    "muscle_group": "核心",
    "sub_muscle": "上腹",
    "equipment": "健腹轮",
    "target_muscles": "腹直肌、腹横肌 · 背阔肌、肩带稳定",
    "description": "跪姿双手握健腹轮，微含胸收腹呈骨盆后倾态。核心全程绷紧缓慢向前滚出至可控最远点，再由腹肌主导将身体拉回起始位。",
    "tips": "绝不可塌腰下沉；新手可面对墙壁用墙体限制滚出距离，循序渐进。",
    "is_system": true,
    "alternatives": [
      "ex_060",
      "ex_100"
    ]
  },
  {
    "id": "ex_102",
    "name": "侧桥支撑",
    "name_en": "Side Plank",
    "muscle_group": "核心",
    "sub_muscle": "侧腹",
    "equipment": "徒手",
    "target_muscles": "腹内外斜肌、腰方肌 · 臀中肌",
    "description": "侧卧以单侧前臂撑地（肘在肩正下方），双脚叠放或前后错开。抬起髋部使身体从头到脚呈直线，保持骨盆不前倾或下坠，左右交替。",
    "tips": "强化脊柱侧向稳定性的极佳动作，保持均匀呼吸不憋气。",
    "is_system": true,
    "alternatives": [
      "ex_060",
      "ex_063"
    ]
  },
  {
    "id": "ex_103",
    "name": "反向卷腹",
    "name_en": "Reverse Crunch",
    "muscle_group": "核心",
    "sub_muscle": "下腹",
    "equipment": "徒手",
    "target_muscles": "腹直肌下段 · 腹横肌",
    "description": "仰卧屈膝90°抬腿，双手平放体侧稳定。呼气时用下腹发力将臀部与尾骨轻轻卷离垫面，膝盖向胸口靠近，再缓慢逐节放回。",
    "tips": "依靠腹肌控制发力而非双腿猛甩，对下背压力远小于仰卧直腿抬高。",
    "is_system": true,
    "alternatives": [
      "ex_062",
      "ex_061"
    ]
  }
];
}

module.exports = {
  MUSCLE_SUB_GROUPS,
  getExercisesSeedData
};
