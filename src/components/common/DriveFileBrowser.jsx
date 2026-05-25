import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../../lib/api'

const isPdf = (file) => file.mimeType === 'application/pdf'
const isImage = (file) => file.mimeType?.startsWith('image/')

export default function DriveFileBrowser({
  open,
  onClose,
  onConfirm,
  allowImages = false,
  allowPdf = false,
  title = 'Select from Google Drive',
}) {
  const [folderId, setFolderId] = useState('')
  const [history, setHistory] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (!open) return
    setFolderId('')
    setHistory([])
    setQuery('')
    setSelectedFile(null)
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    async function loadFolder() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/drive/browse', {
          params: folderId ? { folderId } : undefined,
        })
        if (!cancelled) setResponse(data)
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Could not load Google Drive folder')
          setResponse(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadFolder()
    return () => {
      cancelled = true
    }
  }, [folderId, open])

  const folders = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (response?.folders || []).filter((folder) => folder.name.toLowerCase().includes(needle))
  }, [query, response])

  const files = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (response?.files || []).filter((file) => {
      const compatible = (allowPdf && isPdf(file)) || (allowImages && isImage(file))
      return compatible && file.name.toLowerCase().includes(needle)
    })
  }, [allowImages, allowPdf, query, response])

  const openFolder = (folder) => {
    if (response?.folderId) setHistory((current) => [...current, response.folderId])
    setSelectedFile(null)
    setFolderId(folder.id)
  }

  const goBack = () => {
    setHistory((current) => {
      const next = [...current]
      setFolderId(next.pop() || '')
      setSelectedFile(null)
      return next
    })
  }

  const handleConfirm = () => {
    if (!selectedFile) return
    onConfirm(selectedFile)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            disabled={!history.length || loading}
            onClick={goBack}
          >
            Back
          </Button>
          <TextField
            size="small"
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search folders and files"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        {loading && <LinearProgress sx={{ mb: 1.5, borderRadius: 999 }} />}

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 1.5 }}>
            {error}
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '230px 1fr' },
            gap: 2,
            minHeight: 360,
          }}
        >
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800, color: 'text.secondary' }}>
              Folders
            </Typography>
            <Stack spacing={0.75}>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant="text"
                  startIcon={<FolderOutlinedIcon />}
                  onClick={() => openFolder(folder)}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'text.primary',
                    textTransform: 'none',
                    minWidth: 0,
                  }}
                >
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder.name}
                  </Box>
                </Button>
              ))}
              {!loading && !folders.length && (
                <Typography variant="body2" color="text.secondary">
                  No folders here.
                </Typography>
              )}
            </Stack>
          </Box>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800, color: 'text.secondary' }}>
              Files
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
              {files.map((file) => {
                const selected = selectedFile?.id === file.id
                return (
                  <Button
                    key={file.id}
                    variant="outlined"
                    onClick={() => setSelectedFile(file)}
                    startIcon={isPdf(file) ? <PictureAsPdfOutlinedIcon /> : <InsertDriveFileOutlinedIcon />}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      minHeight: 54,
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? alpha('#F97316', 0.1) : 'background.paper',
                      color: 'text.primary',
                      px: 1.25,
                    }}
                  >
                    <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isPdf(file) ? 'PDF' : 'Image'}
                      </Typography>
                    </Box>
                  </Button>
                )
              })}
              {!loading && !files.length && (
                <Typography variant="body2" color="text.secondary">
                  No compatible files in this folder.
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!selectedFile} onClick={handleConfirm}>
          Use selected
        </Button>
      </DialogActions>
    </Dialog>
  )
}
