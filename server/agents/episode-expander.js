import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `# 角色设定
你是「花火智作」编剧团队的剧集扩展编剧。你的任务是基于分集大纲，将多集短剧的概要扩展为完整的可拍摄剧本。

# 核心创作标准
同「花火智作」编剧团队标准：
1. **经典电影的价值观** — 传递普世、深刻、能引发共鸣的价值主张
2. **独特的切入视角** — 每个故事必须有与众不同的叙事角度
3. **短剧算法友好的开场和爽点** — 前3秒强冲突/大反差/悬念；爽点密度高
4. **高密度高信息量台词** — 每句对白都有信息增量，拒绝废话
5. **全程引导观众情绪** — 精确设计情绪曲线

# 🔥 短剧创作铁律（2026）
- 爽点密度：平均每90秒一个微爽点
- 付费钩子必须狠：每集倒数第3句制造悬念
- 情绪对比法：极悲→极喜的反差
- 金句密度：每集至少2-3句可截图传播的台词
- 禁止大段回忆（闪回不超过20秒）
- 纯对话推进每段不超过4句，必须配行动

# 剧情一致性要求
- 保持人物性格一致（参考已有的人物小传）
- 剧情逻辑连贯（承接上一集结尾，为下一集留钩子）
- 每集结尾必须有悬念钩子，让观众想点下一集

# 输出格式
严格 JSON：

{
  "episodeScripts": {
    "2": {
      "title": "第2集标题",
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
    "3": {
      "title": "第3集标题",
      "scenes": [...]
    }
  }
}

⚠️ 每集必须包含 2-3 个完整场景，含详细对白、动作描述和情绪标记。
JSON 格式铁律：所有字符串内换行写为 \\n；字符串内双引号写为 \\"；最后一个元素后禁止逗号；所有 key 必须双引号。`;

export class EpisodeExpanderAgent extends BaseAgent {
  constructor() {
    super({
      name: '剧集扩展编剧',
      role: 'episode_expander',
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * 将指定的多集概要扩展为完整剧本
   * @param {Object} options
   * @param {Array<{ep:number,title:string,summary:string,emotion:string}>} options.episodeOutlines - 要扩展的剧集概要
   * @param {Object} options.characterProfiles - 人物小传（维持一致性）
   * @param {string} options.storyContext - 故事背景和前面剧集的内容摘要
   * @returns {Promise<Object>} { result: { episodeScripts: {...} }, tokens: number }
   */
  async expand({ episodeOutlines, characterProfiles, storyContext }) {
    const batchDesc = episodeOutlines.map(ep =>
      `第 ${ep.ep} 集 · 《${ep.title}》 [${ep.emotion || '未标注'}]\n概要：${ep.summary || ''}`
    ).join('\n\n');

    const userMessage = `# 故事背景
${storyContext || '基于用户真实经历改编的短剧'}

# 人物小传
${characterProfiles ? JSON.stringify(characterProfiles, null, 2) : '（请参考已有设定）'}

# 需要扩展的剧集
请将以下 ${episodeOutlines.length} 集的分集概要扩展为完整的可拍摄剧本：

${batchDesc}

# 创作要求
1. 每集创作 2-3 个完整场景（场景描述 + 角色对白 + 动作描述 + 情绪标记）
2. 保持人物性格与已有设定一致
3. 每集结尾设置悬念钩子
4. 剧集之间剧情连贯（前集结尾→本集开头需承接）
5. 对白必须携带信息增量
6. 每集至少 2-3 句可传播金句
7. 输出 JSON 中的 episodeScripts key 为集数字符串`;

    this.log(`✍️ 扩展剧集 ${episodeOutlines[0]?.ep} - ${episodeOutlines[episodeOutlines.length - 1]?.ep}（共 ${episodeOutlines.length} 集）`);
    return this.call(userMessage, { temperature: 0.85, maxTokens: 8192, timeout: 120000 });
  }
}
