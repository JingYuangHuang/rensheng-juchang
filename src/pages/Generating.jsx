import { useEffect, useState, useRef, useCallback } from 'react';
import useAppStore from '../store/useAppStore';
import { generateScript } from '../data/scriptGenerator';

const C = (k, a) => a != null ? `hsl(var(--${k}) / ${a})` : `hsl(var(--${k}))`;

const polishLines = [
  { draft: '我不会放弃的。', polished: '死磕到所有人都觉得你疯了，就对了。' },
  { draft: '这次创业太难了。', polished: '不是路难走，是走在前面的人本来就少。' },
  { draft: '谢谢你相信我。', polished: '这份信任，我用命还。' },
  { draft: '我们一定能成功。', polished: '不是能不能的问题，是多久的问题。' },
  { draft: '那时候真的撑不下去了。', polished: '最黑的时候，光才最亮。' },
  { draft: '我做了一个艰难的决定。', polished: '要么认输回家，要么把天捅个窟窿。' },
];

const agentPipeline = [
  { id: 'architect', label: '故事架构师', icon: '🏗️' },
  { id: 'designer', label: '人物设计师', icon: '🎨' },
  { id: 'writer', label: '剧本写手', icon: '✍️' },
  { id: 'expander', label: '剧集扩展', icon: '📚' },
  { id: 'polisher', label: '台词润色师', icon: '💎' },
  { id: 'evaluator', label: '剧本评估师', icon: '📊' },
  { id: 'showrunner', label: '总编审', icon: '🎬' },
];

export default function Generating() {
  const { answers, selectedDirection, scriptCount, setResult, setStep } = useAppStore();
  const [stage, setStage] = useState({ pct: 0, msg: '正在连接 AI 编剧…' });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const isPolishing = stage.pct >= 55 && stage.pct <= 75;
  const [polishIdx, setPolishIdx] = useState(0);
  const [revealChars, setRevealChars] = useState(0);
  const polishInterval = useRef(null);
  const currentDraftLine = polishLines[polishIdx % polishLines.length];

  const startPolishAnim = useCallback(() => {
    setPolishIdx(0);
    setRevealChars(0);
    polishInterval.current = setInterval(() => {
      setPolishIdx((prev) => { setRevealChars(0); return prev + 1; });
    }, 3500);
  }, []);

  const stopPolishAnim = useCallback(() => {
    if (polishInterval.current) { clearInterval(polishInterval.current); polishInterval.current = null; }
  }, []);

  useEffect(() => {
    if (!isPolishing || !currentDraftLine) return;
    const len = currentDraftLine.polished.length;
    let charIdx = 0;
    const timer = setInterval(() => { charIdx++; setRevealChars(charIdx); if (charIdx >= len) clearInterval(timer); }, 60);
    return () => clearInterval(timer);
  }, [polishIdx, isPolishing, currentDraftLine]);

  // 计算当前 Agent 状态
  const currentStage = stage.stage || '';
  const currentAgentIdx = agentPipeline.findIndex(a => a.id === currentStage);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const result = await generateScript(answers, '企业家励志型', scriptCount, selectedDirection, (s) => {
          if (!cancelled) {
            setStage(s);
            if (s.pct >= 55 && s.pct <= 75 && !polishInterval.current) startPolishAnim();
            if (s.pct > 75 && polishInterval.current) stopPolishAnim();
          }
        });
        stopPolishAnim();
        if (!cancelled) { setDone(true); setTimeout(() => { if (!cancelled) { setResult(result); setStep('result'); } }, 800); }
      } catch (err) { stopPolishAnim(); if (!cancelled) { console.error(err); setError(err.message || '未知错误'); } }
    }
    run();
    return () => { cancelled = true; stopPolishAnim(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center px-6" style={{ background: C('background'), paddingTop: '15vh' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-lg font-bold mb-3" style={{ color: C('primary') }}>生成失败</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: C('muted-foreground') }}>{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setStep('questionFlow')} className="btn-secondary">← 返回修改</button>
            <button onClick={() => window.location.reload()} className="btn-primary">重试</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6" style={{ background: C('background'), paddingTop: '14vh' }}>
      <div className="w-full max-w-lg text-center">
        {/* 图标 */}
        <div className="mb-8 anim-fade-in">
          {done ? (
            <div className="text-6xl anim-fade-scale">✦</div>
          ) : (
            <div className="text-6xl anim-float">🎬</div>
          )}
          <p className="text-sm mt-4 anim-pulse" style={{ color: C('primary') }}>
            {done ? '你的传奇已就绪' : 'AI 正在创作你的传奇…'}
          </p>
        </div>

        {/* 进度条 */}
        <div className="progress-bar mb-2" style={{ height: '4px' }}>
          <div className="progress-fill" style={{ width: `${Math.max(stage.pct || 0, 2)}%` }} />
        </div>
        <p className="text-xs mb-8" style={{ color: C('muted-foreground', 0.5) }}>{Math.round(stage.pct || 0)}%</p>

        {/* Agent 流水线可视化 */}
        {!done && (
          <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
            {agentPipeline.map((agent, i) => {
              const isCompleted = currentAgentIdx > i;
              const isActive = currentAgentIdx === i && stage.pct > 0;
              return (
                <div key={agent.id}
                  className={`pipeline-node ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}>
                  <span>{agent.icon}</span>
                  <span className="hidden sm:inline">{agent.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 主卡片 */}
        <div className="glass-card p-8 mb-8" style={{ borderColor: C('primary', 0.12) }}>
          <p className="text-base font-bold mb-4" style={{ color: done ? C('primary') : C('foreground') }}>
            {done ? '✦ 创作完成' : stage.msg || '正在连接 AI 编剧…'}
          </p>

          {/* SSE 实时预览 */}
          {!done && stage.preview && (
            <div className="text-xs mt-4 p-4 rounded-lg anim-fade-scale" style={{ background: C('primary', 0.04), border: `1px solid ${C('primary', 0.1)}` }}>
              {stage.preview.oneLine && (
                <p className="mb-2" style={{ color: C('primary'), fontWeight: 700 }}>「{stage.preview.oneLine}」</p>
              )}
              {stage.preview.theme && (
                <p className="mb-1" style={{ color: C('muted-foreground', 0.7) }}>主题：{stage.preview.theme}</p>
              )}
              {stage.preview.protagonist && (
                <p className="mb-1" style={{ color: C('muted-foreground', 0.7) }}>主角：{stage.preview.protagonist} · {stage.preview.supportingCount}位配角</p>
              )}
              {stage.preview.episodeCount && (
                <p className="mb-1" style={{ color: C('muted-foreground', 0.7) }}>已生成 {stage.preview.episodeCount} 集大纲</p>
              )}
              {stage.preview.goldLines && stage.preview.goldLines.map((l, i) => (
                <p key={i} style={{ color: C('primary', 0.7), fontStyle: 'italic' }}>"{l}"</p>
              ))}
              {stage.preview.sampleChange && (
                <p style={{ color: C('primary', 0.7) }}>润色：{stage.preview.sampleChange}</p>
              )}
              {stage.preview.grade && (
                <p style={{ color: C('primary'), fontWeight: 700 }}>评级 {stage.preview.grade} · {stage.preview.topStrength}</p>
              )}
              {stage.preview.verdict && (
                <p style={{ color: C('primary'), fontWeight: 700 }}>
                  {stage.preview.verdict === 'GREENLIGHT' ? '🟢' : stage.preview.verdict === 'YELLOW' ? '🟡' : '🔴'} {stage.preview.verdict}
                </p>
              )}
              {stage.preview.directorNote && (
                <p className="mt-2" style={{ color: C('foreground'), fontWeight: 600, fontStyle: 'italic' }}>"{stage.preview.directorNote}"</p>
              )}
            </div>
          )}

          {/* 台词打磨动画 */}
          {!done && isPolishing && !stage.preview && (
            <div className="polish-stage">
              <div className="text-xs mb-3 anim-pulse" style={{ color: C('primary') }}>✦ AI 正在打磨台词质感…</div>
              <div className="polish-draft mb-3">
                <span className="text-xs" style={{ color: C('muted-foreground', 0.4) }}>草稿 →</span>
                <span className="polish-strikethrough">{currentDraftLine?.draft}</span>
              </div>
              <div className="polish-result">
                <span className="text-xs" style={{ color: C('primary', 0.6) }}>成品 →</span>
                <span className="polish-typewriter">
                  {currentDraftLine?.polished.slice(0, revealChars)}
                  <span className="polish-cursor">|</span>
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="polish-dot"
                    style={{
                      background: i <= (polishIdx % polishLines.length) ? C('primary') : C('border'),
                      boxShadow: i === (polishIdx % polishLines.length) ? `0 0 6px ${C('primary', 0.6)}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 通用提示 */}
          {!done && !isPolishing && !stage.preview && (
            <p className="text-xs mt-4 anim-pulse" style={{ color: C('muted-foreground', 0.5) }}>六位 AI 编剧接力创作中…</p>
          )}
        </div>

        <p className="text-xs" style={{ color: C('muted-foreground', 0.35) }}>
          {done ? '正在跳转结果页…' : `6位AI编剧接力 · ${scriptCount}集约需3-8分钟`}
        </p>
      </div>
    </div>
  );
}
