import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import CheckoutModal from '../components/CheckoutModal';

const pricingTiers = [
  { tier:'🆓 体验版', price:'免费', desc:'完整大纲 + 第1集剧本\n人物小传 · 评估报告\nPDF / DOCX 导出', popular:false },
  { tier:'🥉 精华版', price:'¥4,980', desc:'30 集完整剧本\n人物小传 · 分集大纲\n全本 PDF / DOCX 导出\n标准商业评估', popular:false },
  { tier:'🥈 专业版', price:'¥9,800', desc:'50 集完整剧本\n三方向任选其二\n品牌植入定制\n深度商业评估报告\n优先交付', popular:true },
  { tier:'🥇 传奇版', price:'¥19,800', desc:'80 集完整剧本\n三方向全出\n专属编剧人工润色\n分镜头拍摄建议\n竞品对标分析\n一对一交付', popular:false },
];

const steps = [
  { num: '01', title: '回答 15 个问题', desc: '讲述你的创业历程、至暗时刻与高光瞬间' },
  { num: '02', title: 'AI 编剧创作', desc: 'DeepSeek 大模型将真实经历重构为戏剧化剧本' },
  { num: '03', title: '选择创作方向', desc: '传奇传记 / 品牌叙事 / 脑洞爽片，三种玩法任选' },
  { num: '04', title: '生成专属短剧', desc: '30/50/80 集完整剧本 + 人物小传 + 商业评估' },
];

const C = (k, a) => a != null ? `hsl(var(--${k}) / ${a})` : `hsl(var(--${k}))`;

export default function Landing() {
  const setStep = useAppStore((s) => s.setStep);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState({});

  return (
    <div style={{ background: C('background') }}>
      {/* ===== Hero ===== */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative ember-glow" style={{ paddingTop: '8vh', paddingBottom: '18vh' }}>
        {/* 装饰光晕 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15), transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none anim-float"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.08), transparent 60%)' }} />

        <div className="w-full max-w-2xl relative z-10">
          {/* 顶部铭牌 */}
          <div className="text-center mb-16 anim-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-10"
              style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)' }}>
              <span className="anim-glow" style={{ width:6,height:6,borderRadius:'50%',background:'hsl(var(--primary))',display:'inline-block'}} />
              <span style={{ color: 'hsl(var(--primary))', fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em' }}>花火智作 · AI 编剧引擎</span>
            </div>
          </div>

          {/* 主标题 */}
          <div className="text-center mb-8 anim-slide-up">
            <h1 className="text-5xl md:text-7xl font-black tracking-wider mb-5" style={{ letterSpacing: '0.08em', lineHeight: '1.2' }}>
              <span style={{ color: C('foreground') }}>我的</span>
              <span className="text-shimmer">传奇</span>
              <span style={{ color: C('foreground') }}>之路</span>
            </h1>
            <p className="text-lg mt-6" style={{ color: C('muted-foreground'), lineHeight: '1.8', maxWidth: '480px', margin: '0 auto' }}>
              把你的创业经历，变成一部<span style={{ color: C('primary'), fontWeight: 700 }}>专属于你</span>的短剧剧本
            </p>
          </div>

          {/* 四步流程 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
            {steps.map((s, i) => (
              <div key={i} className="glass-card p-5 text-center anim-fade-up" style={{ animationDelay: `${0.15 * i}s` }}>
                <div className="text-2xl font-black mb-3" style={{ color: C('primary') }}>{s.num}</div>
                <div className="text-sm font-bold mb-2" style={{ color: C('foreground') }}>{s.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: C('muted-foreground', 0.65) }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center anim-fade-up anim-delay-4">
            <button onClick={() => setStep('directionSelect')}
              className="gold-btn text-lg px-16 py-5 anim-breathe">
              <span>开始创作 ✦</span>
            </button>
            <p className="mt-5 text-xs" style={{ color: C('muted-foreground', 0.5) }}>无需写作能力 · 全程约 15 分钟 · AI 自动生成完整剧本</p>
          </div>
        </div>
      </div>

      {/* ===== 定价区 ===== */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px 80px 24px' }}>
        <div className="divider" style={{ marginBottom: '48px' }} />
        <h2 className="text-2xl font-black text-center mb-3" style={{ color: C('foreground') }}>创作套餐</h2>
        <p className="text-center text-sm mb-16" style={{ color: C('muted-foreground') }}>从免费体验到剧组级定制，找到适合你的方案</p>

        <div className="pricing-grid">
          {pricingTiers.map((p, i) => (
            <div key={i}
              className={`${p.popular ? 'glass-card gradient-border' : 'glass-card-hover'} p-6 text-center relative cursor-pointer`}
              style={p.popular ? { borderColor: 'hsl(var(--primary) / 0.35)' } : {}}
              onClick={() => { setCheckoutTier(p); setCheckoutOpen(true); }}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))', color: 'hsl(var(--primary-foreground))' }}>
                  ✦ 推荐
                </div>
              )}
              {!p.popular && <div className="h-5" />}
              <div className="text-lg font-bold mb-2" style={{ color: C('foreground') }}>{p.tier}</div>
              <div className="text-3xl font-black mb-1" style={{
                color: p.popular ? C('primary') : C('foreground'),
                textShadow: p.popular ? '0 0 30px hsl(var(--primary) / 0.3)' : 'none'
              }}>{p.price}</div>
              <div className="text-xs leading-relaxed mt-3" style={{ color: C('muted-foreground', 0.65), whiteSpace: 'pre-line' }}>
                {p.desc.split('\n').map((line, idx) => (
                  <span key={idx} className="block py-0.5">{line}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs mt-8" style={{ color: C('muted-foreground', 0.4) }}>点击套餐了解更多 · 免费体验无需付费</p>
      </div>

      {/* 底部 */}
      <div className="text-center pb-12">
        <p style={{ color: C('muted-foreground', 0.25), fontSize: '12px', letterSpacing: '0.05em' }}>
          花火智作 © 传奇剧场
        </p>
      </div>

      <CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} tier={checkoutTier} />
    </div>
  );
}
