import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import bgImage from '../../assets/login_background.png'
import BookBrandIcon from '../../assets/icons/auth/book-brand.svg?react'
import CheckIcon from '../../assets/icons/auth/check.svg?react'

const STATS = [
  { value: '6 Steps', label: 'Fully automated' },
  { value: '300 DPI', label: 'Zero compression' },
  { value: '6 hrs', label: 'Lulu sync cycle' },
]

const FEATURES = [
  'Etsy CSV -> orders in seconds',
  'AI flags missing or conflicting data',
  'One-click send to Lulu Print API',
  'Real-time tracking and Slack alerts',
]

const cn = (...classes) => classes.filter(Boolean).join(' ')

function BrandMark({ dark = true }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="auth-brand-icon">
        <BookBrandIcon className="text-white" width={18} height={18} aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-[0.1rem]">
        <span
          className={cn(
            'block text-[0.78rem] font-extrabold uppercase tracking-[0.18em]',
            dark ? 'text-slate-50' : 'text-slate-900'
          )}
        >
          Beatific.co
        </span>
        <span className={cn('mt-[0.1rem] block text-[0.7rem]', dark ? 'text-slate-400/75' : 'text-slate-500')}>
          Order Automation
        </span>
      </div>
    </div>
  )
}

export default function AuthLayout({ children }) {
  const rightRef = useRef(null)

  useEffect(() => {
    const element = rightRef.current
    if (!element) return

    gsap.fromTo(element, { opacity: 0, x: 28 }, { opacity: 1, x: 0, duration: 0.85, ease: 'power3.out' })
  }, [])

  return (
    <div className="auth-shell h-screen overflow-hidden">
      <div className="auth-left">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/90 pointer-events-none" />
        <div className="auth-left-glow" />
        <div className="auth-left-overlay" />

        <div className="relative z-10">
          <BrandMark dark />
        </div>

        <div className="auth-hero">
          <div className="auth-hero-badge">
            <span className="auth-hero-badge-dot" />
            Order Automation System
          </div>
          <h1 className="auth-hero-title">
            Print orders,
            <br />
            <span>automated.</span>
          </h1>
          <p className="auth-hero-sub">
            From Etsy import to Lulu dispatch, manage your team, track every order, and ship with zero manual steps.
          </p>

          <ul className="auth-features">
            {FEATURES.map((feature) => (
              <li key={feature} className="auth-feature">
                <span className="auth-feature-check">
                  <CheckIcon className="text-[var(--c-accent)]" width={8} height={8} aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

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
          <div className="auth-mobile-brand mb-1 justify-center">
            <BrandMark dark={false} />
          </div>

          {children}

          <p className="auth-footer-text">Copyright 2026 Beatific.co. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
