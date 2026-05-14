import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { alpha } from '@mui/material/styles'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'

export default function ImportPage() {
  const { activeStore } = useAuthStore()
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.match(/\.(csv|xlsx|xls)$/i)) {
      setFile(dropped)
      setResult(null)
      setError('')
    } else {
      setError('Please upload a .csv, .xls, or .xlsx file')
    }
  }, [])

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file || !activeStore) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storeId', activeStore._id)

      const { data } = await api.post('/import/spreadsheet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Import Orders</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload an Etsy order export (.csv or .xlsx) to import orders automatically.
        </Typography>
      </Box>

      {!activeStore && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please select a store from the header before importing.
        </Alert>
      )}

      {/* Upload zone */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            sx={{
              p: 5,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              m: 2,
              bgcolor: dragOver ? alpha('#00A76F', 0.04) : 'transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <UploadFileOutlinedIcon sx={{ fontSize: 48, color: dragOver ? 'primary.main' : 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {dragOver ? 'Drop file here' : 'Drag & drop your Etsy export'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supports .csv, .xls, and .xlsx formats
            </Typography>
            <Button variant="outlined" size="small">Browse files</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Selected file */}
      {file && !result && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '16px !important' }}>
            <InsertDriveFileOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">{file.name}</Typography>
              <Typography variant="caption" color="text.secondary">{formatSize(file.size)}</Typography>
              {uploading && <LinearProgress sx={{ mt: 1 }} />}
            </Box>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploading || !activeStore}
            >
              {uploading ? 'Importing...' : 'Import'}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Results */}
      {result && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Import Results</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Chip icon={<CheckCircleOutlineIcon />} label={`${result.created} Created`} color="success" variant="outlined" />
                <Chip label={`${result.skipped} Skipped (duplicates)`} variant="outlined" />
                {result.unmapped > 0 && (
                  <Chip icon={<WarningAmberIcon />} label={`${result.unmapped} Unmapped`} color="warning" variant="outlined" />
                )}
                {result.errors?.length > 0 && (
                  <Chip label={`${result.errors.length} Errors`} color="error" variant="outlined" />
                )}
              </Box>
              {result.errors?.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <Typography key={i} variant="body2">{e}</Typography>
                  ))}
                  {result.errors.length > 5 && (
                    <Typography variant="body2">...and {result.errors.length - 5} more</Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>

          {result.orders?.length > 0 && (
            <Card>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Mapped</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.orders.slice(0, 50).map((order, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {order.etsyOrderId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.productTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status.replace(/_/g, ' ')}
                            size="small"
                            color={order.status === 'in_progress' ? 'info' : 'warning'}
                            variant="outlined"
                            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          {order.isProductMapped ? (
                            <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 20 }} />
                          ) : (
                            <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => { setFile(null); setResult(null) }}
            >
              Import Another File
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
