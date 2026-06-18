import { ITEM_STATUSES } from './etsy2Constants'

export const GENERATED_ORDER_STATUSES = [
  ITEM_STATUSES.GENERATED,
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.SHIPPED,
]

const isGeneratedPdfUrl = (value = '') =>
  /(?:^|[/\\])generated-pdfs(?:[/\\]|$)/i.test(String(value || ''))

export const hasGeneratedPdfFiles = (item) => {
  const source = item?.sourceOrder || item || {}
  const hasSavedGeneratedUrl = isGeneratedPdfUrl(source.coverImageUrl) || isGeneratedPdfUrl(source.interiorPdfUrl)
  const hasSavedPdf = Boolean(source.coverImageUrl || source.interiorPdfUrl)
  return hasSavedGeneratedUrl || (hasSavedPdf && source.templateFinalizedAt && !source.requiresTemplateFinalization)
}

export const isGeneratedOrderItem = (item) =>
  GENERATED_ORDER_STATUSES.includes(item?.status) || hasGeneratedPdfFiles(item)

export const getGeneratedOrderItems = (order) =>
  (order?.items || []).filter(isGeneratedOrderItem)

export const hasGeneratedOrderItems = (order) =>
  getGeneratedOrderItems(order).length > 0

export const getGeneratedOrderItem = (order) =>
  getGeneratedOrderItems(order)[0] || order?.items?.[0]

export const getGeneratedOrderSourceIds = (order) =>
  getGeneratedOrderItems(order)
    .map((item) => item.sourceOrder?._id)
    .filter(Boolean)
