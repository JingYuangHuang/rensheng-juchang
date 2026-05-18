import { useState, useRef, useEffect, useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import { getQuestionLayers } from '../data/questions';

const API_BASE = '/api';

const layerMeta = {
  1: { emoji: '🌱', label: '起点', color: '#c8953b' },
  2: { emoji: '⚡', label: '转折', color: '#d4a853' },
  3: { emoji: '💧', label: '情感', color: '#c8953b' },
  4: { emoji: '⭐', label: '精神', color: '#d4a853' },
};

// 回答质量评估
function getQuality(len) {
  if (len < 20) return { level: 0, emoji: '👀', text: '再补充一些细节，剧本会更精彩', color: 'hsl(var(--muted-foreground) / 0.5)' };
  if (len < 60) return { level: 1, emoji: '✦', text: '不错，继续', color: 'hsl(var(--primary) / 0.5)' };
  if (len < 150) return { level: 2, emoji: '✦✦', text: '这个回答很好，AI 能写出彩', color: 'hsl(var(--primary) / 0.7)' };
  return { level: 3, emoji: '✦✦✦', text: '非常丰满！剧本会很有质感', color: 'hsl(var(--primary))' };
}

export default function QuestionFlow() {
  const { answers, selectedDirection, currentQuestionIdx, setAnswer, nextQuestion, prevQuestion, setStep } = useAppStore();

  const questionLayers = useMemo(() => getQuestionLayers('a', selectedDirection), [selectedDirection]);
  const allQuestions = useMemo(() => questionLayers.flatMap((l) => l.questions.map((q) => ({ ...q, layer: l.layer, layerTitle: l.title }))), [questionLayers]);
  const [input, setInput] = useState('');
  const [followUpQ, setFollowUpQ] = useState('');       // AI 追问的问题
  const [followUpA, setFollowUpA] = useState('');       // 用户对追问的回答
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [quality, setQuality] = useState(null);          // 提交后的质量反馈
  const inputRef = useRef(null);
  const followUpRef = useRef(null);
  const total = allQuestions.length;
  const currentQ = allQuestions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / total) * 100;
  const isLast = currentQuestionIdx === total - 1;
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const meta = { ...(layerMeta[currentQ?.layer] || layerMeta[1]), label: currentQ?.layerTitle || layerMeta[currentQ?.layer]?.label }; // 使用题库中的动态标题

  useEffect(() => { inputRef.current?.focus(); }, [currentQuestionIdx]);
  useEffect(() => {
    const saved = answers[currentQ?.id] || '';
    /* eslint-disable react-hooks/set-state-in-effect */
    setInput(saved);
    setShowFollowUp(false);
    setFollowUpQ('');
    setFollowUpA('');
    setQuality(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIdx]);

  // AI 生成追问
  const fetchFollowUp = async (qText, answerText) => {
    setFollowUpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qText, answer: answerText }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowUpQ(data.followUp || '');
      }
    } catch {
      // 追问失败不阻断，静默处理
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    // 先保存主回答，追问补充在 skipFollowUp 时追加
    setAnswer(currentQ.id, input.trim());
    setQuality(getQuality(input.length));
    setShowFollowUp(true);
    // 触发 AI 追问（异步，不阻塞）
    fetchFollowUp(currentQ.q, input.trim());
    // 最后一题也等待用户处理追问，不自动跳转
  };

  const skipFollowUp = (dir) => {
    // 如果有追问补充，追加到回答中
    if (followUpA.trim()) {
      const existing = answers[currentQ.id] || '';
      setAnswer(currentQ.id, `${existing}\n\n[追问补充] ${followUpA.trim()}`);
    }
    setShowFollowUp(false);
    setFollowUpQ('');
    setFollowUpA('');
    if (dir === 'next') { setInput(''); nextQuestion(); }
    else if (dir === 'finish') setStep('generating');
  };

  const finish = () => { handleSubmit('finish'); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); isLast ? finish() : handleSubmit('next'); }
  };

  if (!currentQ) return null;

  return (
    <div className="min-h-screen flex flex-col items-center px-6" style={{ background: 'hsl(var(--background))', paddingTop: '8vh' }}>
      <div className="w-full max-w-lg">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-0 mb-16">
          {['创作方向', '回答问题', '生成剧本'].map((label, i) => (
            <span key={i} className="flex items-center gap-0">
              <span className={`step-dot ${i <= 1 ? 'completed' : ''}`} />
              {i < 2 && <span className={`step-line ${i < 1 ? 'active' : ''}`} />}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-12 mb-14" style={{ marginTop: '-8px' }}>
          {['创作方向', '回答问题', '生成剧本'].map((label, i) => (
            <span key={i} className="text-xs font-bold" style={{ color: i <= 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)' }}>{label}</span>
          ))}
        </div>

        {/* 进度 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="tag" style={{ background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))' }}>
              {meta.emoji} {meta.label} · 第 {currentQ.layer}/4 层
            </span>
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px', fontWeight: 700 }}>
              {currentQuestionIdx + 1}<span style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>/{total}</span>
            </span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>

        {/* 问题卡片 */}
        <div className="glass-card p-8 mb-6 anim-fade-up" key={currentQ.id}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black mb-5"
            style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>{currentQ.id}</div>
          <h3 className="text-xl font-bold mb-6 leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>{currentQ.q}</h3>

          {/* 未提交状态：输入框 */}
          {!showFollowUp && (
            <>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={currentQ.placeholder} rows={4} className="input-line" />
              <div className="flex items-center justify-between mt-5">
                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>✦ 细节越多剧本越精彩 · Enter 提交</span>
                <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.35)' }}>{input.length} 字</span>
              </div>
            </>
          )}

          {/* 已提交状态：质量反馈 + AI 追问 */}
          {showFollowUp && (
            <div className="anim-fade-in">
              {/* 质量指示灯 */}
              {quality && (
                <div className="flex items-center gap-2 mb-5 p-3 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.04)', border: '1px solid hsl(var(--primary) / 0.08)' }}>
                  <span className="text-lg">{quality.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: quality.color }}>{quality.text}</span>
                  {quality.level >= 2 && (
                    <span className="ml-auto text-xs" style={{ color: 'hsl(var(--primary) / 0.5)' }}>剧本素材+1</span>
                  )}
                </div>
              )}

              {/* AI 追问区域 */}
              <div className="p-4 rounded-lg mb-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                {followUpLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs anim-pulse" style={{ color: 'hsl(var(--primary) / 0.6)' }}>AI 正在思考追问…</span>
                  </div>
                ) : (
                  <>
                    {followUpQ ? (
                      <>
                        <p className="text-xs font-bold mb-1" style={{ color: 'hsl(var(--primary))' }}>💡 AI 追问</p>
                        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>{followUpQ}</p>
                      </>
                    ) : (
                      <p className="text-xs mb-2" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>你的回答已记录 ✦</p>
                    )}
                    <textarea
                      ref={followUpRef}
                      value={followUpA}
                      onChange={(e) => setFollowUpA(e.target.value)}
                      placeholder={followUpQ ? '展开说说…（可选）' : '还想补充什么吗？（可选）'}
                      rows={2}
                      className="input-line"
                      style={{ fontSize: '14px' }}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 mb-8">
          {showFollowUp ? (
            <>
              <button onClick={() => skipFollowUp(isLast ? 'finish' : 'next')} className="btn-secondary flex-1 text-sm">
                {followUpA.trim() ? '保存追问 →' : '跳过 →'}
              </button>
            </>
          ) : (
            <>
              {currentQuestionIdx > 0 && (
                <button onClick={() => prevQuestion()} className="btn-secondary flex-1">← 上一题</button>
              )}
              {isLast ? (
                <button onClick={finish} disabled={!input.trim()} className="btn-primary flex-1 text-base"><span>✦ 提交，生成剧本</span></button>
              ) : (
                <button onClick={() => handleSubmit('next')} disabled={!input.trim()} className="btn-primary flex-1"><span>下一题 →</span></button>
              )}
            </>
          )}
        </div>

        {/* 编号导航 */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {allQuestions.map((q, idx) => {
            const filled = answers[q.id]?.trim();
            const isCurrent = idx === currentQuestionIdx;
            return (
              <button key={q.id}
                onClick={() => { setAnswer(currentQ.id, input); useAppStore.getState().setCurrentQuestionIdx(idx); }}
                className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: filled ? 'hsl(var(--primary) / 0.12)' : isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                  color: filled ? 'hsl(var(--primary))' : isCurrent ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                  border: filled ? '1px solid hsl(var(--primary) / 0.25)' : isCurrent ? 'none' : '1px solid hsl(var(--border))'
                }}>
                {q.id}
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>已回答 {answeredCount}/{total} · 点击编号可跳转</p>
        <button onClick={() => setStep('directionSelect')} className="block mx-auto mt-6 text-xs font-bold" style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>
          ← 返回方向选择
        </button>
      </div>
    </div>
  );
}
