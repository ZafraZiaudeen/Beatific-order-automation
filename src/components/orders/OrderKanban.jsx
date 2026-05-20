import { useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha } from '@mui/material/styles'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import OrderCard from './OrderCard'
import { ETSY_ORDER_STATUSES } from '../../lib/constants'
import api from '../../lib/api'

const STATUS_COLORS = {
  custom_orders: '#71717A',
  waiting: '#CA8A04',
  in_progress: '#0369A1',
  completed: '#16A34A',
}

function KanbanColumn({ status, orders, onCardClick, statusCounts, readOnly }) {
  const color = STATUS_COLORS[status.value] || '#637381'
  const count = statusCounts[status.value] || orders.length

  return (
    <Box
      sx={{
        minWidth: 240,
        maxWidth: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          mb: 1,
          borderRadius: 2,
          bgcolor: alpha(color, 0.07),
          border: '1px solid',
          borderColor: alpha(color, 0.14),
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0, boxShadow: `0 0 0 4px ${alpha(color, 0.12)}` }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', flex: 1 }}>
          {status.label}
        </Typography>
        <Chip
          label={count}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 700,
            bgcolor: alpha(color, 0.1),
            color: color,
          }}
        />
      </Box>

      {/* Droppable area */}
      <Droppable droppableId={status.value}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              minHeight: 100,
              p: 0.5,
              borderRadius: 2,
              bgcolor: snapshot.isDraggingOver ? alpha(color, 0.04) : 'transparent',
              border: '1.5px dashed',
              borderColor: snapshot.isDraggingOver ? color : 'transparent',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {orders.map((order, index) => (
              <Draggable key={order._id} draggableId={order._id} index={index} isDragDisabled={readOnly}>
                {(draggableProvided, draggableSnapshot) => (
                  <div
                    ref={draggableProvided.innerRef}
                    {...draggableProvided.draggableProps}
                    {...draggableProvided.dragHandleProps}
                  >
                    <OrderCard
                      order={order}
                      onClick={() => onCardClick(order)}
                      isDragging={draggableSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {orders.length === 0 && !snapshot.isDraggingOver && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 3,
                  color: 'text.disabled',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  No orders
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Droppable>
    </Box>
  )
}

export default function OrderKanban({ orders, onOrderClick, onOrdersChange, statusCounts, readOnly = false }) {
  const [optimisticOrders, setOptimisticOrders] = useState(null)
  const [moving, setMoving] = useState(false)

  const displayOrders = optimisticOrders ?? orders

  // Group orders by status
  const grouped = ETSY_ORDER_STATUSES.reduce((acc, s) => {
    acc[s.value] = displayOrders.filter((o) => o.etsyStatus === s.value)
    return acc
  }, {})

  const handleDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result

    if (readOnly) return
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const order = displayOrders.find((o) => o._id === draggableId)
    if (!order || order.etsyStatus === newStatus) return

    // Optimistic update
    const updated = displayOrders.map((o) =>
      o._id === draggableId ? { ...o, etsyStatus: newStatus } : o
    )
    setOptimisticOrders(updated)
    setMoving(true)

    try {
      await api.patch(`/orders/${draggableId}/status`, { status: newStatus })
      onOrdersChange?.()
    } catch {
      // Revert on error
      setOptimisticOrders(null)
    } finally {
      setOptimisticOrders(null)
      setMoving(false)
    }
  }, [displayOrders, onOrdersChange, readOnly])

  return (
    <Box sx={{ position: 'relative' }}>
      {moving && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 10,
          }}
        >
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">Saving...</Typography>
        </Box>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            pt: 0.5,
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
          }}
        >
          {ETSY_ORDER_STATUSES.map((status) => (
            <KanbanColumn
              key={status.value}
              status={status}
              orders={grouped[status.value] || []}
              onCardClick={onOrderClick}
              statusCounts={statusCounts}
              readOnly={readOnly}
            />
          ))}
        </Box>
      </DragDropContext>
    </Box>
  )
}
