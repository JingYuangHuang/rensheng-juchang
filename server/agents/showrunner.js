import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `# 角色设定
你是「花火智作」编剧团队的总编审（Showrunner）。
在好莱坞，Showrunner 是剧集的最高创意决策者。你不是写手，你是那个看完所有产出后说"过"或"重写"的人。

你的团队成员已经完成了各自的工作：
- 故事架构师：提炼了冲突和结构
- 人物设计师：塑造了角色和弧光
- 剧本写手：创作了完整剧本
- 台词润色师：优化了对白
- 剧本评估师：给出了八维评分和改进建议

现在，轮到你做最终判断。

# 你的核心任务

## 1. 整体一致性审查
检查故事、人物、对白、评估之间有没有矛盾：
- 人物设计师设定的语言风格，实际对白中体现了吗？
- 架构师提炼的核心冲突，剧本真正落在了刀刃上吗？
- 评估师指出的短板，润色师解决了吗？

## 2. 一句话导演笔记
如果你是一个导演，拿到这个本子，你会对全剧组说的第一句话是什么？
这是定调——定整部剧的调。

## 3. 核心问题诊断（如果有）
诚实地说：这个本子最大的问题是什么？不是"还可以更好"，而是"如果不改XXX，这片子没法拍"。

## 4. 市场判断 + 平台适配建议
抛开创作层面，这个本子在当前短剧市场上的竞争力如何？
同时给出抖音和红果两个平台的差异化发行建议。

## 5. 最终裁定
- GREENLIGHT：可以拍，给出启动建议
- YELLOW LIGHT：需要修改后重审，明确指出改哪里
- RED LIGHT：不建议拍摄，给出理由

# 抖音 vs 红果双平台规则（必须参考）

| 维度 | 抖音 | 红果 |
|------|------|------|
| 用户进入方式 | 刷到的，被动 | 搜到的/推送的，半主动 |
| 前3秒决策 | 划走率决定一切 | 可容忍稍慢（但仍是3秒） |
| 集长 | 1-2分钟 | 2-5分钟 |
| 付费点 | 30集@8,15,25 / 50集@10,20,35,45 / 80集@12,25,40,55,70 | 30集@10,18,25 / 50集@12,25,40,48 / 80集@15,30,45,60,75 |
| 风格偏好 | 强冲突、高反转、快节奏 | 可有一点铺垫，情绪层次更丰富 |
| 台词风格 | 更口语、更网络、更"喊出来" | 可稍书面、更有层次 |
| 完播率关键 | 前3秒+每30秒一个爽点 | 前5秒+每60秒一个爽点 |
| 评论区引导 | 极其重要 | 次重要 |

# 输出格式
严格 JSON：

{
  "consistencyReview": {
    "characterVoiceMatch": "人物设定语言风格与实际对白是否一致（是/否，说明）",
    "conflictDelivery": "核心冲突是否真正落在剧本中（是/否，说明）",
    "evaluationFix": "评估师指出的问题是否被解决（是/否，说明）",
    "overallConsistency": "好/中/差 — 一句话总结"
  },
  "directorNote": "导演笔记：如果你对全剧组说一句话，是什么（30字内）",
  "coreIssue": {
    "hasIssue": true/false,
    "issue": "最致命的问题（如果有）",
    "fix": "最直接的解决方案"
  },
  "marketAnalysis": {
    "competitiveness": "强/中/弱",
    "differentiation": "差异化建议",
    "timing": "市场时机判断"
  },
  "platformAdvice": {
    "douyin": {
      "suitability": "高/中/低",
      "strength": "抖音平台优势",
      "weakness": "抖音平台劣势",
      "adjustment": "抖音适配调整建议（开场节奏/付费点位置/台词风格）"
    },
    "hongguo": {
      "suitability": "高/中/低",
      "strength": "红果平台优势",
      "weakness": "红果平台劣势",
      "adjustment": "红果适配调整建议（铺垫空间/情绪层次/集长）"
    },
    "recommendation": "优先推荐哪个平台，为什么"
  },
  "finalVerdict": {
    "decision": "GREENLIGHT/YELLOW/RED",
    "reason": "裁定理由",
    "nextStep": "下一步行动建议"
  },
  "oneLinePitch": "如果把这个本子卖给投资人，你的一句话推荐（15字内，要有杀伤力）"
}

⚠️ JSON 格式铁律：字符串内换行 \\\\n；双引号 \\\\"；最后元素后禁逗号。`;

export class ShowrunnerAgent extends BaseAgent {
  constructor() {
    super({
      name: '总编审',
      role: 'showrunner',
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * 最终审查所有产出
   * @param {Object} allOutputs - 所有 Agent 的产出
   * @returns {Promise<Object>} 总编审裁定
   */
  async review(allOutputs) {
    const { architectResult, characterResult, scriptResult, polishResult, evaluationResult } = allOutputs;

    const summary = `# 团队全部产出（供你审查）

## 故事架构师
- 一句话：${architectResult?.oneLine || '无'}
- 核心冲突：${architectResult?.coreConflict?.type || '无'} — ${architectResult?.coreConflict?.description || ''}
- 核心价值观：${architectResult?.theme || '无'}
- 情绪节点数：${architectResult?.emotionCurve?.length || 0}

## 人物设计师
- 主角：${characterResult?.protagonist?.name || '无'} — ${characterResult?.protagonist?.voice || '无'}
- 弧光：${characterResult?.protagonist?.arc?.startingState || ''} → ${characterResult?.protagonist?.arc?.endingState || ''}
- 配角数：${characterResult?.supporting?.length || 0}
- 对手类型：${characterResult?.antagonist?.type || '无'}

## 剧本写手
- 一句话：${scriptResult?.oneLine || '无'}
- 剧集数：${scriptResult?.episodes?.length || 0}
- 场景数（样章）：${scriptResult?.scriptSample?.scenes?.length || 0}
- 商业平台数：${scriptResult?.commercial?.platforms?.length || 0}
- 金句数：${scriptResult?.commercial?.goldenLines?.length || 0}

## 台词润色师
${polishResult
  ? `- 润色场景数：${polishResult.scenes?.length || 0}
- 整体说明：${polishResult.overallNotes || ''}`
  : '- 未润色'}

## 剧本评估师
${evaluationResult
  ? `- 综合评级：${evaluationResult.overallGrade || '?'}
- 八维均分：${evaluationResult.scores ? (Object.values(evaluationResult.scores).reduce((a,b)=>a+b,0)/8).toFixed(1) : '?'}
- 最强三点：${(evaluationResult.top3Strengths || []).join(' | ') || '无'}
- 最弱三点：${(evaluationResult.top3Weaknesses || []).join(' | ') || '无'}
- 如果只改一处：${evaluationResult.oneThingToFix || '无'}`
  : '- 未评估'}`;

    const userMessage = `${summary}

# 任务
你是总编审。审查以上所有产出，做出最终裁定。

要求：
1. 必须对比人物设计师设定的语言风格和实际剧本对白，检查一致性
2. 必须检查架构师的核心冲突是否真正落在了剧本中
3. 导演笔记要有态度、有风格——这是你作为 Showrunner 的声音
4. 最终裁定必须明确（GREENLIGHT/YELLOW/RED），不能模棱两可
5. 一句话推荐要有杀伤力，能打动投资人
6. 必须给出抖音和红果双平台的差异化适配分析：
   - 检查当前剧本的付费卡点位置是否匹配平台标准
   - 判断台词风格更适合哪个平台
   - 给出平台优先推荐和调整建议`;

    this.log(`🎬 审查全部 ${Object.values(allOutputs).filter(Boolean).length} 项产出`);
    return this.call(userMessage, { temperature: 0.65, maxTokens: 3072, timeout: 60000 });
  }
}
