import { useEffect, useState, useRef, useCallback } from 'react';
import useAppStore from '../store/useAppStore';
import { generateScript } from '../data/scriptGenerator';

// 模拟打磨的台词素材
const polishLines = [
  { draft: '我不会放弃的。', polished: '死磕到所有人都觉得你疯了，就对了。' },
  { draft: '这次创业太难了。', polished: '不是路难走，是走在前面的人本来就少。' },
  { draft: '谢谢你相信我。', polished: '这份信任，我用命还。' },
  { draft: '我们一定能成功。', polished: '不是能不能的问题，是多久的问题。' },
  { draft: '那时候真的撑不下去了。', polished: '最黑的时候，光才最亮。' },
  { draft: '我做了一个艰难的决定。', polished: '要么认输回家，要么把天捅个窟窿。' },
];

export default function Generating() {
  const { answers, selectedDirection, scriptCount, setResult, setStep } = useAppStore();
  const [stage, setStage] = useState({ pct: 0, msg: '正在连接 AI 编剧…' });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // 台词打磨动画状态
  const [polishIdx, setPolishIdx] = useState(0);
  const [revealChars, setRevealChars] = useState(0);
  const polishInterval = useRef(null);

  // 判断是否处于润色阶段
  const isPolishing = stage.pct >= 55 && stage.pct <= 75;
  const currentDraftLine = polishLines[polishIdx % polishLines.length];

  const startPolishAnim = useCallback(() => {
    setPolishIdx(0);
    setRevealChars(0);
    // 每 3.5 秒切换一句台词
    polishInterval.current = setInterval(() => {
      setPolishIdx((prev) => {
        setRevealChars(0);
        return prev + 1;
      });
    }, 3500);
  }, []);

  const stopPolishAnim = useCallback(() => {
    if (polishInterval.current) {
      clearInterval(polishInterval.current);
      polishInterval.current = null;
    }
  }, []);

  // 打字机逐字显示
  useEffect(() => {
    if (!isPolishing || !currentDraftLine) return;
    const len = currentDraftLine.polished.length;
    let charIdx = 0;
    const timer = setInterval(() => {
      charIdx++;
      setRevealChars(charIdx);
      if (charIdx >= len) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, [polishIdx, isPolishing, currentDraftLine]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const result = await generateScript(answers, '企业家励志型', scriptCount, selectedDirection, (s) => {
          if (!cancelled) {
            setStage(s);
            // 进入润色阶段时启动动画
            if (s.pct >= 55 && s.pct <= 75 && !polishInterval.current) {
              startPolishAnim();
            }
            // 离开润色阶段时停止动画
            if (s.pct > 75 && polishInterval.current) {
              stopPolishAnim();
            }
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
      <div className="min-h-screen flex flex-col items-center px-6" style={{ background: 'hsl(var(--background))', paddingTop: '15vh' }}>
        <div className="w-full max-w-sm text-center anim-fade-in">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'hsl(var(--primary))' }}>生成失败</h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setStep('questionFlow')} className="btn-secondary">← 返回修改</button>
            <button onClick={() => window.location.reload()} className="btn-primary">重试</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6" style={{ background: 'hsl(var(--background))', paddingTop: '18vh' }}>
      <div className="w-full max-w-sm text-center">
        <div className="mb-10">
          <div className="text-7xl mb-5">{done ? '✦' : '🎬'}</div>
          <p className="text-sm anim-pulse" style={{ color: 'hsl(var(--primary))' }}>{done ? '你的传奇已就绪' : 'AI 正在创作你的传奇…'}</p>
        </div>
        <div className="progress-bar mb-3"><div className="progress-fill" style={{ width: `${Math.max(stage.pct || 0, 2)}%` }} /></div>
        <p className="text-xs mb-8" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>{Math.round(stage.pct || 0)}%</p>
        <div className="card p-8 mb-8">
          <p className="text-base font-bold mb-4" style={{ color: done ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>{stage.msg || '正在连接 AI 编剧…'}</p>

          {/* SSE 实时预览：展示 Agent 产出片段 */}
          {!done && stage.preview && (
            <div className="text-xs mt-4 p-3 rounded-lg anim-fade-in" style={{ background: 'hsl(var(--primary) / 0.04)', border: '1px solid hsl(var(--primary) / 0.1)' }}>
              {stage.preview.oneLine && (
                <p className="mb-2" style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>「{stage.preview.oneLine}」</p>
              )}
              {stage.preview.theme && (
                <p className="mb-1" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>主题：{stage.preview.theme}</p>
              )}
              {stage.preview.protagonist && (
                <p className="mb-1" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>主角：{stage.preview.protagonist} · {stage.preview.supportingCount}位配角</p>
              )}
              {stage.preview.episodeCount && (
                <p className="mb-1" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>已生成 {stage.preview.episodeCount} 集大纲</p>
              )}
              {stage.preview.goldLines && (
                <div>
                  {stage.preview.goldLines.map((l, i) => (
                    <p key={i} className="mb-0.5" style={{ color: 'hsl(var(--primary) / 0.7)', fontStyle: 'italic' }}>"{l}"</p>
                  ))}
                </div>
              )}
              {stage.preview.sampleChange && (
                <p className="mb-1" style={{ color: 'hsl(var(--primary) / 0.7)' }}>润色：{stage.preview.sampleChange}</p>
              )}
              {stage.preview.grade && (
                <p className="mb-1" style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>综合评级 {stage.preview.grade} · {stage.preview.topStrength}</p>
              )}
              {stage.preview.verdict && (
                <p className="mb-1" style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>
                  {stage.preview.verdict === 'GREENLIGHT' ? '🟢' : stage.preview.verdict === 'YELLOW' ? '🟡' : '🔴'} {stage.preview.verdict} — {stage.preview.pitch}
                </p>
              )}
              {stage.preview.directorNote && (
                <p className="mt-2" style={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontStyle: 'italic' }}>"{stage.preview.directorNote}"</p>
              )}
            </div>
          )}

          {/* 台词打磨动画（非 SSE 模式兼容） */}
          {!done && isPolishing && !stage.preview && (
            <div className="polish-stage">
              <div className="text-xs mb-3 anim-pulse" style={{ color: 'hsl(var(--primary))' }}>✦ AI 正在打磨台词质感…</div>
              <div className="polish-draft mb-3">
                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>草稿 →</span>
                <span className="polish-strikethrough">{currentDraftLine?.draft}</span>
              </div>
              <div className="polish-result">
                <span className="text-xs" style={{ color: 'hsl(var(--primary) / 0.6)' }}>成品 →</span>
                <span className="polish-typewriter">
                  {currentDraftLine?.polished.slice(0, revealChars)}
                  <span className="polish-cursor">|</span>
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="polish-dot"
                    style={{
                      background: i <= (polishIdx % polishLines.length) ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      boxShadow: i === (polishIdx % polishLines.length) ? '0 0 6px hsl(var(--primary) / 0.6)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 非润色非预览的通用提示 */}
          {!done && !isPolishing && !stage.preview && (
            <p className="text-xs mt-4 anim-pulse" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>正在精心打磨每一句台词…</p>
          )}
        </div>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>30集首次生成约需 5-10 分钟，六位 AI 编剧接力创作中</p>
      </div>
    </div>
  );
}
