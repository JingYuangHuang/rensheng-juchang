import useAppStore from '../store/useAppStore';
import { entrepreneurDirections } from '../data/questions';

const C = (k, a) => a != null ? `hsl(var(--${k}) / ${a})` : `hsl(var(--${k}))`;

const directionMeta = {
  legend: { emoji: '👑', label: '个人传记 · 戏剧张力 · IP 孵化', desc: '如实记录你的创业历程，最大化情感共鸣和 IP 价值' },
  brand:  { emoji: '🏛️', label: '创意设定 · 品牌叙事 · 文化输出', desc: '用创意高概念包装品牌，让产品成为故事的核心卖点' },
  fury:   { emoji: '🔥', label: '脑洞爽片 · 算法友好 · 病毒传播', desc: '你出镜当主演，AI 帮你写最爽的剧情，纯短剧逻辑引爆流量' },
};

export default function DirectionSelect() {
  const { selectedDirection, setSelectedDirection, setStep } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col items-center px-6" style={{ background: C('background'), paddingTop: '8vh' }}>
      <div className="w-full max-w-lg">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {[0,1,2].map((i) => (
            <span key={i} className="flex items-center gap-0">
              <span className={`step-dot ${i === 0 ? 'active' : ''}`} />
              {i < 2 && <span className="step-line" />}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-14 mb-14" style={{ marginTop: '-8px' }}>
          {['创作方向', '回答问题', '生成剧本'].map((label, i) => (
            <span key={i} className="text-xs font-bold" style={{ color: i === 0 ? C('primary') : C('muted-foreground', 0.4) }}>{label}</span>
          ))}
        </div>

        <div className="text-center mb-12 anim-fade-up">
          <h2 className="text-2xl font-black mb-3" style={{ color: C('foreground') }}>选择创作方向</h2>
          <p className="text-sm" style={{ color: C('muted-foreground', 0.6) }}>同一位企业家，三种完全不同的剧本玩法</p>
        </div>

        <div className="space-y-5 mb-12">
          {entrepreneurDirections.map((dir, idx) => {
            const meta = directionMeta[dir.id];
            const selected = selectedDirection === dir.id;
            return (
              <button
                key={dir.id}
                onClick={() => setSelectedDirection(dir.id)}
                className={`w-full text-left p-6 rounded-xl transition-all duration-300 anim-fade-up ${selected ? 'card-active' : 'glass-card-hover'}`}
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: C('primary', 0.08) }}>
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-black text-lg" style={{ color: C('foreground') }}>{dir.name}</span>
                      {selected && (
                        <span className="tag" style={{ background: C('primary', 0.12), color: C('primary') }}>已选</span>
                      )}
                    </div>
                    <span className="tag inline-block mb-2" style={{ background: C('primary', 0.06), color: C('primary') }}>
                      {meta.label}
                    </span>
                    <p className="text-sm italic mb-1.5" style={{ color: C('muted-foreground') }}>「{dir.tagline}」</p>
                    <p className="text-xs leading-relaxed" style={{ color: C('muted-foreground', 0.7) }}>{dir.approach}</p>
                    <p className="text-xs mt-2" style={{ color: C('muted-foreground', 0.4) }}>参考：{dir.reference}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="anim-fade-up anim-delay-3">
          <button
            disabled={!selectedDirection}
            onClick={() => selectedDirection && setStep('questionFlow')}
            className="gold-btn w-full text-base py-4"
            style={!selectedDirection ? { background: C('muted'), color: C('muted-foreground', 0.5), boxShadow: 'none', cursor: 'not-allowed', opacity: 0.5 } : {}}
          >
            <span>下一步：回答问题 →</span>
          </button>
          <button onClick={() => setStep('landing')} className="btn-secondary w-full mt-3">← 返回首页</button>
        </div>

        {/* 帮助提示 */}
        <div className="mt-12 glass-card p-6 anim-fade-in anim-delay-4">
          <p className="text-xs font-bold mb-3" style={{ color: C('primary') }}>✦ 如何选择？</p>
          <div className="space-y-3 text-xs" style={{ color: C('muted-foreground', 0.7), lineHeight: '1.7' }}>
            {entrepreneurDirections.map((dir) => {
              const meta = directionMeta[dir.id];
              return (
                <p key={dir.id}>{meta.emoji} <b style={{ color: C('foreground') }}>{dir.name}</b> — {meta.desc}</p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
