import { ITEM_STATUSES } from './etsy2Constants'

export const getGeneratedOrderItem = (order) =>
  order?.items?.find((item) => item.status === ITEM_STATUSES.GENERATED) ||
  order?.items?.[0]

export const getGeneratedOrderSourceIds = (order) =>
  (order?.items || [])
    .filter((item) => item.status === ITEM_STATUSES.GENERATED)
    .map((item) => item.sourceOrder?._id)
    .filter(Boolean)
