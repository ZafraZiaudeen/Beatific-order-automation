import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import bgImage from '../../assets/login_background.png'
import BookBrandIcon from '../../assets/icons/auth/book-brand.svg?react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

function BrandMark({ light = false }) {
  return (
    <div className="auth-brand-mark">
      <span className="auth-brand-icon">
        <BookBrandIcon className="text-white" width={18} height={18} aria-hidden="true" />
      </span>
      <span className={cn('auth-brand-wordmark', light && 'is-light')}>Beatific Dashboard</span>
    </div>
  )
}

function AuthNav({ transparent = false }) {
  return (
    <nav className={cn('auth-nav', transparent && 'is-transparent')}>
      <BrandMark light={transparent} />
      <div className="auth-nav-links">
        <span>Dashboard</span>
        <span>Orders</span>
        <span>Products</span>
        <span>Team</span>
      </div>
    </nav>
  )
}

export default function AuthLayout({ children, mode = 'login' }) {
  const contentRef = useRef(null)
  const isRegister = mode === 'register'

  useEffect(() => {
    const element = contentRef.current
    if (!element) return
    gsap.fromTo(element, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' })
  }, [mode])

  if (isRegister) {
    return (
      <main className="auth-signup-shell">
        <AuthNav transparent />
        <section className="auth-signup-hero" style={{ backgroundImage: `url(${bgImage})` }}>
          <span className="auth-signup-mask" />
          <div className="auth-signup-copy">
            <h1>Welcome!</h1>
            <p>Create your workspace and start managing Etsy to Lulu production from one clean dashboard.</p>
          </div>
        </section>
        <section className="auth-signup-card-row">
          <div ref={contentRef} className="auth-signup-card-wrap">
            {children}
          </div>
        </section>
        <footer className="auth-template-footer">
          <span>Company</span>
          <span>Orders</span>
          <span>Products</span>
          <span>Team</span>
          <span>Support</span>
        </footer>
      </main>
    )
  }

  return (
    <main className="auth-signin-shell">
      <AuthNav />
      <section className="auth-signin-page">
        <div ref={contentRef} className="auth-signin-form-column">
          {children}
        </div>
        <div className="auth-oblique">
          <div className="auth-oblique-image" style={{ backgroundImage: `url(${bgImage})` }} />
        </div>
      </section>
    </main>
  )
}
