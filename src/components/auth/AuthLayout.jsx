import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import bgImage from '../../assets/login_background.png'
export default function AuthLayout({ children, mode = 'login' }) {
  const contentRef = useRef(null)

  useEffect(() => {
    const element = contentRef.current
    if (!element) return
    gsap.fromTo(element, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' })
  }, [mode])

  return (
    <main className="auth-signin-shell">
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
