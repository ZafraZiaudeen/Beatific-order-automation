import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import AuthLayout from '../../components/auth/AuthLayout'

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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
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
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
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
