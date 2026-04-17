import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import AuthLayout from '../../components/auth/AuthLayout'
import EyeOpenIcon from '../../assets/icons/auth/eye-open.svg?react'
import EyeOffIcon from '../../assets/icons/auth/eye-off.svg?react'
import AlertCircleIcon from '../../assets/icons/auth/alert-circle.svg?react'
import CheckIcon from '../../assets/icons/auth/check.svg?react'
import Spinner14Icon from '../../assets/icons/auth/spinner-14.svg?react'

function Field({ label, type = 'text', placeholder, value, onChange, suffix }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="auth-field">
      <div className="auth-field-head">
        <label className="auth-label">{label}</label>
        {suffix}
      </div>

      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`auth-input ${isPassword ? 'pr-11' : ''}`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((state) => !state)}
            className="auth-toggle"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <EyeOffIcon width={16} height={16} aria-hidden="true" />
            ) : (
              <EyeOpenIcon width={16} height={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fieldsRef = useRef(null)

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  useEffect(() => {
    const elements = fieldsRef.current?.querySelectorAll('.stagger-item')
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: 'power2.out', delay: 0.3 }
      )
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setError('Invalid email or password. Please try again.')
    setLoading(false)

    gsap.fromTo(
      fieldsRef.current?.querySelector('.error-box'),
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
    )
  }

  return (
    <AuthLayout>
      <div ref={fieldsRef}>
        <div className="stagger-item mb-8">
          <p className="auth-eyebrow">Welcome back</p>
          <h2 className="auth-heading">Sign in to your workspace</h2>
          <p className="auth-subtitle">Enter your credentials to continue.</p>
        </div>

        {error && (
          <div className="error-box auth-alert mb-5">
            <AlertCircleIcon width={14} height={14} className="mt-0.5 shrink-0 text-[#ff5630]" aria-hidden="true" />
            <p className="auth-alert-text">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="stagger-item">
            <Field
              label="Work Email"
              type="email"
              placeholder="jane@beatific.co"
              value={form.email}
              onChange={set('email')}
            />
          </div>

          <div className="stagger-item">
            <Field
              label="Password"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={set('password')}
              suffix={
                <Link to="/forgot-password" className="auth-link text-xs">
                  Forgot password?
                </Link>
              }
            />
          </div>

          <div className="stagger-item mt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setRemember((state) => !state)}
              className={`auth-checkbox shrink-0 ${remember ? 'is-active' : ''}`}
              aria-label="Keep me signed in for 30 days"
              aria-pressed={remember}
            >
              {remember && (
                <CheckIcon className="text-white" width={9} height={9} aria-hidden="true" />
              )}
            </button>
            <span className="auth-meta">Keep me signed in for 30 days</span>
          </div>

          <div className="stagger-item mt-2">
            <button type="submit" disabled={loading} className="auth-primary-button relative overflow-hidden">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner14Icon className="animate-spin" width={14} height={14} aria-hidden="true" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="stagger-item my-6 flex items-center gap-3">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <div className="stagger-item auth-note mb-6">
          <p className="auth-note-text">
            <span className="auth-note-title">Joining a team?</span>{' '}
            Your invite link was sent by your Owner or Admin, check your email and use the link there, not this form.
          </p>
        </div>

        <p className="stagger-item auth-form-meta">
          Registering a new company?{' '}
          <Link to="/register" className="auth-link">
            Create workspace
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
