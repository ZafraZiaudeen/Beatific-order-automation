import { create } from 'zustand'
import api from '../lib/api'

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('beatific_user') || 'null'),
  token: localStorage.getItem('beatific_token') || null,
  company: JSON.parse(localStorage.getItem('beatific_company') || 'null'),
  stores: JSON.parse(localStorage.getItem('beatific_stores') || '[]'),
  activeStore: JSON.parse(localStorage.getItem('beatific_active_store') || 'null'),
  loading: false,
  error: null,

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  register: async ({ companyName, name, email, password }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/register', { companyName, name, email, password })
      localStorage.setItem('beatific_token', data.token)
      localStorage.setItem('beatific_user', JSON.stringify(data.user))
      localStorage.setItem('beatific_company', JSON.stringify(data.company))
      set({
        token: data.token,
        user: data.user,
        company: data.company,
        loading: false,
      })
      return data
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed'
      set({ error: message, loading: false })
      throw err
    }
  },

  login: async ({ companyName, email, password }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { companyName, email, password })
      localStorage.setItem('beatific_token', data.token)
      localStorage.setItem('beatific_user', JSON.stringify(data.user))
      localStorage.setItem('beatific_company', JSON.stringify(data.company))
      localStorage.setItem('beatific_stores', JSON.stringify(data.stores || []))

      const activeStore = data.stores?.[0] || null
      if (activeStore) localStorage.setItem('beatific_active_store', JSON.stringify(activeStore))

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

  acceptInvite: async ({ token, name, email, password }) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/accept-invite', { token, name, email, password })
      localStorage.setItem('beatific_token', data.token)
      localStorage.setItem('beatific_user', JSON.stringify(data.user))
      localStorage.setItem('beatific_company', JSON.stringify(data.company))
      localStorage.setItem('beatific_stores', JSON.stringify(data.stores || []))
      const activeStore = data.stores?.[0] || null
      if (activeStore) localStorage.setItem('beatific_active_store', JSON.stringify(activeStore))

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
    localStorage.removeItem('beatific_token')
    localStorage.removeItem('beatific_user')
    localStorage.removeItem('beatific_company')
    localStorage.removeItem('beatific_stores')
    localStorage.removeItem('beatific_active_store')
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
