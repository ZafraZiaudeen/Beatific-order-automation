import { ITEM_STATUSES } from './etsy2Constants'
import { buildOrderFileUrl } from './etsy2Orders'
export { isGeneratedPdfUrl } from './generatedPdfUrls'
import { isGeneratedPdfUrl } from './generatedPdfUrls'

export const GENERATED_ORDER_STATUSES = [
  ITEM_STATUSES.GENERATED,
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.SHIPPED,
]

const generatedMetadataUrlKeys = {
  cover: ['_canvasPdfUrl:cover', '_editablePdfUrl:cover'],
  interior: ['_canvasPdfUrl:interior', '_editablePdfUrl:interior'],
}

const generatedMetadataUrlFor = (source, kind) => {
  const values = source?.templateFieldValues || {}
  return (generatedMetadataUrlKeys[kind] || [])
    .map((key) => values[key])
    .find(isGeneratedPdfUrl) || ''
}

export const generatedPdfUrlFor = (item, kind) => {
  const source = item?.sourceOrder || item || {}
  const directUrl = kind === 'interior' ? source.interiorPdfUrl : source.coverImageUrl
  if (isGeneratedPdfUrl(directUrl)) return directUrl
  return generatedMetadataUrlFor(source, kind)
}

export const hasGeneratedPdfFiles = (item) => {
  return Boolean(generatedPdfUrlFor(item, 'cover') || generatedPdfUrlFor(item, 'interior'))
}

export const hasAnyPdfFiles = (item) => {
  const source = item?.sourceOrder || item || {}
  return Boolean(source.coverImageUrl || source.interiorPdfUrl)
}

export const hasFinalizedGeneratedTemplate = (item) => {
  const source = item?.sourceOrder || item || {}
  return Boolean(
    hasGeneratedPdfFiles(item) &&
    source.templateFinalizedAt &&
    !source.requiresTemplateFinalization
  )
}

export const isGeneratedOrderItem = (item) => hasGeneratedPdfFiles(item)

export const isPreviewableGeneratedPdf = (_item, url) => isGeneratedPdfUrl(url)

export const getGeneratedOrderItems = (order) =>
  (order?.items || []).filter(isGeneratedOrderItem)

export const hasGeneratedOrderItems = (order) =>
  getGeneratedOrderItems(order).length > 0

export const getGeneratedOrderItem = (order) =>
  getGeneratedOrderItems(order)[0] || null

export const getGeneratedOrderSourceIds = (order) =>
  getGeneratedOrderItems(order)
    .map((item) => item.sourceOrder?._id)
    .filter(Boolean)

export const buildGeneratedPreviewAssets = (order) =>
  getGeneratedOrderItems(order).flatMap((item, index) => {
    const source = item.sourceOrder || {}
    const itemName = item.name || source.productTitle || `Item ${index + 1}`
    const itemId = source._id || item.id || `${order?.orderId || order?.etsyOrderId || 'order'}-${index}`
    const coverUrl = generatedPdfUrlFor(item, 'cover')
    const interiorUrl = generatedPdfUrlFor(item, 'interior')

    return [
      coverUrl ? {
        id: `${itemId}-cover`,
        itemId,
        item,
        source,
        kind: 'cover',
        label: `${itemName} Cover`,
        title: 'Cover Preview',
        url: buildOrderFileUrl(coverUrl),
        fileName: `${itemName}.pdf`,
      } : null,
      interiorUrl ? {
        id: `${itemId}-interior`,
        itemId,
        item,
        source,
        kind: 'interior',
        label: `${itemName} Inside`,
        title: 'Inside Page Preview',
        url: buildOrderFileUrl(interiorUrl),
        fileName: `${itemName} inside.pdf`,
      } : null,
    ].filter(Boolean)
  })
