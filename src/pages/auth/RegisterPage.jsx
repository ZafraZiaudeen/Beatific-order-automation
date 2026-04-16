import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import AuthLayout from '../../components/auth/AuthLayout'
import EyeOpenIcon from '../../assets/icons/auth/eye-open.svg?react'
import EyeOffIcon from '../../assets/icons/auth/eye-off.svg?react'
import UserGroupIcon from '../../assets/icons/auth/user-group.svg?react'
import Spinner14Icon from '../../assets/icons/auth/spinner-14.svg?react'

function Field({ label, type = 'text', placeholder, value, onChange, hint }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>

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

      {hint && <p className="auth-field-hint">{hint}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    company: '',
    name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [loading, setLoading] = useState(false)
  const fieldsRef = useRef(null)

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  useEffect(() => {
    const elements = fieldsRef.current?.querySelectorAll('.stagger-item')
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.3 }
      )
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setLoading(false)
  }

  const strengthTone =
    form.password.length >= 10
      ? 'strong'
      : form.password.length >= 7
        ? 'medium'
        : 'weak'

  return (
    <AuthLayout>
      <div ref={fieldsRef}>
        <div className="stagger-item mb-8">
          <p className="auth-eyebrow">New company</p>
          <h2 className="auth-heading">Create your workspace</h2>
          <p className="auth-subtitle">You'll be the Owner, invite your team after setup.</p>
        </div>

        <div className="stagger-item auth-note auth-note--accent mb-6 flex items-start gap-3">
          <div className="auth-note-icon mt-0.5">
            <UserGroupIcon width={12} height={12} aria-hidden="true" />
          </div>
          <p className="auth-note-text">
            The first person to register creates the company. All other teammates join via invitation - no further
            self-sign-up is allowed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="stagger-item">
            <Field
              label="Company Name"
              placeholder="e.g. Beatific Studio"
              value={form.company}
              onChange={set('company')}
              hint="This becomes your workspace identifier."
            />
          </div>

          <div className="stagger-item">
            <Field
              label="Your Full Name"
              placeholder="Jane Smith"
              value={form.name}
              onChange={set('name')}
            />
          </div>

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
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={set('password')}
            />

            {form.password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={`auth-strength-bar ${form.password.length >= index * 2 + 2 ? `is-active is-${strengthTone}` : ''}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="stagger-item">
            <Field
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={set('confirm')}
            />

            {form.confirm.length > 0 && form.password !== form.confirm && (
              <p className="auth-inline-error">Passwords do not match</p>
            )}
          </div>

          <div className="stagger-item mt-2">
            <button type="submit" disabled={loading} className="auth-primary-button relative overflow-hidden">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner14Icon className="animate-spin" width={14} height={14} aria-hidden="true" />
                  Creating workspace...
                </span>
              ) : (
                'Create Company & Account'
              )}
            </button>
          </div>

          <p className="stagger-item auth-form-meta">
            By registering you agree to our <span className="auth-link cursor-pointer">Terms of Service</span> &{' '}
            <span className="auth-link cursor-pointer">Privacy Policy</span>
          </p>
        </form>

        <div className="stagger-item my-6 flex items-center gap-3">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <p className="stagger-item auth-form-meta">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
