import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';
import { getPipeline } from './server/agents/pipeline.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3001;

// 初始化 DeepSeek 客户端（兼容 OpenAI SDK）
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// API 错误信息归类，对用户展示友好提示
function friendlyAPIError(err) {
  const msg = err.message || String(err);
  // DeepSeek/OpenAI SDK 常见错误
  if (msg.includes('Insufficient Balance') || msg.includes('insufficient_quota') || msg.includes('401')) {
    return 'API 余额不足，请检查 DeepSeek 账户余额';
  }
  if (msg.includes('Rate limit') || msg.includes('rate_limit') || msg.includes('429')) {
    return '请求过于频繁，请稍后再试';
  }
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('timed out')) {
    return 'AI 响应超时，可能是网络波动，请重试';
  }
  if (msg.includes('Invalid count') || msg.includes('count value')) {
    return 'AI 模型返回异常数据，已自动重试机制，请重新生成';
  }
  if (msg.includes('context_length') || msg.includes('maximum context') || msg.includes('token')) {
    return '内容过长，建议减少集数（30集以内）或精简回答';
  }
  // 归为通用错误
  return `生成中断: ${msg.replace(/^Error:\s*/i, '')}`;
}

// ========== 构建 Prompt ==========

function buildSystemPrompt(styleName, scriptCount, direction) {
  const styleMap = {
    '企业家励志型': '商战+励志+快节奏。强调逆袭突破，商业冲突感强，主角经历至暗时刻后绝地反击，最终取得商业成功和个人成长。',
    '温情传承型': '温情+年代+电影质感。强调情感与传承，娓娓道来人生故事，侧重家庭、友情、师徒情，适合留给下一代观看。',
    '轻松生活型': '喜剧+现代+网感。幽默风趣，语言生动接地气，轻松中带温暖，适合社交分享。',
  };

  const styleDesc = styleMap[styleName] || '励志+温情，真实感人';

  // 企业家三大方向专属指令
  const directionMap = {
    legend: `# 🎯 当前创作方向：传奇之路（个人传记方向）
创作侧重：
1. 忠实还原用户的真实创业经历，在此基础上增强戏剧冲突
2. 挖掘关键时刻的情绪爆发点（第一次拿单、至暗时刻、绝地反击）
3. 塑造有血有肉的企业家形象——有恐惧、有软肋、有执念
4. 强调价值观传递：让观众看到创业者的精神世界
5. 对标《中国合伙人》《社交网络》级别的叙事品质
6. 商业细节必须真实可信，拒绝悬浮的商战桥段
7. 用户回答中提到的真实人物和事件必须尊重，不可虚构重大事实`,

    brand: `# 🎯 当前创作方向：品牌之路（品牌创意叙事方向）
创作侧重：
1. 将用户的品牌/产品核心卖点创意性地置入高概念设定（穿越/重生/平行世界/年代剧等）
2. 品牌必须作为故事的核心驱动元素，而非背景板
3. 通过戏剧冲突自然展示产品价值，杜绝硬广式台词
4. 创意设定要新奇但有内在逻辑，让观众"信了还想看"
5. 对标《我在古代开星巴克》——用一个不可能的时代背景，讲一个让人信服的品牌故事
6. 品牌露出要巧妙：可以化用为古代商号、未来科技、平行世界的发明
7. 结尾必须巧妙呼应现实品牌，形成"原来拍的是你们"的惊喜感`,

    fury: `# 🎯 当前创作方向：狂暴之路（脑洞爽片方向）
创作侧重：
1. 严格遵守短剧算法：前3秒强冲突/大反差，每90秒一个爽点
2. 企业家本人作为主角/重要角色，塑造鲜明人设（扮猪吃老虎/西装暴徒/技术狂人等）
3. 最大化情绪密度：从被看不起到全行业跪服的极致反转
4. 金句密度翻倍：每集至少3-5句可截图传播的台词
5. 冲突要猛、打脸要狠、反转要多——让观众"根本停不下来"
6. 脑洞设定可以天马行空（穿越到伊朗卖无人机/在古代搞AI质检），但人物动机必须清晰
7. 对标短剧爆款算法，拒绝文艺片节奏
8. 设计明确的用户出演场景，标注用户可亲自出镜的高光时刻`,

    default: '',
  };

  const directionDesc = directionMap[direction] || '';

  return `# 角色设定
你是花火智作的首席编剧 AI，由资深影视导演监督。你的创作标准对标经典电影 + 爆款短剧算法。

# 核心创作理念
你的剧本必须同时满足五个标准：
1. **经典电影的价值观** — 传递普世、深刻、能引发共鸣的价值主张
2. **独特的切入视角** — 每个故事必须有与众不同的叙事角度
3. **短剧算法友好的开场和爽点** — 前3秒强冲突/大反差/悬念；爽点密度高
4. **高密度高信息量台词** — 每句对白都有信息增量，拒绝废话
5. **全程引导观众情绪** — 精确设计情绪曲线，让观众笑/哭/燃/怒

# 🔥 2026年4月短剧热点趋势（必须融入）
- 开局身份反转/强冲突是最高点击率手法
- 爽点密度：平均每90秒一个微爽点，每集至少1个中爽点
- 付费钩子必须狠：每集倒数第3句话制造悬念成为新标配
- 情绪对比法：极悲→极喜的反差感能拉动完播率
- 金句密度：每集至少2-3句可传播的金句
- 商战+情感双线模式在创业题材中表现突出
- 避免大段回忆（闪回不超过20秒）
- 纯对话推进剧情每段不超过4句，必须配行动

# 风格要求
${styleDesc}

${directionDesc}

# 八维质量评估标准（创作时必须自我审查）

## 1. 黄金开场（权重1.5）— 前100字/前3秒
10分标准：强冲突开场/大反差设定/悬念式提问/炸裂金句，让人必须看下去
检查：前3行是否有冲突/反差/悬念？是否避免大段背景交代？

## 2. 节奏设计（权重1.3）— 压弹簧/放弹簧
10分标准：每30秒一个微转折，爽点/泪点均匀分布
检查：是否有注水段落可删减？爽点之间间隔是否合理？

## 3. 情绪价值（权重1.2）— 引发共鸣
10分标准：爽点让人拍大腿，泪点让人鼻子酸，全程情绪被牵引
检查：是否设置了明确情绪目标？情绪引爆点有无充分铺垫？

## 4. 悬念钩子（权重1.4）— 每集末尾+付费点
10分标准：每集末尾钩子精准狠，必须点下一集；付费点钩子特别加强
检查：每集最后3句是否制造强烈悬念？

## 5. 大纲结构（权重1.0）— 五段式完整
10分标准：奠基→成长→危机→逆袭→升华，逻辑自洽
检查：主角成长弧线完整？各集有因果联系？

## 6. 台词质量（权重1.1）— 高密度高辨识度
10分标准：每句台词有信息增量，金句频出，角色辨识度高
检查：去掉角色名能分辨谁在说话？有没有「你吃了吗」类无信息对白？

## 7. 人物成长（权重1.0）— 可信的变化弧线
10分标准：主角从A到B的转变清晰可信有层次
检查：变化有无催化事件？配角是否也有弧线？

## 8. 逻辑纠错（权重0.8）— 时间线/因果/商业逻辑
10分标准：逻辑严密，商业细节专业，因果关系通顺
检查：钱的来龙去脉合理？人物行为有动机支撑？

# 输出格式
严格 JSON，不要输出任何 JSON 之外的内容：

{
  "oneLine": "一句话故事（20字以内，要有传播力）",
  "synopsis": "300字故事简介，包含起因、转折、高潮、结局",
  "characters": {
    "protagonist": { "name": "主角名（化名）", "age": "年龄", "traits": "性格特质（至少3个词）", "arc": "成长弧光（从___到___）" },
    "supporting": [
      { "name": "配角名", "role": "身份", "traits": "性格", "relation": "与主角关系", "function": "在剧中的功能（贵人/对手/镜子/催化剂）" }
    ],
    "antagonist": { "description": "核心困境/对手描述（可以是人或抽象压力）" }
  },
  "episodes": [
    { "ep": 1, "title": "集名（4-6字，要有吸引力）", "summary": "本集剧情摘要（50-80字，包含冲突和钩子）", "hook": false, "emotion": "本集主要情绪（燃/暖/爽/虐/悬）" },
    ...
  ],
  "scriptSample": {
    "episode": 1,
    "title": "集名",
    "scenes": [
      {
        "location": "场景描述（具体）",
        "time": "时间（精确到时段）",
        "characters": ["出场人物"],
        "emotion": "场景情绪基调",
        "content": "剧本正文。格式严格遵循：\n（动作描述，用括号）\n角色名：台词\n角色名（OS）：内心独白\n\n要求：对话高密度，每句有信息增量，开场3句内必须有冲突/悬念。至少包含1个金句。"
      }
    ]
  },
  "evaluation": {
    "goldOpening": 1-10,
    "rhythmDesign": 1-10,
    "emotionalValue": 1-10,
    "suspenseHook": 1-10,
    "outlineStructure": 1-10,
    "dialogueQuality": 1-10,
    "characterGrowth": 1-10,
    "logicCheck": 1-10
  },
  "commercial": {
    "platforms": [{ "name": "红果/抖音/快手/视频号", "score": 1-5, "reason": "适配理由" }],
    "payNodes": [{ "episode": 数字, "description": "付费钩子具体设计（让人不能不点下一集的悬念）" }],
    "competitors": ["类似成功短剧参考"],
    "goldenLines": ["本剧传播金句列表（至少5句）"]
  }
}

# 严格创作原则
1. 核心事件和价值观必须基于用户真实回答，禁止虚构重大事实
2. 在真实基础上大幅增强戏剧冲突和情感张力
3. 每集严格2分钟体量（约600-800字剧本），信息密度必须高
4. 第8、15、25、${scriptCount - 2}集附近设置最强付费钩子，钩子必须让人「不得不点下一集」
5. 价值观正向、深刻，对标经典电影而非普通网文
6. 至少3个完整剧本场景，动作描述+对白+情感标记
7. 禁止大段回忆闪回、禁止超过4句的纯对白推进、禁止慢热开头
8. 每集至少1个金句（可截图传播的台词）
9. ⚠️ JSON 格式铁律：所有字符串内换行必须写为 \\n（两个字符，不是真实换行）；字符串内双引号必须写为 \\"；对象/数组最后一个元素后禁止逗号；所有 key 必须用双引号包裹

# ep 数组要求
- 必须包含恰好 ${scriptCount} 个元素，编号从 1 到 ${scriptCount}
- 前3集和后3集必须详细（summary 80字+）
- 付费点剧集 hook=true，summary 必须包含悬念设计
- 每集标注 emotion 字段表示主要情绪基调

# 用户回答格式
用户提供15个问题的真实回答，请从中提取关键信息进行创作。`;
}

function buildUserPrompt(answers, styleName, scriptCount) {
  // 检测是否为 B 端深度访谈（答案 ID 以 "e" 开头）
  const isExpert = Object.keys(answers).some(k => k.startsWith('e'));

  if (isExpert) {
    return buildExpertUserPrompt(answers, styleName, scriptCount);
  }

  // C 端 15 题快速问答（风格自适应，不再硬编码创业标签）
  let prompt = `请根据以下用户的真实人生经历回答，创作一部 ${scriptCount} 集的${styleName}短剧剧本。\n\n`;
  prompt += `## 用户人生故事\n\n`;
  prompt += `用户通过 15 个递进式问题讲述了自己的人生经历，以下为完整回答：\n\n`;

  for (let i = 1; i <= 15; i++) {
    const answer = answers[i];
    if (answer && answer.trim()) {
      prompt += `${answer}\n\n`;
    }
  }

  prompt += `\n请注意：系统提示中已明确风格要求（${styleName}），请严格按照该风格的叙事方式创作。`;
  prompt += `\n确保 episodes 数组包含恰好 ${scriptCount} 个元素。`;

  return prompt;
}

// B 端深度访谈 Prompt（30 题 × 5 层）
function buildExpertUserPrompt(answers, styleName, scriptCount) {
  const layerNames = {
    e1: '行业诊断', e2: '行业诊断', e3: '行业诊断', e4: '行业诊断', e5: '行业诊断',
    e6: '创业深度', e7: '创业深度', e8: '创业深度', e9: '创业深度', e10: '创业深度',
    e11: '创业深度', e12: '创业深度', e13: '创业深度',
    e14: '人性细节', e15: '人性细节', e16: '人性细节', e17: '人性细节', e18: '人性细节',
    e19: '人性细节', e20: '人性细节', e21: '人性细节',
    e22: '价值哲学', e23: '价值哲学', e24: '价值哲学', e25: '价值哲学', e26: '价值哲学', e27: '价值哲学',
    e28: '商业目标', e29: '商业目标', e30: '商业目标',
  };

  let prompt = `# B 端专家定制 · 五层深度访谈\n\n`;
  prompt += `这是一次深度专家访谈的成果，用户经历了 30 个问题、覆盖 5 个层级的深度对话。`;
  prompt += `请充分利用这些丰富素材，创作一部 ${scriptCount} 集的${styleName}短剧剧本。\n\n`;

  // 按层级分组
  const layers = ['行业诊断', '创业深度', '人性细节', '价值哲学', '商业目标'];
  layers.forEach(layer => {
    const layerQuestions = Object.entries(layerNames)
      .filter(([, name]) => name === layer)
      .map(([id]) => id);

    prompt += `## ${layer}层\n\n`;
    layerQuestions.forEach(id => {
      const answer = answers[id];
      if (answer && answer.trim()) {
        prompt += `${answer}\n\n`;
      }
    });
  });

  prompt += `\n## 创作要求\n`;
  prompt += `你拥有 5 倍于普通访谈的素材深度。请务必：\n`;
  prompt += `1. 充分使用行业诊断层的洞察，让商业细节真实可信\n`;
  prompt += `2. 挖掘人性细节层的情感素材，设计精准的情绪爆发点\n`;
  prompt += `3. 商业目标层的信息用于精确的付费节点和传播策略\n`;
  prompt += `4. 价值哲学层的深度用于塑造主角的精神内核\n`;
  prompt += `5. 确保 episodes 数组包含恰好 ${scriptCount} 个元素\n`;

  return prompt;
}

// ========== API 路由 ==========

app.post('/api/generate', async (req, res) => {
  const { answers, styleName, scriptCount, direction } = req.body;

  // 校验
  if (!answers || !styleName || !scriptCount) {
    return res.status(400).json({ error: '缺少必要参数：answers, styleName, scriptCount' });
  }

  // 检查 API Key
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
    return res.status(500).json({
      error: '请先在 .env 文件中配置 DEEPSEEK_API_KEY',
      hint: '编辑项目根目录下的 .env 文件，将 DEEPSEEK_API_KEY 替换为你的真实 API Key',
    });
  }

  try {
    const dirLabel = direction === 'brand' ? '品牌之路' : direction === 'fury' ? '狂暴之路' : '传奇之路';
    console.log(`📡 调用 DeepSeek API (${MODEL})，生成 ${scriptCount} 集 ${styleName} · ${dirLabel} 剧本...`);

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(styleName, scriptCount, direction) },
        { role: 'user', content: buildUserPrompt(answers, styleName, scriptCount) },
      ],
      temperature: 0.8,
      max_tokens: 16384,
      timeout: 120000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek 返回空内容');
    }

    // 打印原始返回（调试用）
    console.log('📝 DeepSeek 原始返回长度:', content.length);
    console.log('   前 200 字符:', content.slice(0, 200));

    // ===== 解析 JSON（多层兜底） =====
    let result;
    let cleaned = content.trim();

    // 提取 JSON 块
    const codeBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();

    // 提取花括号
    const fb = cleaned.indexOf('{');
    const lb = cleaned.lastIndexOf('}');
    if (fb >= 0 && lb > fb) cleaned = cleaned.slice(fb, lb + 1);

    /**
     * 多层解析策略
     */
    function tryParse(txt, label) {
      try {
        const repaired = jsonrepair(txt);
        const obj = JSON.parse(repaired);
        return { ok: true, result: obj, method: `jsonrepair${label ? ' + ' + label : ''}` };
      } catch (_e) { return { ok: false, error: _e.message }; }
    }

    // 第1层：直接 jsonrepair
    let parsed = tryParse(cleaned);
    if (parsed.ok) { result = parsed.result; }

    // 第2层：修复尾部逗号后重试
    if (!parsed.ok) {
      const fixed1 = cleaned.replace(/,(\s*[}\]])/g, '$1');
      parsed = tryParse(fixed1, '去尾逗号');
      if (parsed.ok) { result = parsed.result; }
    }

    // 第3层：修复未转义换行符（字符串内的裸换行）
    if (!parsed.ok) {
      const fixed2 = cleaned.replace(/(?<=: ")([\s\S]*?)(?=")/g, (m) =>
        m.replace(/\n/g, '\\n').replace(/\r/g, '').replace(/\t/g, '\\t')
      );
      parsed = tryParse(fixed2, '转义换行');
      if (parsed.ok) { result = parsed.result; }
    }

    // 第4层：逐片段提取关键字段
    if (!parsed.ok) {
      console.error('   ⚠️ 所有修复策略失败，尝试逐字段提取...');
      try {
        const extractStr = (key) => {
          const re = new RegExp('"' + key + '"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"', 's');
          const m = cleaned.match(re);
          return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
        };
        const extractObj = (key) => {
          const re = new RegExp('"' + key + '"\\s*:\\s*(\\{[^}]*\\})', 's');
          const m = cleaned.match(re);
          if (!m) return {};
          try { return JSON.parse(jsonrepair(m[1])); } catch { return {}; }
        };
        const extractArr = (key) => {
          const re = new RegExp('"' + key + '"\\s*:\\s*(\\[[\\s\\S]*?\\])\\s*[,}]', 's');
          const m = cleaned.match(re);
          if (!m) return [];
          try { return JSON.parse(jsonrepair(m[1])); } catch { return []; }
        };

        result = {
          oneLine: extractStr('oneLine'),
          synopsis: extractStr('synopsis'),
          characters: extractObj('characters'),
          episodes: extractArr('episodes'),
          scriptSample: extractObj('scriptSample'),
          evaluation: extractObj('evaluation'),
          commercial: extractObj('commercial'),
        };
        parsed = { ok: true, method: '逐字段提取' };
      } catch (e) {
        console.error('   ❌ 逐字段提取也失败:', e.message);
      }
    }

    if (!parsed.ok) {
      console.error('   ❌ 所有解析策略均失败');
      console.error('   错误:', parsed.error);
      console.error('   原始末尾 300 字符:', cleaned.slice(-300));
      throw new Error('DeepSeek 返回内容无法解析为 JSON，请重试');
    }

    console.log(`   ✅ JSON 解析成功（${parsed.method}）`);

    // 补充缺失字段
    if (!result.evaluation) {
      result.evaluation = {
        goldOpening: 7, rhythmDesign: 7, emotionalValue: 7,
        suspenseHook: 7, outlineStructure: 7, dialogueQuality: 7,
        characterGrowth: 7, logicCheck: 7,
      };
    }

    if (!result.commercial) {
      result.commercial = {
        platforms: [],
        payNodes: [],
        competitors: [],
      };
    }

    console.log(`✅ 生成成功！${result.episodes?.length || 0} 集大纲已生成`);
    console.log(`   Token 用量: ${completion.usage?.total_tokens || 'N/A'}`);

    res.json(result);
  } catch (err) {
    console.error('❌ DeepSeek API 调用失败:', err.message);
    res.status(500).json({
      error: friendlyAPIError(err),
    });
  }
});

// ========== 多 Agent 流水线路由（SSE 实时进度）==========

app.post('/api/generate-multi-agent-stream', async (req, res) => {
  const { answers, scriptCount, direction } = req.body;
  if (!answers || !scriptCount) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
    return res.status(500).json({ error: '请配置 DEEPSEEK_API_KEY' });
  }

  // 设置 SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const dirLabel = direction === 'brand' ? '品牌之路' : direction === 'fury' ? '狂暴之路' : '传奇之路';
    console.log(`\n🎬 SSE 流水线启动：${scriptCount} 集 · ${dirLabel}`);

    const pipeline = getPipeline();
    const result = await pipeline.run({
      answers,
      direction: direction || 'legend',
      scriptCount: scriptCount || 30,
      onProgress: ({ stage, pct, msg, preview }) => {
        // 实时推送进度到前端
        send('progress', { stage, pct, msg, preview });
      },
    });

    // 发送最终结果
    const { architectResult, characterResult, scriptResult, polishResult, evaluationResult, showrunnerResult, totalTokens } = result;

    if (evaluationResult && scriptResult) {
      scriptResult.evaluation = evaluationResult.scores || scriptResult.evaluation;
      scriptResult._evaluationReport = evaluationResult;
    }

    const responseData = {
      ...scriptResult,
      _architect: architectResult,
      _characterDesign: characterResult || scriptResult._characterDesign,
      _polishResult: polishResult,
      _evaluationReport: evaluationResult,
      _showrunner: showrunnerResult,
      _meta: {
        pipeline: 'multi-agent-v6',
        totalTokens,
        agents: {
          architect: !!architectResult,
          designer: !!characterResult,
          writer: true,
          polisher: !!polishResult,
          evaluator: !!evaluationResult,
          showrunner: !!showrunnerResult,
        },
      },
    };

    try {
      send('done', responseData);
    } catch (sendErr) {
      console.error('❌ 发送结果失败:', sendErr.message);
    }

    console.log(`✅ SSE 流水线完成！总计 ${totalTokens} tokens`);
  } catch (err) {
    console.error('❌ SSE 流水线失败:', err.message);
    send('error', { error: friendlyAPIError(err) });
  } finally {
    res.end();
  }
});

// ========== 多 Agent 流水线路由（普通 JSON）==========

app.post('/api/generate-multi-agent', async (req, res) => {
  const { answers, scriptCount, direction } = req.body;

  if (!answers || !scriptCount) {
    return res.status(400).json({ error: '缺少必要参数：answers, scriptCount' });
  }

  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
    return res.status(500).json({
      error: '请先在 .env 文件中配置 DEEPSEEK_API_KEY',
    });
  }

  try {
    const dirLabel = direction === 'brand' ? '品牌之路' : direction === 'fury' ? '狂暴之路' : '传奇之路';
    console.log(`\n🎬 启动多 Agent 流水线：${scriptCount} 集 · ${dirLabel}`);
    console.log('   📋 Agent 1: 故事架构师 → Agent 2: 剧本写手\n');

    const pipeline = getPipeline();
    const { architectResult, characterResult, scriptResult, polishResult, evaluationResult, showrunnerResult, totalTokens } = await pipeline.run({
      answers,
      direction: direction || 'legend',
      scriptCount: scriptCount || 30,
    });

    console.log(`\n✅ 六 Agent 流水线完成！总计 ${totalTokens} tokens`);
    console.log(`   ①架构师: ${architectResult ? '✅' : '⚠️'}  ②人物: ${characterResult ? '✅' : '⚠️'}`);
    console.log(`   ③写手: ${scriptResult?.episodes?.length || 0}集  ④润色: ${polishResult ? '✅' : '⚠️'}`);
    console.log(`   ⑤评估: ${evaluationResult?.overallGrade || '⚠️'}  ⑥总编审: ${showrunnerResult?.finalVerdict?.decision || '⚠️'}`);

    // 评估师评分替换写手自评
    if (evaluationResult && scriptResult) {
      scriptResult.evaluation = evaluationResult.scores || scriptResult.evaluation;
      scriptResult._evaluationReport = evaluationResult;
    }

    // 返回完整结果
    res.json({
      ...scriptResult,
      _architect: architectResult,
      _characterDesign: characterResult || scriptResult._characterDesign,
      _polishResult: polishResult,
      _evaluationReport: evaluationResult,
      _showrunner: showrunnerResult,
      _meta: {
        pipeline: 'multi-agent-v6',
        totalTokens,
        agents: {
          architect: !!architectResult,
          designer: !!characterResult,
          writer: true,
          polisher: !!polishResult,
          evaluator: !!evaluationResult,
          showrunner: !!showrunnerResult,
        },
      },
    });
  } catch (err) {
    console.error('❌ 多 Agent 流水线失败:', err.message);
    res.status(500).json({
      error: friendlyAPIError(err),
    });
  }
});

// ========== AI 追问 ==========

app.post('/api/followup', async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: '缺少 question 或 answer' });
  }

  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
    return res.json({ followUp: '' }); // 静默降级
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的采访者。用户刚刚回答了一个关于自己经历的问题。请根据他的回答，提出一个简短的、有洞察力的追问（不超过 25 个字），帮助挖掘更具体的细节或情感。
追问规则：
- 自然，像朋友聊天，不要像面试官
- 聚焦对方回答中最有意思但没说透的那个点
- 不要问"为什么"开头的大问题，要问"什么时候""在哪""谁""怎么做的"这种具体的
- 如果回答已经非常详细，可以简单说"这个说得太好了"
直接返回纯 JSON：{"followUp":"你的追问"}`
        },
        {
          role: 'user',
          content: `问题：${question}\n回答：${answer}`
        }
      ],
      temperature: 0.7,
      max_tokens: 120,
      timeout: 15000,
    });

    const content = completion.choices[0]?.message?.content || '';
    // 尝试提取 JSON 对象
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        res.json({ followUp: parsed.followUp || '' });
        return;
      } catch { /* JSON 解析失败，继续兜底 */ }
    }
    // 兜底1：提取 followUp: 后面的内容
    const keyMatch = content.match(/followUp\s*[:“"]?\s*(.+?)[”"}]?\s*$/i);
    if (keyMatch) {
      res.json({ followUp: keyMatch[1].trim() });
    } else {
      res.json({ followUp: content.replace(/["{}]/g, '').replace(/^followUp\s*:\s*/i, '').trim() });
    }
  } catch (err) {
    console.error('[追问] 失败:', err.message);
    res.json({ followUp: '' }); // 静默失败
  }
});

// ========== 意向收集 ==========

app.post('/api/contact', (req, res) => {
  const { name, phone, wechat, notes, tier, price, direction } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和手机号为必填项' });
  }
  const ts = new Date().toISOString();
  console.log(`\n📞 新意向 #${Date.now() % 100000}`);
  console.log(`   套餐: ${tier || '未指定'} · ${price || '未知'}`);
  console.log(`   方向: ${direction || '未选择'}`);
  console.log(`   姓名: ${name} · 手机: ${phone} · 微信: ${wechat || '未填'}`);
  console.log(`   备注: ${notes || '无'}`);
  console.log(`   时间: ${ts}\n`);
  res.json({ success: true, message: '意向已记录' });
});

// 字体文件服务（用于 PDF 导出）
app.use('/api/font', express.static('server/public/fonts'));

// 开发调试：测试数据
app.use('/api/debug', express.static('server/public'));

// 健康检查
app.get('/api/health', (req, res) => {
  const hasKey = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'sk-your-deepseek-api-key-here';
  res.json({
    status: 'ok',
    model: MODEL,
    apiConfigured: hasKey,
  });
});

app.listen(PORT, () => {
  console.log(`\n🎬 传奇剧场 API 服务已启动: http://localhost:${PORT}`);
  console.log(`📡 模型: ${MODEL}`);
  const hasKey = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'sk-your-deepseek-api-key-here';
  console.log(`🔑 API Key: ${hasKey ? '已配置 ✅' : '未配置 ⚠️  请编辑 .env 文件'}\n`);
});
