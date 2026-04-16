import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import ThreeBackground from './ThreeBackground'

const STATS = [
  { value: '6 Steps', label: 'Fully automated' },
  { value: '300 DPI', label: 'Zero compression' },
  { value: '6 hrs',   label: 'Lulu sync cycle' },
]

const FEATURES = [
  'Etsy CSV → orders in seconds',
  'AI flags missing or conflicting data',
  'One-click send to Lulu Print API',
  'Real-time tracking & Slack alerts',
]

function BrandMark({ dark = true }) {
  const textColor = dark ? '#f8fafc' : '#0f172a'
  const subColor  = dark ? 'rgba(148,163,184,0.75)' : '#64748b'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      <div className="auth-brand-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="white" strokeWidth="2"/>
        </svg>
      </div>
      <div>
        <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: textColor }}>
          Beatific.co
        </span>
        <span style={{ display: 'block', fontSize: '0.7rem', color: subColor, marginTop: '0.1rem' }}>
          Order Automation
        </span>
      </div>
    </div>
  )
}

export default function AuthLayout({ children }) {
  const rightRef = useRef(null)

  useEffect(() => {
    const el = rightRef.current
    if (!el) return
    gsap.fromTo(el, { opacity: 0, x: 28 }, { opacity: 1, x: 0, duration: 0.85, ease: 'power3.out' })
  }, [])

  return (
    <div className="auth-shell" style={{ minHeight: '100vh' }}>

      {/* ── Dark Left Panel ─────────────────────────────────── */}
      <div className="auth-left">
        <ThreeBackground />
        <div className="auth-left-glow" />
        <div className="auth-left-overlay" />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <BrandMark dark />
        </div>

        {/* Hero */}
        <div className="auth-hero">
          <div className="auth-hero-badge">
            <span className="auth-hero-badge-dot" />
            Order Automation System
          </div>
          <h1 className="auth-hero-title">
            Print orders,<br />
            <span>automated.</span>
          </h1>
          <p className="auth-hero-sub">
            From Etsy import to Lulu dispatch — manage your team,
            track every order, ship with zero manual steps.
          </p>
          <ul className="auth-features">
            {FEATURES.map(f => (
              <li key={f} className="auth-feature">
                <span className="auth-feature-check">
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#00a76f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="auth-stats">
          {STATS.map(({ value, label }) => (
            <div key={label} className="auth-stat">
              <p className="auth-stat-value">{value}</p>
              <p className="auth-stat-label">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ────────────────────────────────── */}
      <div ref={rightRef} className="auth-right">
        <div className="auth-right-inner">

          {/* Mobile logo */}
          <div className="auth-mobile-brand" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
            <BrandMark dark={false} />
          </div>

          {children}

          <p className="auth-footer-text">
            © 2026 Beatific.co · All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
