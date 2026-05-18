# 传奇剧场 · 项目上下文

## 产品定位
AI 短剧剧本生成平台，将企业家真实创业经历转化为短剧剧本。
面向创始人/企业家，输出可用于拍摄的完整剧本 + 人物小传 + 商业评估。

## 技术栈
- 前端: React 19 + Vite 8 + TailwindCSS 4 + Zustand 5
- 后端: Express 5 + OpenAI SDK → DeepSeek API (deepseek-v4-flash)
- 导出: jsPDF 4 + html2canvas 1.4 + docx 9.6
- JSON 解析: jsonrepair 3.14 (4层兜底)

## 核心架构

### 用户流程
landing → directionSelect → questionFlow(19题) → generating(SSE实时进度) → result(10+标签页)

### 6 Agent 编剧流水线 (server/agents/)
① 故事架构师(story-architect) → ② 人物设计师(character-designer) → ③ 剧本写手(script-writer)
→ ④ 台词润色师(dialogue-polisher) → ⑤ 剧本评估师(script-evaluator) → ⑥ 总编审(showrunner)
编排器: pipeline.js | 基类: base-agent.js

### 关键端点
- POST /api/generate-multi-agent-stream (SSE 实时流，主要用这个)
- POST /api/generate-multi-agent (普通 JSON，fallback)
- POST /api/generate (单 Agent 旧版)
- POST /api/followup (AI 追问)
- GET /api/health

### 前端开关
src/data/scriptGenerator.js:
- USE_MULTI_AGENT: true/false（切多/单 Agent）
- USE_SSE: true/false（切实时/模拟进度）

### 状态管理
src/store/useAppStore.js — Zustand: step, selectedDirection, answers, result, scriptCount

### UI 体系
- CSS 变量: hsl(var(--primary)) / hsl(var(--background)) 等
- 组件类: glass-card, gold-btn, btn-primary, btn-secondary, input-line, progress-bar, step-dot
- 页面文件: src/pages/*.jsx

## 用户偏好
- 风格: 暗金色调、玻璃态、精致大气
- 决策: 默认同意，不等确认直接推进
- 沟通: 中文，直接给结果，少说废话
- 审美参考: Kimi 前端设计风格
- 不纠结移动端适配，先验证 PC 端

## 启动命令
```bash
node server.js &     # 后端 :3001
npx vite --host      # 前端 :5173
```

## 已知遗留问题
- 结果页只能看第1集剧本，缺集数选择器
- 没有 localStorage 持久化，刷新丢失
- 定价页没有购买/预约入口
- Agent 失败只能整体降级，不能单独重试
