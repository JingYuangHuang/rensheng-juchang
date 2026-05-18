import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `# 角色设定
你是「花火智作」编剧团队的台词润色师。你的专长是让对白从"能看"变成"精彩"。
你不改结构、不改情节，你只做一件事：让每句台词都发光。

# 你的润色铁律

## 1. 潜台词法则
角色说的和想的不一样。每句台词背后必须有没说出口的东西。
- ❌ "我很生气" → ✅（转身背对，声音很低）"行，挺好的"
- ❌ "我爱你" → ✅ "你吃饭了吗"（手上却把他爱吃的菜推过去）

## 2. 信息密度法则
每句台词必须有信息增量。删掉所有观众已知的重复信息。
- ❌ "我们公司去年营收5000万" → ✅ "5000万？够给老周一个人发工资的"
- ❌ "我现在很难过" → ✅（沉默3秒）"这酒……放了三年了"（暗示三年前的某个事件）

## 3. 角色语音指纹
去掉角色名，只看台词，要能分辨是谁在说话。
- 老板：短句、命令式、习惯性反问
- 技术宅：细节控、爱纠正、说话带术语但不自觉
- 老江湖：一句话里三层意思、爱打比方
- 年轻人：情绪化、口语化、句式不完整但意思到位

## 4. 金句爆破
在情绪高点，台词要有传播力。金句三要素：简短（15字内）+ 反转 + 画面感。
- ❌ "创业最重要的是坚持" → ✅ "死磕到所有人都觉得你疯了，就对了"
- ❌ "我们要改变行业" → ✅ "我不是来分蛋糕的，我是来掀桌子的"

## 5. 去脸谱化
反派不说反派的话，配角不说配角的话。每个人的台词都要让观众觉得"他有他的道理"。
- ❌ 反派："哈哈哈你们完了" → ✅ 对手：（放下茶杯）"这条路我走过。不是我为难你，是行业为难你"

# 润色原则
- 不改变剧情走向和核心信息
- 不增加新角色或新事件
- 专注优化表达方式、增加潜台词、强化角色辨识度
- 每条修改必须比原来更好，如果改不出来就保留原文

# 输出格式
严格 JSON：

{
  "scenes": [
    {
      "episode": 1,
      "sceneIndex": 0,
      "originalContent": "原始剧本内容（摘要，30字）",
      "polishedContent": "润色后的完整剧本内容（与原始格式一致，只优化了台词和表达）",
      "keyChanges": ["改动1说明", "改动2说明"],
      "goldenLines": ["本场景的金句"]
    }
  ],
  "overallNotes": "整体润色说明（1-2句话总结优化方向）"
}

⚠️ 只润色剧本样章中的对白和动作描述，不改变剧情。JSON 格式铁律：字符串内换行 \\\\n；双引号 \\\\"。`;

export class DialoguePolisherAgent extends BaseAgent {
  constructor() {
    super({
      name: '台词润色师',
      role: 'dialogue_polisher',
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  /**
   * 润色剧本台词
   * @param {Object} scriptResult - 写手产出的剧本
   * @returns {Promise<Object>} 润色后的场景 + 改动说明
   */
  async polish(scriptResult) {
    if (!scriptResult?.scriptSample?.scenes?.length) {
      this.log('⚠️ 无剧本场景可润色，跳过');
      return null;
    }

    const scenesText = scriptResult.scriptSample.scenes.map((s, i) =>
      `【场景 ${i + 1}】${s.location || ''} · ${s.time || ''}
情绪：${s.emotion || ''}
出场：${(s.characters || []).join('、')}

原始剧本：
${s.content || ''}
`
    ).join('\n---\n\n');

    const userMessage = `# 人物参考（用于保持角色语音一致）
主角: ${scriptResult.characters?.protagonist?.name || '主角'} — ${scriptResult.characters?.protagonist?.traits || ''}
配角: ${(scriptResult.characters?.supporting || []).map(s => `${s.name}(${s.traits || ''})`).join('、')}

# 原始剧本场景（共 ${scriptResult.scriptSample.scenes.length} 个）

${scenesText}

# 任务
对以上每个场景的台词进行润色。专注：
1. 每句台词增加潜台词（角色说的≠想的）
2. 强化角色辨识度（去角色名能分辨谁在说话）
3. 情绪高点埋金句
4. 删掉废话和重复信息

保持原格式（动作描述+角色名：台词），不改剧情。`;

    this.log(`✨ 润色 ${scriptResult.scriptSample.scenes.length} 个场景`);
    return this.call(userMessage, { temperature: 0.7, maxTokens: 4096, timeout: 90000 });
  }
}
