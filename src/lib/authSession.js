const TOKEN_KEY = 'beatific_token'
const TOKEN_EXPIRES_AT_KEY = 'beatific_token_expires_at'
const USER_KEY = 'beatific_user'
const COMPANY_KEY = 'beatific_company'
const STORES_KEY = 'beatific_stores'
const ACTIVE_STORE_KEY = 'beatific_active_store'

const AUTH_STORAGE_KEYS = [
  TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  USER_KEY,
  COMPANY_KEY,
  STORES_KEY,
  ACTIVE_STORE_KEY,
]

const DAY_MS = 24 * 60 * 60 * 1000

const parseJson = (value, fallback) => {
  if (!value) return fallback

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const clearAuthSessionStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}

const decodeTokenExpiry = (token) => {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return null

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))

    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

const resolveTokenExpiry = ({ token, tokenExpiresAt, fallbackMs = DAY_MS }) => {
  const serverExpiry = tokenExpiresAt ? Date.parse(tokenExpiresAt) : null
  if (serverExpiry && !Number.isNaN(serverExpiry)) return serverExpiry

  return decodeTokenExpiry(token) || Date.now() + fallbackMs
}

export const isAuthSessionExpired = () => {
  const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY) || 0)
  return Boolean(expiresAt && expiresAt <= Date.now())
}

export const ensureFreshAuthSession = () => {
  if (!isAuthSessionExpired()) return true

  clearAuthSessionStorage()
  return false
}

export const getStoredToken = () => {
  if (!ensureFreshAuthSession()) return null
  return localStorage.getItem(TOKEN_KEY)
}

export const getStoredAuthSession = () => {
  ensureFreshAuthSession()

  return {
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: parseJson(localStorage.getItem(USER_KEY), null),
    company: parseJson(localStorage.getItem(COMPANY_KEY), null),
    stores: parseJson(localStorage.getItem(STORES_KEY), []),
    activeStore: parseJson(localStorage.getItem(ACTIVE_STORE_KEY), null),
  }
}

export const persistAuthSession = ({
  token,
  tokenExpiresAt,
  user,
  company,
  stores = [],
  activeStore = null,
}) => {
  const expiresAt = resolveTokenExpiry({ token, tokenExpiresAt })

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(COMPANY_KEY, JSON.stringify(company))
  localStorage.setItem(STORES_KEY, JSON.stringify(stores))

  if (activeStore) {
    localStorage.setItem(ACTIVE_STORE_KEY, JSON.stringify(activeStore))
  } else {
    localStorage.removeItem(ACTIVE_STORE_KEY)
  }

  return { expiresAt }
}
