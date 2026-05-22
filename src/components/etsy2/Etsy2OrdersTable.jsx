import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Collapse,
  Typography,
  Tooltip,
  Paper,
} from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Etsy2StatusBadge from './Etsy2StatusBadge'
import { deriveBatchStatus } from '../../lib/etsy2Constants'

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatMoney = (value) => {
  const num = Number(value || 0)
  return num > 0 ? `$${num.toFixed(2)}` : '-'
}

const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function OrderRow({ order }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  
  const batchStatus = deriveBatchStatus(order.items)
  const hasAIFlag = order.items?.some((item) => item.status === 'ai_flagged')

  return (
    <>
      <TableRow
        hover
        sx={{
          '& > *': { borderBottom: open ? 'none !important' : undefined },
          cursor: 'pointer',
        }}
      >
        <TableCell sx={{ width: 48 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: '#F97316',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {getInitials(order.buyerName)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#27272A' }}>
                {order.buyerName || 'Unknown'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#71717A' }}>
                {order.buyerEmail || ''}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
            #{order.orderId}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#71717A' }}>
            {formatDate(order.date)}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
            {order.items?.length || 0}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
            {formatMoney(order.total)}
          </Typography>
        </TableCell>

        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Etsy2StatusBadge status={batchStatus} />
            {hasAIFlag && (
              <Tooltip title="AI Flagged - Requires attention">
                <WarningAmberIcon sx={{ color: '#EF4444', fontSize: '18px' }} />
              </Tooltip>
            )}
          </Box>
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title="View">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/orders/etsy2/${order.orderId}`)
                }}
              >
                <VisibilityOutlinedIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                <EditOutlinedIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                <PrintOutlinedIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      {/* Expanded Row - Order Items */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, bgcolor: '#FAFAFA' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#27272A', fontWeight: 600 }}>
                Order Items ({order.items?.length || 0})
              </Typography>
              
              {hasAIFlag && (
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    bgcolor: '#FEF2F2',
                    border: '1px solid #FEE2E2',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <WarningAmberIcon sx={{ color: '#EF4444', fontSize: '20px' }} />
                  <Typography variant="body2" sx={{ color: '#991B1B' }}>
                    This order is AI Flagged due to 1 item requiring attention.
                  </Typography>
                </Box>
              )}

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map((item, idx) => (
                    <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: '#F4F4F5',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
                            {item.icon || '📦'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                        {item.variant && (
                          <Typography variant="caption" sx={{ color: '#71717A' }}>
                            {item.variant}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#71717A', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {item.sku || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#27272A' }}>
                          {item.quantity || 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                          {formatMoney(item.price)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Etsy2StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <VisibilityOutlinedIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small">
                              <EditOutlinedIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function Etsy2OrdersTable({ orders = [] }) {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid #E3E3E7' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFAFA' }}>
            <TableCell sx={{ width: 48 }} />
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Buyer
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Order ID
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Date
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Items
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Total
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Status
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <OrderRow key={order.orderId} order={order} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
