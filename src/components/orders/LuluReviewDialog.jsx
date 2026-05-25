import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import api from '../../lib/api'
import { buildAssetThumbnailUrl } from '../../lib/assets'
import useAuthStore from '../../stores/authStore'

const SHIPPING_LEVELS = [
  { value: 'MAIL', label: 'Standard Mail' },
  { value: 'PRIORITY_MAIL', label: 'Priority Mail' },
  { value: 'GROUND_HD', label: 'Ground Home Delivery' },
  { value: 'GROUND_BUS', label: 'Ground Business' },
  { value: 'EXPEDITED', label: 'Expedited' },
  { value: 'EXPRESS_OVERNIGHT', label: 'Express Overnight' },
]

const COUNTRY_NAME_TO_CODE = {
  'united states': 'US',
  'united states of america': 'US',
  canada: 'CA',
  'united kingdom': 'GB',
  'great britain': 'GB',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  netherlands: 'NL',
  italy: 'IT',
  spain: 'ES',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  switzerland: 'CH',
  austria: 'AT',
  belgium: 'BE',
  ireland: 'IE',
  'new zealand': 'NZ',
  japan: 'JP',
  mexico: 'MX',
  brazil: 'BR',
  india: 'IN',
  singapore: 'SG',
  'hong kong': 'HK',
  'south korea': 'KR',
  korea: 'KR',
  israel: 'IL',
  'south africa': 'ZA',
  portugal: 'PT',
  poland: 'PL',
  'czech republic': 'CZ',
  czechia: 'CZ',
  hungary: 'HU',
  romania: 'RO',
  greece: 'GR',
  turkey: 'TR',
  ukraine: 'UA',
  russia: 'RU',
  china: 'CN',
  taiwan: 'TW',
  thailand: 'TH',
  indonesia: 'ID',
  malaysia: 'MY',
  philippines: 'PH',
  argentina: 'AR',
  colombia: 'CO',
  chile: 'CL',
  peru: 'PE',
  'united arab emirates': 'AE',
  uae: 'AE',
  'saudi arabia': 'SA',
  egypt: 'EG',
  nigeria: 'NG',
  kenya: 'KE',
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

const formatDate = (value) => {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatStatusLabel = (value) => (
  value
    ? value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    : ''
)

const normalizeCountryCode = (country) => {
  if (!country) return 'US'
  const trimmed = country.trim()
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()] || trimmed.slice(0, 2).toUpperCase()
}

const isValidLuluPodPackageId = (value) => {
  const normalized = String(value || '').trim().toUpperCase()
  return /^\d{4}X\d{4}[A-Z0-9]{18}$/.test(normalized.replace(/\./g, ''))
}

const getInitials = (value) => {
  const parts = value?.trim().split(/\s+/).filter(Boolean) || []
  if (parts.length === 0) return 'BO'
  return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
}

const buildAddressLines = (address = {}) => {
  const cityState = [address.city, address.state].filter(Boolean).join(', ')
  const locality = [cityState, address.zip].filter(Boolean).join(' ')

  return [
    address.name,
    address.street1,
    address.street2,
    locality,
    address.country || 'US',
  ].filter(Boolean)
}

function ReviewCard({ eyebrow, title, subtitle, action, children, className = '' }) {
  return (
    <Box className={cn('lulu-review-card', className)}>
      {(eyebrow || title || subtitle || action) && (
        <Box className="lulu-review-card-header">
          <Box className="lulu-review-card-copy">
            {eyebrow && (
              <Typography component="p" className="lulu-review-card-eyebrow">
                {eyebrow}
              </Typography>
            )}
            {title && (
              <Typography variant="h6" component="h3" className="lulu-review-card-title">
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography component="p" className="lulu-review-card-subtitle">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Box>
  )
}

function ReviewStat({ label, value, mono = false, tone = 'default' }) {
  return (
    <Box className={cn('lulu-review-detail', tone !== 'default' && `is-${tone}`)}>
      <Typography component="p" className="lulu-review-detail-label">
        {label}
      </Typography>
      <Typography
        component="p"
        className={cn('lulu-review-detail-value', mono && 'is-mono')}
      >
        {value}
      </Typography>
    </Box>
  )
}

function ReviewChecklistItem({
  icon,
  title,
  description,
  ready,
  href,
  actionLabel = 'Open file',
}) {
  return (
    <Box className={cn('lulu-review-check', ready ? 'is-ready' : 'is-warning')}>
      <Box className="lulu-review-check-icon">
        {icon}
      </Box>
      <Box className="lulu-review-check-body">
        <Box className="lulu-review-check-heading">
          <Typography component="p" className="lulu-review-check-title">
            {title}
          </Typography>
          <Chip
            size="small"
            label={ready ? 'Ready' : 'Needs action'}
            color={ready ? 'success' : 'warning'}
            variant={ready ? 'filled' : 'outlined'}
            className="lulu-review-check-chip"
          />
        </Box>
        <Typography component="p" className="lulu-review-check-description">
          {description}
        </Typography>
        {href && (
          <Button
            component="a"
            href={href}
            target="_blank"
            rel="noreferrer"
            size="small"
            endIcon={<OpenInNewIcon fontSize="inherit" />}
            className="lulu-review-link-button"
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default function LuluReviewDialog({ open, onClose, order, onSubmitted }) {
  const { activeStore } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [coverPreviewFailed, setCoverPreviewFailed] = useState(false)
  const [shippingLevel, setShippingLevel] = useState('MAIL')

  useEffect(() => {
    setCoverPreviewFailed(false)
  }, [order?.coverImageUrl])

  // Initialise shipping level from order or store default when dialog opens
  useEffect(() => {
    if (open && order) {
      setShippingLevel(order.shippingLevel || activeStore?.shippingLevel || 'MAIL')
    }
  }, [open, order, activeStore])

  if (!order) return null

  const storeName = activeStore?.name || 'Beatific'
  const resolvedPhone = order.shippingAddress?.phone || activeStore?.contactPhone || ''

  const luluPayload = {
    external_id: String(order.etsyOrderId),
    line_items: [{
      title: order.productTitle || `Order ${order.etsyOrderId}`,
      pod_package_id: order.podPackageId,
      quantity: order.quantity,
      interior: { source_url: order.interiorPdfUrl },
      cover: { source_url: order.coverImageUrl },
    }],
    shipping_address: {
      name: order.shippingAddress?.name,
      street1: order.shippingAddress?.street1,
      street2: order.shippingAddress?.street2 || '',
      city: order.shippingAddress?.city,
      state_code: order.shippingAddress?.state,
      postcode: String(order.shippingAddress?.zip || ''),
      country_code: normalizeCountryCode(order.shippingAddress?.country),
      phone_number: resolvedPhone,
    },
    shipping_level: shippingLevel,
    contact_email: order.customerEmail || 'orders@beatific.co',
  }

  const payloadStr = JSON.stringify(luluPayload, null, 2)

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payloadStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/lulu/submit/${order._id}`, { shippingLevel })
      onSubmitted?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit to Lulu')
    } finally {
      setSubmitting(false)
    }
  }

  const hasCover = Boolean(order.coverImageUrl)
  const thumbnailUrl = hasCover && !coverPreviewFailed ? buildAssetThumbnailUrl(order.coverImageUrl) : ''
  const canPreviewCover = Boolean(thumbnailUrl && !coverPreviewFailed)
  const canSubmit = order.coverImageUrl && order.interiorPdfUrl && order.podPackageId
  const addressLines = buildAddressLines(order.shippingAddress)
  const shipByDate = order.shipByDate ? new Date(order.shipByDate) : null
  const isOverdue = shipByDate ? shipByDate < new Date() : false

  const missingRequirements = [
    !order.coverImageUrl && 'cover PDF',
    !order.interiorPdfUrl && 'interior PDF',
    !order.podPackageId && 'Pod package ID',
  ].filter(Boolean)

  const readinessItems = [
    {
      icon: <ImageOutlinedIcon fontSize="small" />,
      title: 'Cover PDF',
      description: order.coverImageUrl
        ? 'The print-ready cover PDF is linked and ready for Lulu to fetch.'
        : 'Upload or link the final cover PDF before submitting this order.',
      ready: Boolean(order.coverImageUrl),
      href: order.coverImageUrl,
      actionLabel: 'Open cover PDF',
    },
    {
      icon: <DescriptionOutlinedIcon fontSize="small" />,
      title: 'Interior PDF',
      description: order.interiorPdfUrl
        ? 'The interior file is available and included in the payload.'
        : 'Upload or link the interior PDF so Lulu can print the inside pages.',
      ready: Boolean(order.interiorPdfUrl),
      href: order.interiorPdfUrl,
      actionLabel: 'Open PDF',
    },
    {
      icon: <Inventory2OutlinedIcon fontSize="small" />,
      title: 'Pod package mapping',
      description: order.podPackageId
        ? isValidLuluPodPackageId(order.podPackageId)
          ? 'This product is mapped to a Lulu package and ready for production.'
          : 'This looks like a shorthand Lulu SKU. Replace it with the 27-character pod_package_id from Lulu.'
        : 'Assign a Lulu Pod package ID before sending the order.',
      ready: Boolean(order.podPackageId && isValidLuluPodPackageId(order.podPackageId)),
    },
    {
      icon: <LocalShippingOutlinedIcon fontSize="small" />,
      title: 'Shipping destination',
      description: addressLines.length > 2
        ? resolvedPhone
          ? order.shippingAddress?.phone
            ? 'The shipping address and customer contact phone look ready for fulfillment.'
            : 'The shipping address is ready and will use the store fallback contact phone.'
          : 'Add a customer phone on this order or a default contact phone in Store settings so Lulu can accept this shipment.'
        : 'Add the shipping address details so the print order can be delivered.',
      ready: Boolean(order.shippingAddress?.street1 && order.shippingAddress?.city && order.shippingAddress?.country && resolvedPhone),
    },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: { className: 'lulu-review-paper' },
      }}
    >
      <DialogTitle className="lulu-review-title">
        <Box className="lulu-review-hero">
          <IconButton
            onClick={onClose}
            aria-label="Close review dialog"
            className="lulu-review-close"
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>

          <Box className="lulu-review-kicker-row">
            <Box className="lulu-review-kicker-pill">
              <LocalPrintshopOutlinedIcon fontSize="inherit" />
              <span>Lulu submission review</span>
            </Box>
            <Chip
              size="small"
              color={canSubmit ? 'success' : 'warning'}
              variant={canSubmit ? 'filled' : 'outlined'}
              icon={canSubmit ? <CheckCircleRoundedIcon /> : <WarningAmberRoundedIcon />}
              label={canSubmit ? 'Ready for Lulu' : 'Needs attention'}
              className="lulu-review-hero-chip"
            />
          </Box>

          <Typography variant="h4" component="h2" className="lulu-review-heading">
            Order #{order.etsyOrderId}
          </Typography>

          <Typography component="p" className="lulu-review-product">
            {order.productTitle || 'Untitled product'}
          </Typography>

          <Typography component="p" className="lulu-review-subtitle">
            Review the shipping details, production assets, and API payload before this print job is sent to Lulu.
          </Typography>

          <Box className="lulu-review-customer-row">
            <Box className="lulu-review-customer-card">
              <Box className="lulu-review-avatar">
                {getInitials(order.customerName)}
              </Box>
              <Box className="lulu-review-customer-copy">
                <Typography component="p" className="lulu-review-customer-name">
                  {order.customerName || 'Unknown customer'}
                </Typography>
                <Typography component="p" className="lulu-review-customer-meta">
                  {order.customerEmail || 'orders@beatific.co'}
                </Typography>
              </Box>
            </Box>

            <Box className="lulu-review-chip-row">
              {order.etsyStatus && (
                <Chip
                  size="small"
                  label={`Etsy ${formatStatusLabel(order.etsyStatus)}`}
                  variant="outlined"
                  className="lulu-review-status-chip"
                />
              )}
              {order.luluStatus && (
                <Chip
                  size="small"
                  label={`Lulu ${formatStatusLabel(order.luluStatus)}`}
                  variant="outlined"
                  className="lulu-review-status-chip"
                />
              )}
            </Box>
          </Box>

          <Box className="lulu-review-stat-grid">
            <Box className="lulu-review-stat">
              <Typography component="p" className="lulu-review-stat-label">
                Quantity
              </Typography>
              <Typography component="p" className="lulu-review-stat-value">
                {order.quantity || 1} {order.quantity === 1 ? 'unit' : 'units'}
              </Typography>
            </Box>

            <Box className="lulu-review-stat">
              <Typography component="p" className="lulu-review-stat-label">
                Pod package
              </Typography>
              <Typography
                component="p"
                className={cn('lulu-review-stat-value', 'is-mono', !order.podPackageId && 'is-warning')}
              >
                {order.podPackageId || 'Missing'}
              </Typography>
            </Box>

            <Box className="lulu-review-stat">
              <Typography component="p" className="lulu-review-stat-label">
                Destination
              </Typography>
              <Typography component="p" className="lulu-review-stat-value">
                {order.shippingAddress?.country || 'US'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent className="lulu-review-content">
        <Box className="lulu-review-stack">
          {error && (
            <Alert severity="error" className="lulu-review-alert">
              {error}
            </Alert>
          )}

          {!canSubmit && (
            <Alert severity="warning" className="lulu-review-alert">
              Missing {missingRequirements.join(', ')}. Upload or link the required items before sending this job to Lulu.
            </Alert>
          )}

          <Box className="lulu-review-layout">
            <Box className="lulu-review-column">
              <ReviewCard
                eyebrow="Order overview"
                title="Production summary"
                subtitle="Core order data that will accompany the Lulu print request."
              >
                <Box className="lulu-review-detail-grid">
                  <ReviewStat label="Order ID" value={`#${order.etsyOrderId || 'Not available'}`} mono />
                  <ReviewStat label="Listing ID" value={order.listingId || 'Not linked'} mono={Boolean(order.listingId)} />
                  <ReviewStat label="Ordered" value={formatDate(order.orderedAt)} />
                  <ReviewStat
                    label="Ship by"
                    value={formatDate(order.shipByDate)}
                    tone={isOverdue ? 'danger' : 'default'}
                  />
                  <ReviewStat label="Contact email" value={order.customerEmail || 'orders@beatific.co'} />
                  <ReviewStat label="External ID" value={String(order.etsyOrderId || 'Not available')} mono />
                </Box>
              </ReviewCard>

              <ReviewCard
                eyebrow="Delivery"
                title={addressLines[0] || 'Shipping address'}
                subtitle="This is the destination Lulu will use for fulfillment."
              >
                <Box className="lulu-review-address-wrap">
                  <Box className="lulu-review-icon-badge">
                    <LocalShippingOutlinedIcon fontSize="small" />
                  </Box>
                  <Box className="lulu-review-address-block">
                    {addressLines.length > 0 ? (
                      addressLines.map((line) => (
                        <Typography key={line} component="p" className="lulu-review-address-line">
                          {line}
                        </Typography>
                      ))
                    ) : (
                      <Typography component="p" className="lulu-review-muted-note">
                        No shipping address has been added yet.
                      </Typography>
                    )}
                    <Typography component="p" className="lulu-review-inline-note">
                      Sender on the shipping label: <strong>{storeName}</strong>
                      {' '}(configured in your Lulu account settings)
                    </Typography>
                  </Box>
                </Box>
              </ReviewCard>

              {/* Shipping level selector */}
              <ReviewCard
                eyebrow="Shipping"
                title="Shipping level"
                subtitle="Select the service level for this print job. This is sent directly to Lulu."
              >
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Shipping level</InputLabel>
                  <Select
                    value={shippingLevel}
                    label="Shipping level"
                    onChange={(e) => setShippingLevel(e.target.value)}
                  >
                    {SHIPPING_LEVELS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </ReviewCard>

              <ReviewCard
                eyebrow="Production readiness"
                title={canSubmit ? 'Everything looks ready' : 'A few items still need attention'}
                subtitle="Resolve any warnings below before approving this Lulu submission."
              >
                <Box className="lulu-review-checklist">
                  {readinessItems.map((item) => (
                    <ReviewChecklistItem key={item.title} {...item} />
                  ))}
                </Box>
              </ReviewCard>
            </Box>

            <Box className="lulu-review-column">
              <ReviewCard
                eyebrow="Cover preview"
                title={hasCover ? (canPreviewCover ? 'Cover artwork ready' : 'Cover file linked') : 'No cover uploaded'}
                subtitle={canPreviewCover
                  ? 'The original cover URL will be sent to Lulu without compression.'
                  : hasCover
                    ? 'This cover file cannot be previewed here, but the original URL will still be sent to Lulu.'
                    : 'Upload or link a final cover PDF before sending this order.'}
              >
                <Box className="lulu-review-cover-frame">
                  {canPreviewCover ? (
                    <Box
                      component="img"
                      src={thumbnailUrl}
                      alt="Cover preview"
                      onError={() => setCoverPreviewFailed(true)}
                      className="lulu-review-cover-image"
                    />
                  ) : hasCover ? (
                    <Box className="lulu-review-empty-state">
                      <DescriptionOutlinedIcon />
                      <Typography component="p" className="lulu-review-empty-title">
                        Cover preview unavailable
                      </Typography>
                      <Typography component="p" className="lulu-review-empty-copy">
                        This cover file is still linked and ready to send to Lulu.
                      </Typography>
                    </Box>
                  ) : (
                    <Box className="lulu-review-empty-state">
                      <WarningAmberRoundedIcon />
                      <Typography component="p" className="lulu-review-empty-title">
                        No cover available
                      </Typography>
                      <Typography component="p" className="lulu-review-empty-copy">
                        Add a cover PDF URL to unlock Lulu submission for this order.
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box className="lulu-review-link-grid">
                  {order.coverImageUrl ? (
                    <Button
                      component="a"
                      href={order.coverImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      endIcon={<OpenInNewIcon fontSize="inherit" />}
                      className="lulu-review-file-button"
                    >
                      Open cover PDF
                    </Button>
                  ) : (
                    <Box className="lulu-review-link-missing">Cover not uploaded</Box>
                  )}

                  {order.interiorPdfUrl ? (
                    <Button
                      component="a"
                      href={order.interiorPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      endIcon={<OpenInNewIcon fontSize="inherit" />}
                      className="lulu-review-file-button"
                    >
                      Open interior PDF
                    </Button>
                  ) : (
                    <Box className="lulu-review-link-missing">Interior PDF missing</Box>
                  )}
                </Box>
              </ReviewCard>

              <ReviewCard
                eyebrow="Payload preview"
                title="Lulu API request"
                subtitle="This JSON payload is what the app will send when you approve the order."
                action={(
                  <Tooltip title={copied ? 'Copied!' : 'Copy payload'}>
                    <IconButton
                      size="small"
                      onClick={handleCopyPayload}
                      className="lulu-review-copy"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              >
                <Typography component="p" className="lulu-review-payload-note">
                  External ID, files (as source URLs), shipping level, and address are shown exactly as prepared for Lulu.
                </Typography>
                <Box component="pre" className="lulu-review-code">
                  {payloadStr}
                </Box>
              </ReviewCard>

              <Alert
                severity="info"
                icon={<LocalPrintshopOutlinedIcon />}
                className="lulu-review-alert"
              >
                The store name <strong>{storeName}</strong> appears on the Lulu shipping label — set
                this in your Lulu account settings, not the API. Files are sent as URLs (no upload required).
              </Alert>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions className="lulu-review-actions">
        <Typography component="p" className="lulu-review-actions-note">
          Approving sends a live print request to Lulu for order #{order.etsyOrderId}.
        </Typography>

        <Box className="lulu-review-actions-buttons">
          <Button onClick={onClose} color="inherit" disabled={submitting} className="lulu-review-cancel-btn">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LocalPrintshopOutlinedIcon />}
            className="lulu-review-submit-btn"
          >
            {submitting ? 'Submitting...' : 'Approve and send to Lulu'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
