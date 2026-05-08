import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import api from '../../lib/api'

const targetLabel = (target) => target === 'cover' ? 'Cover' : 'Inside First Page'

export default function TemplatePersonalizationDialog({ open, order, product, onClose, onFinalized }) {
  const fields = useMemo(() => product?.printTemplate?.fields || [], [product])
  const [values, setValues] = useState({})
  const [tab, setTab] = useState('cover')
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !order) return
    const next = {}
    for (const field of fields) {
      next[field.key] =
        order.templateFieldValues?.[field.key] ??
        order.templateAiSuggestions?.[field.key] ??
        ''
    }
    setValues(next)
    setPreview(null)
    setWarnings(order.templateWarnings || [])
    setError('')
  }, [open, order, fields])

  const setValue = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  const saveValues = async () => {
    if (!order) return
    setSaving(true)
    setError('')
    try {
      await api.patch(`/orders/${order._id}/template-values`, { values })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save personalization values')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const generatePreview = async () => {
    if (!order) return
    setPreviewing(true)
    setError('')
    try {
      const { data } = await api.post(`/orders/${order._id}/template-preview`, { values })
      setPreview(data.preview)
      setWarnings(data.warnings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate preview')
    } finally {
      setPreviewing(false)
    }
  }

  const finalize = async () => {
    if (!order) return
    setFinalizing(true)
    setError('')
    try {
      const { data } = await api.post(`/orders/${order._id}/template-finalize`, { values })
      onFinalized?.(data.order)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to finalize PDFs')
    } finally {
      setFinalizing(false)
    }
  }

  const busy = saving || previewing || finalizing
  const rawPersonalization = order?.personalization || {}
  const activePreviewUrl = tab === 'cover' ? preview?.coverPreviewUrl : preview?.interiorPreviewUrl
  const activePdfUrl = tab === 'cover' ? preview?.coverPdfUrl : preview?.interiorPdfUrl

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        Personalize Print PDFs
        {product?.title && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{product.title}</Typography>
        )}
      </DialogTitle>
      {busy && <LinearProgress />}
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {warnings.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{warnings.join('; ')}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '0.8fr 1fr 1.05fr' }, gap: 2.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Imported Etsy Details</Typography>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{order?.customerName}</Typography>
              <Typography variant="caption" color="text.secondary">{order?.etsyOrderId}</Typography>
              <Divider sx={{ my: 1.5 }} />
              {Object.keys(rawPersonalization).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No imported personalization fields.</Typography>
              ) : (
                <Stack spacing={1}>
                  {Object.entries(rawPersonalization).map(([key, value]) => (
                    <Box key={key}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{key}</Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Template Form</Typography>
              <Chip size="small" label={`${fields.length} fields`} />
            </Box>
            <Stack spacing={1.5}>
              {fields.map((field) => {
                const suggested = order?.templateAiSuggestions?.[field.key]
                return (
                  <TextField
                    key={field.id}
                    label={field.label}
                    value={values[field.key] || ''}
                    onChange={(event) => setValue(field.key, event.target.value)}
                    required={field.required}
                    multiline={field.height > field.fontSize * 2.2}
                    minRows={field.height > field.fontSize * 2.2 ? 2 : 1}
                    helperText={[
                      targetLabel(field.target),
                      suggested ? 'AI suggested' : '',
                    ].filter(Boolean).join(' · ')}
                    fullWidth
                  />
                )
              })}
              {fields.length === 0 && (
                <Alert severity="info">This product does not have template fields yet.</Alert>
              )}
            </Stack>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1 }}>Preview</Typography>
              {activePdfUrl && (
                <Button size="small" endIcon={<OpenInNewIcon />} onClick={() => window.open(activePdfUrl, '_blank')}>
                  PDF
                </Button>
              )}
            </Box>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth">
                <Tab value="cover" label="Cover" />
                <Tab value="interior" label="Inside" />
              </Tabs>
              <Box sx={{ minHeight: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eef2f7', p: 2 }}>
                {activePreviewUrl ? (
                  <Box
                    component="img"
                    src={activePreviewUrl}
                    alt={`${tab} preview`}
                    sx={{ maxWidth: '100%', maxHeight: 520, objectFit: 'contain', boxShadow: 4, bgcolor: '#fff' }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                    <PictureAsPdfIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                    <Typography variant="body2">Generate a preview to inspect the personalized PDFs.</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>Cancel</Button>
        <Button onClick={saveValues} disabled={busy || !fields.length}>Save Draft</Button>
        <Button onClick={generatePreview} variant="outlined" disabled={busy || !fields.length}>
          Generate Preview
        </Button>
        <Button onClick={finalize} variant="contained" disabled={busy || !fields.length}>
          Approve & Freeze PDFs
        </Button>
      </DialogActions>
    </Dialog>
  )
}
