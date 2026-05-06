/**
 * 动作库统一数据源
 * 所有后端模块应从此处引用动作数据，避免重复定义
 */

const EXERCISES = [
  // 胸部
  { id: 'ex_001', name: '杠铃卧推', name_en: 'Barbell Bench Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_002', 'ex_003', 'ex_004'] },
  { id: 'ex_002', name: '哑铃卧推', name_en: 'Dumbbell Bench Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_001', 'ex_003', 'ex_004'] },
  { id: 'ex_003', name: '机械卧推', name_en: 'Machine Chest Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_001', 'ex_002', 'ex_004'] },
  { id: 'ex_004', name: '俯卧撑', name_en: 'Push-ups', muscle_group: '胸部', is_system: true, alternatives: ['ex_001', 'ex_002', 'ex_003'] },
  { id: 'ex_005', name: '上斜杠铃卧推', name_en: 'Incline Barbell Bench Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_006'] },
  { id: 'ex_006', name: '上斜哑铃卧推', name_en: 'Incline Dumbbell Press', muscle_group: '胸部', is_system: true, alternatives: ['ex_005'] },
  { id: 'ex_007', name: '双杠臂屈伸', name_en: 'Dips', muscle_group: '胸部', is_system: true, alternatives: ['ex_004'] },
  { id: 'ex_008', name: '绳索飞鸟', name_en: 'Cable Fly', muscle_group: '胸部', is_system: true, alternatives: ['ex_009'] },
  { id: 'ex_009', name: '哑铃飞鸟', name_en: 'Dumbbell Fly', muscle_group: '胸部', is_system: true, alternatives: ['ex_008'] },
  // 背部
  { id: 'ex_010', name: '杠铃划船', name_en: 'Barbell Row', muscle_group: '背部', is_system: true, alternatives: ['ex_011', 'ex_012'] },
  { id: 'ex_011', name: '哑铃划船', name_en: 'Dumbbell Row', muscle_group: '背部', is_system: true, alternatives: ['ex_010', 'ex_012'] },
  { id: 'ex_012', name: '坐姿划船', name_en: 'Seated Cable Row', muscle_group: '背部', is_system: true, alternatives: ['ex_010', 'ex_011'] },
  { id: 'ex_013', name: '引体向上', name_en: 'Pull-ups', muscle_group: '背部', is_system: true, alternatives: ['ex_014'] },
  { id: 'ex_014', name: '高位下拉', name_en: 'Lat Pulldown', muscle_group: '背部', is_system: true, alternatives: ['ex_013'] },
  { id: 'ex_015', name: 'T杆划船', name_en: 'T-Bar Row', muscle_group: '背部', is_system: true, alternatives: ['ex_010'] },
  { id: 'ex_016', name: '直臂下压', name_en: 'Straight Arm Pulldown', muscle_group: '背部', is_system: true, alternatives: [] },
  // 下肢
  { id: 'ex_020', name: '杠铃深蹲', name_en: 'Barbell Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_021', 'ex_022', 'ex_023'] },
  { id: 'ex_021', name: '腿举', name_en: 'Leg Press', muscle_group: '下肢', is_system: true, alternatives: ['ex_020', 'ex_022'] },
  { id: 'ex_022', name: '前蹲', name_en: 'Front Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_020', 'ex_023'] },
  { id: 'ex_023', name: '保加利亚分腿蹲', name_en: 'Bulgarian Split Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_020'] },
  { id: 'ex_024', name: '腿弯举', name_en: 'Leg Curl', muscle_group: '下肢', is_system: true, alternatives: [] },
  { id: 'ex_025', name: '腿伸展', name_en: 'Leg Extension', muscle_group: '下肢', is_system: true, alternatives: [] },
  { id: 'ex_026', name: '罗马尼亚硬拉', name_en: 'Romanian Deadlift', muscle_group: '下肢', is_system: true, alternatives: ['ex_030'] },
  { id: 'ex_027', name: '臀推', name_en: 'Hip Thrust', muscle_group: '下肢', is_system: true, alternatives: [] },
  { id: 'ex_028', name: '腿举(哈克机)', name_en: 'Hack Squat', muscle_group: '下肢', is_system: true, alternatives: ['ex_021'] },
  { id: 'ex_029', name: '行走箭步蹲', name_en: 'Walking Lunge', muscle_group: '下肢', is_system: true, alternatives: ['ex_023'] },
  // 硬拉
  { id: 'ex_030', name: '传统硬拉', name_en: 'Conventional Deadlift', muscle_group: '硬拉', is_system: true, alternatives: ['ex_031', 'ex_032'] },
  { id: 'ex_031', name: '相扑硬拉', name_en: 'Sumo Deadlift', muscle_group: '硬拉', is_system: true, alternatives: ['ex_030', 'ex_032'] },
  { id: 'ex_032', name: '直腿硬拉', name_en: 'Stiff Leg Deadlift', muscle_group: '硬拉', is_system: true, alternatives: ['ex_030', 'ex_026'] },
  // 肩部
  { id: 'ex_040', name: '杠铃推举', name_en: 'Barbell Overhead Press', muscle_group: '肩部', is_system: true, alternatives: ['ex_041'] },
  { id: 'ex_041', name: '哑铃推举', name_en: 'Dumbbell Shoulder Press', muscle_group: '肩部', is_system: true, alternatives: ['ex_040'] },
  { id: 'ex_042', name: '侧平举', name_en: 'Lateral Raise', muscle_group: '肩部', is_system: true, alternatives: [] },
  { id: 'ex_043', name: '前平举', name_en: 'Front Raise', muscle_group: '肩部', is_system: true, alternatives: [] },
  { id: 'ex_044', name: '面拉', name_en: 'Face Pull', muscle_group: '肩部', is_system: true, alternatives: [] },
  { id: 'ex_045', name: '阿诺德推举', name_en: 'Arnold Press', muscle_group: '肩部', is_system: true, alternatives: ['ex_041'] },
  { id: 'ex_046', name: '俯身侧平举', name_en: 'Bent Over Lateral Raise', muscle_group: '肩部', is_system: true, alternatives: ['ex_042'] },
  // 手臂
  { id: 'ex_050', name: '杠铃弯举', name_en: 'Barbell Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_051'] },
  { id: 'ex_051', name: '哑铃弯举', name_en: 'Dumbbell Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_050', 'ex_052'] },
  { id: 'ex_052', name: '锤式弯举', name_en: 'Hammer Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_051'] },
  { id: 'ex_053', name: '集中弯举', name_en: 'Concentration Curl', muscle_group: '手臂', is_system: true, alternatives: ['ex_051'] },
  { id: 'ex_054', name: '绳索下压', name_en: 'Cable Pushdown', muscle_group: '手臂', is_system: true, alternatives: ['ex_055'] },
  { id: 'ex_055', name: '过头臂屈伸', name_en: 'Overhead Triceps Extension', muscle_group: '手臂', is_system: true, alternatives: ['ex_054'] },
  { id: 'ex_056', name: '窄距卧推', name_en: 'Close Grip Bench Press', muscle_group: '手臂', is_system: true, alternatives: ['ex_054'] },
  { id: 'ex_057', name: '双杠臂屈伸(臂屈伸)', name_en: 'Triceps Dips', muscle_group: '手臂', is_system: true, alternatives: ['ex_055'] },
  // 核心
  { id: 'ex_060', name: '平板支撑', name_en: 'Plank', muscle_group: '核心', is_system: true, alternatives: ['ex_061'] },
  { id: 'ex_061', name: '卷腹', name_en: 'Crunch', muscle_group: '核心', is_system: true, alternatives: ['ex_060'] },
  { id: 'ex_062', name: '悬垂举腿', name_en: 'Hanging Leg Raise', muscle_group: '核心', is_system: true, alternatives: [] },
  { id: 'ex_063', name: '俄罗斯转体', name_en: 'Russian Twist', muscle_group: '核心', is_system: true, alternatives: [] },
  { id: 'ex_064', name: '死虫式', name_en: 'Dead Bug', muscle_group: '核心', is_system: true, alternatives: [] },
  { id: 'ex_065', name: '登山者', name_en: 'Mountain Climber', muscle_group: '核心', is_system: true, alternatives: [] },
  { id: 'ex_066', name: '农夫行走', name_en: 'Farmer Walk', muscle_group: '核心', is_system: true, alternatives: [] }
];

/**
 * 从 EXERCISES 数组生成的 Map，便于按 id 快速查找
 */
const EXERCISE_MAP = {};
for (const ex of EXERCISES) {
  EXERCISE_MAP[ex.id] = { name: ex.name, nameEn: ex.name_en, muscleGroup: ex.muscle_group, alternatives: ex.alternatives };
}

/**
 * 根据 exercise_id 查找动作信息
 * @returns {{ exerciseName: string, muscleGroup: string } | null}
 */
function findExerciseInfo(exerciseId) {
  const info = EXERCISE_MAP[exerciseId];
  if (info) {
    return { exerciseName: info.name, muscleGroup: info.muscleGroup };
  }
  return null;
}

module.exports = {
  EXERCISES,
  EXERCISE_MAP,
  findExerciseInfo
};
