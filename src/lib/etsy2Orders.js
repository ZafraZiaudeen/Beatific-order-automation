import { ITEM_STATUSES } from './etsy2Constants'
import api from './api'

export const STATUS_PRIORITY = [
  'waiting',
  'custom_orders',
  'in_progress',
  'completed',
]

const NON_REVIEW_AI_FLAGS = new Set(['Missing Product Mapping', 'Lulu Rejected'])

export const getPresetDateRange = (preset) => {
  if (!preset || preset === 'all') return {}

  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (preset === '7d') start.setDate(start.getDate() - 6)
  if (preset === '30d') start.setDate(start.getDate() - 29)
  if (preset === '90d') start.setDate(start.getDate() - 89)
  if (preset === '1y') start.setMonth(0, 1)

  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

export const formatDate = (value, includeTime = false) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

export const formatMoney = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return '-'
  return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'

const firstGroupOrder = (orders) =>
  [...orders].sort((a, b) => {
    if (a.isFirstItem !== b.isFirstItem) return a.isFirstItem ? -1 : 1
    return (a.itemIndexInOrder ?? 999) - (b.itemIndexInOrder ?? 999)
  })[0]

export const deriveGroupStatus = (orders) => {
  if (!orders.length) return 'waiting'
  if (orders.every((order) => order.etsyStatus === 'completed')) return 'completed'
  const normalized = orders.map((order) => {
    if (['new', 'drawings', 'ready_to_order'].includes(order.etsyStatus)) {
      return { ...order, etsyStatus: 'in_progress' }
    }
    return order
  })
  return STATUS_PRIORITY.find((status) => normalized.some((order) => order.etsyStatus === status)) || normalized[0].etsyStatus
}

export const groupTotal = (orders) => {
  const priced = orders.find((order) => Number(order.pricing?.orderTotal || 0) > 0)
  if (priced) return Number(priced.pricing.orderTotal || 0)
  return orders.reduce((sum, order) => (
    sum + Number(order.price || 0) * Number(order.quantity || 1) + Number(order.shippingCost || 0)
  ), 0)
}

export const buildOrderGroups = (orders) => {
  const grouped = new Map()
  for (const order of orders || []) {
    if (!order?.etsyOrderId) continue
    grouped.set(order.etsyOrderId, [...(grouped.get(order.etsyOrderId) || []), order])
  }

  return [...grouped.values()]
    .map((items) => {
      const first = firstGroupOrder(items)
      const aiFlags = [...new Set(items.flatMap((item) => item.aiFlags || []))]
      const reviewFlags = aiFlags.filter((flag) => !NON_REVIEW_AI_FLAGS.has(flag))
      return {
        etsyOrderId: first.etsyOrderId,
        orderIds: items.map((item) => item._id),
        firstOrder: first,
        customerName: first.customerName,
        customerEmail: first.customerEmail,
        shippingAddress: first.shippingAddress,
        shop: first.shop,
        orderedAt: first.orderedAt,
        shipByDate: first.shipByDate,
        status: deriveGroupStatus(items),
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
        total: groupTotal(items),
        hasUnmapped: items.some((item) => !item.isProductMapped),
        hasAiFlags: reviewFlags.length > 0,
        aiFlags,
        reviewFlags,
        hasCustomArtwork: items.some((item) => item.hasCustomArtwork),
        updatedAt: items.reduce((latest, item) => Math.max(latest, new Date(item.updatedAt || 0).getTime()), 0),
        items,
      }
    })
    .sort((a, b) => new Date(b.orderedAt || b.updatedAt || 0).getTime() - new Date(a.orderedAt || a.updatedAt || 0).getTime())
}

export const reviewFlagsFor = (item) => (item.aiFlags || []).filter((flag) => !NON_REVIEW_AI_FLAGS.has(flag))

export const getItemStatus = (item) => {
  const hasBothGeneratedPdfs = Boolean(item.coverImageUrl && item.interiorPdfUrl)
  const hasGeneratedTemplate = hasBothGeneratedPdfs && item.templateFinalizedAt && !item.requiresTemplateFinalization

  if (item.luluStatus === 'failed' && hasGeneratedTemplate) return ITEM_STATUSES.FAILED
  if (hasGeneratedTemplate && (item.luluStatus === 'shipped' || item.etsyStatus === 'completed')) return ITEM_STATUSES.SHIPPED
  if (hasGeneratedTemplate) return ITEM_STATUSES.GENERATED
  if (reviewFlagsFor(item).length > 0) return ITEM_STATUSES.AI_FLAGGED
  if (!item.isProductMapped) return ITEM_STATUSES.UNMAPPED
  if (item.hasCustomArtwork || item.etsyStatus === 'custom_orders') return ITEM_STATUSES.CUSTOM
  if (item.luluStatus === 'shipped' || item.etsyStatus === 'completed') return ITEM_STATUSES.SHIPPED
  return ITEM_STATUSES.MAPPED
}

export const optionText = (item) => [
  item.option1Name && item.option1Value ? `${item.option1Name}: ${item.option1Value}` : null,
  item.option2Name && item.option2Value ? `${item.option2Name}: ${item.option2Value}` : null,
  item.matchedVariantName ? `Variant: ${item.matchedVariantName}` : null,
].filter(Boolean).join(' / ')

export const toEtsy2Order = (group) => ({
  orderId: String(group.etsyOrderId),
  buyerName: group.customerName,
  buyerEmail: group.customerEmail,
  shop: group.shop,
  date: group.orderedAt,
  shipByDate: group.shipByDate,
  total: group.total,
  status: group.status,
  totalItems: group.totalItems,
  totalQuantity: group.totalQuantity,
  hasUnmapped: group.hasUnmapped,
  hasAiFlags: group.hasAiFlags,
  reviewFlags: group.reviewFlags || [],
  sourceGroup: group,
  items: group.items.map((item, index) => ({
    id: item._id || item.etsyItemId || `${group.etsyOrderId}-${index}`,
    sourceOrder: item,
    name: item.productTitle || `Item ${index + 1}`,
    variant: optionText(item),
    sku: item.sku || item.listingId || item.etsyItemId,
    transactionId: item.etsyItemId,
    listingId: item.listingId,
    quantity: item.quantity || 1,
    price: item.price,
    status: getItemStatus(item),
    icon: 'Item',
    aiFlags: reviewFlagsFor(item),
  })),
})

export const toEtsy2GroupOrder = (group) => toEtsy2Order({
  ...group,
  reviewFlags: (group.aiFlags || []).filter((flag) => !NON_REVIEW_AI_FLAGS.has(flag)),
  hasAiFlags: (group.aiFlags || []).some((flag) => !NON_REVIEW_AI_FLAGS.has(flag)),
})

export const addressLines = (address = {}) => [
  address.name,
  address.street1,
  address.street2,
  [address.city, address.state, address.zip].filter(Boolean).join(', '),
  address.country,
].filter(Boolean)

export const buildOrderFileUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const base = String(api.defaults.baseURL || '').replace(/\/+$/, '')
  if (url.startsWith('/api/')) return `${base.replace(/\/api$/i, '')}${url}`
  if (url.startsWith('/')) return `${base}${url}`
  return `${base}/${url}`
}
