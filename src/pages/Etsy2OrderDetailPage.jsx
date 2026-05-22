import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Divider,
  Avatar,
  Chip,
  Alert,
  Card,
  CardContent,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SyncIcon from '@mui/icons-material/Sync'
import PrintIcon from '@mui/icons-material/Print'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import Etsy2StatusBadge from '../components/etsy2/Etsy2StatusBadge'
import { ITEM_STATUSES } from '../lib/etsy2Constants'

// Mock data - replace with API call
const MOCK_ORDER = {
  orderId: '10234',
  buyerName: 'Emily Morgan',
  buyerEmail: 'emily.morgan@example.com',
  date: '2025-05-28T10:24:00Z',
  total: 68.50,
  address: {
    street: '123 Maple Street',
    city: 'Portland',
    state: 'OR',
    zip: '97201',
    country: 'USA',
  },
  phone: '+1 (503) 555-1234',
  joinedDate: 'Mar 12, 2023',
  buyerType: 'Returning',
  totalOrders: 8,
  totalSpent: 214.75,
  items: [
    {
      id: 1,
      name: 'Ceramic Mug - White',
      variant: 'SKU: SKU-1001 / Color: White',
      sku: 'SKU-1001',
      quantity: 1,
      price: 24.50,
      status: ITEM_STATUSES.MAPPED,
      image: '☕',
    },
    {
      id: 2,
      name: 'Botanical Wall Art',
      variant: 'SKU: SKU-1002 / Size: 8x10',
      sku: 'SKU-1002',
      quantity: 1,
      price: 44.00,
      status: ITEM_STATUSES.AI_FLAGGED,
      image: '🖼️',
      aiFlag: {
        reason: 'Text contains restricted keywords',
        originalText: 'To the best mom ever,\nThanks for everything you do!\nLove, Emma',
        suggestedText: 'To the best mom ever,\nThank you for everything you do!\nLove, Emma',
      },
    },
  ],
  orderHistory: [
    { id: '10233', date: 'May 28, 2025', amount: 32.00, status: 'Custom' },
    { id: '10232', date: 'May 27, 2025', amount: 89.75, status: 'Delivered' },
    { id: '10231', date: 'May 27, 2025', amount: 15.25, status: 'Processing' },
  ],
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatMoney = (value) => {
  const num = Number(value || 0)
  return num > 0 ? `$${num.toFixed(2)}` : '-'
}

export default function Etsy2OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order] = useState(MOCK_ORDER)
  const [syncing, setSyncing] = useState(false)

  const hasAIFlag = order.items.some((item) => item.status === ITEM_STATUSES.AI_FLAGGED)
  const aiFlaggedItem = order.items.find((item) => item.status === ITEM_STATUSES.AI_FLAGGED)

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 2000)
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/orders/etsy2')} sx={{ bgcolor: '#F4F4F5' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body2" sx={{ color: '#0EA5E9', cursor: 'pointer' }} onClick={() => navigate('/orders/etsy2')}>
            Back to Orders
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#27272A' }}>
                Order #{order.orderId}
              </Typography>
              <IconButton size="small">
                <Typography sx={{ fontSize: '16px' }}>📋</Typography>
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label="AI Flagged"
                size="small"
                sx={{
                  bgcolor: '#FEE2E2',
                  color: '#991B1B',
                  fontWeight: 600,
                }}
              />
              <Chip
                label="Processing"
                size="small"
                sx={{
                  bgcolor: '#E0F2FE',
                  color: '#075985',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
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
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              sx={{
                borderColor: '#E3E3E7',
                color: '#27272A',
                '&:hover': {
                  borderColor: '#D4D4D8',
                  bgcolor: '#FAFAFA',
                },
              }}
            >
              Print Order
            </Button>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ color: '#71717A', display: 'block', mt: 1 }}>
          Last synced: 2m ago
        </Typography>
      </Box>

      {/* AI Flagged Banner */}
      {hasAIFlag && (
        <Alert
          severity="error"
          icon={<WarningAmberIcon />}
          sx={{
            mb: 3,
            borderRadius: '12px',
            bgcolor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            '& .MuiAlert-icon': {
              color: '#EF4444',
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#991B1B', mb: 0.5 }}>
            Batch Status: AI Flagged
          </Typography>
          <Typography variant="body2" sx={{ color: '#991B1B' }}>
            One or more items in this order have been flagged by AI for review.
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        {/* Left Column */}
        <Box>
          {/* Order Info Card */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid #E3E3E7' }}>
            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography sx={{ fontSize: '16px' }}>📅</Typography>
                  <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
                    Order Date
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                  {formatDate(order.date)}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: '#F97316',
                      fontSize: '0.875rem',
                    }}
                  >
                    EM
                  </Avatar>
                  <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
                    Buyer
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                  {order.buyerName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#71717A' }}>
                  {order.buyerEmail}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography sx={{ fontSize: '16px' }}>📦</Typography>
                  <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
                    Items
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                  {order.items.length} Items
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography sx={{ fontSize: '16px' }}>💰</Typography>
                  <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
                    Total
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
                  {formatMoney(order.total)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Order Items */}
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid #E3E3E7' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A', mb: 2 }}>
              Order Items
            </Typography>

            {order.items.map((item, idx) => (
              <Box key={item.id}>
                {idx > 0 && <Divider sx={{ my: 2 }} />}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: '#F4F4F5',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                    }}
                  >
                    {item.image}
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#27272A' }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#71717A' }}>
                          {item.variant}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ color: '#71717A', mb: 0.5 }}>
                          Quantity
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
                          {item.quantity}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#71717A' }}>
                          Status
                        </Typography>
                        <Etsy2StatusBadge status={item.status} />
                        {item.status === ITEM_STATUSES.AI_FLAGGED && (
                          <WarningAmberIcon sx={{ color: '#EF4444', fontSize: '18px' }} />
                        )}
                      </Box>
                      <Typography variant="body1" sx={{ color: '#27272A', fontWeight: 600 }}>
                        {formatMoney(item.price)}
                      </Typography>
                    </Box>

                    {/* AI Review Section */}
                    {item.status === ITEM_STATUSES.AI_FLAGGED && item.aiFlag && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FEE2E2' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <WarningAmberIcon sx={{ color: '#EF4444', fontSize: '20px' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#991B1B' }}>
                            AI Review
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Personalization Text
                            </Typography>
                            <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: '6px', border: '1px solid #FEE2E2' }}>
                              <Typography variant="body2" sx={{ color: '#991B1B', whiteSpace: 'pre-line' }}>
                                {item.aiFlag.originalText}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#71717A', mt: 0.5, display: 'block' }}>
                              66 characters
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Edited Text (AI Suggestion)
                            </Typography>
                            <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderRadius: '6px', border: '1px solid #D1FAE5' }}>
                              <Typography variant="body2" sx={{ color: '#065F46', whiteSpace: 'pre-line' }}>
                                {item.aiFlag.suggestedText}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#71717A', mt: 0.5, display: 'block' }}>
                              69 characters
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ p: 1.5, bgcolor: '#FEF9C3', borderRadius: '6px', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <WarningAmberIcon sx={{ color: '#CA8A04', fontSize: '18px', mt: 0.25 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#854D0E', mb: 0.5 }}>
                                Why AI Flagged This Item
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#854D0E' }}>
                                {item.aiFlag.reason}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            fullWidth
                            sx={{
                              borderColor: '#FCA5A5',
                              color: '#991B1B',
                              '&:hover': {
                                borderColor: '#F87171',
                                bgcolor: '#FEF2F2',
                              },
                            }}
                          >
                            Edit Personalization
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<CheckCircleIcon />}
                            fullWidth
                            sx={{
                              bgcolor: '#0EA5E9',
                              '&:hover': {
                                bgcolor: '#0284C7',
                              },
                            }}
                          >
                            Save & Map
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>

        {/* Right Column */}
        <Box>
          {/* Customer Info */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid #E3E3E7' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A', mb: 2 }}>
              Customer Info
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: '#F97316',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                }}
              >
                EM
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#27272A' }}>
                  {order.buyerName}
                </Typography>
                <Typography variant="body2" sx={{ color: '#71717A' }}>
                  {order.buyerEmail}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>📍</Typography>
              <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                {order.address.street}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#71717A', ml: 3 }}>
              {order.address.city}, {order.address.state} {order.address.zip}
            </Typography>
            <Typography variant="body2" sx={{ color: '#71717A', ml: 3, mb: 2 }}>
              {order.address.country}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>📞</Typography>
              <Typography variant="body2" sx={{ color: '#27272A' }}>
                {order.phone}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>📅</Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Joined {order.joinedDate}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>🏷️</Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Buyer Type: {order.buyerType}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>📦</Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Total Orders: {order.totalOrders}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '16px' }}>💰</Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Total Spent: {formatMoney(order.totalSpent)}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              sx={{
                mt: 2,
                borderColor: '#E3E3E7',
                color: '#27272A',
                '&:hover': {
                  borderColor: '#D4D4D8',
                  bgcolor: '#FAFAFA',
                },
              }}
            >
              View Customer Profile
            </Button>
          </Paper>

          {/* Order History */}
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid #E3E3E7' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A' }}>
                Order History
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#0EA5E9', cursor: 'pointer', fontWeight: 500 }}
              >
                View All
              </Typography>
            </Box>

            {order.orderHistory.map((historyItem) => (
              <Box key={historyItem.id} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#0EA5E9', fontWeight: 500 }}>
                    #{historyItem.id}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
                    {formatMoney(historyItem.amount)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#71717A' }}>
                    {historyItem.date}
                  </Typography>
                  <Chip
                    label={historyItem.status}
                    size="small"
                    sx={{
                      height: '20px',
                      fontSize: '0.7rem',
                      bgcolor: '#F4F4F5',
                      color: '#71717A',
                    }}
                  />
                </Box>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Total Orders
              </Typography>
              <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
                {order.totalOrders}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Total Spent
              </Typography>
              <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
                {formatMoney(order.totalSpent)}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}
