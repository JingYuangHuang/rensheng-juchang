// ============================================================
// 花火智作 · 短剧剧本八维评估系统 v1.0
// 用途：AI 自评 / 多模型 PK / 客户交付质量检查
// ============================================================

export const EVALUATION_DIMENSIONS = {
  // ── 维度一：黄金开场（前3秒/前100字） ──
  goldOpening: {
    name: '黄金开场',
    weight: 1.5, // 短剧核心权重最高
    description: '剧集开头 3 秒或前 100 字能否瞬间抓住注意力',
    levels: {
      10: '强冲突开场 / 大反差设定 / 悬念式提问 / 炸裂金句，让人必须看下去',
      8: '开局有明确冲突或悬念，但力度稍弱，仍能勾起好奇',
      6: '开局有信息但平淡，需要耐心才能进入',
      4: '开局流水账，无冲突无悬念',
      2: '开局不知所云，观众直接划走',
    },
    checkpoints: [
      '前 3 行是否有冲突/反差/悬念？',
      '是否避免了大段背景交代？',
      '首句是否有力？（试读第一句话）',
    ],
  },

  // ── 维度二：节奏设计（压弹簧/放弹簧） ──
  rhythmDesign: {
    name: '节奏设计',
    weight: 1.3,
    description: '信息密度、情绪起伏、呼吸节奏是否适合 2 分钟短剧',
    levels: {
      10: '压弹簧（积累情绪）和放弹簧（释放爽点）交替完美，每 30 秒一个微转折',
      8: '节奏基本紧凑，有起伏感，偶尔有小段平淡',
      6: '节奏忽快忽慢，有爽点但分布不均',
      4: '节奏拖沓，大段对白无推进',
      2: '无节奏意识，像流水账',
    },
    checkpoints: [
      '每 30 秒是否有一个小钩子或转折？',
      '爽点/泪点是否均匀分布？',
      '是否有注水段落可以删减？',
    ],
  },

  // ── 维度三：情绪价值 ──
  emotionalValue: {
    name: '情绪价值',
    weight: 1.2,
    description: '能否引发观众的情绪共鸣（爽/泪/燃/怒/暖）',
    levels: {
      10: '情绪设计精准，爽点让人拍大腿，泪点让人鼻子酸，全程情绪被牵引',
      8: '有明显情绪点设计，但个别处力度不够',
      6: '有情绪意图但执行不到位，观众内心无波动',
      4: '情绪平淡，不痛不痒',
      2: '完全无情绪设计',
    },
    checkpoints: [
      '是否设置了明确的情绪目标？（本集要让观众感到什么）',
      '情绪引爆点是否有充分的铺垫？',
      '情绪释放是否有足够空间？',
    ],
  },

  // ── 维度四：悬念钩子 ──
  suspenseHook: {
    name: '悬念钩子',
    weight: 1.4,
    description: '每集末尾的付费钩子强度 + 整体悬念链设计',
    levels: {
      10: '每集末尾钩子精准狠，让人必须点下一集；整体悬念环环相扣',
      8: '大部分集数末尾有钩子，个别钩子偏弱',
      6: '钩子有时有时无，不统一',
      4: '钩子生硬，为悬念而悬念',
      2: '无钩子意识，每集自然结束',
    },
    checkpoints: [
      '每集最后 3 句是否制造了强烈悬念？',
      '付费节点集（第 8/15/25 集等）钩子是否特别加强？',
      '悬念是否让人产生「下一集会怎样」的冲动？',
    ],
  },

  // ── 维度五：大纲结构 ──
  outlineStructure: {
    name: '大纲结构',
    weight: 1.0,
    description: '整体故事架构是否完整，起承转合是否合理',
    levels: {
      10: '结构严谨，五段式（奠基/成长/危机/逆袭/升华）清晰，逻辑自洽',
      8: '结构完整，但个别段落衔接稍弱',
      6: '有结构意识但执行不彻底',
      4: '结构松散，事件堆砌',
      2: '无结构可言',
    },
    checkpoints: [
      '是否有清晰的三幕/五段结构？',
      '主角成长弧线是否完整？',
      '各集之间有因果联系还是孤立事件？',
    ],
  },

  // ── 维度六：台词质量 ──
  dialogueQuality: {
    name: '台词质量',
    weight: 1.1,
    description: '台词是否自然、有辨识度、信息密度高',
    levels: {
      10: '每句台词都有信息增量，角色辨识度高，金句频出',
      8: '台词自然流畅，偶尔有亮眼金句',
      6: '台词基本通顺但无特色，功能性为主',
      4: '台词生硬，像在念说明书',
      2: '台词尴尬，不符合角色身份',
    },
    checkpoints: [
      '去掉角色名，光看台词能否分辨是谁在说话？',
      '是否避免了「你吃了吗」「我吃了」这类无信息对白？',
      '每 10 句台词中是否有 1-2 句金句或记忆点？',
    ],
  },

  // ── 维度七：人物成长 ──
  characterGrowth: {
    name: '人物成长',
    weight: 1.0,
    description: '主角是否有清晰的成长弧线，变化是否可信',
    levels: {
      10: '主角从 A 点到 B 点的转变清晰、可信、有层次',
      8: '有成长但个别转折稍显突兀',
      6: '有成长意图但铺垫不足',
      4: '主角扁平，前后无变化',
      2: '主角工具人，服务于剧情而非驱动剧情',
    },
    checkpoints: [
      '主角在剧中有明显的性格/能力/认知变化吗？',
      '变化是否有催化事件支撑？',
      '配角是否也有各自的弧线？',
    ],
  },

  // ── 维度八：逻辑纠错 ──
  logicCheck: {
    name: '逻辑纠错',
    weight: 0.8,
    description: '时间线、因果关系、商业逻辑是否经得起推敲',
    levels: {
      10: '逻辑严密，时间线清晰，因果合理，商业细节专业',
      8: '基本逻辑通顺，偶有小瑕疵',
      6: '有明显逻辑漏洞但不影响主线',
      4: '多处逻辑矛盾，影响可信度',
      2: '逻辑混乱，前后矛盾严重',
    },
    checkpoints: [
      '时间线是否可以画出一条清晰的轴？',
      '钱从哪来、花到哪去是否合理？',
      '人物的行为是否有动机支撑？',
    ],
  },
};

// ── 权重调整因子（基于平台算法趋势） ──
export const PLATFORM_WEIGHTS = {
  '红果短剧': {
    factor: '强冲突+快节奏+强钩子',
    adjustments: { goldOpening: +0.2, suspenseHook: +0.2, rhythmDesign: +0.1 },
  },
  '抖音': {
    factor: '前3秒定生死+情绪爆发+社交传播',
    adjustments: { goldOpening: +0.3, emotionalValue: +0.1 },
  },
  '快手': {
    factor: '下沉+真实感+强情绪',
    adjustments: { emotionalValue: +0.2, dialogueQuality: -0.1 },
  },
  '视频号': {
    factor: '中老年+温情+慢节奏',
    adjustments: { emotionalValue: +0.2, rhythmDesign: -0.1, goldOpening: -0.1 },
  },
};

// ── 评分计算 ──
export function calculateScore(scores, platform = null) {
  let totalWeighted = 0;
  let totalWeight = 0;

  Object.entries(EVALUATION_DIMENSIONS).forEach(([key, dim]) => {
    let weight = dim.weight;
    if (platform && PLATFORM_WEIGHTS[platform]) {
      weight += PLATFORM_WEIGHTS[platform].adjustments[key] || 0;
    }
    const score = scores[key] || 0;
    totalWeighted += score * weight;
    totalWeight += weight;
  });

  return Math.round((totalWeighted / totalWeight) * 10) / 10;
}

// ── 评级 ──
export function getGrade(rawTotal) {
  if (rawTotal >= 70) return { grade: 'S+', label: '可直接拍摄上线', color: '#2da44e' };
  if (rawTotal >= 60) return { grade: 'A', label: '微调后可上线', color: '#c8953b' };
  if (rawTotal >= 50) return { grade: 'B', label: '需要较大修改', color: '#e87b35' };
  return { grade: 'C', label: '建议重构', color: '#d4302f' };
}

// ── 生成评估 Prompt（注入到 AI 自评） ──
export function buildEvaluationPrompt() {
  let prompt = '请严格按照以下八维标准对剧本进行评估，每项 1-10 分：\n\n';
  Object.entries(EVALUATION_DIMENSIONS).forEach(([, dim]) => {
    prompt += `## ${dim.name}（权重 ${dim.weight}）\n${dim.description}\n`;
    prompt += `10分标准：${dim.levels[10]}\n`;
    prompt += `检查要点：\n${dim.checkpoints.map(c => `- ${c}`).join('\n')}\n\n`;
  });
  return prompt;
}
