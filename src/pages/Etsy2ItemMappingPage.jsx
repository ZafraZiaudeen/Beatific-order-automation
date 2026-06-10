import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Divider,
  TextField,
  Alert,
  Chip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SyncIcon from '@mui/icons-material/Sync'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import EditIcon from '@mui/icons-material/Edit'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

// Mock data
const MOCK_ITEM = {
  orderId: '10234',
  itemName: 'Botanical Wall Art',
  sku: 'SKU-1002',
  quantity: 1,
  etsyData: {
    listingId: '87234156233',
    coverColor: 'White',
    insidePage: 'Botanical Print',
    title: 'Botanical Wall Art - Custom Text Print',
    price: 44.00,
  },
  productLibraryMatch: {
    listingId: '87234156233',
    coverColor: 'White',
    insidePage: 'Botanical Print',
    product: 'Botanical Wall Art (SKU-1002)',
    price: 44.00,
    confidence: 'Best Match',
  },
  aiFlag: {
    originalText: 'To the best mom ever,\nThanks for everything you do!\nLove, Emma',
    suggestedText: 'To the best mom ever,\nThank you for everything you do!\nLove, Emma',
    reason: 'Text contains potentially inappropriate language or sensitive content',
    details: 'The original text contains potentially inappropriate language or sensitive content. Please review the edited text before processing.',
  },
}

const ComparisonRow = ({ label, etsyValue, libraryValue, isMatch }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderBottom: '1px solid #F4F4F5' }}>
    <Typography variant="body2" sx={{ width: '150px', color: '#71717A', fontWeight: 600 }}>
      {label}
    </Typography>
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          flex: 1,
          p: 1.5,
          bgcolor: '#FAFAFA',
          borderRadius: '6px',
          border: '1px solid #E3E3E7',
        }}
      >
        <Typography variant="body2" sx={{ color: '#27272A' }}>
          {etsyValue}
        </Typography>
      </Box>
      <CompareArrowsIcon sx={{ color: '#71717A', fontSize: '20px' }} />
      <Box
        sx={{
          flex: 1,
          p: 1.5,
          bgcolor: isMatch ? '#DCFCE7' : '#FEE2E2',
          borderRadius: '6px',
          border: `1px solid ${isMatch ? '#BBF7D0' : '#FEE2E2'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: '#27272A', flex: 1 }}>
          {libraryValue}
        </Typography>
        {isMatch ? (
          <CheckIcon sx={{ color: '#16A34A', fontSize: '18px' }} />
        ) : (
          <CloseIcon sx={{ color: '#DC2626', fontSize: '18px' }} />
        )}
      </Box>
    </Box>
  </Box>
)

export default function Etsy2ItemMappingPage() {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const [item] = useState(MOCK_ITEM)
  const [originalText, setOriginalText] = useState(item.aiFlag.originalText)
  const [editedText, setEditedText] = useState(item.aiFlag.suggestedText)
  const [syncing, setSyncing] = useState(false)

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 2000)
  }

  const handleSaveAndMap = () => {
    // Save logic here
    navigate(`/orders/etsy2/${orderId}`)
  }

  const allMatch = true // In real app, check if all fields match

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate(`/orders/etsy2/${orderId}`)} sx={{ bgcolor: '#F4F4F5' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="body2"
            sx={{ color: '#0EA5E9', cursor: 'pointer' }}
            onClick={() => navigate(`/orders/etsy2/${orderId}`)}
          >
            Back to Order #{orderId}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#27272A', mb: 0.5 }}>
              Item Mapping & AI Review
            </Typography>
            <Typography variant="body2" sx={{ color: '#71717A' }}>
              Review how this item maps to your product library and the AI personalization edits.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={syncing ? <SyncIcon className="spin" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
            sx={{
              borderColor: '#E3E3E7',
              color: '#27272A',
              '&:hover': {
                borderColor: '#D4D4D8',
                bgcolor: '#FAFAFA',
              },
            }}
          >
            Sync
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: '#71717A', display: 'block', mt: 1 }}>
          Last synced: 2m ago
        </Typography>
      </Box>

      {/* Item Info Card */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '12px',
          border: '1px solid #E3E3E7',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: '#F4F4F5',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
          }}
        >
          🖼️
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#27272A' }}>
            {item.itemName}
          </Typography>
          <Typography variant="body2" sx={{ color: '#71717A' }}>
            SKU: {item.sku} • Qty: {item.quantity}
          </Typography>
        </Box>
        <Chip
          label="AI Flagged"
          icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
          sx={{
            bgcolor: '#FEE2E2',
            color: '#991B1B',
            fontWeight: 600,
          }}
        />
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr' }, gap: 3 }}>
        {/* Mapping Comparison */}
        <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid #E3E3E7' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A' }}>
              1. Mapping Comparison
            </Typography>
            {allMatch && (
              <Chip
                label="Best Match"
                icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                size="small"
                sx={{
                  bgcolor: '#DCFCE7',
                  color: '#166534',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#71717A', fontWeight: 600, mb: 1 }}>
                Etsy Order Data
                <Typography component="span" sx={{ color: '#A1A1AA', fontWeight: 400, ml: 0.5 }}>
                  (What buyer ordered)
                </Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#71717A', fontWeight: 600, mb: 1 }}>
                Product Library Match
                <Typography component="span" sx={{ color: '#A1A1AA', fontWeight: 400, ml: 0.5 }}>
                  (What we will use)
                </Typography>
              </Typography>
            </Box>
          </Box>

          <ComparisonRow
            label="Listing ID"
            etsyValue={item.etsyData.listingId}
            libraryValue={item.productLibraryMatch.listingId}
            isMatch={true}
          />
          <ComparisonRow
            label="Cover Color"
            etsyValue={item.etsyData.coverColor}
            libraryValue={item.productLibraryMatch.coverColor}
            isMatch={true}
          />
          <ComparisonRow
            label="Inside Page"
            etsyValue={item.etsyData.insidePage}
            libraryValue={item.productLibraryMatch.insidePage}
            isMatch={true}
          />
          <ComparisonRow
            label="Product"
            etsyValue={item.etsyData.title}
            libraryValue={item.productLibraryMatch.product}
            isMatch={true}
          />
          <ComparisonRow
            label="Price"
            etsyValue={`$${item.etsyData.price.toFixed(2)}`}
            libraryValue={`$${item.productLibraryMatch.price.toFixed(2)}`}
            isMatch={true}
          />

          {allMatch && (
            <Alert
              severity="info"
              icon={<CheckCircleIcon />}
              sx={{
                mt: 2,
                borderRadius: '8px',
                bgcolor: '#E0F2FE',
                border: '1px solid #BAE6FD',
                '& .MuiAlert-icon': {
                  color: '#0369A1',
                },
              }}
            >
              <Typography variant="body2" sx={{ color: '#075985', fontWeight: 500 }}>
                All key attributes match. This is a confident mapping.
              </Typography>
            </Alert>
          )}
        </Paper>

        {/* AI Personalization Review */}
        <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid #E3E3E7' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A' }}>
              2. AI Personalization Review
            </Typography>
            <Chip
              label="AI Flagged"
              icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
              size="small"
              sx={{
                bgcolor: '#FEE2E2',
                color: '#991B1B',
                fontWeight: 600,
              }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#71717A', fontWeight: 600, mb: 1 }}>
                Original Text
                <Typography component="span" sx={{ color: '#A1A1AA', fontWeight: 400, ml: 0.5 }}>
                  (From Etsy Order)
                </Typography>
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#FFFFFF',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#71717A', mt: 0.5, display: 'block' }}>
                {originalText.length} characters
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: '#71717A', fontWeight: 600, mb: 1 }}>
                Edited Text
                <Typography component="span" sx={{ color: '#A1A1AA', fontWeight: 400, ml: 0.5 }}>
                  (AI Suggestion)
                </Typography>
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#71717A', mt: 0.5, display: 'block' }}>
                {editedText.length} characters
              </Typography>
            </Box>
          </Box>

          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{
              mb: 3,
              borderRadius: '8px',
              bgcolor: '#FEF9C3',
              border: '1px solid #FDE047',
              '& .MuiAlert-icon': {
                color: '#CA8A04',
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#854D0E', mb: 0.5 }}>
              Why AI Flagged This Item
            </Typography>
            <Typography variant="body2" sx={{ color: '#854D0E' }}>
              {item.aiFlag.reason}
            </Typography>
          </Alert>

          <Box
            sx={{
              p: 2,
              bgcolor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FEE2E2',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <WarningAmberIcon sx={{ color: '#EF4444', fontSize: '20px', mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#991B1B', mb: 0.5 }}>
                  AI Reasoning Details
                </Typography>
                <Typography variant="body2" sx={{ color: '#991B1B' }}>
                  {item.aiFlag.details}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={() => navigate(`/orders/etsy2/${orderId}`)}
              sx={{
                flex: 1,
                borderColor: '#E3E3E7',
                color: '#27272A',
                '&:hover': {
                  borderColor: '#D4D4D8',
                  bgcolor: '#FAFAFA',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              startIcon={<WarningAmberIcon />}
              sx={{
                flex: 1,
                borderColor: '#FCA5A5',
                color: '#991B1B',
                '&:hover': {
                  borderColor: '#F87171',
                  bgcolor: '#FEF2F2',
                },
              }}
            >
              Override Flag
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleSaveAndMap}
              sx={{
                flex: 1,
                bgcolor: '#0EA5E9',
                '&:hover': {
                  bgcolor: '#0284C7',
                },
              }}
            >
              Save & Map
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
