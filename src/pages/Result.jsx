import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { EVALUATION_DIMENSIONS, calculateScore } from '../data/evaluationSystem';
import {
  exportCustomerPDF, exportCustomerDOCX,
  exportInternalPDF, exportInternalDOCX,
} from '../utils/exportScript';
import CheckoutModal from '../components/CheckoutModal';

const C = (k, a) => a != null ? `hsl(var(--${k}) / ${a})` : `hsl(var(--${k}))`;

const dimLabels = {
  goldOpening: '黄金开场', rhythmDesign: '节奏设计', emotionalValue: '情绪价值',
  suspenseHook: '悬念钩子', outlineStructure: '大纲结构', dialogueQuality: '台词质量',
  characterGrowth: '人物成长', logicCheck: '逻辑纠错',
};

const tabs = [
  { key: 'synopsis', label: '📖 故事梗概' },
  { key: 'characters', label: '👤 人物小传' },
  { key: 'outline', label: '📋 分集大纲' },
  { key: 'script', label: '✍️ 剧本样章' },
  { key: 'evaluation', label: '📊 评估报告' },
  { key: 'showrunner', label: '🎬 总编审', requires: '_showrunner' },
  { key: 'architect', label: '📋 架构分析', requires: '_architect' },
  { key: 'characterDesign', label: '🎭 人物设计', requires: '_characterDesign' },
  { key: 'notes', label: '💡 创作笔记' },
  { key: 'commercial', label: '💰 商业化' },
];

function ScoreBar({ label, score }) {
  const color = score >= 8 ? C('primary') : score >= 6 ? C('primary', 0.7) : '#a02020';
  return (
    <div className="score-row">
      <span className="score-label" style={{ color: C('muted-foreground') }}>{label}</span>
      <div className="score-track"><div className="score-fill" style={{ width: `${(score / 10) * 100}%`, background: color }} /></div>
      <span className="score-num">{score}</span>
    </div>
  );
}

/** 带样式的 Markdown 式文本行 */
function ContentBlock({ content, className = '' }) {
  if (!content) return null;
  const lines = content.split('\n').filter(Boolean);
  return (
    <div className={`space-y-2 ${className}`}>
      {lines.map((line, i) => {
        if (line.startsWith('【') && line.includes('】')) {
          return <p key={i} className="text-sm font-bold mt-4 mb-2 first:mt-0" style={{ color: C('primary') }}>{line}</p>;
        }
        if (line.startsWith('━━') || line.startsWith('——')) {
          return <div key={i} className="divider my-1" />;
        }
        return (
          <p key={i} className="text-sm leading-relaxed" style={{ color: C('muted-foreground', 0.85) }}>
            {line.startsWith('-') ? <span className="inline-block w-3" /> : null}
            {line}
          </p>
        );
      })}
    </div>
  );
}

/** 剧本场景卡片 */
function ScriptCard({ index, time, location, content }) {
  return (
    <div className="glass-card p-5 mb-3 anim-fade-in" style={{ borderLeft: `3px solid ${C('primary', 0.3)}` }}>
      <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: C('muted-foreground', 0.6) }}>
        <span className="font-bold" style={{ color: C('primary') }}>场景 {index + 1}</span>
        {time && <span>🕐 {time}</span>}
        {location && <span>📍 {location}</span>}
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: C('foreground', 0.9), lineHeight: '1.9' }}>{content}</p>
    </div>
  );
}

/** 架构师分析 */
function renderArchitect(arch) {
  if (!arch) return <div className="glass-card p-8"><p style={{ color: C('muted-foreground', 0.7) }}>暂无架构分析数据</p></div>;
  return (
    <div className="space-y-4 anim-fade-in">
      <div className="glass-card p-6" style={{ borderColor: C('primary', 0.2) }}>
        <p className="text-xs font-bold mb-2" style={{ color: C('primary') }}>✦ 核心冲突</p>
        <p className="text-sm font-bold mb-1" style={{ color: C('foreground') }}>{arch.coreConflict?.type || '未分析'}</p>
        <p className="text-sm mb-3" style={{ color: C('muted-foreground', 0.8), lineHeight: '1.8' }}>{arch.coreConflict?.description || ''}</p>
        <div className="flex flex-wrap gap-1.5">
          {(arch.coreConflict?.escalation || []).map((s, i) => (
            <span key={i} className="tag text-xs" style={{ background: C('primary', 0.06), color: C('primary') }}>阶段{i + 1}：{s}</span>
          ))}
        </div>
      </div>
      {arch.threeActStructure && (
        <div className="glass-card p-6">
          <p className="text-xs font-bold mb-4" style={{ color: C('primary') }}>✦ 三幕结构</p>
          {['act1', 'act2', 'act3'].map((act, i) => {
            const a = arch.threeActStructure[act];
            if (!a) return null;
            return (
              <div key={act} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{['🎬', '⚡', '🌟'][i]}</span>
                  <span className="text-sm font-bold" style={{ color: C('foreground') }}>{a.title}</span>
                  <span className="text-xs" style={{ color: C('muted-foreground', 0.5) }}>占{a.durationPct}% · {a.emotion}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-7">
                  {(a.keyEvents || []).map((ev, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded" style={{ background: C('card'), color: C('muted-foreground', 0.7) }}>{ev}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {arch.emotionCurve && (
        <div className="glass-card p-6">
          <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>✦ 情绪曲线</p>
          <div className="flex items-end gap-1 h-24 mb-3">
            {(arch.emotionCurve || []).map((ec, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                <span className="text-[10px] mb-1" style={{ color: C('muted-foreground', 0.5) }}>{ec.emotion}</span>
                <div style={{
                  width: '100%', maxWidth: '24px',
                  height: `${(ec.intensity || 5) * 10}%`,
                  background: `linear-gradient(to top, ${C('primary')}, ${C('primary', 0.3)})`,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s',
                }} />
                <span className="text-[10px] mt-1" style={{ color: C('muted-foreground', 0.4) }}>{ec.point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="glass-card p-6">
        <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>✦ 金句灵感（来自用户原话）</p>
        {(arch.goldenLineSeeds || []).map((l, i) => (
          <p key={i} className="text-sm mb-1 italic" style={{ color: C('foreground'), borderLeft: `2px solid ${C('primary', 0.3)}`, paddingLeft: '12px' }}>"{l}"</p>
        ))}
      </div>
    </div>
  );
}

/** 人物设计 */
function renderCharacterDesign(cd) {
  if (!cd) return <div className="glass-card p-8"><p style={{ color: C('muted-foreground', 0.7) }}>暂无人物设计数据</p></div>;
  return (
    <div className="space-y-4 anim-fade-in">
      {cd.protagonist && (
        <div className="glass-card p-6" style={{ borderColor: C('primary', 0.2) }}>
          <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>✦ 主角 · {cd.protagonist.name}</p>
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div><span style={{ color: C('muted-foreground', 0.5) }}>年龄：</span><span style={{ color: C('foreground') }}>{cd.protagonist.age}</span></div>
            <div><span style={{ color: C('muted-foreground', 0.5) }}>形象：</span><span style={{ color: C('foreground') }}>{cd.protagonist.appearance}</span></div>
            <div><span style={{ color: C('muted-foreground', 0.5) }}>表面想要：</span><span style={{ color: C('foreground') }}>{cd.protagonist.surfaceWant}</span></div>
            <div><span style={{ color: C('muted-foreground', 0.5) }}>内心需要：</span><span style={{ color: C('foreground') }}>{cd.protagonist.deepNeed}</span></div>
          </div>
          {cd.protagonist.voice && <p className="text-xs mb-2"><span style={{ color: C('muted-foreground', 0.5) }}>语言风格：</span><span style={{ color: C('foreground') }}>{cd.protagonist.voice}</span></p>}
          {cd.protagonist.signatureLine && (
            <p className="text-sm italic mt-2 p-2 rounded" style={{ background: C('primary', 0.05), color: C('primary'), borderLeft: `2px solid ${C('primary', 0.3)}` }}>"{cd.protagonist.signatureLine}"</p>
          )}
        </div>
      )}
      {(cd.supporting || []).length > 0 && (
        <div className="glass-card p-6">
          <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>✦ 配角矩阵（{cd.supporting.length}人）</p>
          {cd.supporting.map((s, i) => (
            <div key={i} className="mb-4 last:mb-0 p-3 rounded" style={{ background: C('card') }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold" style={{ color: C('foreground') }}>{s.name}</span>
                <span className="tag text-[10px]" style={{ background: C('primary', 0.08), color: C('primary') }}>{s.function}</span>
              </div>
              <p className="text-xs" style={{ color: C('muted-foreground', 0.8), lineHeight: '1.7' }}>{s.traits?.join(' · ')} | {s.role}</p>
              <p className="text-xs mt-1" style={{ color: C('muted-foreground', 0.6) }}>与主角：{s.relationToProtagonist}</p>
              {s.signatureLine && <p className="text-xs italic mt-1" style={{ color: C('primary', 0.7) }}>"{s.signatureLine}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 总编审 */
function renderShowrunner(sr) {
  if (!sr) return <div className="glass-card p-8"><p style={{ color: C('muted-foreground', 0.7) }}>暂无总编审数据</p></div>;
  const vColor = sr.finalVerdict?.decision === 'GREENLIGHT' ? '#2ecc71' : sr.finalVerdict?.decision === 'YELLOW' ? '#f39c12' : '#e74c3c';
  return (
    <div className="space-y-4 anim-fade-in">
      <div className="glass-card p-6 text-center" style={{ borderColor: C('primary', 0.2) }}>
        <div className="text-5xl mb-3">{sr.finalVerdict?.decision === 'GREENLIGHT' ? '🟢' : sr.finalVerdict?.decision === 'YELLOW' ? '🟡' : '🔴'}</div>
        <p className="text-2xl font-black mb-2" style={{ color: vColor }}>{sr.finalVerdict?.decision || '?'}</p>
        <p className="text-sm mb-3" style={{ color: C('foreground') }}>{sr.finalVerdict?.reason}</p>
        <p className="text-xs" style={{ color: C('muted-foreground', 0.6) }}>下一步：{sr.finalVerdict?.nextStep}</p>
      </div>
      {sr.directorNote && (
        <div className="glass-card p-6" style={{ borderColor: C('primary', 0.15) }}>
          <p className="text-xs font-bold mb-2" style={{ color: C('primary') }}>🎥 导演笔记</p>
          <p className="text-lg font-bold italic" style={{ color: C('foreground') }}>"{sr.directorNote}"</p>
        </div>
      )}
      {sr.oneLinePitch && (
        <div className="glass-card p-6">
          <p className="text-xs font-bold mb-2" style={{ color: C('primary') }}>💼 一句话推荐（给投资人）</p>
          <p className="text-base font-bold" style={{ color: C('foreground') }}>"{sr.oneLinePitch}"</p>
        </div>
      )}
      {sr.marketAnalysis && (
        <div className="glass-card p-6">
          <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>📈 市场分析</p>
          <div className="flex gap-3 mb-3">
            <span className="tag" style={{ background: C('primary', 0.08), color: C('primary') }}>竞争力：{sr.marketAnalysis.competitiveness}</span>
            <span className="tag" style={{ background: C('primary', 0.08), color: C('primary') }}>时机：{sr.marketAnalysis.timing}</span>
          </div>
          <p className="text-xs" style={{ color: C('muted-foreground', 0.8), lineHeight: '1.8' }}>{sr.marketAnalysis.differentiation}</p>
        </div>
      )}
      {sr.platformAdvice && (
        <div className="glass-card p-6" style={{ borderColor: C('primary', 0.12) }}>
          <p className="text-xs font-bold mb-4" style={{ color: C('primary') }}>📱 双平台适配分析</p>
          {['douyin', 'hongguo'].map(platform => {
            const pa = sr.platformAdvice[platform];
            if (!pa) return null;
            const isDouyin = platform === 'douyin';
            const suitabilityColor = pa.suitability === '高' ? '#2ecc71' : pa.suitability === '中' ? '#f39c12' : '#e74c3c';
            return (
              <div key={platform} className="mb-4 last:mb-0 p-4 rounded-lg" style={{ background: C('primary', 0.03) }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{isDouyin ? '🎵' : '🍎'}</span>
                  <span className="text-sm font-bold" style={{ color: C('foreground') }}>{isDouyin ? '抖音' : '红果'}</span>
                  <span className="tag text-[10px]" style={{ background: suitabilityColor + '20', color: suitabilityColor }}>适配度：{pa.suitability}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span style={{ color: '#2ecc71' }}>✓ {pa.strength}</span></div>
                  <div><span style={{ color: '#e74c3c' }}>✗ {pa.weakness}</span></div>
                </div>
                {pa.adjustment && <p className="text-xs mt-2" style={{ color: C('muted-foreground', 0.6) }}>💡 {pa.adjustment}</p>}
              </div>
            );
          })}
          {sr.platformAdvice.recommendation && (
            <div className="mt-3 p-3 rounded-lg text-center" style={{ background: C('primary', 0.06) }}>
              <p className="text-sm font-bold" style={{ color: C('primary') }}>推荐：{sr.platformAdvice.recommendation}</p>
            </div>
          )}
        </div>
      )}
      {sr.consistencyReview && (
        <div className="glass-card p-6">
          <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>🔍 一致性审查</p>
          {Object.entries(sr.consistencyReview).filter(([k]) => k !== 'overallConsistency').map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 mb-2 text-xs">
              <span style={{ color: String(v).startsWith('是') ? '#2ecc71' : C('muted-foreground', 0.6) }}>
                {String(v).startsWith('是') ? '✓' : '⚠'}
              </span>
              <span style={{ color: C('foreground') }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {sr.coreIssue?.hasIssue && (
        <div className="glass-card p-6" style={{ borderColor: '#e74c3c' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#e74c3c' }}>⚠️ 核心问题</p>
          <p className="text-sm font-bold mb-2" style={{ color: C('foreground') }}>{sr.coreIssue.issue}</p>
          <p className="text-xs" style={{ color: C('muted-foreground', 0.8), lineHeight: '1.8' }}>修复方案：{sr.coreIssue.fix}</p>
        </div>
      )}
    </div>
  );
}

export default function Result() {
  const { result, scriptCount, answers, reset, setStep } = useAppStore();
  const [activeTab, setActiveTab] = useState('synopsis');
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [showPricing, setShowPricing] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState({});

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C('background') }}>
        <p style={{ color: C('muted-foreground', 0.7) }}>没有生成结果，请重新开始</p>
      </div>
    );
  }

  const totalScore = Object.values(result.evaluation || {}).reduce((a, b) => a + b, 0);
  const weightedScore = calculateScore(result.evaluation || {});
  const grade = totalScore >= 70 ? 'S+' : totalScore >= 60 ? 'A' : totalScore >= 50 ? 'B' : 'C';

  const renderContent = () => {
    switch (activeTab) {
      case 'synopsis':
        return (
          <div className="space-y-5 anim-fade-in">
            {result.oneLine && (
              <div className="glass-card p-6" style={{ borderColor: C('primary', 0.2) }}>
                <p className="text-xs font-bold mb-2" style={{ color: C('primary') }}>✦ 一句话故事</p>
                <p className="text-lg font-bold" style={{ color: C('foreground') }}>{result.oneLine}</p>
              </div>
            )}
            <div className="glass-card p-8">
              <ContentBlock content={result.synopsis} />
            </div>
          </div>
        );
      case 'characters':
        return (
          <div className="glass-card p-8 anim-fade-in">
            <ContentBlock content={result.characters} />
          </div>
        );
      case 'outline':
        return (
          <div className="glass-card p-8 anim-fade-in">
            <ContentBlock content={result.episodeOutline} />
          </div>
        );
      case 'script': {
        const epScripts = result.allEpisodeScripts;
        const epCount = epScripts ? Object.keys(epScripts).length : 0;
        const isLocked = currentEpisode > 1;
        const currentScript = epScripts?.[String(currentEpisode)];
        return (
          <div className="space-y-4 anim-fade-in">
            {epCount > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {Array.from({ length: epCount }, (_, i) => i + 1).map(ep => {
                  const locked = ep > 1;
                  return (
                    <button key={ep}
                      onClick={() => setCurrentEpisode(ep)}
                      className="px-2.5 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1"
                      style={{
                        background: currentEpisode === ep ? C('primary', 0.12) : C('card'),
                        color: currentEpisode === ep ? C('primary') : C('muted-foreground', 0.7),
                        border: currentEpisode === ep ? `1px solid ${C('primary', 0.3)}` : `1px solid ${C('border')}`,
                        opacity: locked && currentEpisode !== ep ? 0.5 : 1,
                      }}
                    >
                      {locked && currentEpisode !== ep && <span style={{ fontSize: '10px' }}>🔒</span>}
                      {ep === 1 && <span style={{ fontSize: '10px' }}>📖</span>}
                      {ep}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="glass-card p-8 relative" style={{ borderColor: isLocked ? 'hsl(var(--muted) / 0.3)' : C('primary', 0.12) }}>
              <p className="text-xs font-bold mb-4 flex items-center gap-2" style={{ color: C('primary') }}>
                <span>{isLocked ? '🔒' : '📖'}</span>
                第 {currentEpisode} 集 · 《{currentScript?.title || result.scriptSample?.match(/第 \d+ 集 · 《(.+?)》/)?.[1] || ''}》
                {isLocked && <span className="tag text-[10px]" style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>会员专属</span>}
                {!isLocked && <span className="tag text-[10px]" style={{ background: 'rgba(46,204,113,0.12)', color: '#2ecc71' }}>免费预览</span>}
              </p>
              {isLocked ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-5xl mb-4">🔒</div>
                  <p className="text-lg font-bold mb-2" style={{ color: C('foreground') }}>本集已锁定</p>
                  <p className="text-sm mb-6" style={{ color: C('muted-foreground', 0.7) }}>
                    购买套餐即可解锁全部 {epCount} 集完整剧本
                  </p>
                  <button className="gold-btn px-6 py-2 text-sm" onClick={() => setShowPricing(true)}>
                    <span>✦ 查看套餐方案</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(currentScript?.scenesDisplay || currentScript?.rawScenes || []).map((scene, i) => (
                    <ScriptCard key={i} index={i} time={scene.time} location={scene.location} content={scene.content} />
                  ))}
                  {(!currentScript?.scenesDisplay && !currentScript?.rawScenes) && (
                    <pre className="whitespace-pre-wrap font-sans" style={{ color: C('foreground', 0.9), lineHeight: '1.9', fontSize: '14px' }}>
                      {currentScript?.text || result.scriptSample}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'evaluation': {
        const er = result._evaluationReport || {};
        const ds = er.densityScores;
        const cp = er.compliance;
        return (
          <div className="space-y-5 anim-fade-in">
            {/* 评级大卡 */}
            <div className="glass-card p-8 text-center" style={{ borderColor: C('primary', 0.15) }}>
              <div className="text-7xl font-black mb-2 text-shimmer">{grade}</div>
              <p className="text-sm mt-2" style={{ color: C('muted-foreground', 0.6) }}>{scriptCount} 集 · 企业家励志型</p>
              <div className="flex items-center justify-center gap-8 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: C('foreground') }}>{totalScore}</div>
                  <div className="text-[10px]" style={{ color: C('muted-foreground', 0.5) }}>综合 / 80</div>
                </div>
                <div className="w-px h-8" style={{ background: C('border') }} />
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: C('primary') }}>{weightedScore}</div>
                  <div className="text-[10px]" style={{ color: C('muted-foreground', 0.5) }}>加权分</div>
                </div>
              </div>
            </div>

            {/* 八维评估 */}
            {result.evaluation && (
              <div className="glass-card p-8">
                <p className="text-xs font-bold mb-5" style={{ color: C('primary') }}>八维评估详情（含权重）</p>
                {Object.entries(result.evaluation).map(([k, s]) => {
                  const w = EVALUATION_DIMENSIONS[k]?.weight || 1;
                  return <ScoreBar key={k} label={`${dimLabels[k] || k} (×${w})`} score={s} />;
                })}
              </div>
            )}

            {/* 三密度评分 */}
            {ds && (
              <div className="glass-card p-6" style={{ borderColor: C('primary', 0.12) }}>
                <p className="text-xs font-bold mb-4" style={{ color: C('primary') }}>📊 三密度评估</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { key: 'emotional', icon: '🎭', label: '情绪密度', w: 0.4 },
                    { key: 'info', icon: '💬', label: '信息密度', w: 0.3 },
                    { key: 'plot', icon: '📈', label: '情节密度', w: 0.3 },
                  ].map(({ key, icon, label, w }) => (
                    <div key={key} className="text-center p-3 rounded-lg" style={{ background: C('primary', 0.04) }}>
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className="text-2xl font-black" style={{ color: C('primary') }}>{ds[key]?.score || '?'}</div>
                      <div className="text-[10px]" style={{ color: C('muted-foreground', 0.6) }}>{label} ×{w}</div>
                      <div className="text-[10px] mt-1" style={{
                        color: ds[key]?.level === '高' || ds[key]?.level === '极' ? '#2ecc71'
                          : ds[key]?.level === '中' ? '#f39c12' : '#e74c3c',
                      }}>{ds[key]?.level || '?'}</div>
                    </div>
                  ))}
                </div>
                {ds.total != null && (
                  <div className="text-center mb-3">
                    <span className="text-sm font-bold" style={{ color: C('foreground') }}>三密度总分：{ds.total}</span>
                    <span className={`tag ml-2 text-[10px] ${ds.grade === '优' ? 'tag-green' : ds.grade === '良' ? 'tag-yellow' : 'tag-red'}`}>{ds.grade}</span>
                  </div>
                )}
                {Object.entries(ds).filter(([k]) => k !== 'total' && k !== 'grade').map(([k, v]) => (
                  v.issue ? (
                    <div key={k} className="mb-2 p-2 rounded text-xs" style={{ background: C('primary', 0.03) }}>
                      <span style={{ color: '#f39c12' }}>⚠ {v.issue}</span>
                      {v.suggestion && <span style={{ color: C('muted-foreground', 0.6) }}> → {v.suggestion}</span>}
                    </div>
                  ) : null
                ))}
              </div>
            )}

            {/* 审查合规 */}
            {cp && (
              <div className="glass-card p-6" style={{ borderColor: C('primary', 0.12) }}>
                <p className="text-xs font-bold mb-4" style={{ color: C('primary') }}>🔍 审查合规检查</p>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 text-center p-3 rounded-lg" style={{ background: cp.aClass?.violations?.length ? 'rgba(231,76,60,0.06)' : 'rgba(46,204,113,0.06)' }}>
                    <div className="text-lg font-black" style={{ color: cp.aClass?.violations?.length ? '#e74c3c' : '#2ecc71' }}>
                      {cp.aClass?.passed || 7}/{7}
                    </div>
                    <div className="text-[10px]" style={{ color: C('muted-foreground', 0.6) }}>A类红线通过</div>
                  </div>
                  <div className="flex-1 text-center p-3 rounded-lg" style={{ background: cp.bClass?.warnings?.length ? 'rgba(243,156,18,0.06)' : 'rgba(46,204,113,0.06)' }}>
                    <div className="text-lg font-black" style={{ color: cp.bClass?.warnings?.length ? '#f39c12' : '#2ecc71' }}>
                      {cp.bClass?.passed || 6}/{6}
                    </div>
                    <div className="text-[10px]" style={{ color: C('muted-foreground', 0.6) }}>B类红线通过</div>
                  </div>
                </div>
                {(cp.aClass?.violations || []).map((v, i) => (
                  <div key={`a${i}`} className="mb-2 p-2 rounded text-xs flex items-start gap-2" style={{ background: 'rgba(231,76,60,0.06)' }}>
                    <span style={{ color: '#e74c3c' }}>🚫</span>
                    <span style={{ color: C('foreground') }}>[{v.id}] 命中「{v.found}」</span>
                    <span style={{ color: C('muted-foreground', 0.6) }}>→ {v.suggestion}</span>
                  </div>
                ))}
                {(cp.bClass?.warnings || []).map((v, i) => (
                  <div key={`b${i}`} className="mb-2 p-2 rounded text-xs flex items-start gap-2" style={{ background: 'rgba(243,156,18,0.06)' }}>
                    <span style={{ color: '#f39c12' }}>⚠️</span>
                    <span style={{ color: C('foreground') }}>[{v.id}] 「{v.found}」{v.handled ? '(已处理)' : '(未处理)'}</span>
                    {!v.handled && <span style={{ color: C('muted-foreground', 0.6) }}>→ {v.suggestion}</span>}
                  </div>
                ))}
                {cp.endingCheck && (
                  <div className="mt-2 p-2 rounded text-xs" style={{ background: cp.endingCheck.positive ? 'rgba(46,204,113,0.06)' : 'rgba(231,76,60,0.06)' }}>
                    <span style={{ color: cp.endingCheck.positive ? '#2ecc71' : '#e74c3c' }}>
                      {cp.endingCheck.positive ? '✓' : '✗'} 结局价值观：{cp.endingCheck.note || (cp.endingCheck.positive ? '正向' : '需调整')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 rounded-lg text-xs" style={{ background: C('primary', 0.03), color: C('muted-foreground', 0.65), lineHeight: '1.8', border: `1px solid ${C('primary', 0.06)}` }}>
              <span style={{ color: C('primary'), fontWeight: 700 }}>评级标准</span>：
              S+（70-80）可直接拍摄 · A（60-69）微调后可上线 · B（50-59）需较大修改 · C（&lt;50）建议重构
            </div>
          </div>
        );
      }
      case 'notes':
        return (
          <div className="glass-card p-8 anim-fade-in">
            <ContentBlock content={result.notes} />
          </div>
        );
      case 'commercial':
        return (
          <div className="glass-card p-8 anim-fade-in">
            <ContentBlock content={result.commercial} />
          </div>
        );
      case 'architect':
        return renderArchitect(result._architect);
      case 'characterDesign':
        return renderCharacterDesign(result._characterDesign);
      case 'showrunner':
        return renderShowrunner(result._showrunner);
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4" style={{ background: C('background'), paddingTop: '6vh' }}>
      <div className="w-full max-w-2xl">
        {/* 标题 */}
        <div className="text-center mb-8 anim-fade-up">
          <div className="text-4xl mb-4">✦</div>
          <h2 className="text-2xl font-black mb-2" style={{ color: C('foreground') }}>
            你的<span className="text-shimmer">传奇</span>已生成
          </h2>
          <p style={{ color: C('muted-foreground', 0.6), fontSize: '13px' }}>
            {scriptCount} 集短剧 · DeepSeek AI 创作
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs-scroll mb-8">
          {tabs.filter(t => !t.requires || result[t.requires]).map((t) => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="mb-8" key={activeTab}>{renderContent()}</div>

        {/* 升级引导 */}
        <div className="mb-10 anim-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card p-6" style={{ borderColor: C('primary', 0.15) }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="tag" style={{ background: C('primary', 0.1), color: C('primary') }}>🆓 免费预览</span>
              <span style={{ color: C('muted-foreground', 0.8), fontSize: '13px' }}>已解锁：第 1 集完整剧本</span>
            </div>
            <div style={{ color: C('muted-foreground', 0.7), fontSize: '13px', lineHeight: '1.8' }}>
              第 2 - {scriptCount} 集详细剧本已全部生成，<span style={{ color: C('primary') }}>购买套餐后由工作人员审核发放</span>。
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { tier:'🥉 精华版', price:'¥4,980', desc:'30集全本' },
                { tier:'🥈 专业版', price:'¥9,800', desc:'50集+品牌植入' },
                { tier:'🥇 传奇版', price:'¥19,800', desc:'80集+人工润色' },
              ].map((p, i) => (
                <div key={i} className="p-3 rounded-lg text-center cursor-pointer glass-card-hover" style={{ background: C('card') }}
                  onClick={() => { setCheckoutTier(p); setCheckoutOpen(true); }}>
                  <div className="text-xs font-bold mb-1" style={{ color: C('foreground') }}>{p.tier}</div>
                  <div className="text-lg font-black" style={{ color: C('primary') }}>{p.price}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: C('muted-foreground', 0.7) }}>{p.desc}</div>
                </div>
              ))}
            </div>
            <button className="gold-btn w-full mt-5 text-sm py-3" onClick={() => setShowPricing(true)}>
              <span>✦ 查看完整套餐方案</span>
            </button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 justify-center pb-10 anim-fade-up">
          <button onClick={() => setStep('questionFlow')} className="btn-secondary text-xs">← 修改回答</button>
          <button onClick={() => exportCustomerPDF(result, scriptCount)} className="gold-btn text-xs"><span>📄 客户预览版 PDF</span></button>
          <button onClick={() => exportCustomerDOCX(result, scriptCount)} className="btn-secondary text-xs"><span>📄 客户预览版 DOCX</span></button>
          <button onClick={() => exportInternalPDF(result, scriptCount, answers)} className="text-xs" style={{ background: 'linear-gradient(135deg, #8B0000, #a02020)', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>🔒 内部存档版 PDF</button>
          <button onClick={() => exportInternalDOCX(result, scriptCount, answers)} className="text-xs" style={{ background: 'linear-gradient(135deg, #2c3e50, #34495e)', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>📁 内部存档版 DOCX</button>
          <button onClick={() => reset()} className="btn-secondary text-xs">↻ 重新创作</button>
        </div>
      </div>

      {/* 套餐弹窗 */}
      {showPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setShowPricing(false)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto glass-card p-8 anim-fade-scale" onClick={(e) => e.stopPropagation()} style={{ borderColor: C('primary', 0.25) }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black" style={{ color: C('foreground') }}>创作套餐</h3>
              <button onClick={() => setShowPricing(false)} className="text-2xl leading-none hover:opacity-60 transition-opacity" style={{ color: C('muted-foreground', 0.6) }}>✕</button>
            </div>
            <p className="text-sm mb-6" style={{ color: C('muted-foreground', 0.7) }}>从免费体验到剧组级定制，找到适合你的方案</p>
            <div className="space-y-3">
              {[
                { tier:'🆓 体验版', price:'免费', desc:'完整大纲 + 第1集剧本\n人物小传 · 评估报告\nPDF / DOCX 导出', popular:false },
                { tier:'🥉 精华版', price:'¥4,980', desc:'30 集完整剧本\n人物小传 · 分集大纲\n全本 PDF / DOCX 导出\n标准商业评估', popular:false },
                { tier:'🥈 专业版', price:'¥9,800', desc:'50 集完整剧本\n三方向任选其二\n品牌植入定制\n深度商业评估报告\n优先交付', popular:true },
                { tier:'🥇 传奇版', price:'¥19,800', desc:'80 集完整剧本\n三方向全出\n专属编剧人工润色\n分镜头拍摄建议\n竞品对标分析\n一对一交付', popular:false },
              ].map((p, i) => (
                <div key={i}
                  className={`${p.popular ? 'glass-card' : 'glass-card-hover'} p-5 text-center relative cursor-pointer`}
                  style={p.popular ? { borderColor: C('primary', 0.35) } : {}}
                  onClick={() => { setCheckoutTier(p); setShowPricing(false); setCheckoutOpen(true); }}
                >
                  {p.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))', color: 'hsl(var(--primary-foreground))' }}>推荐</div>
                  )}
                  <div className="text-base font-bold mb-1.5" style={{ color: C('foreground') }}>{p.tier}</div>
                  <div className="text-2xl font-black mb-1" style={{ color: p.popular ? C('primary') : C('foreground') }}>{p.price}</div>
                  <div className="text-xs leading-relaxed mt-2" style={{ color: C('muted-foreground', 0.7), whiteSpace: 'pre-line' }}>
                    {p.desc.split('\n').map((line, idx) => (
                      <span key={idx} className="block py-0.5">{line}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-5" style={{ color: C('muted-foreground', 0.5) }}>点击套餐提交意向 · 24小时内顾问联系</p>
          </div>
        </div>
      )}

      <CheckoutModal key={checkoutOpen ? 'open' : 'closed'} isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} tier={checkoutTier} />
    </div>
  );
}
