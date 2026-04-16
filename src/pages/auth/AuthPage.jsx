import { useState, useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import AuthLayout from '../../components/auth/AuthLayout'
import EyeOpenIcon from '../../assets/icons/auth/eye-open.svg?react'
import EyeOffIcon from '../../assets/icons/auth/eye-off.svg?react'
import Spinner15Icon from '../../assets/icons/auth/spinner-15.svg?react'
import ArrowRightIcon from '../../assets/icons/auth/arrow-right.svg?react'
import ArrowLeftIcon from '../../assets/icons/auth/arrow-left.svg?react'
import AlertCircleIcon from '../../assets/icons/auth/alert-circle.svg?react'
import AlertCircleGreenIcon from '../../assets/icons/auth/alert-circle-green.svg?react'
import AlertCircleRedIcon from '../../assets/icons/auth/alert-circle-red.svg?react'
import CheckIcon from '../../assets/icons/auth/check.svg?react'
import BookOutlineBoldIcon from '../../assets/icons/auth/book-outline-bold.svg?react'

const EyeOpen = () => (
  <EyeOpenIcon width={15} height={15} aria-hidden="true" />
)
const EyeOff = () => (
  <EyeOffIcon width={15} height={15} aria-hidden="true" />
)
const Spinner = () => (
  <Spinner15Icon className="spin" width={15} height={15} aria-hidden="true" />
)
const ArrowRight = () => (
  <ArrowRightIcon width={14} height={14} aria-hidden="true" />
)
const ArrowLeft = () => (
  <ArrowLeftIcon width={14} height={14} aria-hidden="true" />
)

const LinkBtn = ({ onClick, children, style }) => (
  <button type="button" onClick={onClick}
    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', ...style }}
    className="auth-link">
    {children}
  </button>
)

function Field({ label, type = 'text', placeholder, value, onChange, hint, error, right }) {
  const [showPw, setShowPw] = useState(false)
  const isPass = type === 'password'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label className="auth-label">{label}</label>
        {right}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={isPass ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="auth-input"
          style={{
            paddingRight: isPass ? '2.75rem' : undefined,
            borderColor: error ? 'rgba(239,68,68,0.5)' : undefined,
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.08)' : undefined,
          }}
        />
        {isPass && (
          <button type="button" className="auth-input-icon"
            onClick={() => setShowPw(s => !s)}
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? <EyeOff /> : <EyeOpen />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--c-error)', margin: 0 }}>
          <AlertCircleIcon width={11} height={11} aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', margin: 0 }}>{hint}</p>
      )}
    </div>
  )
}

function getStrength(pw) {
  if (!pw.length) return null
  if (pw.length < 6)  return { level: 'weak',   label: 'Too short',              color: 'var(--c-error)' }
  if (pw.length < 10) return { level: 'medium',  label: 'Moderate, add symbols', color: 'var(--c-warn)'  }
  return                     { level: 'strong',  label: 'Strong password',        color: 'var(--c-accent)' }
}

function StrengthBar({ password }) {
  const s = getStrength(password)
  if (!password.length) return null
  const filled = s.level === 'strong' ? 4 : s.level === 'medium' ? 2 : 1
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.3rem' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '99px',
            background: i <= filled ? s.color : 'var(--c-border)',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>
      <p style={{ fontSize: '0.73rem', color: s.color, margin: 0 }}>{s.label}</p>
    </div>
  )
}

function InfoNote({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
      padding: '0.75rem 1rem', borderRadius: '0.75rem',
      background: 'rgba(0,167,111,0.07)', border: '1px solid rgba(0,167,111,0.16)',
      fontSize: '0.8rem', color: '#065f46', lineHeight: 1.55
    }}>
      <AlertCircleGreenIcon width={14} height={14} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function ErrorAlert({ message }) {
  if (!message) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
      padding: '0.75rem 1rem', borderRadius: '0.75rem',
      background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
      fontSize: '0.82rem', color: '#991b1b', lineHeight: 1.55
    }}>
      <AlertCircleRedIcon width={14} height={14} style={{ flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
      {message}
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '1.5rem',
      border: '1px solid var(--c-border)',
      boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.05)',
      padding: '2.5rem',
    }}>
      {children}
    </div>
  )
}

function SwitchRow({ text, linkText, onClick }) {
  return (
    <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--c-text-2)', margin: 0 }}>
      {text}{' '}
      <LinkBtn onClick={onClick}>{linkText}</LinkBtn>
    </p>
  )
}

function LoginView({ onSwitch }) {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [remember, setRem] = useState(false)
  const [loading, setLoad] = useState(false)
  const [error, setError]  = useState('')
  const ref = useRef(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.si')
    if (els) gsap.fromTo(els, { opacity: 0, y: 14 },
      { opacity: 1, y: 0, stagger: 0.07, duration: 0.45, ease: 'power2.out', delay: 0.05 })
  }, [])

  const submit = async e => {
    e.preventDefault()
    setError(''); setLoad(true)
    await new Promise(r => setTimeout(r, 1100))
    setLoad(false)
    setError('Invalid email or password. Please try again.')
  }

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Heading */}
      <div className="si">
        <p className="auth-eyebrow">Welcome back</p>
        <h2 style={{ margin: '0.35rem 0 0.6rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.15 }}>
          Sign in to Beatific
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--c-text-2)', lineHeight: 1.6 }}>
          Enter your credentials to access your workspace.
        </p>
      </div>

      {/* Error */}
      {error && <div className="si"><ErrorAlert message={error} /></div>}

      {/* Fields */}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="si">
          <Field label="Work Email" type="email" placeholder="jane@beatific.co"
            value={form.email} onChange={set('email')} />
        </div>

        <div className="si">
          <Field label="Password" type="password" placeholder="Your password"
            value={form.password} onChange={set('password')}
            right={
              <LinkBtn onClick={() => {}} style={{ fontSize: '0.78rem' }}>Forgot password?</LinkBtn>
            }
          />
        </div>

        {/* Remember */}
        <div className="si" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}
             onClick={() => setRem(r => !r)}>
          <div style={{
            width: '1.1rem', height: '1.1rem', borderRadius: '0.3rem', flexShrink: 0,
            background: remember ? 'var(--c-accent)' : 'var(--c-surface)',
            border: `1.5px solid ${remember ? 'var(--c-accent)' : 'var(--c-border-2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s, border-color 0.2s'
          }}>
            {remember && (
              <CheckIcon width={8} height={8} style={{ color: '#ffffff' }} aria-hidden="true" />
            )}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--c-text-2)' }}>Keep me signed in for 30 days</span>
        </div>

        {/* CTA */}
        <div className="si">
          <button type="submit" disabled={loading} className="auth-btn-primary" style={{ marginTop: '0.25rem' }}>
            {loading ? <><Spinner />Signing in…</> : 'Sign In'}
          </button>
        </div>
      </form>

      {/* Team invite note */}
      <div className="si">
        <InfoNote>
          <strong>Joining a team?</strong> Your invite link is sent to your email by an Owner or Admin use that link directly, not this form.
        </InfoNote>
      </div>

      {/* Switch */}
      <div className="si">
        <SwitchRow text="Don't have an account?" linkText="Create a workspace →" onClick={() => onSwitch('register')} />
      </div>
    </div>
  )
}

function RegisterStep1({ data, setData, onNext, onSwitch }) {
  const [errors, setErrors] = useState({})
  const ref = useRef(null)

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.si')
    if (els) gsap.fromTo(els, { opacity: 0, x: 18 },
      { opacity: 1, x: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' })
  }, [])

  const set = k => e => {
    setData(d => ({ ...d, [k]: e.target.value }))
    setErrors(v => ({ ...v, [k]: '' }))
  }

  const next = () => {
    const e = {}
    if (!data.company.trim()) e.company = 'Company name is required'
    if (!data.name.trim())    e.name    = 'Your full name is required'
    if (Object.keys(e).length) { setErrors(e); return }
    onNext()
  }

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Step indicator */}
      <div className="si" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '1.4rem', height: '4px', borderRadius: '99px', background: 'var(--c-accent)' }} />
        <div style={{ width: '0.45rem', height: '4px', borderRadius: '99px', background: 'var(--c-border-2)' }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--c-text-3)', marginLeft: '0.5rem' }}>Step 1 of 2</span>
      </div>

      {/* Heading */}
      <div className="si">
        <p className="auth-eyebrow">New workspace</p>
        <h2 style={{ margin: '0.35rem 0 0.6rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.15 }}>
          Create your company
        </h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--c-text-2)', lineHeight: 1.6 }}>
          You'll be the <strong>Owner</strong> invite teammates after setup.
        </p>
      </div>

      {/* Info */}
      <div className="si">
        <InfoNote>
          Only the <strong>first registration</strong> creates a company. After that, new teammates join exclusively via invitation link.
        </InfoNote>
      </div>

      {/* Fields */}
      <div className="si" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Field label="Company Name" placeholder="e.g. Beatific Studio"
          value={data.company} onChange={set('company')} error={errors.company}
          hint="This becomes your unique workspace identifier." />
        <Field label="Your Full Name" placeholder="Jane Smith"
          value={data.name} onChange={set('name')} error={errors.name} />
      </div>

      {/* CTA */}
      <div className="si" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button type="button" onClick={next} className="auth-btn-primary">
          Continue <ArrowRight />
        </button>
        <SwitchRow text="Already have an account?" linkText="Sign in" onClick={() => onSwitch('login')} />
      </div>
    </div>
  )
}

function RegisterStep2({ data, setData, onBack, onSwitch }) {
  const [errors, setErrors] = useState({})
  const [loading, setLoad]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const els = ref.current?.querySelectorAll('.si')
    if (els) gsap.fromTo(els, { opacity: 0, x: 18 },
      { opacity: 1, x: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' })
  }, [])

  const set = k => e => {
    setData(d => ({ ...d, [k]: e.target.value }))
    setErrors(v => ({ ...v, [k]: '' }))
  }

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!data.email.trim())           errs.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(data.email)) errs.email = 'Enter a valid email'
    if (!data.password)               errs.password = 'Password is required'
    else if (data.password.length < 8) errs.password = 'At least 8 characters required'
    if (data.password !== data.confirm) errs.confirm = "Passwords don't match"
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoad(true)
    await new Promise(r => setTimeout(r, 1300))
    setLoad(false)
    // → navigate to dashboard
  }

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Step indicator */}
      <div className="si" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div style={{ width: '0.45rem', height: '4px', borderRadius: '99px', background: 'var(--c-accent)', opacity: 0.4 }} />
        <div style={{ width: '1.4rem', height: '4px', borderRadius: '99px', background: 'var(--c-accent)' }} />
        <span style={{ fontSize: '0.72rem', color: 'var(--c-text-3)', marginLeft: '0.5rem' }}>Step 2 of 2</span>
      </div>

      {/* Heading + back */}
      <div className="si">
        <button type="button" onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--c-text-2)', marginBottom: '0.75rem', fontWeight: 500 }}>
          <ArrowLeft /> Back
        </button>
        <p className="auth-eyebrow">Account details</p>
        <h2 style={{ margin: '0.35rem 0 0.4rem', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--c-text)', lineHeight: 1.15 }}>
          Set up your account
        </h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '999px', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', marginTop: '0.25rem' }}>
          <BookOutlineBoldIcon width={11} height={11} style={{ color: 'var(--c-accent)' }} aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>{data.company}</span>
        </div>
      </div>

      {/* Fields */}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="si">
          <Field label="Work Email" type="email" placeholder="jane@beatific.co"
            value={data.email} onChange={set('email')} error={errors.email} />
        </div>

        <div className="si">
          <Field label="Password" type="password" placeholder="Min. 8 characters"
            value={data.password} onChange={set('password')} error={errors.password} />
          <StrengthBar password={data.password} />
        </div>

        <div className="si">
          <Field label="Confirm Password" type="password" placeholder="Repeat your password"
            value={data.confirm} onChange={set('confirm')} error={errors.confirm} />
        </div>

        {/* CTA */}
        <div className="si" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          <button type="submit" disabled={loading} className="auth-btn-primary">
            {loading ? <><Spinner />Creating workspace…</> : 'Create Company & Account'}
          </button>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '0.75rem', color: 'var(--c-text-3)' }}>
            By registering you agree to our{' '}
            <span className="auth-link">Terms of Service</span> &amp; <span className="auth-link">Privacy Policy</span>
          </p>
        </div>
      </form>

      <div className="si">
        <SwitchRow text="Already have an account?" linkText="Sign in instead" onClick={() => onSwitch('login')} />
      </div>
    </div>
  )
}

/* ══════════════════════ REGISTER SHELL ════════════════════ */
function RegisterView({ onSwitch }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({ company: '', name: '', email: '', password: '', confirm: '' })
  const cardRef = useRef(null)

  const goNext = () => {
    gsap.to(cardRef.current, { opacity: 0, x: -16, duration: 0.2, ease: 'power2.in', onComplete: () => {
      setStep(2)
      gsap.fromTo(cardRef.current, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' })
    }})
  }
  const goBack = () => {
    gsap.to(cardRef.current, { opacity: 0, x: 16, duration: 0.2, ease: 'power2.in', onComplete: () => {
      setStep(1)
      gsap.fromTo(cardRef.current, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' })
    }})
  }

  return (
    <div ref={cardRef}>
      {step === 1
        ? <RegisterStep1 data={data} setData={setData} onNext={goNext} onSwitch={onSwitch} />
        : <RegisterStep2 data={data} setData={setData} onBack={goBack} onSwitch={onSwitch} />
      }
    </div>
  )
}

export default function AuthPage({ defaultTab = 'login' }) {
  const [view, setView] = useState(defaultTab)
  const cardRef = useRef(null)

  const switchView = useCallback((next) => {
    if (next === view) return
    const el = cardRef.current
    if (!el) { setView(next); return }
    gsap.to(el, { opacity: 0, y: 10, duration: 0.18, ease: 'power2.in', onComplete: () => {
      setView(next)
      gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
    }})
  }, [view])

  return (
    <AuthLayout>
      <div ref={cardRef}>
        <Card>
          {view === 'login'
            ? <LoginView onSwitch={switchView} />
            : <RegisterView onSwitch={switchView} />
          }
        </Card>
      </div>
    </AuthLayout>
  )
}
