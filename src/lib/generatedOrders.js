import { ITEM_STATUSES } from './etsy2Constants'

export const GENERATED_ORDER_STATUSES = [
  ITEM_STATUSES.GENERATED,
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.SHIPPED,
]

export const isGeneratedPdfUrl = (value = '') =>
  /(?:^|[/\\])generated-pdfs(?:[/\\]|$)/i.test(String(value || '')) ||
  /(?:^|\/)(?:api\/)?orders\/download\/[^/?#]+\.pdf(?:[?#].*)?$/i.test(String(value || ''))

export const hasGeneratedPdfFiles = (item) => {
  const source = item?.sourceOrder || item || {}
  return isGeneratedPdfUrl(source.coverImageUrl) || isGeneratedPdfUrl(source.interiorPdfUrl)
}

export const hasFinalizedGeneratedTemplate = (item) => {
  const source = item?.sourceOrder || item || {}
  return Boolean(
    (source.coverImageUrl || source.interiorPdfUrl) &&
    source.templateFinalizedAt &&
    !source.requiresTemplateFinalization
  )
}

export const isGeneratedOrderItem = (item) =>
  hasGeneratedPdfFiles(item) || hasFinalizedGeneratedTemplate(item)

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
