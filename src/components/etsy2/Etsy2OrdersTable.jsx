import { useState } from 'react'
import {
  Avatar,
  Box,
  Checkbox,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Etsy2StatusBadge from './Etsy2StatusBadge'
import { deriveBatchStatus } from '../../lib/etsy2Constants'
import { formatDate, formatMoney, getInitials } from '../../lib/etsy2Orders'

function OrderRow({
  order,
  onViewOrder,
  onGenerateOrder,
  canManage,
  selected,
  onToggleOrder,
  generating,
}) {
  const [open, setOpen] = useState(false)
  const batchStatus = deriveBatchStatus(order.items)
  const hasAIFlag = order.items?.some((item) => item.status === 'ai_flagged')
  const shipByIsLate = order.shipByDate && new Date(order.shipByDate) < new Date() && order.status !== 'completed'

  return (
    <>
      <TableRow
        hover
        onClick={() => onViewOrder?.(order)}
        sx={{
          '& > *': { borderBottom: open ? 'none !important' : undefined },
          cursor: 'pointer',
        }}
      >
        {canManage && (
          <TableCell sx={{ width: 48 }}>
            <Checkbox
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onToggleOrder?.(order.orderId, e.target.checked)}
            />
          </TableCell>
        )}

        <TableCell sx={{ width: 48 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#F97316', fontWeight: 700, fontFamily: 'monospace' }}>
            #{order.orderId}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#71717A' }}>
            {order.totalItems || order.items?.length || 0} item{(order.totalItems || order.items?.length) === 1 ? '' : 's'} / Qty {order.totalQuantity || 0}
          </Typography>
          {hasAIFlag && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: '#EF4444' }}>
              <WarningAmberIcon sx={{ fontSize: 15 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Needs review
              </Typography>
            </Box>
          )}
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
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#27272A' }}>
                {order.buyerName || 'Unknown'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: '#71717A', wordBreak: 'break-word' }}>
                {order.buyerEmail || ''}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#27272A' }}>
            {order.shop || '-'}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#71717A' }}>
            {formatDate(order.date, true)}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography
            variant="body2"
            sx={{
              color: shipByIsLate ? '#EF4444' : '#27272A',
              fontWeight: shipByIsLate ? 700 : 400,
            }}
          >
            {formatDate(order.shipByDate)}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600 }}>
            {formatMoney(order.total)}
          </Typography>
        </TableCell>

        <TableCell>
          <Etsy2StatusBadge status={batchStatus} />
        </TableCell>

        <TableCell align="right">
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title="View">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewOrder?.(order)
                }}
              >
                <VisibilityOutlinedIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Generate PDFs">
              <span>
                <IconButton
                  size="small"
                  disabled={generating}
                  onClick={(e) => {
                    e.stopPropagation()
                    onGenerateOrder?.(order)
                  }}
                >
                  {generating ? <CircularProgress size={18} /> : <PrintOutlinedIcon sx={{ fontSize: '18px' }} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={canManage ? 10 : 9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, bgcolor: '#FAFAFA' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#27272A', fontWeight: 600 }}>
                Order Items ({order.items?.length || 0})
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>SKU / Txn</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                        {item.variant && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#71717A' }}>
                            {item.variant}
                          </Typography>
                        )}
                        {item.aiFlags?.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#EF4444', mt: 0.5 }}>
                            {item.aiFlags.join('; ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#71717A', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {item.sku || '-'}
                        </Typography>
                        {item.transactionId && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#A1A1AA', fontFamily: 'monospace' }}>
                            Txn {item.transactionId}
                          </Typography>
                        )}
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
                        <Tooltip title="View order">
                          <IconButton size="small" onClick={() => onViewOrder?.(order)}>
                            <VisibilityOutlinedIcon sx={{ fontSize: '16px' }} />
                          </IconButton>
                        </Tooltip>
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

export default function Etsy2OrdersTable({
  orders = [],
  onViewOrder,
  onGenerateOrder,
  canManage = false,
  selectedOrderIds = [],
  onToggleOrder,
  onToggleVisible,
  allVisibleSelected = false,
  partiallyVisibleSelected = false,
  generatingOrderIds = {},
}) {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid #E3E3E7' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFAFA' }}>
            {canManage && (
              <TableCell sx={{ width: 48 }}>
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={partiallyVisibleSelected}
                  onChange={(e) => onToggleVisible?.(e.target.checked)}
                />
              </TableCell>
            )}
            <TableCell sx={{ width: 48 }} />
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Order #
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Customer
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Shop
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Payment Date
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#71717A', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Ship By
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
            <OrderRow
              key={order.orderId}
              order={order}
              onViewOrder={onViewOrder}
              onGenerateOrder={onGenerateOrder}
              canManage={canManage}
              selected={selectedOrderIds.includes(order.orderId)}
              onToggleOrder={onToggleOrder}
              generating={Boolean(generatingOrderIds[order.orderId])}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
