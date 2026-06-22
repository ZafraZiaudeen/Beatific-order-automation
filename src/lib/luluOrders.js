const CANCELABLE_INTERNAL_STATUSES = new Set(['pending', 'unpaid', 'submitted'])
const CANCELABLE_RAW_STATUSES = new Set(['CREATED', 'UNPAID', 'PRODUCTION_DELAYED'])
const TERMINAL_OR_PRODUCTION_STATUSES = new Set(['in_production', 'shipped', 'cancelled', 'failed'])

export const isLuluCancelable = (order = {}) => {
  if (!order?.luluJobId) return false
  const status = String(order.luluStatus || '').toLowerCase()
  const rawStatus = String(order.luluRawStatusName || '').toUpperCase()
  if (rawStatus) return CANCELABLE_RAW_STATUSES.has(rawStatus)

  if (TERMINAL_OR_PRODUCTION_STATUSES.has(status)) return false
  return CANCELABLE_INTERNAL_STATUSES.has(status)
}

export const getCancelableLuluSourceIds = (order = {}) => {
  const candidates = (order?.items || [])
    .map((item) => item?.sourceOrder || item)
    .filter(Boolean)

  return candidates
    .filter(isLuluCancelable)
    .map((item) => item._id || item.id)
    .filter(Boolean)
}
