import OpenAI from 'openai';
import { jsonrepair } from 'jsonrepair';

let _client = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
  }
  return _client;
}

const MODEL = () => process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

/**
 * JSON 解析：4 层兜底策略
 */
function robustParse(raw) {
  let cleaned = raw.trim();

  const codeBlockMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();

  const fb = cleaned.indexOf('{');
  const lb = cleaned.lastIndexOf('}');
  if (fb >= 0 && lb > fb) cleaned = cleaned.slice(fb, lb + 1);

  function tryRepair(txt, label) {
    try {
      const repaired = jsonrepair(txt);
      const obj = JSON.parse(repaired);
      return { ok: true, result: obj, method: `jsonrepair${label ? ' + ' + label : ''}` };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  let parsed = tryRepair(cleaned);
  if (parsed.ok) return parsed;

  const fixed1 = cleaned.replace(/,(\s*[}\]])/g, '$1');
  parsed = tryRepair(fixed1, '去尾逗号');
  if (parsed.ok) return parsed;

  const fixed2 = cleaned.replace(/(?<=: ")([\s\S]*?)(?=")/g, (m) =>
    m.replace(/\n/g, '\\n').replace(/\r/g, '').replace(/\t/g, '\\t')
  );
  parsed = tryRepair(fixed2, '转义换行');
  if (parsed.ok) return parsed;

  console.error('   ⚠️ 所有修复策略失败，尝试逐字段提取...');
  try {
    const extractStr = (key) => {
      const re = new RegExp('"' + key + '"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"', 's');
      const m = cleaned.match(re);
      return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
    };
    const extractObj = (key) => {
      const startRe = new RegExp('"' + key + '"\\s*:\\s*\\{');
      const start = cleaned.match(startRe);
      if (!start) return {};
      let idx = start.index + start[0].length - 1;
      let depth = 1;
      let end = idx + 1;
      while (depth > 0 && end < cleaned.length) {
        if (cleaned[end] === '{') depth++;
        else if (cleaned[end] === '}') depth--;
        end++;
      }
      try { return JSON.parse(jsonrepair(cleaned.slice(idx, end))); } catch { return {}; }
    };
    const extractArr = (key) => {
      const startRe = new RegExp('"' + key + '"\\s*:\\s*\\[');
      const start = cleaned.match(startRe);
      if (!start) return [];
      let idx = start.index + start[0].length - 1;
      let depth = 1;
      let end = idx + 1;
      while (depth > 0 && end < cleaned.length) {
        if (cleaned[end] === '[') depth++;
        else if (cleaned[end] === ']') depth--;
        end++;
      }
      try { return JSON.parse(jsonrepair(cleaned.slice(idx, end))); } catch { return []; }
    };

    const fields = {};
    const keyRe = /"(\w+)"\s*:/g;
    let m;
    while ((m = keyRe.exec(cleaned)) !== null) {
      const key = m[1];
      if (fields[key] !== undefined) continue;
      const arr = extractArr(key);
      if (arr.length > 0) { fields[key] = arr; continue; }
      const obj = extractObj(key);
      if (Object.keys(obj).length > 0) { fields[key] = obj; continue; }
      fields[key] = extractStr(key);
    }

    return { ok: true, result: fields, method: '逐字段提取' };
  } catch (e) {
    console.error('   ❌ 逐字段提取也失败:', e.message);
    return { ok: false, error: '所有解析策略均失败: ' + e.message };
  }
}

/**
 * Agent 基类
 */
export class BaseAgent {
  constructor({ name, role, systemPrompt }) {
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
  }

  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }

  async call(userMessage, options = {}) {
    const { temperature = 0.7, maxTokens = 8192, timeout = 90000 } = options;

    this.log(`📡 调用 DeepSeek (${MODEL()})...`);

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODEL(),
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      timeout,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`${this.name}: DeepSeek 返回空内容`);
    }

    this.log(`📝 响应长度: ${content.length} 字符`);

    const parsed = robustParse(content);
    if (!parsed.ok) {
      console.error(`${this.name} 解析失败:`, parsed.error);
      console.error('   原始末尾 300 字符:', content.slice(-300));
      throw new Error(`${this.name}: 响应无法解析为 JSON - ${parsed.error}`);
    }

    this.log(`✅ 解析成功 (${parsed.method})`);
    return { result: parsed.result, tokens: completion.usage?.total_tokens || 0 };
  }
}

export { robustParse, getClient, MODEL };
