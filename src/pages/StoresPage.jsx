import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
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
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'

const SHIPPING_LEVELS = [
  { value: 'MAIL', label: 'Standard Mail' },
  { value: 'PRIORITY_MAIL', label: 'Priority Mail' },
  { value: 'GROUND_HD', label: 'Ground Home Delivery' },
  { value: 'GROUND_BUS', label: 'Ground Business' },
  { value: 'EXPEDITED', label: 'Expedited' },
  { value: 'EXPRESS_OVERNIGHT', label: 'Express Overnight' },
]

function StoreFormDialog({ open, onClose, store, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    etsyShopId: '',
    luluApiKey: '',
    luluApiSecret: '',
    luluApiBaseUrl: '',
    luluSandboxMode: true,
    shippingLevel: 'MAIL',
    contactEmail: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [luluExpanded, setLuluExpanded] = useState(false)

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '',
        etsyShopId: store.etsyShopId || '',
        luluApiKey: '',
        luluApiSecret: '',       // Never pre-fill secret — must be re-entered
        luluApiBaseUrl: store.luluApiBaseUrl || '',
        luluSandboxMode: store.luluSandboxMode ?? true,
        shippingLevel: store.shippingLevel || 'MAIL',
        contactEmail: store.contactEmail || '',
      })
      setLuluExpanded(Boolean(store.luluApiKeyConfigured))
    } else {
      setForm({ name: '', etsyShopId: '', luluApiKey: '', luluApiSecret: '', luluApiBaseUrl: '', luluSandboxMode: true, shippingLevel: 'MAIL', contactEmail: '' })
      setLuluExpanded(false)
    }
    setError('')
  }, [store, open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setBool = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Store name is required'); return }
    setLoading(true); setError('')
    try {
      const body = {
        name: form.name,
        etsyShopId: form.etsyShopId || null,
        luluSandboxMode: form.luluSandboxMode,
        shippingLevel: form.shippingLevel,
        contactEmail: form.contactEmail || null,
      }
      if (form.luluApiKey) body.luluApiKey = form.luluApiKey
      if (form.luluApiSecret) body.luluApiSecret = form.luluApiSecret
      if (form.luluApiBaseUrl) body.luluApiBaseUrl = form.luluApiBaseUrl || null

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

  const sandboxBaseUrl = 'https://api.sandbox.lulu.com'
  const productionBaseUrl = 'https://api.lulu.com'
  const derivedBaseUrl = form.luluApiBaseUrl || (form.luluSandboxMode ? sandboxBaseUrl : productionBaseUrl)

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
                />
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

export default function StoresPage() {
  const { user } = useAuthStore()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStore, setEditStore] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/company/stores')
      setStores(data)
    } catch {
      setError('Failed to load stores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStores() }, [fetchStores])

  const handleToggleActive = async (store) => {
    try {
      await api.patch(`/company/stores/${store._id}`, { isActive: !store.isActive })
      fetchStores()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update store')
    }
  }

  const handleDelete = async (storeId) => {
    setDeleteLoading(true)
    try {
      await api.delete(`/company/stores/${storeId}`)
      setDeleteConfirm(null)
      fetchStores()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete store')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Stores</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your Etsy shops and per-store Lulu API settings.
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditStore(null); setDialogOpen(true) }}
          >
            Add Store
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6 }}>
              <Card><CardContent><Skeleton height={120} /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <StorefrontOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>No stores yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first store to start managing orders.
            </Typography>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                Add Store
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {stores.map((store) => (
            <Grid key={store._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: store.isActive ? 'primary.light' : 'divider',
                  transition: 'border-color 0.2s',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        bgcolor: store.isActive ? alpha('#00A76F', 0.1) : 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <StorefrontOutlinedIcon sx={{ fontSize: 22, color: store.isActive ? 'primary.main' : 'text.disabled' }} />
                    </Box>

                    {canManage && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Edit store & Lulu settings">
                          <IconButton size="small" onClick={() => { setEditStore(store); setDialogOpen(true) }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {stores.length > 1 && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm(store)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {store.name}
                  </Typography>

                  {store.etsyShopId && (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block' }}>
                      Etsy: {store.etsyShopId}
                    </Typography>
                  )}
                  {store.contactEmail && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Contact: {store.contactEmail}
                    </Typography>
                  )}

                  {/* Lulu status badges */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                    <Chip
                      size="small"
                      icon={<LocalPrintshopOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                      label={store.luluApiKeyConfigured ? (store.luluSandboxMode ? 'Lulu sandbox' : 'Lulu production') : 'Lulu (global key)'}
                      color={store.luluApiKeyConfigured ? (store.luluSandboxMode ? 'warning' : 'success') : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                    {store.shippingLevel && store.shippingLevel !== 'MAIL' && (
                      <Chip
                        size="small"
                        label={store.shippingLevel}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.7rem', fontFamily: 'monospace' }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                    <Chip
                      label={store.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={store.isActive ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    {canManage && (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={store.isActive}
                            onChange={() => handleToggleActive(store)}
                            size="small"
                            color="primary"
                          />
                        }
                        label=""
                        sx={{ m: 0 }}
                      />
                    )}
                  </Box>

                  <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.disabled' }}>
                    Created {new Date(store.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <StoreFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        store={editStore}
        onSaved={fetchStores}
      />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Store</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
            Existing orders will be preserved but unlinked from the store.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={() => handleDelete(deleteConfirm?._id)} color="error" variant="contained" disabled={deleteLoading}>
            {deleteLoading ? <CircularProgress size={20} /> : 'Delete Store'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
