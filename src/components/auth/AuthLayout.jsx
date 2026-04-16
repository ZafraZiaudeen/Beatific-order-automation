import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import ThreeBackground from './ThreeBackground'
import BookBrandIcon from '../../assets/icons/auth/book-brand.svg?react'
import CheckIcon from '../../assets/icons/auth/check.svg?react'

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
        <BookBrandIcon width={18} height={18} style={{ color: '#ffffff' }} aria-hidden="true" />
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
            From Etsy import to Lulu dispatch, manage your team,
            track every order, ship with zero manual steps.
          </p>
          <ul className="auth-features">
            {FEATURES.map(f => (
              <li key={f} className="auth-feature">
                <span className="auth-feature-check">
                  <CheckIcon width={8} height={8} style={{ color: '#00a76f' }} aria-hidden="true" />
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
