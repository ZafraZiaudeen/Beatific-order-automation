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
    <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(249,115,22,0.18)] bg-[rgba(249,115,22,0.08)] px-4 py-3 text-[0.8rem] leading-[1.55] text-[#9a3412]">
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
      const data = await login({
        companyName: form.company,
        email: form.email,
        password: form.password,
        rememberMe: remember,
      })
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
              <LinkBtn onClick={() => onSwitch('forgot')} className="text-[0.78rem]">
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

const RESET_CODE_LENGTH = 6
const RESET_RESEND_COOLDOWN_SECONDS = 20
const RESET_MAX_SENDS = 5
const RESET_SESSION_BLOCK_SECONDS = 15 * 60

const resetStepOrder = ['request', 'code', 'password']

function ResetStepIndicator({ step }) {
  const current = Math.max(resetStepOrder.indexOf(step), 0)

  return (
    <div className={cn('si', STEP_ROW_CLASS)}>
      {resetStepOrder.map((item, index) => (
        <div
          key={item}
          className={index <= current ? ACTIVE_STEP_CLASS : INACTIVE_STEP_CLASS}
        />
      ))}
      <span className={STEP_LABEL_CLASS}>Step {current + 1} of 3</span>
    </div>
  )
}

function CodeInput({ value, onChange, error }) {
  const refs = useRef([])
  const digits = Array.from({ length: RESET_CODE_LENGTH }, (_, index) => value[index] || '')

  const updateDigits = (index, input) => {
    const nextDigits = [...digits]
    const clean = input.replace(/\D/g, '')

    if (!clean) {
      nextDigits[index] = ''
      onChange(nextDigits.join('').slice(0, RESET_CODE_LENGTH))
      return
    }

    clean.slice(0, RESET_CODE_LENGTH - index).split('').forEach((digit, offset) => {
      nextDigits[index + offset] = digit
    })

    onChange(nextDigits.join('').slice(0, RESET_CODE_LENGTH))
    refs.current[Math.min(index + clean.length, RESET_CODE_LENGTH - 1)]?.focus()
  }

  const handleKeyDown = (index) => (event) => {
    if (event.key !== 'Backspace') return

    if (!digits[index] && index > 0) {
      event.preventDefault()
      const nextDigits = [...digits]
      nextDigits[index - 1] = ''
      onChange(nextDigits.join('').slice(0, RESET_CODE_LENGTH))
      refs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const clean = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, RESET_CODE_LENGTH)
    onChange(clean)
    refs.current[Math.min(clean.length, RESET_CODE_LENGTH - 1)]?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="auth-label">Reset Code</label>
      <div className="auth-code-grid" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { refs.current[index] = element }}
            aria-label={`Reset code digit ${index + 1}`}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(event) => updateDigits(index, event.target.value)}
            onKeyDown={handleKeyDown(index)}
            className={cn('auth-code-input', error && 'is-error')}
          />
        ))}
      </div>
      {error && (
        <p className="m-0 flex items-center gap-[0.3rem] text-xs text-[var(--c-error)]">
          <AlertCircleIcon width={11} height={11} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

function formatWait(seconds) {
  if (seconds <= 0) return 'now'
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.ceil(seconds / 60)
  return `${minutes} min`
}

function ForgotPasswordView({ onSwitch }) {
  const [step, setStep] = useState('request')
  const [identity, setIdentity] = useState({ company: '', email: '' })
  const [code, setCode] = useState('')
  const [passwords, setPasswords] = useState({ password: '', confirm: '' })
  const [loading, setLoad] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [codeError, setCodeError] = useState('')
  const [sendCount, setSendCount] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const [blockSeconds, setBlockSeconds] = useState(0)
  const [complete, setComplete] = useState(false)
  const ref = useRef(null)
  const { forgotPassword, verifyResetCode, resetPassword } = useAuthStore()

  const setIdentityField = (key) => (event) => {
    setIdentity((current) => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  const setPasswordField = (key) => (event) => {
    setPasswords((current) => ({ ...current, [key]: event.target.value }))
    setError('')
  }

  useEffect(() => {
    const elements = ref.current?.querySelectorAll('.si')
    if (elements) {
      gsap.fromTo(elements, { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.45, ease: 'power2.out' })
    }
  }, [step])

  useEffect(() => {
    if (cooldown <= 0) return undefined

    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (blockSeconds <= 0) return undefined

    const timer = window.setInterval(() => {
      setBlockSeconds((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [blockSeconds])

  useEffect(() => {
    if (blockSeconds === 0 && sendCount >= RESET_MAX_SENDS) {
      setSendCount(0)
    }
  }, [blockSeconds, sendCount])

  const startResetBlock = () => {
    setCooldown(0)
    setBlockSeconds(RESET_SESSION_BLOCK_SECONDS)
    setError('You have reached the reset code limit. Please wait 15 minutes before requesting another code.')
  }

  const sendCode = async (event) => {
    event?.preventDefault()
    setError('')
    setInfo('')

    if (!identity.company.trim() || !identity.email.trim()) {
      setError('Company name and email are required.')
      return
    }

    if (blockSeconds > 0) {
      setError(`You have reached the reset code limit. Please wait ${formatWait(blockSeconds)} before requesting another code.`)
      return
    }

    if (sendCount >= RESET_MAX_SENDS) {
      startResetBlock()
      return
    }

    setLoad(true)
    try {
      const data = await forgotPassword({ companyName: identity.company, email: identity.email })
      const nextSendCount = typeof data.remainingRequests === 'number'
        ? RESET_MAX_SENDS - data.remainingRequests
        : Math.min(sendCount + 1, RESET_MAX_SENDS)

      setSendCount(nextSendCount)
      setCooldown(data.resendAvailableInSeconds || RESET_RESEND_COOLDOWN_SECONDS)
      setInfo(
        nextSendCount >= RESET_MAX_SENDS
          ? 'Reset code sent. This was your final code request for this session.'
          : 'Reset code sent. Check your email for the latest 6 digit code.'
      )
      if (nextSendCount >= RESET_MAX_SENDS) {
        setBlockSeconds(RESET_SESSION_BLOCK_SECONDS)
      }
      setStep('code')
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset code.'
      setError(message)
      if (message.toLowerCase().includes('15 minutes')) {
        setBlockSeconds(RESET_SESSION_BLOCK_SECONDS)
      } else if (message.toLowerCase().includes('20 seconds')) {
        setCooldown(RESET_RESEND_COOLDOWN_SECONDS)
      }
    } finally {
      setLoad(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setCodeError('')

    if (code.length !== RESET_CODE_LENGTH) {
      setCodeError('Enter the 6 digit code from your email.')
      return
    }

    setLoad(true)
    try {
      await verifyResetCode({
        companyName: identity.company,
        email: identity.email,
        code,
      })
      setInfo('Code verified. Create your new password.')
      setStep('password')
    } catch (err) {
      setCodeError(err.response?.data?.message || 'Invalid or expired reset code.')
    } finally {
      setLoad(false)
    }
  }

  const submitNewPassword = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (passwords.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (passwords.password !== passwords.confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoad(true)
    try {
      await resetPassword({
        companyName: identity.company,
        email: identity.email,
        code,
        newPassword: passwords.password,
      })
      setComplete(true)
      setInfo('Password reset successfully. Sign in with your new password.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setLoad(false)
    }
  }

  const resendDisabled = loading || cooldown > 0 || blockSeconds > 0 || sendCount >= RESET_MAX_SENDS
  const remainingSends = Math.max(RESET_MAX_SENDS - sendCount, 0)

  return (
    <div ref={ref} className={VIEW_CLASS}>
      <ResetStepIndicator step={step} />

      {step === 'request' && (
        <>
          <div className="si">
            <button type="button" onClick={() => onSwitch('login')} className={BACK_BUTTON_CLASS}>
              <ArrowLeft /> Back to sign in
            </button>
            <p className="auth-eyebrow">Password reset</p>
            <h2 className={TITLE_CLASS}>Get a reset code</h2>
            <p className={DESC_CLASS}>Enter your workspace and email. The code expires in 15 minutes.</p>
          </div>

          {error && <div className="si"><ErrorAlert message={error} /></div>}

          <form onSubmit={sendCode} className={FORM_CLASS}>
            <div className="si">
              <Field label="Company Name" placeholder="e.g. Beatific Studio" value={identity.company} onChange={setIdentityField('company')} />
            </div>
            <div className="si">
              <Field label="Work Email" type="email" placeholder="jane@beatific.co" value={identity.email} onChange={setIdentityField('email')} />
            </div>
            <div className="si">
              <button type="submit" disabled={loading} className="auth-btn-primary mt-1">
                {loading ? <><Spinner />Sending code...</> : 'Send Reset Code'}
              </button>
            </div>
          </form>

          <div className="si">
            <SwitchRow text="Remembered it?" linkText="Back to sign in" onClick={() => onSwitch('login')} />
          </div>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="si">
            <button type="button" onClick={() => setStep('request')} className={BACK_BUTTON_CLASS}>
              <ArrowLeft /> Change email
            </button>
            <p className="auth-eyebrow">Check your email</p>
            <h2 className={TITLE_CLASS}>Enter the reset code</h2>
            <p className={DESC_CLASS}>Use the 6 digit code we sent. Request a new one only if the latest email does not arrive.</p>
          </div>

          {error && <div className="si"><ErrorAlert message={error} /></div>}
          {info && <div className="si"><InfoNote>{info}</InfoNote></div>}

          <form onSubmit={verifyCode} className={FORM_CLASS}>
            <div className="si">
              <CodeInput value={code} onChange={(value) => { setCode(value); setCodeError('') }} error={codeError} />
            </div>
            <div className="si">
              <button type="submit" disabled={loading} className="auth-btn-primary mt-1">
                {loading ? <><Spinner />Verifying...</> : <>Continue <ArrowRight /></>}
              </button>
            </div>
          </form>

          <div className="si flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={resendDisabled}
              onClick={() => sendCode()}
              className={cn(
                'auth-link cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold',
                resendDisabled && 'cursor-not-allowed opacity-55'
              )}
            >
              {blockSeconds > 0 || sendCount >= RESET_MAX_SENDS
                ? `Send reset code again in ${formatWait(blockSeconds || RESET_SESSION_BLOCK_SECONDS)}`
                : cooldown > 0
                  ? `Send reset code again in ${cooldown}s`
                  : 'Send reset code again'}
            </button>
            <p className="m-0 text-center text-xs text-[var(--c-text-3)]">
              {remainingSends > 0
                ? `${remainingSends} reset code request${remainingSends === 1 ? '' : 's'} left in this session.`
                : 'Please wait 15 minutes before requesting another reset session.'}
            </p>
          </div>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="si">
            {!complete && (
              <button type="button" onClick={() => setStep('code')} className={BACK_BUTTON_CLASS}>
                <ArrowLeft /> Back to code
              </button>
            )}
            <p className="auth-eyebrow">Password reset</p>
            <h2 className={TITLE_CLASS}>Set a new password</h2>
            <p className={DESC_CLASS}>Choose a secure password for your next sign in.</p>
          </div>

          {error && <div className="si"><ErrorAlert message={error} /></div>}
          {info && <div className="si"><InfoNote>{info}</InfoNote></div>}

          {!complete ? (
            <form onSubmit={submitNewPassword} className={FORM_CLASS}>
              <div className="si">
                <Field label="New Password" type="password" placeholder="Min. 8 characters" value={passwords.password} onChange={setPasswordField('password')} />
                <StrengthBar password={passwords.password} />
              </div>
              <div className="si">
                <Field label="Confirm Password" type="password" placeholder="Repeat your password" value={passwords.confirm} onChange={setPasswordField('confirm')} />
              </div>
              <div className="si">
                <button type="submit" disabled={loading} className="auth-btn-primary mt-1">
                  {loading ? <><Spinner />Resetting...</> : 'Reset Password'}
                </button>
              </div>
            </form>
          ) : (
            <div className="si">
              <button type="button" onClick={() => onSwitch('login')} className="auth-btn-primary">
                Back to Sign In
              </button>
            </div>
          )}

          {!complete && (
            <div className="si">
              <SwitchRow text="Need a new code?" linkText="Go back" onClick={() => setStep('code')} />
            </div>
          )}
        </>
      )}
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
  const initialView = defaultTab === 'reset' ? 'forgot' : defaultTab
  const [view, setView] = useState(initialView)
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
    <AuthLayout mode={view}>
      <div ref={cardRef}>
        <Card>
          {view === 'login' && <LoginView onSwitch={switchView} />}
          {view === 'register' && <RegisterView onSwitch={switchView} />}
          {view === 'forgot' && <ForgotPasswordView onSwitch={switchView} />}
        </Card>
      </div>
    </AuthLayout>
  )
}
