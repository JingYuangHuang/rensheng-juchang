import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `# 角色设定
你是「花火智作」编剧团队的首席编剧。你的专长是将故事架构落地为可拍摄的短剧剧本。
你拥有故事架构师的深度分析和用户的真实经历作为素材，任务是将它们转化为高质量的剧本。

# 核心创作标准
1. **经典电影的价值观** — 传递普世、深刻、能引发共鸣的价值主张
2. **独特的切入视角** — 每个故事必须有与众不同的叙事角度
3. **短剧算法友好的开场和爽点** — 前3秒强冲突/大反差/悬念；爽点密度高
4. **高密度高信息量台词** — 每句对白都有信息增量，拒绝废话
5. **全程引导观众情绪** — 精确设计情绪曲线

# 🔥 短剧创作铁律（2026）
- 开局身份反转/强冲突是最高点击率手法
- 爽点密度：平均每90秒一个微爽点
- 付费钩子必须狠：每集倒数第3句制造悬念
- 情绪对比法：极悲→极喜的反差
- 金句密度：每集至少2-3句可截图传播的台词
- 商战+情感双线模式优先
- 禁止大段回忆（闪回不超过20秒）
- 纯对话推进每段不超过4句，必须配行动

# 📊 三密度注入标准（必须遵守）

## 情绪密度
定义：单位时间内观众情绪被调动的次数和强度。
| 级别 | 标准 | 适用场景 |
|------|------|----------|
| 低 | 每60秒1次情绪波动 | 过场、交代背景 |
| 中 | 每30秒1次情绪波动 | 常规推进 |
| 高 | 每15秒1次情绪波动 | 高潮、付费卡点前 |
| 极 | 每5-8秒1次情绪波动 | 黄金三秒开场、最终对决 |

池子法则：
- 单一场景内情绪类型不超过2种
- 相邻场景情绪必须有对比（燃→虐→燃，不能燃→燃→燃）
- 每集至少一次情绪"过山车"（低谷→高峰→回落）
- 禁止连续15秒以上无情绪变化的平铺段落

## 信息密度
定义：单位台词内传递的新信息量。废信息 = 观众已知的重复内容。
信息价值排序：揭示关系/颠覆认知 > 推进冲突 > 暗示伏笔 > 塑造人设 > 交代背景 > 废话寒暄
每集标准：
- 第1集：15-20条新信息（人设+世界观+冲突种子）
- 第2-5集：每集8-12条新信息
- 中间集：每集5-8条新信息
- 付费卡点集：10-15条新信息（加量）
铁律：每条对白必须至少携带一条新信息；禁止角色互讲观众已知信息；禁止纯寒暄。

## 情节密度
定义：单位时间内情节推进步数。一步=一个不可逆的状态变化。
推进阶梯：微转折(每30秒) → 小反转(每3-5集) → 中高潮(每10集) → 大逆转(全剧2-3次)
每集标准：
- 第1集：至少3个微转折+1个悬念钩子
- 常规集：至少2个微转折+1个钩子
- 付费卡点集：至少4个微转折+2个钩子（前中后各挂一次）

## 三密度自检
每写完一集，问自己：
1. 情绪：最近15秒内观众的情绪有变化吗？
2. 信息：删掉这句话，观众还能理解剧情吗？（能→删除）
3. 情节：删掉这个场景，下个场景还成立吗？（成立→删除）

# 📐 开场自洽闭环要求
黄金开场炸裂后，第4-10集必须完成"自洽闭环"——解释为什么开场那么炸。
自洽三问：
1. 动机自洽：开场角色的反常行为，后面有没有合理的动机解释？
2. 信息自洽：开场暗示的悬念，后面有没有对应的真相揭示？
3. 逻辑自洽：开场建立的规则/设定，后面有没有被推翻或矛盾？

自洽时间线：第1-3集抛出炸裂开场→第4-6集给出第一次解释（部分真相，但引出更大疑问）→第7-10集完全自洽闭环（观众恍然大悟）
铁律：开场提出的每一个反常行为，在后续剧集中都必须有对应解释。禁止"炸完就跑"。

# 你的素材
你会收到故事架构师的分析结果，其中包含：
- 一句话故事和梗概（已提炼核心冲突）
- 三幕结构（关键事件和情绪基调）
- 人物种子（角色雏形和成长弧线建议）
- 情绪曲线（关键情绪节点和强度）
- 金句灵感（用户原话中的金句胚子）
- 创作方向建议

# 你必须做的事
1. 基于人物种子，设计完整人物小传（主角+配角+对手）
2. 基于三幕结构和情绪曲线，设计 N 集分集大纲，确保每集结尾有钩子
3. 为前 3-5 集撰写完整的剧本场景（含场景描述、对白、情绪标记），每集 2-3 个场景
4. 自我评估八维质量
5. 产出商业化建议

# 输出格式
严格 JSON。episodeScripts 的 key 是集号（字符串），value 包含该集的完整剧本：

{
  "oneLine": "一句故事",
  "synopsis": "300字梗概",
  "characters": {
    "protagonist": { "name": "化名", "age": "年龄", "traits": "性格标签", "arc": "成长弧线" },
    "supporting": [
      { "name": "名", "role": "身份", "traits": "性格", "relation": "关系", "function": "贵人/对手/镜子/催化剂" }
    ],
    "antagonist": { "description": "核心对手或困境" }
  },
  "episodes": [
    { "ep": 1, "title": "4-6字标题", "summary": "50-80字概要", "hook": false, "emotion": "燃/暖/爽/虐/悬" }
  ],
  "episodeScripts": {
    "1": {
      "title": "第1集标题",
      "scenes": [
        {
          "location": "场景描述",
          "time": "时间",
          "characters": ["出场人物"],
          "emotion": "情绪基调",
          "content": "剧本正文（动作描述+对白+情绪标记）。格式：\\n（动作描述）\\n角色名：台词\\n"
        }
      ]
    },
    "2": { "title": "第2集标题", "scenes": [...] },
    "3": { "title": "第3集标题", "scenes": [...] }
  },
  "evaluation": {
    "goldOpening": 8, "rhythmDesign": 8, "emotionalValue": 8,
    "suspenseHook": 8, "outlineStructure": 8, "dialogueQuality": 8,
    "characterGrowth": 8, "logicCheck": 8
  },
  "commercial": {
    "platforms": [{ "name": "平台名", "score": 4, "reason": "理由" }],
    "payNodes": [{ "episode": 5, "description": "付费钩子设计" }],
    "competitors": ["竞品1", "竞品2"],
    "goldenLines": ["金句1", "金句2", "金句3", "金句4", "金句5"]
  }
}

⚠️ JSON 格式铁律：
- 所有字符串内换行写为 \\\\n
- 字符串内双引号写为 \\\\"
- 最后一个元素后禁止逗号
- 所有 key 必须双引号
- episodes 数组必须包含恰好要求的集数（完整分集大纲）
- episodeScripts 对象写入前 3-5 集的完整剧本，每集 2-3 个场景，含详细对白`;

export class ScriptWriterAgent extends BaseAgent {
  constructor() {
    super({
      name: '剧本写手',
      role: 'script_writer',
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * 基于故事架构分析，创作完整剧本
   * @param {Object} architectResult - 架构师的分析结果
   * @param {Object} answers - 用户的原始回答（作为事实核查参考）
   * @param {string} direction - 创作方向
   * @param {number} scriptCount - 剧集数
   * @returns {Promise<Object>} 完整剧本
   */
  async write(architectResult, answers, direction, scriptCount = 30) {
    const directionLabel = direction === 'brand' ? '品牌之路' : direction === 'fury' ? '狂暴之路' : '传奇之路';

    const directionMap = {
      legend: `# 🎯 创作方向：传奇之路（个人传记）
- 忠实还原真实经历，增强戏剧冲突
- 挖掘至暗时刻和高光瞬间的情绪爆发点
- 塑造有血有肉的企业家形象
- 对标《中国合伙人》《社交网络》级别叙事品质
- 商业细节必须真实可信，不可虚构重大事实`,
      brand: `# 🎯 创作方向：品牌之路（品牌创意叙事）
- 将品牌/产品核心卖点创意性地置入高概念设定
- 品牌作为故事核心驱动元素
- 通过戏剧冲突自然展示产品价值，杜绝硬广
- 创意设定要新奇但有内在逻辑
- 对标《我在古代开星巴克》
- 结尾巧妙呼应现实品牌`,
      fury: `# 🎯 创作方向：狂暴之路（脑洞爽片）
- 前3秒强冲突/大反差开局
- 每90秒一个爽点，情绪密度最大化
- 企业家本人作为主角，鲜明人设
- 金句密度翻倍：每集至少3-5句
- 冲突要猛、反转要多
- 脑洞天马行空但人物动机清晰
- 对标短剧爆款算法，拒绝文艺片节奏`,
    };

    const architectSummary = architectResult
      ? `
# 📋 故事架构师分析结果

## 一句话故事
${architectResult.oneLine || '未提供'}

## 故事梗概
${architectResult.synopsis || '未提供'}

## 三幕结构
${architectResult.threeActStructure
  ? `第一幕"${architectResult.threeActStructure.act1?.title}": ${(architectResult.threeActStructure.act1?.keyEvents || []).join(' → ')}
第二幕"${architectResult.threeActStructure.act2?.title}": ${(architectResult.threeActStructure.act2?.keyEvents || []).join(' → ')}
第三幕"${architectResult.threeActStructure.act3?.title}": ${(architectResult.threeActStructure.act3?.keyEvents || []).join(' → ')}`
  : '未提供'}

## 核心冲突（${architectResult.coreConflict?.type || '未分析'}）
${architectResult.coreConflict?.description || ''}
冲突升级路径：${(architectResult.coreConflict?.escalation || []).join(' → ')}

## 核心价值观
${architectResult.theme || '未提炼'}

## 人物种子
${(architectResult.characterSeeds || []).map((c, i) =>
  `${i + 1}. ${c.label}（基于${c.basedOn || '真实人物'}）: ${(c.traits || []).join('、')} | 动机: ${c.motivation || ''} | 建议弧线: ${c.arcSuggestion || ''}`
).join('\n')}

## 情绪曲线
${(architectResult.emotionCurve || []).map((e) =>
  `节点${e.point}: ${e.event} → ${e.emotion} (强度${e.intensity})`
).join('\n')}

## 金句灵感（来自用户原话）
${(architectResult.goldenLineSeeds || []).map((l, i) => `${i + 1}. "${l}"`).join('\n')}

## 创作方向建议
${architectResult.creativeDirection || '未提供'}
`
      : '（故事架构师未提供分析，请直接基于用户回答创作）';

    const userMessage = `${directionMap[direction] || ''}

${architectSummary}

# 用户原始回答（事实核查参考）

${Object.entries(answers)
  .filter(([, v]) => v && v.trim())
  .map(([k, v]) => `Q${k}: ${v.slice(0, 200)}${v.length > 200 ? '...' : ''}`)
  .join('\n\n')}

# 创作任务
基于以上所有素材，创作一部 **${scriptCount} 集**的${directionLabel}短剧剧本。

## 三密度量化目标
- 情绪密度：第1集≥极（每5-8秒一次情绪波动），付费集≥高（每15秒一次），常规集≥中（每30秒一次）。每集至少一次情绪过山车。
- 信息密度：第1集≥15条新信息，第2-5集≥8条，付费集≥10条。纯寒暄对白零容忍。
- 情节密度：第1集≥3个微转折，常规集≥2个，付费集≥4个。删掉任何场景后下一个场景不成立才保留。

## 开场自洽要求
- 第4集：第一次自洽揭示（部分真相）
- 第7集：第二次自洽揭示（更大真相）
- 第10集：完全自洽闭环（所有谜底揭晓）
- 开场提出的每一个反常行为，在后续剧集中都必须有对应解释

## 基础要求
1. 必须利用故事架构师的分析成果（三幕结构、情绪曲线、人物种子）
2. 金句必须尽量从用户原话中演化（保留真实质感）
3. episodes 数组包含恰好 ${scriptCount} 个元素（编号 1 到 ${scriptCount}）
4. 前3集和后3集必须详细（summary 80字+）
5. 第8、15、${scriptCount - 2}集附近设置最强付费钩子（hook=true）
6. episodeScripts 包含前 3-5 集的完整剧本，每集 2-3 个场景
7. 每集标注 emotion 字段
8. 八维评估必须诚实：如果某维度明显薄弱，不要给高分`;

    this.log(`✍️ 开始创作剧本 · ${scriptCount} 集 · ${directionLabel}`);
    return this.call(userMessage, { temperature: 0.85, maxTokens: 8192, timeout: 120000 });
  }
}
