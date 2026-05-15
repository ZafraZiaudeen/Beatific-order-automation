export const SHIPPING_LEVELS = [
  { value: 'MAIL', label: 'Standard Mail' },
  { value: 'PRIORITY_MAIL', label: 'Priority Mail' },
  { value: 'GROUND_HD', label: 'Ground Home Delivery' },
  { value: 'GROUND_BUS', label: 'Ground Business' },
  { value: 'EXPEDITED', label: 'Expedited' },
  { value: 'EXPRESS_OVERNIGHT', label: 'Express Overnight' },
]

export const STORE_FORM_DEFAULTS = {
  name: '',
  etsyShopId: '',
  luluApiKey: '',
  luluApiSecret: '',
  luluApiBaseUrl: '',
  luluSandboxMode: true,
  shippingLevel: 'MAIL',
  contactEmail: '',
  emailImportMailbox: '',
  emailImportUsername: '',
  emailImportPassword: '',
  emailImportHost: '',
  emailImportPort: '993',
  emailImportSecure: true,
  emailImportSenderFilter: '',
  emailImportFolder: 'INBOX',
  emailImportPollingEnabled: false,
}

export const LULU_BASE_URLS = {
  sandbox: 'https://api.sandbox.lulu.com',
  production: 'https://api.lulu.com',
}

const EMAIL_PROVIDER_SETTINGS = {
  'gmail.com': { host: 'imap.gmail.com', port: '993', secure: true },
  'googlemail.com': { host: 'imap.gmail.com', port: '993', secure: true },
  'outlook.com': { host: 'outlook.office365.com', port: '993', secure: true },
  'hotmail.com': { host: 'outlook.office365.com', port: '993', secure: true },
  'live.com': { host: 'outlook.office365.com', port: '993', secure: true },
  'msn.com': { host: 'outlook.office365.com', port: '993', secure: true },
  'yahoo.com': { host: 'imap.mail.yahoo.com', port: '993', secure: true },
  'icloud.com': { host: 'imap.mail.me.com', port: '993', secure: true },
  'me.com': { host: 'imap.mail.me.com', port: '993', secure: true },
  'mac.com': { host: 'imap.mail.me.com', port: '993', secure: true },
  'zoho.com': { host: 'imap.zoho.com', port: '993', secure: true },
  'aol.com': { host: 'imap.aol.com', port: '993', secure: true },
}

export const deriveEmailProviderSettings = (mailbox) => {
  const domain = String(mailbox || '').split('@')[1]?.toLowerCase() || ''
  return EMAIL_PROVIDER_SETTINGS[domain] || null
}

export const getStoreFormValues = (store) => {
  if (!store) return { ...STORE_FORM_DEFAULTS }

  return {
    ...STORE_FORM_DEFAULTS,
    name: store.name || '',
    etsyShopId: store.etsyShopId || '',
    luluApiBaseUrl: store.luluApiBaseUrl || '',
    luluSandboxMode: store.luluSandboxMode ?? true,
    shippingLevel: store.shippingLevel || 'MAIL',
    contactEmail: store.contactEmail || '',
    emailImportMailbox: store.emailImportMailbox || '',
    emailImportUsername: store.emailImportUsername || store.emailImportMailbox || '',
    emailImportHost: store.emailImportHost || '',
    emailImportPort: String(store.emailImportPort || 993),
    emailImportSecure: store.emailImportSecure ?? true,
    emailImportSenderFilter: store.emailImportSenderFilter || '',
    emailImportFolder: store.emailImportFolder || 'INBOX',
    emailImportPollingEnabled: store.emailImportPollingEnabled || false,
  }
}

export const buildEmailTestPayload = (store, form) => ({
  storeId: store?._id,
  mailbox: form.emailImportMailbox || null,
  username: form.emailImportUsername || form.emailImportMailbox || null,
  password: form.emailImportPassword || null,
  host: form.emailImportHost || null,
  port: form.emailImportPort ? Number(form.emailImportPort) : null,
  secure: form.emailImportSecure,
  senderFilter: form.emailImportSenderFilter || null,
  folder: form.emailImportFolder || 'INBOX',
})

export const buildStorePayload = (form) => {
  const body = {
    name: form.name,
    etsyShopId: form.etsyShopId || null,
    luluSandboxMode: form.luluSandboxMode,
    shippingLevel: form.shippingLevel,
    contactEmail: form.contactEmail || null,
    emailImportMailbox: form.emailImportMailbox || null,
    emailImportUsername: form.emailImportUsername || form.emailImportMailbox || null,
    emailImportHost: form.emailImportHost || null,
    emailImportPort: form.emailImportPort ? Number(form.emailImportPort) : null,
    emailImportSecure: form.emailImportSecure,
    emailImportSenderFilter: form.emailImportSenderFilter || null,
    emailImportFolder: form.emailImportFolder || 'INBOX',
    emailImportPollingEnabled: form.emailImportPollingEnabled,
  }

  if (form.luluApiKey) body.luluApiKey = form.luluApiKey
  if (form.luluApiSecret) body.luluApiSecret = form.luluApiSecret
  if (form.luluApiBaseUrl) body.luluApiBaseUrl = form.luluApiBaseUrl
  if (form.emailImportPassword) body.emailImportPassword = form.emailImportPassword

  return body
}
