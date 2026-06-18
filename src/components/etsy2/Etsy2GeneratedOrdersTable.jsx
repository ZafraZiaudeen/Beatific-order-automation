import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import Etsy2StatusBadge from './Etsy2StatusBadge'
import { buildAssetThumbnailUrl } from '../../lib/assets'
import { getGeneratedOrderItem } from '../../lib/generatedOrders'
import { formatDate, optionText } from '../../lib/etsy2Orders'

const isImageUrl = (value = '') => /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value)

function ProductThumb({ item }) {
  const coverUrl = item?.sourceOrder?.coverImageUrl

  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '4px',
        border: '1px solid #E5E7EB',
        bgcolor: '#F8FAFC',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {coverUrl && isImageUrl(coverUrl) ? (
        <Box
          component="img"
          src={buildAssetThumbnailUrl(coverUrl, 120)}
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <ArticleOutlinedIcon sx={{ fontSize: 22, color: '#5B21B6' }} />
      )}
    </Box>
  )
}

export default function Etsy2GeneratedOrdersTable({
  orders = [],
  canManage = false,
  selectedOrderIds = [],
  onToggleOrder,
  onToggleVisible,
  allVisibleSelected = false,
  partiallyVisibleSelected = false,
  onPreview,
  onEditCanvas,
  onGenerateOrder,
  onCancelGeneration,
  onSendToLulu,
  generatingOrderIds = {},
  sendingOrderIds = {},
  onDeleteOrder,
}) {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', borderTop: '1px solid #E5E7EB', borderRadius: 0 }}>
      <Table sx={{ minWidth: 1120 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FFFFFF' }}>
            {canManage && (
              <TableCell sx={{ width: 52 }}>
                <Checkbox
                  size="small"
                  checked={allVisibleSelected}
                  indeterminate={partiallyVisibleSelected}
                  onChange={(e) => onToggleVisible?.(e.target.checked)}
                  sx={{ color: '#5B21B6', '&.Mui-checked': { color: '#5B21B6' } }}
                />
              </TableCell>
            )}
            <TableCell sx={{ fontWeight: 800, color: '#111827' }}>Order ID</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#111827' }}>Buyer</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#111827' }}>Product</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#111827' }}>Template</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#111827' }}>Generated Date</TableCell>
            <TableCell sx={{ fontWeight: 800, color: '#111827' }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, color: '#111827' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => {
            const item = getGeneratedOrderItem(order)
            const source = item?.sourceOrder || {}
            const generatedAt = source.templateFinalizedAt || source.updatedAt || order.sourceGroup?.updatedAt || order.date
            const templateName = source.matchedVariantName || source.projectName || 'Print Template'
            const generating = Boolean(generatingOrderIds[order.orderId])
            const sending = Boolean(sendingOrderIds[order.orderId])
            const orderStatus = item?.status || order?.status
            const canGenerate = Boolean(item?.sourceOrder?.isProductMapped)

            return (
              <TableRow key={order.orderId} hover sx={{ '& td': { borderColor: '#EEF2F7', py: 2 } }}>
                {canManage && (
                  <TableCell>
                    <Checkbox
                      size="small"
                      checked={selectedOrderIds.includes(order.orderId)}
                      onChange={(e) => onToggleOrder?.(order.orderId, e.target.checked)}
                      sx={{ color: '#5B21B6', '&.Mui-checked': { color: '#5B21B6' } }}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#4F46E5', fontWeight: 800 }}>
                    #{order.orderId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#1F2937', fontWeight: 600 }}>
                    {order.buyerName || 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 260 }}>
                    <ProductThumb item={item} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ color: '#111827', fontWeight: 800 }}>
                        {item?.name || source.productTitle || 'Generated product'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {optionText(source) || source.matchedVariantName || 'Print-ready PDF'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                    {templateName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
                    {formatDate(generatedAt, true)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Etsy2StatusBadge status={orderStatus} showIcon={false} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => onPreview?.(order)}
                      sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700, borderRadius: '6px' }}
                    >
                      Preview
                    </Button>
                    {canManage && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={generating ? <CircularProgress size={14} /> : <PrintOutlinedIcon />}
                        disabled={generating || !canGenerate}
                        onClick={() => onGenerateOrder?.(order)}
                        sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700, borderRadius: '6px' }}
                      >
                        {generating ? 'Generating...' : 'Generate PDF'}
                      </Button>
                    )}
                    {canManage && generating && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelOutlinedIcon />}
                        onClick={() => onCancelGeneration?.(order)}
                        sx={{ fontWeight: 700, borderRadius: '6px' }}
                      >
                        Cancel
                      </Button>
                    )}
                    {canManage && onEditCanvas && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => onEditCanvas?.(order)}
                        sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700, borderRadius: '6px' }}
                      >
                        Edit PDF
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={sending ? <CircularProgress size={14} /> : <LocalShippingOutlinedIcon />}
                        disabled={sending}
                        onClick={() => onSendToLulu?.(order)}
                        sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700, borderRadius: '6px' }}
                      >
                        {orderStatus === 'failed' ? 'Resend to Lulu' : 'Send to Lulu'}
                      </Button>
                    )}
                    {canManage && onDeleteOrder && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => onDeleteOrder?.(order)}
                        sx={{ fontWeight: 700, borderRadius: '6px' }}
                      >
                        Delete
                      </Button>
                    )}
                    <IconButton size="small" sx={{ color: '#334155' }}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
