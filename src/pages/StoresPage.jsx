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
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import StoreFormDialog from './stores/StoreFormDialog'

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
                  {store.contactPhone && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Phone: {store.contactPhone}
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
                    <Chip
                      size="small"
                      icon={<EmailOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                      label={store.emailImportPasswordConfigured ? (store.emailImportPollingEnabled ? 'Email auto-sync' : 'Email manual') : 'Email not set'}
                      color={store.emailImportPasswordConfigured ? (store.emailImportPollingEnabled ? 'success' : 'info') : 'default'}
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
                    {store.emailImportLastError
                      ? `Email sync error: ${store.emailImportLastError}`
                      : store.emailImportLastSyncedAt
                        ? `Email synced ${new Date(store.emailImportLastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : `Created ${new Date(store.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {canManage && (
        <StoreFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          store={editStore}
          onSaved={fetchStores}
        />
      )}

      <Dialog open={canManage && !!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
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


