import { ITEM_STATUSES } from './etsy2Constants'

export const GENERATED_ORDER_STATUSES = [
  ITEM_STATUSES.GENERATED,
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.SHIPPED,
]

export const isGeneratedOrderItem = (item) => GENERATED_ORDER_STATUSES.includes(item?.status)

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
