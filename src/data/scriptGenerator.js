// 调用后端 API 进行真正的 AI 剧本生成

const API_BASE = '/api';

// 使用多 Agent 流水线（true=SSE实时流，false=单Agent）
const USE_MULTI_AGENT = true;
const USE_SSE = true; // 使用 SSE 实时进度

/**
 * 格式化 AI 返回的结果为前端展示所需格式
 */
function formatResult(aiResult, scriptCount, styleName) {
  const { oneLine, synopsis, characters, episodes, scriptSample, episodeScripts, evaluation, commercial } = aiResult;

  // 格式化人物小传
  let charactersText = '【人物小传】\n\n';
  if (characters?.protagonist) {
    const p = characters.protagonist;
    charactersText += `🎯 主角 · ${p.name || '林远'}（化名）\n`;
    charactersText += `年龄：${p.age || '35-45 岁'}\n`;
    charactersText += `性格：${p.traits || '坚韧果敢'}\n`;
    if (p.arc) charactersText += `成长弧光：${p.arc}\n`;
    charactersText += '\n';
  }
  if (characters?.supporting?.length) {
    characters.supporting.forEach((s, i) => {
      charactersText += `🤝 重要配角${i + 1} · ${s.name || ''}\n`;
      charactersText += `身份：${s.role || ''} | 性格：${s.traits || ''}\n`;
      if (s.relation) charactersText += `关系：${s.relation}\n`;
      if (s.function) charactersText += `功能：${s.function}\n`;
      charactersText += '\n';
    });
  }
  if (characters?.antagonist) {
    charactersText += `⚔️ 对手/困境：${characters.antagonist.description || ''}\n`;
  }

  // 格式化分集大纲（含情绪标签）
  let outlineText = `【分集大纲】（共 ${scriptCount} 集）\n\n`;
  if (episodes?.length) {
    episodes.forEach((ep) => {
      const hookMark = ep.hook ? ' 🔥 付费点' : '';
      const emotionTag = ep.emotion ? ` [${ep.emotion}]` : '';
      outlineText += `📺 第 ${ep.ep} 集 · 《${ep.title || '未命名'}》${emotionTag}${hookMark}\n`;
      outlineText += `${ep.summary || ''}\n\n`;
    });
  } else {
    outlineText += '（AI 生成的剧集大纲将显示在此处）\n';
  }

  // 格式化剧本样章（默认第1集）
  let scriptText = '【剧本样章】\n\n';
  if (scriptSample?.scenes?.length) {
    scriptText += `第 ${scriptSample.episode || 1} 集 · 《${scriptSample.title || '未命名'}》\n\n`;
    scriptSample.scenes.forEach((scene, i) => {
      scriptText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      scriptText += `【场景 ${i + 1}】${scene.time || ''} · ${scene.location || ''}\n`;
      scriptText += `${scene.content || ''}\n\n`;
    });
  } else {
    scriptText += '（AI 生成的完整剧本文本将显示在此处）\n';
  }

  // 格式化所有剧集的完整剧本（供集数选择器使用）
  const allEpisodeScripts = {};
  if (episodeScripts) {
    Object.entries(episodeScripts).forEach(([epNum, ep]) => {
      let epText = '';
      if (ep.scenes?.length) {
        ep.scenes.forEach((scene, i) => {
          epText += `━━━━━━━━━━━━━━━━━━━\n\n`;
          epText += `【场景 ${i + 1}】${scene.time || ''} · ${scene.location || ''}\n`;
          epText += `${scene.content || ''}\n\n`;
        });
      }
      allEpisodeScripts[epNum] = {
        title: ep.title || `第${epNum}集`,
        text: epText,
      };
    });
  }

  // 格式化创作笔记（含八维评估权重说明）
  const notesText = [
    '【AI 创作笔记 · 花火智作八维评估体系】',
    '',
    '💡 亮点分析：',
    `1. 故事核："${oneLine || '基于真实经历改编'}"，具备强共鸣基础`,
    `2. 风格定位：${styleName}，${scriptCount} 集短剧`,
    '3. 情感张力：基于用户真实经历，情感密度高',
    '4. 热点对齐：已融入2026年4月短剧算法趋势',
    '',
    '⭐ 故事价值：',
    '本故事的核心力量在于"真实"——基于用户的亲身经历改编，',
    '观众能在其中看到自己的影子，这是最大 IP 价值。',
    '',
    '📐 八维评估权重说明：',
    '黄金开场(1.5) > 悬念钩子(1.4) > 节奏设计(1.3) > 情绪价值(1.2) > 台词质量(1.1) > 大纲结构(1.0) = 人物成长(1.0) > 逻辑纠错(0.8)',
    '加权总分更能反映短剧算法的真实竞争力。',
    '',
    '🎬 视觉建议：',
    '- 色调：跟随剧情情绪变化调整冷暖色调',
    '- 节奏：商战场面快剪，情感场面长镜头',
    '- 关键意象：灯光（从昏暗到明亮，象征希望）',
  ].join('\n');

  // 格式化商业化建议（含金句传播）
  let commercialText = '【商业化建议】\n\n📊 平台匹配度分析：\n';
  if (commercial?.platforms?.length) {
    commercial.platforms.forEach((p) => {
      const stars = '★'.repeat(p.score || 3) + '☆'.repeat(5 - (p.score || 3));
      commercialText += `| ${p.name || ''} | ${stars} | ${p.reason || ''} |\n`;
    });
  }
  commercialText += '\n💰 付费节点设计：\n';
  if (commercial?.payNodes?.length) {
    commercial.payNodes.forEach((node) => {
      commercialText += `- 第 ${node.episode} 集：${node.description || ''}\n`;
    });
  }
  commercialText += '\n🎯 竞品参考：\n';
  if (commercial?.competitors?.length) {
    commercial.competitors.forEach((c) => {
      commercialText += `- ${c}\n`;
    });
  }
  if (commercial?.goldenLines?.length) {
    commercialText += '\n💬 传播金句（可用于海报/预告/社交媒体）：\n';
    commercial.goldenLines.forEach((line, i) => {
      commercialText += `${i + 1}. "${line}"\n`;
    });
  }

  return {
    oneLine: oneLine || '这是一个关于奋斗与成长的真实故事。',
    synopsis: '【故事简介】\n\n' + (synopsis || '基于您的真实经历，AI 正在为您创作专属故事...'),
    characters: charactersText,
    episodeOutline: outlineText,
    scriptSample: scriptText,
    allEpisodeScripts, // { "1": {title, text}, "2": {title, text}, ... }
    _episodeScripts: episodeScripts || null, // 原始结构化数据
    notes: notesText,
    commercial: commercialText,
    evaluation: evaluation || {
      goldOpening: 7, rhythmDesign: 7, emotionalValue: 7,
      suspenseHook: 7, outlineStructure: 7, dialogueQuality: 7,
      characterGrowth: 7, logicCheck: 7,
    },
  };
}

/**
 * 调用后端 API 生成剧本
 */
export async function generateScript(answers, styleName, scriptCount, direction, onProgress) {
  // 进度回调
  const progressStages = [
    { pct: 5, msg: '正在整理你的故事素材…' },
    { pct: 15, msg: '分析情感线索与关键转折点…' },
    { pct: 25, msg: '设计故事架构与分集大纲…' },
    { pct: 40, msg: '撰写人物小传…' },
    { pct: 55, msg: 'AI 正在创作剧本正文…' },
    { pct: 75, msg: '润色台词与节奏…' },
    { pct: 90, msg: '生成评估报告…' },
    { pct: 98, msg: '打包完成！' },
  ];

  // 根据模式选择不同的进度提示
  const multiAgentStages = USE_MULTI_AGENT
    ? [
        { pct: 5,  msg: '① 故事架构师：分析经历，提炼冲突…' },
        { pct: 16, msg: '② 人物设计师：塑造角色，设计弧光…' },
        { pct: 30, msg: '构建人物关系图谱与语言风格…' },
        { pct: 40, msg: '③ 剧本写手：基于架构+人物创作…' },
        { pct: 52, msg: '撰写完整人物小传与分集大纲…' },
        { pct: 62, msg: '④ 台词润色师：优化对白，注入潜台词…' },
        { pct: 72, msg: '⑤ 剧本评估师：八维深度评估…' },
        { pct: 84, msg: '⑥ 总编审：最终审查，做出裁定…' },
        { pct: 94, msg: '生成评估报告与总编审意见…' },
        { pct: 99, msg: '打包完成！' },
      ]
    : progressStages;

  const stages = USE_MULTI_AGENT ? multiAgentStages : progressStages;

  // SSE 实时进度模式
  if (USE_SSE) {
    const response = await fetch(`${API_BASE}/generate-multi-agent-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, styleName, scriptCount, direction: direction || 'legend' }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `服务器错误 (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'progress') {
              onProgress?.(data);
            } else if (currentEvent === 'done') {
              finalResult = data;
            } else if (currentEvent === 'error') {
              throw new Error(data.error || '生成失败');
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e;
          }
          currentEvent = '';
        }
      }
    }

    if (!finalResult) throw new Error('未收到生成结果');

    onProgress?.({ pct: 100, msg: '生成完成！' });
    const formatted = formatResult(finalResult, scriptCount, styleName);
    formatted._architect = finalResult._architect;
    formatted._characterDesign = finalResult._characterDesign;
    formatted._polishResult = finalResult._polishResult;
    formatted._evaluationReport = finalResult._evaluationReport;
    formatted._showrunner = finalResult._showrunner;
    formatted._meta = finalResult._meta;
    return formatted;
  }

  // 普通模式（fallback）
  let stageIdx = 0;
  const progressInterval = setInterval(() => {
    if (stageIdx < stages.length) {
      onProgress?.(stages[stageIdx]);
      stageIdx++;
    }
  }, 1000);

  try {
    const endpoint = USE_MULTI_AGENT
      ? `${API_BASE}/generate-multi-agent`
      : `${API_BASE}/generate`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, styleName, scriptCount, direction: direction || 'legend' }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `服务器错误 (${response.status})`);
    }

    const aiResult = await response.json();
    clearInterval(progressInterval);
    onProgress?.({ pct: 100, msg: '生成完成！' });

    const formatted = formatResult(aiResult, scriptCount, styleName);
    if (USE_MULTI_AGENT && aiResult._architect) {
      formatted._architect = aiResult._architect;
      formatted._characterDesign = aiResult._characterDesign;
      formatted._polishResult = aiResult._polishResult;
      formatted._evaluationReport = aiResult._evaluationReport;
      formatted._showrunner = aiResult._showrunner;
      formatted._meta = aiResult._meta;
    }
    return formatted;
  } catch (err) {
    clearInterval(progressInterval);
    throw err;
  }
}
