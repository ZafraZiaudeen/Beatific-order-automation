import { create } from 'zustand'
import api from '../lib/api'
import {
  clearAuthSessionStorage,
  getStoredAuthSession,
  persistAuthSession,
} from '../lib/authSession'

const storedAuth = getStoredAuthSession()

const useAuthStore = create((set, get) => ({
  user: storedAuth.user,
  token: storedAuth.token,
  company: storedAuth.company,
  stores: storedAuth.stores,
  activeStore: storedAuth.activeStore,
  loading: false,
  error: null,

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  register: async ({ companyName, name, email, password }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/register', { companyName, name, email, password })
      persistAuthSession({
        token: data.token,
        tokenExpiresAt: data.tokenExpiresAt,
        user: data.user,
        company: data.company,
      })
      set({
        token: data.token,
        user: data.user,
        company: data.company,
        stores: [],
        activeStore: null,
        loading: false,
      })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed'
      set({ error: message, loading: false })
      throw err
    }
  },

  login: async ({ companyName, email, password, rememberMe = false }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { companyName, email, password, rememberMe })
      const activeStore = data.stores?.[0] || null
      persistAuthSession({
        token: data.token,
        tokenExpiresAt: data.tokenExpiresAt,
        user: data.user,
        company: data.company,
        stores: data.stores || [],
        activeStore,
      })

      set({
        token: data.token,
        user: data.user,
        company: data.company,
        stores: data.stores || [],
        activeStore,
        loading: false,
      })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      set({ error: message, loading: false })
      throw err
    }
  },

  verifyEmail: async ({ email, code }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/verify-email', { email, code })
      const user = get().user
      if (user) {
        const updated = { ...user, emailVerified: true }
        localStorage.setItem('beatific_user', JSON.stringify(updated))
        set({ user: updated, loading: false })
      }
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Verification failed'
      set({ error: message, loading: false })
      throw err
    }
  },

  resendCode: async (email) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/resend-code', { email })
      set({ loading: false })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to resend code'
      set({ error: message, loading: false })
      throw err
    }
  },

  forgotPassword: async ({ companyName, email }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/forgot-password', { companyName, email })
      set({ loading: false })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset code'
      set({ error: message, loading: false })
      throw err
    }
  },

  verifyResetCode: async ({ companyName, email, code }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/verify-reset-code', { companyName, email, code })
      set({ loading: false })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid or expired reset code'
      set({ error: message, loading: false })
      throw err
    }
  },

  resetPassword: async ({ companyName, email, code, newPassword }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/reset-password', { companyName, email, code, newPassword })
      set({ loading: false })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reset password'
      set({ error: message, loading: false })
      throw err
    }
  },

  acceptInvite: async ({ token, name, email, password }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/accept-invite', { token, name, email, password })
      const activeStore = data.stores?.[0] || null
      persistAuthSession({
        token: data.token,
        tokenExpiresAt: data.tokenExpiresAt,
        user: data.user,
        company: data.company,
        stores: data.stores || [],
        activeStore,
      })

      set({
        token: data.token,
        user: data.user,
        company: data.company,
        stores: data.stores || [],
        activeStore,
        loading: false,
      })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to accept invitation'
      set({ error: message, loading: false })
      throw err
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      localStorage.setItem('beatific_user', JSON.stringify(data.user))
      localStorage.setItem('beatific_company', JSON.stringify(data.company))
      localStorage.setItem('beatific_stores', JSON.stringify(data.stores || []))
      set({
        user: data.user,
        company: data.company,
        stores: data.stores || [],
      })
      return data
    } catch {
      // silently fail
    }
  },

  setActiveStore: (store) => {
    localStorage.setItem('beatific_active_store', JSON.stringify(store))
    set({ activeStore: store })
  },

  logout: () => {
    clearAuthSessionStorage()
    set({
      user: null,
      token: null,
      company: null,
      stores: [],
      activeStore: null,
      error: null,
    })
  },

  get isAuthenticated() {
    return Boolean(get().token && get().user)
  },

  get isEmailVerified() {
    return get().user?.emailVerified === true
  },
}))

export default useAuthStore
