import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { alpha } from '@mui/material/styles'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import {
  buildAssetThumbnailUrl,
  isValidHttpUrl,
  normalizeAssetUrl,
  uploadAssetFile,
  validateAssetFile,
} from '../../lib/assets'
import DriveFileBrowser from './DriveFileBrowser'

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Failed to save asset'

export default function AssetInputField({
  label,
  value,
  onChange,
  folder,
  accept,
  allowImages = false,
  allowPdf = false,
  helperText = '',
  urlPlaceholder = 'https://example.com/file.pdf',
  openLabel = 'Open file',
  showImagePreview = false,
}) {
  const fileInputRef = useRef(null)
  const currentUrl = normalizeAssetUrl(value || '')
  const [draftUrl, setDraftUrl] = useState(currentUrl)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingUrl, setSavingUrl] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
  const [driveBrowserOpen, setDriveBrowserOpen] = useState(false)

  useEffect(() => {
    setDraftUrl(currentUrl)
    setPreviewFailed(false)
  }, [currentUrl])

  const isBusy = uploading || savingUrl
  const previewUrl = currentUrl ? buildAssetThumbnailUrl(currentUrl) : ''
  const hasDraftChanges = normalizeAssetUrl(draftUrl) !== currentUrl
  const icon = allowImages ? ImageOutlinedIcon : PictureAsPdfOutlinedIcon
  const LabelIcon = icon
  const persistValue = async (nextValue) => {
    await Promise.resolve(onChange?.(nextValue))
  }

  const commitDraftUrl = async ({ showValidationError = false } = {}) => {
    const normalizedUrl = normalizeAssetUrl(draftUrl)

    if (!normalizedUrl) {
      if (showValidationError) setError('Paste a public URL first')
      return false
    }

    if (!isValidHttpUrl(normalizedUrl)) {
      if (showValidationError) setError('Enter a valid http or https URL')
      return false
    }

    if (normalizedUrl === currentUrl) return true

    setSavingUrl(true)
    setError('')

    try {
      await persistValue(normalizedUrl)
      setDraftUrl(normalizedUrl)
      return true
    } catch (saveError) {
      setError(getErrorMessage(saveError))
      return false
    } finally {
      setSavingUrl(false)
    }
  }

  const handleFile = async (file) => {
    if (!file) return

    const validationError = validateAssetFile(file, { allowImages, allowPdf })
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError('')
    setProgress(0)

    try {
      const uploadedUrl = await uploadAssetFile({
        file,
        folder,
        onProgress: setProgress,
      })
      await persistValue(uploadedUrl)
      setDraftUrl(uploadedUrl)
    } catch (uploadError) {
      setError(getErrorMessage(uploadError))
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const chooseLocalFile = () => {
    setSourceDialogOpen(false)
    window.setTimeout(() => fileInputRef.current?.click(), 0)
  }

  const chooseDriveFile = () => {
    setSourceDialogOpen(false)
    setDriveBrowserOpen(true)
  }

  const handleDriveFile = async (file) => {
    const isAllowed =
      (allowPdf && file.mimeType === 'application/pdf') ||
      (allowImages && file.mimeType?.startsWith('image/'))

    if (!isAllowed) {
      setError('Choose a compatible Drive file')
      return
    }

    setSavingUrl(true)
    setError('')

    try {
      const driveUrl = file.webViewUrl || `https://drive.google.com/file/d/${file.id}/view`
      await persistValue(driveUrl)
      setDraftUrl(driveUrl)
      setDriveBrowserOpen(false)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSavingUrl(false)
    }
  }

  const handleSaveUrl = async () => {
    await commitDraftUrl({ showValidationError: true })
  }

  const handleClear = async () => {
    setSavingUrl(true)
    setError('')

    try {
      await persistValue('')
      setDraftUrl('')
    } catch (clearError) {
      setError(getErrorMessage(clearError))
    } finally {
      setSavingUrl(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <LabelIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
          {label}
        </Typography>
        {currentUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: 'success.main' }} />
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.7rem' }}>
              Linked
            </Typography>
            <Tooltip title={openLabel}>
              <IconButton size="small" onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')} sx={{ p: 0.25 }}>
                <OpenInNewIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {showImagePreview && currentUrl && !previewFailed && (
        <Box
          component="img"
          src={previewUrl}
          alt={`${label} preview`}
          onError={() => setPreviewFailed(true)}
          sx={{
            width: '100%',
            height: 132,
            objectFit: 'cover',
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            mb: 1.5,
          }}
        />
      )}

      {showImagePreview && currentUrl && previewFailed && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.5,
            mb: 1.5,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <DescriptionOutlinedIcon sx={{ color: 'text.secondary' }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Preview unavailable
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              This file is still linked and ready to use.
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
        onClick={() => !isBusy && setSourceDialogOpen(true)}
        sx={{
          p: 1.75,
          border: '1.5px dashed',
          borderColor: dragging ? 'primary.main' : currentUrl ? alpha('#00A76F', 0.35) : 'divider',
          borderRadius: 1.5,
          textAlign: 'center',
          bgcolor: dragging ? alpha('#00A76F', 0.04) : currentUrl ? alpha('#00A76F', 0.02) : 'transparent',
          cursor: isBusy ? 'progress' : 'pointer',
          transition: 'all 0.15s ease',
          '&:hover': {
            borderColor: isBusy ? undefined : 'primary.light',
            bgcolor: isBusy ? undefined : alpha('#00A76F', 0.03),
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <CloudUploadOutlinedIcon
          sx={{ fontSize: 20, color: currentUrl ? 'success.main' : 'text.disabled', mb: 0.25 }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {uploading ? `Uploading ${progress}%` : currentUrl ? 'Replace file' : `Upload ${label}`}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
          Local file, Google Drive, or URL supported
        </Typography>
      </Box>

      {helperText && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.75 }}>
          {helperText}
        </Typography>
      )}

      {(uploading || savingUrl) && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant={uploading ? 'determinate' : 'indeterminate'} value={progress} sx={{ borderRadius: 999, height: 4 }} />
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          label={`${label} URL`}
          placeholder={urlPlaceholder}
          value={draftUrl}
          disabled={isBusy}
          onChange={(event) => setDraftUrl(event.target.value)}
          onBlur={() => {
            if (!isBusy && hasDraftChanges) {
              void commitDraftUrl()
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !isBusy) {
              event.preventDefault()
              void commitDraftUrl({ showValidationError: true })
            }
          }}
        />
        <Button
          variant="outlined"
          startIcon={<LinkOutlinedIcon />}
          disabled={isBusy || !normalizeAssetUrl(draftUrl) || !hasDraftChanges}
          onClick={handleSaveUrl}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Use URL
        </Button>
        <Button
          color="inherit"
          startIcon={<DeleteOutlineIcon />}
          disabled={isBusy || !currentUrl}
          onClick={handleClear}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Clear
        </Button>
      </Stack>


      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
          {error}
        </Typography>
      )}

      <Dialog open={sourceDialogOpen} onClose={() => setSourceDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Choose upload source</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Button
              variant="outlined"
              startIcon={<ComputerOutlinedIcon />}
              onClick={chooseLocalFile}
              sx={{ justifyContent: 'flex-start', py: 1.25 }}
            >
              Local file
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderOutlinedIcon />}
              onClick={chooseDriveFile}
              sx={{ justifyContent: 'flex-start', py: 1.25 }}
            >
              Google Drive folder
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setSourceDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <DriveFileBrowser
        open={driveBrowserOpen}
        onClose={() => setDriveBrowserOpen(false)}
        onConfirm={handleDriveFile}
        allowImages={allowImages}
        allowPdf={allowPdf}
        title={`Select ${label} from Google Drive`}
      />
    </Box>
  )
}
