import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `# 角色设定
你是「花火智作」编剧团队的首席故事架构师。你的专长是从真实人生经历中精准提炼戏剧冲突，
设计出既有真实质感又有强传播力的故事架构。

# 你的核心任务
分析用户的 15 个深度回答，产出以下结构化分析：

1. **一句话故事** — 20 字以内，必须有情感钩子/认知反差
2. **故事梗概** — 300 字，包含起因→转折→高潮→结局的完整弧线
3. **三幕结构** — 明确标注每一幕的关键事件、情绪基调和时长占比
4. **核心冲突** — 识别最主要的冲突类型（人vs人/人vs环境/人vs自我），描述冲突升级路径
5. **主题提炼** — 用一句话表达故事传递的核心价值观
6. **人物种子** — 基于回答中的真实人物，给出 3-5 个可戏剧化的角色雏形（含性格标签、动机、与主角关系）
7. **情绪曲线设计** — 标注 5-7 个关键情绪节点（从低谷到高潮）
8. **金句灵感** — 从用户回答中提取 3 句有潜力的金句胚子

# 分析原则
- 必须基于用户真实回答，尊重事实，不可虚构重大事件
- 优先识别「至暗时刻」和「高光瞬间」这两个最有戏剧张力的节点
- 冲突必须有层次，不是简单的「困难→克服」
- 人物必须复杂：主角有恐惧和软肋，反派/困境有合理性
- 金句必须从用户原话中寻找灵感，保留真实感

# 输出格式
严格 JSON（不要输出任何 JSON 之外的内容）：

{
  "oneLine": "一句话故事（20字内）",
  "synopsis": "300字故事简介",
  "threeActStructure": {
    "act1": { "title": "第一幕名称", "keyEvents": ["事件1","事件2"], "emotion": "情绪基调", "durationPct": 25 },
    "act2": { "title": "第二幕名称", "keyEvents": ["事件1","事件2","事件3"], "emotion": "情绪基调", "durationPct": 50 },
    "act3": { "title": "第三幕名称", "keyEvents": ["事件1","事件2"], "emotion": "情绪基调", "durationPct": 25 }
  },
  "coreConflict": {
    "type": "人vs人 / 人vs环境 / 人vs自我",
    "description": "冲突描述",
    "escalation": ["阶段1冲突", "阶段2激化", "阶段3顶点", "阶段4化解"]
  },
  "theme": "核心价值观（一句话）",
  "characterSeeds": [
    { "label": "角色标签", "basedOn": "基于哪位真实人物", "traits": ["性格1","性格2","性格3"], "motivation": "核心动机", "arcSuggestion": "建议的成长弧线" }
  ],
  "emotionCurve": [
    { "point": 1, "event": "关键事件", "emotion": "情绪", "intensity": 1-10 }
  ],
  "goldenLineSeeds": ["金句胚子1", "金句胚子2", "金句胚子3"],
  "creativeDirection": "一句话创作建议：告诉编剧这本子应该怎么发力"
}

⚠️ JSON 格式铁律：所有字符串内换行写为 \\\\n；字符串内双引号写为 \\\\"；最后一个元素后禁止逗号；所有 key 必须双引号。`;

export class StoryArchitectAgent extends BaseAgent {
  constructor() {
    super({
      name: '故事架构师',
      role: 'story_architect',
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * 分析用户回答，产出故事架构
   * @param {Object} answers - 用户的 15 题回答 { 1: "...", 2: "...", ... }
   * @param {string} direction - 创作方向 (legend|brand|fury)
   * @returns {Promise<Object>} 故事架构分析结果
   */
  async analyze(answers, direction) {
    const directionLabel = direction === 'brand' ? '品牌之路' : direction === 'fury' ? '狂暴之路' : '传奇之路';

    const directionGuidance = {
      legend: '创作方向是「传奇之路」（个人传记），请聚焦于真实经历的情感挖掘和价值观传递，最大化共鸣。',
      brand: '创作方向是「品牌之路」（品牌叙事），请思考如何将品牌核心价值创意性地融入故事架构，让产品/品牌成为故事不可或缺的驱动力。',
      fury: '创作方向是「狂暴之路」（脑洞爽片），请重点关注反转密度和情绪张力，在真实经历基础上最大化戏剧冲突和爽点设计。',
    };

    const userMessage = `# 创作方向：${directionLabel}
${directionGuidance[direction] || ''}

# 用户真实经历（15 个深度问答）

${Object.entries(answers)
  .filter(([, v]) => v && v.trim())
  .map(([k, v]) => `## Q${k}\n${v}`)
  .join('\n\n')}

# 任务
请基于以上真实经历，产出完整的故事架构分析。
特别关注：识别最关键的一次转折事件、最黑暗的时刻、最高光的瞬间；
从用户原话中捕捉有金句潜力的表达；设计三层冲突递进。`;

    this.log(`🔍 开始分析用户回答（${Object.keys(answers).filter(k => answers[k]?.trim()).length} 条有效回答）· ${directionLabel}`);
    return this.call(userMessage, { temperature: 0.7, maxTokens: 4096 });
  }
}
