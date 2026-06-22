// Etsy 2 Order Management System Constants
// Based on the Etsy Order Management System Logic and UI Guide

// Item-Level Statuses
export const ITEM_STATUSES = {
  AI_FLAGGED: 'ai_flagged',
  FAILED: 'failed',
  UNMAPPED: 'unmapped',
  CUSTOM: 'custom',
  MAPPED: 'mapped',
  IN_PROGRESS: 'in_progress',
  GENERATED: 'generated',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
}

// Status configurations with visual cues
export const ITEM_STATUS_CONFIG = {
  [ITEM_STATUSES.AI_FLAGGED]: {
    label: 'AI Flagged',
    color: '#EF4444', // Red
    bgColor: '#FEE2E2',
    description: 'AI detected potentially inappropriate content',
    icon: 'warning',
  },
  [ITEM_STATUSES.FAILED]: {
    label: 'Failed',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Lulu rejected the generated files or fulfillment data',
    icon: 'error',
  },
  [ITEM_STATUSES.UNMAPPED]: {
    label: 'Unmapped',
    color: '#71717A', // Gray
    bgColor: '#F4F4F5',
    description: 'Product not found in library',
    icon: 'help',
  },
  [ITEM_STATUSES.CUSTOM]: {
    label: 'Custom',
    color: '#F97316', // Orange
    bgColor: '#FFF7ED',
    description: 'Product details need adjustment',
    icon: 'edit',
  },
  [ITEM_STATUSES.MAPPED]: {
    label: 'Mapped',
    color: '#0EA5E9', // Blue
    bgColor: '#E0F2FE',
    description: 'Ready for automated processing',
    icon: 'check',
  },
  [ITEM_STATUSES.IN_PROGRESS]: {
    label: 'In Progress',
    color: '#A855F7', // Purple
    bgColor: '#F3E8FF',
    description: 'Files being generated',
    icon: 'sync',
  },
  [ITEM_STATUSES.GENERATED]: {
    label: 'Generated',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    description: 'Print PDFs are generated and ready for Lulu approval',
    icon: 'check_circle',
  },
  [ITEM_STATUSES.SHIPPED]: {
    label: 'Shipped',
    color: '#22C55E', // Green
    bgColor: '#DCFCE7',
    description: 'Order fulfilled and shipped',
    icon: 'check_circle',
  },
  [ITEM_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    color: '#64748B',
    bgColor: '#F1F5F9',
    description: 'Lulu print job was cancelled',
    icon: 'help',
  },
}

// Batch status hierarchy (from most critical to least critical)
export const BATCH_STATUS_HIERARCHY = [
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.AI_FLAGGED,
  ITEM_STATUSES.UNMAPPED,
  ITEM_STATUSES.CUSTOM,
  ITEM_STATUSES.MAPPED,
  ITEM_STATUSES.IN_PROGRESS,
  ITEM_STATUSES.GENERATED,
  ITEM_STATUSES.SHIPPED,
  ITEM_STATUSES.CANCELLED,
]

// Filter chips for the orders list
export const ORDER_FILTERS = [
  { value: 'all', label: 'All', count: 0 },
  { value: ITEM_STATUSES.FAILED, label: 'Failed', count: 0 },
  { value: ITEM_STATUSES.UNMAPPED, label: 'Unmapped', count: 0 },
  { value: ITEM_STATUSES.CUSTOM, label: 'Custom', count: 0 },
  { value: ITEM_STATUSES.MAPPED, label: 'Mapped', count: 0 },
  { value: ITEM_STATUSES.IN_PROGRESS, label: 'In Progress', count: 0 },
  { value: ITEM_STATUSES.GENERATED, label: 'Generated', count: 0 },
  { value: ITEM_STATUSES.SHIPPED, label: 'Shipped', count: 0 },
  { value: ITEM_STATUSES.CANCELLED, label: 'Cancelled', count: 0 },
  { value: ITEM_STATUSES.AI_FLAGGED, label: 'AI Flagged', count: 0 },
]

// Helper function to determine batch status from items
export const deriveBatchStatus = (items) => {
  if (!items || items.length === 0) return ITEM_STATUSES.UNMAPPED

  // Find the most critical status
  for (const status of BATCH_STATUS_HIERARCHY) {
    if (items.some((item) => item.status === status)) {
      return status
    }
  }

  return items[0]?.status || ITEM_STATUSES.UNMAPPED
}

// Helper function to check if batch is fully shipped
export const isBatchShipped = (items) => {
  return items && items.length > 0 && items.every((item) => item.status === ITEM_STATUSES.SHIPPED)
}

// Helper function to get status badge props
export const getStatusBadgeProps = (status) => {
  return ITEM_STATUS_CONFIG[status] || ITEM_STATUS_CONFIG[ITEM_STATUSES.UNMAPPED]
}
