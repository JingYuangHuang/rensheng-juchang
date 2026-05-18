import { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';

const API_BASE = '/api';

export default function CheckoutModal({ isOpen, onClose, tier = {} }) {
  const { selectedDirection } = useAppStore();
  const [form, setForm] = useState({ name: '', phone: '', wechat: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('请填写姓名和手机号');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
      setError('手机号格式不正确');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.tier || '未指定',
          price: tier.price || '未知',
          direction: selectedDirection || '未选择',
          ...form,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '提交失败，请重试');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const C = (k, a) => (a != null ? `hsl(var(--${k}) / ${a})` : `hsl(var(--${k}))`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: C('background', 0.85), backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm glass-card p-8 anim-fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: C('primary', 0.25) }}
      >
        {success ? (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-black mb-2" style={{ color: C('foreground') }}>
              提交成功！
            </h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: C('muted-foreground', 0.7) }}>
              我们的编剧顾问将在 24 小时内与你联系，<br />
              为你定制专属剧本方案。
            </p>
            {tier.tier && (
              <div className="inline-block px-4 py-2 rounded-lg mb-6" style={{ background: C('primary', 0.08) }}>
                <span className="text-sm font-bold" style={{ color: C('primary') }}>
                  {tier.tier} · {tier.price}
                </span>
              </div>
            )}
            <button onClick={onClose} className="gold-btn w-full text-sm">
              <span>✦ 好的</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black" style={{ color: C('foreground') }}>
                  {tier.tier ? `升级 ${tier.tier}` : '获取专属方案'}
                </h3>
                {tier.price && (
                  <p className="text-xs mt-1" style={{ color: C('primary') }}>
                    {tier.price}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-2xl leading-none"
                style={{ color: C('muted-foreground', 0.6) }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: C('foreground') }}>
                  姓名 <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  ref={nameRef}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="你的称呼"
                  className="input-line w-full"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: C('foreground') }}>
                  手机号 <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="13800000000"
                  className="input-line w-full"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: C('foreground') }}>
                  微信号
                </label>
                <input
                  name="wechat"
                  value={form.wechat}
                  onChange={handleChange}
                  placeholder="方便我们添加你"
                  className="input-line w-full"
                  style={{ padding: '10px 14px', fontSize: '14px' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: C('foreground') }}>
                  备注
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="有什么特殊需求或想法？（可选）"
                  rows={2}
                  className="input-line w-full"
                  style={{ padding: '10px 14px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              {error && (
                <p className="text-xs p-2 rounded" style={{ background: 'rgba(231,76,60,0.08)', color: '#e74c3c' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="gold-btn w-full text-sm"
                style={{ opacity: submitting ? 0.6 : 1 }}
              >
                <span>{submitting ? '提交中…' : '✦ 提交，获取方案'}</span>
              </button>
            </form>

            <p className="text-center text-[11px] mt-4" style={{ color: C('muted-foreground', 0.35) }}>
              提交即表示同意我们的服务条款
            </p>
          </>
        )}
      </div>
    </div>
  );
}
