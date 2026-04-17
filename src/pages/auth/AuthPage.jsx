import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import AuthLayout from '../../components/auth/AuthLayout'
import useAuthStore from '../../stores/authStore'
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

const VIEW_CLASS = 'flex flex-col gap-8'
const FORM_CLASS = 'flex flex-col gap-5'
const TITLE_CLASS =
  'mt-[0.35rem] mb-[0.6rem] text-[1.75rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-[var(--c-text)]'
const DESC_CLASS = 'm-0 text-[0.9rem] leading-[1.6] text-[var(--c-text-2)]'
const STEP_ROW_CLASS = 'flex items-center gap-[0.4rem]'
const STEP_LABEL_CLASS = 'ml-2 text-[0.72rem] text-[var(--c-text-3)]'
const ACTIVE_STEP_CLASS = 'h-1 w-[1.4rem] rounded-full bg-[var(--c-accent)]'
const INACTIVE_STEP_CLASS = 'h-1 w-[0.45rem] rounded-full bg-[var(--c-border-2)]'
const BACK_BUTTON_CLASS =
  'mb-3 inline-flex cursor-pointer items-center gap-[0.4rem] border-0 bg-transparent p-0 text-[0.82rem] font-medium text-[var(--c-text-2)]'
const COMPANY_BADGE_CLASS =
  'mt-1 inline-flex items-center gap-[0.4rem] rounded-full border border-[var(--c-border)] bg-[var(--c-surface-2)] px-3 py-[0.3rem]'
const MICRO_TEXT_CLASS = 'm-0 text-center text-xs text-[var(--c-text-3)]'

const STRENGTH_SEGMENT_CLASS = {
  weak: 'bg-[var(--c-error)]',
  medium: 'bg-[var(--c-warn)]',
  strong: 'bg-[var(--c-accent)]',
}

const STRENGTH_TEXT_CLASS = {
  weak: 'text-[var(--c-error)]',
  medium: 'text-[var(--c-warn)]',
  strong: 'text-[var(--c-accent)]',
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

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

const LinkBtn = ({ onClick, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn('auth-link cursor-pointer border-0 bg-transparent p-0 font-inherit', className)}
  >
    {children}
  </button>
)

function Field({ label, type = 'text', placeholder, value, onChange, hint, error, right }) {
  const [showPw, setShowPw] = useState(false)
  const isPass = type === 'password'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className="auth-label">{label}</label>
        {right}
      </div>

      <div className="relative">
        <input
          type={isPass ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn(
            'auth-input',
            isPass && 'pr-11',
            error &&
              'border-[rgba(239,68,68,0.5)] shadow-[0_0_0_3px_rgba(239,68,68,0.08)] hover:border-[rgba(239,68,68,0.5)] focus:border-[rgba(239,68,68,0.5)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
          )}
        />

        {isPass && (
          <button
            type="button"
            className="auth-input-icon"
            onClick={() => setShowPw((visible) => !visible)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff /> : <EyeOpen />}
          </button>
        )}
      </div>

      {error && (
        <p className="m-0 flex items-center gap-[0.3rem] text-xs text-[var(--c-error)]">
          <AlertCircleIcon width={11} height={11} aria-hidden="true" />
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="m-0 text-xs text-[var(--c-text-3)]">{hint}</p>
      )}
    </div>
  )
}

function getStrength(password) {
  if (!password.length) return null
  if (password.length < 6) return { level: 'weak', label: 'Too short' }
  if (password.length < 10) return { level: 'medium', label: 'Moderate, add symbols' }
  return { level: 'strong', label: 'Strong password' }
}

function StrengthBar({ password }) {
  const strength = getStrength(password)
  if (!password.length) return null

  const filled = strength.level === 'strong' ? 4 : strength.level === 'medium' ? 2 : 1

  return (
    <div className="mt-2">
      <div className="mb-[0.3rem] flex gap-1">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              'h-[3px] flex-1 rounded-full bg-[var(--c-border)] transition-colors',
              index <= filled && STRENGTH_SEGMENT_CLASS[strength.level]
            )}
          />
        ))}
      </div>
      <p className={cn('m-0 text-[0.73rem]', STRENGTH_TEXT_CLASS[strength.level])}>{strength.label}</p>
    </div>
  )
}

function InfoNote({ children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(0,167,111,0.16)] bg-[rgba(0,167,111,0.07)] px-4 py-3 text-[0.8rem] leading-[1.55] text-[#065f46]">
      <AlertCircleGreenIcon className="mt-px shrink-0" width={14} height={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

function ErrorAlert({ message }) {
  if (!message) return null

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.07)] px-4 py-3 text-[0.82rem] leading-[1.55] text-[#991b1b]">
      <AlertCircleRedIcon className="mt-px shrink-0" width={14} height={14} aria-hidden="true" />
      {message}
    </div>
  )
}

function Card({ children }) {
  return (
    <div className="auth-card">
      <div className="auth-card-body">{children}</div>
    </div>
  )
}

function SwitchRow({ text, linkText, onClick }) {
  return (
    <p className="m-0 text-center text-sm text-[var(--c-text-2)]">
      {text}{' '}
      <LinkBtn onClick={onClick}>{linkText}</LinkBtn>
    </p>
  )
}

function LoginView({ onSwitch }) {
  const [form, setForm] = useState({ company: '', email: '', password: '' })
  const [remember, setRem] = useState(false)
  const [loading, setLoad] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.si')
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, stagger: 0.07, duration: 0.45, ease: 'power2.out', delay: 0.05 }
      )
    }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoad(true)

    try {
      const data = await login({ companyName: form.company, email: form.email, password: form.password })
      if (data.user && !data.user.emailVerified) {
        navigate('/verify-email', { state: { email: form.email } })
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div ref={ref} className={VIEW_CLASS}>
      <div className="si">
        <p className="auth-eyebrow">Welcome back</p>
        <h2 className={TITLE_CLASS}>Sign in to Beatific</h2>
        <p className={DESC_CLASS}>Enter your credentials to access your workspace.</p>
      </div>

      {error && (
        <div className="si">
          <ErrorAlert message={error} />
        </div>
      )}

      <form onSubmit={submit} className={FORM_CLASS}>
        <div className="si">
          <Field
            label="Company Name"
            placeholder="e.g. Beatific Studio"
            value={form.company}
            onChange={set('company')}
          />
        </div>

        <div className="si">
          <Field
            label="Work Email"
            type="email"
            placeholder="jane@beatific.co"
            value={form.email}
            onChange={set('email')}
          />
        </div>

        <div className="si">
          <Field
            label="Password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={set('password')}
            right={
              <LinkBtn onClick={() => {}} className="text-[0.78rem]">
                Forgot password?
              </LinkBtn>
            }
          />
        </div>

        <div className="si">
          <button
            type="button"
            onClick={() => setRem((checked) => !checked)}
            className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left"
            aria-label="Keep me signed in for 30 days"
            aria-pressed={remember}
          >
            <span
              className={cn(
                'flex h-[1.1rem] w-[1.1rem] shrink-0 items-center justify-center rounded-[0.3rem] border-[1.5px] transition-[background,border-color]',
                remember
                  ? 'border-[var(--c-accent)] bg-[var(--c-accent)]'
                  : 'border-[var(--c-border-2)] bg-[var(--c-surface)]'
              )}
            >
              {remember && <CheckIcon className="text-white" width={8} height={8} aria-hidden="true" />}
            </span>
            <span className="text-[0.85rem] text-[var(--c-text-2)]">Keep me signed in for 30 days</span>
          </button>
        </div>

        <div className="si">
          <button type="submit" disabled={loading} className="auth-btn-primary mt-1">
            {loading ? <><Spinner />Signing in...</> : 'Sign In'}
          </button>
        </div>
      </form>

      <div className="si">
        <InfoNote>
          <strong>Joining a team?</strong> Your invite link is sent by an Owner or Admin. Use that link directly
          instead of this form.
        </InfoNote>
      </div>

      <div className="si">
        <SwitchRow text="Don't have an account?" linkText="Create a workspace ->" onClick={() => onSwitch('register')} />
      </div>
    </div>
  )
}

function RegisterStep1({ data, setData, onNext, onSwitch }) {
  const [errors, setErrors] = useState({})
  const ref = useRef(null)

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.si')
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, x: 18 },
        { opacity: 1, x: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' }
      )
    }
  }, [])

  const set = (key) => (event) => {
    setData((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const next = () => {
    const nextErrors = {}
    if (!data.company.trim()) nextErrors.company = 'Company name is required'
    if (!data.name.trim()) nextErrors.name = 'Your full name is required'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    onNext()
  }

  return (
    <div ref={ref} className={VIEW_CLASS}>
      <div className={cn('si', STEP_ROW_CLASS)}>
        <div className={ACTIVE_STEP_CLASS} />
        <div className={INACTIVE_STEP_CLASS} />
        <span className={STEP_LABEL_CLASS}>Step 1 of 2</span>
      </div>

      <div className="si">
        <p className="auth-eyebrow">New workspace</p>
        <h2 className={TITLE_CLASS}>Create your company</h2>
        <p className={DESC_CLASS}>You'll be the <strong>Owner</strong>. Invite teammates after setup.</p>
      </div>

      <div className="si">
        <InfoNote>
          Only the <strong>first registration</strong> creates a company. After that, new teammates join only through
          invitation links.
        </InfoNote>
      </div>

      <div className={cn('si', FORM_CLASS)}>
        <Field
          label="Company Name"
          placeholder="e.g. Beatific Studio"
          value={data.company}
          onChange={set('company')}
          error={errors.company}
          hint="This becomes your unique workspace identifier."
        />
        <Field
          label="Your Full Name"
          placeholder="Jane Smith"
          value={data.name}
          onChange={set('name')}
          error={errors.name}
        />
      </div>

      <div className="si flex flex-col gap-4">
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
  const [loading, setLoad] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { register } = useAuthStore()

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.si')
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, x: 18 },
        { opacity: 1, x: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' }
      )
    }
  }, [])

  const set = (key) => (event) => {
    setData((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!data.email.trim()) nextErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(data.email)) nextErrors.email = 'Enter a valid email'

    if (!data.password) nextErrors.password = 'Password is required'
    else if (data.password.length < 8) nextErrors.password = 'At least 8 characters required'

    if (data.password !== data.confirm) nextErrors.confirm = "Passwords don't match"

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setLoad(true)
    try {
      await register({
        companyName: data.company,
        name: data.name,
        email: data.email,
        password: data.password,
      })
      navigate('/verify-email', { state: { email: data.email } })
    } catch (err) {
      setErrors({ email: err.response?.data?.message || 'Registration failed' })
    } finally {
      setLoad(false)
    }
  }

  return (
    <div ref={ref} className={VIEW_CLASS}>
      <div className={cn('si', STEP_ROW_CLASS)}>
        <div className="h-1 w-[0.45rem] rounded-full bg-[var(--c-accent)] opacity-40" />
        <div className={ACTIVE_STEP_CLASS} />
        <span className={STEP_LABEL_CLASS}>Step 2 of 2</span>
      </div>

      <div className="si">
        <button type="button" onClick={onBack} className={BACK_BUTTON_CLASS}>
          <ArrowLeft /> Back
        </button>
        <p className="auth-eyebrow">Account details</p>
        <h2 className="mt-[0.35rem] mb-[0.4rem] text-[1.75rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-[var(--c-text)]">
          Set up your account
        </h2>
        <div className={COMPANY_BADGE_CLASS}>
          <BookOutlineBoldIcon className="text-[var(--c-accent)]" width={11} height={11} aria-hidden="true" />
          <span className="text-xs font-semibold text-[var(--c-text-2)]">{data.company}</span>
        </div>
      </div>

      <form onSubmit={submit} className={FORM_CLASS}>
        <div className="si">
          <Field
            label="Work Email"
            type="email"
            placeholder="jane@beatific.co"
            value={data.email}
            onChange={set('email')}
            error={errors.email}
          />
        </div>

        <div className="si">
          <Field
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={data.password}
            onChange={set('password')}
            error={errors.password}
          />
          <StrengthBar password={data.password} />
        </div>

        <div className="si">
          <Field
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={data.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />
        </div>

        <div className="si mt-1 flex flex-col gap-4">
          <button type="submit" disabled={loading} className="auth-btn-primary">
            {loading ? <><Spinner />Creating workspace...</> : 'Create Company & Account'}
          </button>
          <p className={MICRO_TEXT_CLASS}>
            By registering you agree to our <span className="auth-link">Terms of Service</span> &amp;{' '}
            <span className="auth-link">Privacy Policy</span>
          </p>
        </div>
      </form>

      <div className="si">
        <SwitchRow text="Already have an account?" linkText="Sign in instead" onClick={() => onSwitch('login')} />
      </div>
    </div>
  )
}

function RegisterView({ onSwitch }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({ company: '', name: '', email: '', password: '', confirm: '' })
  const cardRef = useRef(null)

  const goNext = () => {
    gsap.to(cardRef.current, {
      opacity: 0,
      x: -16,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setStep(2)
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, x: 16 },
          { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
        )
      },
    })
  }

  const goBack = () => {
    gsap.to(cardRef.current, {
      opacity: 0,
      x: 16,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setStep(1)
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, x: -16 },
          { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
        )
      },
    })
  }

  return (
    <div ref={cardRef}>
      {step === 1
        ? <RegisterStep1 data={data} setData={setData} onNext={goNext} onSwitch={onSwitch} />
        : <RegisterStep2 data={data} setData={setData} onBack={goBack} onSwitch={onSwitch} />}
    </div>
  )
}

export default function AuthPage({ defaultTab = 'login' }) {
  const [view, setView] = useState(defaultTab)
  const cardRef = useRef(null)

  const switchView = useCallback((next) => {
    if (next === view) return
    const element = cardRef.current
    if (!element) {
      setView(next)
      return
    }

    gsap.to(element, {
      opacity: 0,
      y: 10,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        setView(next)
        gsap.fromTo(
          element,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        )
      },
    })
  }, [view])

  return (
    <AuthLayout>
      <div ref={cardRef}>
        <Card>
          {view === 'login'
            ? <LoginView onSwitch={switchView} />
            : <RegisterView onSwitch={switchView} />}
        </Card>
      </div>
    </AuthLayout>
  )
}
