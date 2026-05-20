import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import api from '../../lib/api'
import {
  buildEmailTestPayload,
  buildStorePayload,
  deriveEmailProviderSettings,
  getStoreFormValues,
  LULU_BASE_URLS,
  SHIPPING_LEVELS,
  STORE_FORM_DEFAULTS,
} from './storeConfig'

function StoreFormDialog({ open, onClose, store, onSaved }) {
  const [form, setForm] = useState(STORE_FORM_DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [error, setError] = useState('')
  const [emailTestStatus, setEmailTestStatus] = useState(null)
  const [luluExpanded, setLuluExpanded] = useState(false)
  const [emailExpanded, setEmailExpanded] = useState(false)

  useEffect(() => {
    setForm(getStoreFormValues(store))
    if (store) {
      setLuluExpanded(Boolean(store.luluApiKeyConfigured))
      setEmailExpanded(Boolean(store.emailImportMailbox || store.emailImportPasswordConfigured))
    } else {
      setLuluExpanded(false)
      setEmailExpanded(false)
    }
    setError('')
    setEmailTestStatus(null)
  }, [store, open])

  const set = (key) => (e) => {
    if (key.startsWith('emailImport')) setEmailTestStatus(null)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }
  const setBool = (key) => (e) => {
    if (key.startsWith('emailImport')) setEmailTestStatus(null)
    setForm((f) => ({ ...f, [key]: e.target.checked }))
  }

  const handleMailboxChange = (e) => {
    const value = e.target.value
    const provider = deriveEmailProviderSettings(value)
    setEmailTestStatus(null)
    setForm((f) => ({
      ...f,
      emailImportMailbox: value,
      emailImportUsername: f.emailImportUsername || value,
      emailImportHost: f.emailImportHost || provider?.host || '',
      emailImportPort: f.emailImportPort || provider?.port || '993',
      emailImportSecure: provider?.secure ?? f.emailImportSecure,
    }))
  }

  const handleTestEmail = async () => {
    if (!store?._id) return
    setTestingEmail(true)
    setError('')
    setEmailTestStatus(null)
    try {
      const { data } = await api.post('/email-orders/test', buildEmailTestPayload(store, form))
      setEmailTestStatus({
        severity: 'success',
        message: `Connected to ${data.mailbox} via ${data.host} and opened ${data.folder}. No email is sent during this test.`,
      })
    } catch (err) {
      setEmailTestStatus({
        severity: 'error',
        message: err.response?.data?.message || 'Email connection failed',
      })
    } finally {
      setTestingEmail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Store name is required'); return }
    setLoading(true)
    setError('')
    try {
      const body = buildStorePayload(form)
      if (store) {
        await api.patch(`/company/stores/${store._id}`, body)
      } else {
        await api.post('/company/stores', body)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save store')
    } finally {
      setLoading(false)
    }
  }

  const derivedBaseUrl = form.luluApiBaseUrl || (
    form.luluSandboxMode ? LULU_BASE_URLS.sandbox : LULU_BASE_URLS.production
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{store ? 'Edit Store' : 'Add Store'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
          <InfoOutlinedIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          The store name appears on Lulu shipping labels as the sender — make sure it matches your Lulu account name.
        </Alert>
        <form onSubmit={handleSubmit} id="store-form">
          <TextField
            label="Store Name"
            fullWidth
            value={form.name}
            onChange={set('name')}
            sx={{ mb: 2 }}
            required
            autoFocus
            helperText="Must match the sender name configured in your Lulu account"
          />
          <TextField
            label="Etsy Shop ID (optional)"
            fullWidth
            value={form.etsyShopId}
            onChange={set('etsyShopId')}
            placeholder="e.g. BeatificDotCo"
            helperText="Your Etsy shop identifier for reference"
            sx={{ mb: 2 }}
          />

          {/* Lulu settings collapsible */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: luluExpanded ? 'primary.light' : 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              onClick={() => setLuluExpanded((v) => !v)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                bgcolor: luluExpanded ? alpha('#00A76F', 0.04) : 'transparent',
                '&:hover': { bgcolor: alpha('#00A76F', 0.06) },
              }}
            >
              <LocalPrintshopOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
                Lulu Print API Settings
              </Typography>
              {store?.luluApiKeyConfigured && (
                <Chip label="Configured" size="small" color="success" variant="outlined" />
              )}
              {luluExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Box>

            <Collapse in={luluExpanded}>
              <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.79rem' }}>
                  Per-store API keys override the global keys in <code>.env</code>. Leave blank to use the global keys.
                  Get keys from <strong>lulu.com → Account → API</strong>.
                </Alert>

                <FormControlLabel
                  control={
                    <Switch
                      checked={form.luluSandboxMode}
                      onChange={setBool('luluSandboxMode')}
                      color="warning"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Sandbox mode {form.luluSandboxMode ? '(testing)' : '(production — live orders)'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        API URL: <code>{derivedBaseUrl}</code>
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, alignItems: 'flex-start' }}
                />

                <Divider sx={{ mb: 2 }} />

                <TextField
                  label="Lulu API Key (Client ID)"
                  fullWidth
                  value={form.luluApiKey}
                  onChange={set('luluApiKey')}
                  placeholder={store?.luluApiKeyConfigured ? 'Enter a new key to replace the saved one' : 'Paste your Lulu client ID'}
                  helperText={store?.luluApiKeyConfigured ? 'A key is already saved — leave blank to keep existing key' : ''}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  label="Lulu API Secret (Client Secret)"
                  fullWidth
                  type="password"
                  value={form.luluApiSecret}
                  onChange={set('luluApiSecret')}
                  placeholder={store?.luluApiSecretConfigured ? 'Enter a new secret to replace the saved one' : 'Paste your Lulu client secret'}
                  helperText={store?.luluApiSecretConfigured ? 'A secret is already saved — leave blank to keep existing secret' : 'It is never shown after saving'}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  label="Custom API Base URL (optional)"
                  fullWidth
                  value={form.luluApiBaseUrl}
                  onChange={set('luluApiBaseUrl')}
                  placeholder={derivedBaseUrl}
                  helperText="Override only if Lulu gives you a different endpoint"
                  sx={{ mb: 2 }}
                  size="small"
                />

                <Divider sx={{ mb: 2 }} />

                <FormControl fullWidth size="small">
                  <InputLabel>Default Shipping Level</InputLabel>
                  <Select
                    value={form.shippingLevel}
                    label="Default Shipping Level"
                    onChange={set('shippingLevel')}
                  >
                    {SHIPPING_LEVELS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', mb: 2 }}>
                  Can be overridden per order in the Lulu review dialog.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <TextField
                  label="Contact Email"
                  fullWidth
                  type="email"
                  value={form.contactEmail}
                  onChange={set('contactEmail')}
                  placeholder="orders@yourcompany.com"
                  helperText="Sent to Lulu as the order contact email. Overrides the customer's email."
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Contact Phone"
                  fullWidth
                  value={form.contactPhone}
                  onChange={set('contactPhone')}
                  placeholder="+1 555 123 4567"
                  helperText="Used as the fallback Lulu shipping contact number when an order has no phone."
                  size="small"
                />
              </Box>
            </Collapse>
          </Box>

          <Box
            sx={{
              border: '1px solid',
              borderColor: emailExpanded ? 'primary.light' : 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              mt: 2,
            }}
          >
            <Box
              onClick={() => setEmailExpanded((v) => !v)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                bgcolor: emailExpanded ? alpha('#00A76F', 0.04) : 'transparent',
                '&:hover': { bgcolor: alpha('#00A76F', 0.06) },
              }}
            >
              <EmailOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
                Email Order Import
              </Typography>
              {store?.emailImportPasswordConfigured && (
                <Chip label="Configured" size="small" color="success" variant="outlined" />
              )}
              {emailExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </Box>

            <Collapse in={emailExpanded}>
              <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.79rem' }}>
                  Use an app password when your mailbox requires two-factor authentication. Gmail, Outlook, Yahoo,
                  iCloud, Zoho, and AOL fill IMAP host settings automatically.
                </Alert>

                <TextField
                  label="Mailbox Email"
                  fullWidth
                  type="email"
                  value={form.emailImportMailbox}
                  onChange={handleMailboxChange}
                  placeholder="orders@yourcompany.com"
                  helperText="The mailbox this app will fetch Etsy sale emails from."
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  label="Username"
                  fullWidth
                  value={form.emailImportUsername}
                  onChange={set('emailImportUsername')}
                  placeholder={form.emailImportMailbox || 'Usually the mailbox email'}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  label="App Password / Key"
                  fullWidth
                  type="password"
                  value={form.emailImportPassword}
                  onChange={set('emailImportPassword')}
                  placeholder={store?.emailImportPasswordConfigured ? 'Enter a new key to replace the saved one' : 'Paste mailbox app password'}
                  helperText={store?.emailImportPasswordConfigured ? 'A key is already saved; leave blank to keep it.' : 'It is encrypted and never shown after saving.'}
                  sx={{ mb: 2 }}
                  size="small"
                />

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <TextField
                      label="IMAP Host"
                      fullWidth
                      value={form.emailImportHost}
                      onChange={set('emailImportHost')}
                      placeholder="imap.gmail.com"
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      label="Port"
                      fullWidth
                      type="number"
                      value={form.emailImportPort}
                      onChange={set('emailImportPort')}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.emailImportSecure}
                          onChange={setBool('emailImportSecure')}
                          color="primary"
                        />
                      }
                      label="SSL"
                      sx={{ m: 0, height: 40 }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Fetch Emails Received From"
                  fullWidth
                  value={form.emailImportSenderFilter}
                  onChange={set('emailImportSenderFilter')}
                  placeholder="transaction@etsy.com or Fathima@beatific.co"
                  helperText="Only emails with this sender text are imported."
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  label="Mailbox Folder"
                  fullWidth
                  value={form.emailImportFolder}
                  onChange={set('emailImportFolder')}
                  placeholder="INBOX"
                  sx={{ mb: 2 }}
                  size="small"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={form.emailImportPollingEnabled}
                      onChange={setBool('emailImportPollingEnabled')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Fetch automatically every 5 minutes
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        You can still use Fetch Email Orders manually from the orders page.
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, alignItems: 'flex-start' }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color={store?.emailImportLastError ? 'error.main' : 'text.secondary'}>
                    {store?.emailImportLastError
                      ? `Last error: ${store.emailImportLastError}`
                      : store?.emailImportLastSyncedAt
                        ? `Last synced ${new Date(store.emailImportLastSyncedAt).toLocaleString()}`
                        : 'No email sync has run for this store yet.'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={testingEmail ? <CircularProgress size={14} /> : <CloudSyncOutlinedIcon />}
                    disabled={!store?._id || testingEmail}
                    onClick={handleTestEmail}
                  >
                    {testingEmail ? 'Testing...' : 'Test Connection'}
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Test Connection only checks IMAP login and folder access. It does not send a confirmation email.
                </Typography>
                {emailTestStatus && (
                  <Alert severity={emailTestStatus.severity} sx={{ mt: 1.5 }}>
                    {emailTestStatus.message}
                  </Alert>
                )}
              </Box>
            </Collapse>
          </Box>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button form="store-form" type="submit" variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}>
          {loading ? 'Saving...' : store ? 'Update Store' : 'Create Store'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default StoreFormDialog

