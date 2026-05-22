import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  Pagination,
  CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SyncIcon from '@mui/icons-material/Sync'
import FilterListIcon from '@mui/icons-material/FilterList'
import Etsy2OrdersTable from '../components/etsy2/Etsy2OrdersTable'
import { ORDER_FILTERS, ITEM_STATUSES } from '../lib/etsy2Constants'

// Mock data for development - replace with API calls
const MOCK_ORDERS = [
  {
    orderId: '12345',
    buyerName: 'Sarah Mitchell',
    buyerEmail: 'sarah.mitchell@email.com',
    date: '2025-05-20T10:24:00Z',
    total: 48.50,
    items: [
      {
        name: 'Botanical Wall Art Print',
        variant: '8x10in / Unframed',
        sku: 'BWAP-810',
        quantity: 1,
        price: 24.50,
        status: ITEM_STATUSES.MAPPED,
        icon: '🖼️',
      },
      {
        name: 'Gold Initial Necklace',
        variant: 'Letter: S / 16"',
        sku: 'GIN-S-16',
        quantity: 1,
        price: 24.00,
        status: ITEM_STATUSES.AI_FLAGGED,
        icon: '📿',
      },
    ],
  },
  {
    orderId: '12344',
    buyerName: 'James Lee',
    buyerEmail: 'james.lee@email.com',
    date: '2025-05-20T09:15:00Z',
    total: 32.00,
    items: [
      {
        name: 'Custom Wedding Invitation',
        variant: '5x7in / Set of 50',
        sku: 'CWI-57-50',
        quantity: 1,
        price: 32.00,
        status: ITEM_STATUSES.MAPPED,
        icon: '💌',
      },
    ],
  },
  {
    orderId: '12343',
    buyerName: 'Emily Brown',
    buyerEmail: 'emily.brown@email.com',
    date: '2025-05-19T14:45:00Z',
    total: 75.20,
    items: [
      {
        name: 'Personalized Journal',
        variant: 'Leather / Brown',
        sku: 'PJ-LTH-BRN',
        quantity: 3,
        price: 75.20,
        status: ITEM_STATUSES.IN_PROGRESS,
        icon: '📓',
      },
    ],
  },
  {
    orderId: '12342',
    buyerName: 'Robert Wilson',
    buyerEmail: 'robert.wilson@email.com',
    date: '2025-05-19T11:02:00Z',
    total: 18.75,
    items: [
      {
        name: 'Ceramic Mug - White',
        variant: 'SKU: SKU-1001 / Color: White',
        sku: 'SKU-1001',
        quantity: 1,
        price: 18.75,
        status: ITEM_STATUSES.SHIPPED,
        icon: '☕',
      },
    ],
  },
  {
    orderId: '12341',
    buyerName: 'Kate Thompson',
    buyerEmail: 'kate.thompson@email.com',
    date: '2025-05-18T14:30:00Z',
    total: 56.00,
    items: [
      {
        name: 'Custom T-Shirt Design',
        variant: 'Size: L / Color: Navy',
        sku: 'CTS-L-NVY',
        quantity: 2,
        price: 56.00,
        status: ITEM_STATUSES.CUSTOM,
        icon: '👕',
      },
    ],
  },
]

export default function Etsy2OrdersPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [syncing, setSyncing] = useState(false)

  const itemsPerPage = 10

  // Calculate filter counts
  const filterCounts = ORDER_FILTERS.map((filter) => {
    if (filter.value === 'all') {
      return { ...filter, count: orders.length }
    }
    const count = orders.filter((order) =>
      order.items?.some((item) => item.status === filter.value)
    ).length
    return { ...filter, count }
  })

  // Filter orders based on active filter and search
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const searchLower = search.toLowerCase()
    const matchesSearch =
      !search ||
      order.orderId.toLowerCase().includes(searchLower) ||
      order.buyerName.toLowerCase().includes(searchLower) ||
      order.buyerEmail.toLowerCase().includes(searchLower) ||
      order.items?.some((item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower)
      )

    // Status filter
    const matchesFilter =
      activeFilter === 'all' ||
      order.items?.some((item) => item.status === activeFilter)

    return matchesSearch && matchesFilter
  })

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const handleSync = async () => {
    setSyncing(true)
    // Simulate API call
    setTimeout(() => {
      setSyncing(false)
    }, 2000)
  }

  const handleFilterChange = (filterValue) => {
    setActiveFilter(filterValue)
    setPage(1)
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#F97316',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: '20px' }}>E</Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#27272A' }}>
                Orders
              </Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Manage and track your Etsy orders
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing}
              sx={{
                borderColor: '#E3E3E7',
                color: '#27272A',
                '&:hover': {
                  borderColor: '#D4D4D8',
                  bgcolor: '#FAFAFA',
                },
              }}
            >
              Sync
            </Button>
            <IconButton
              sx={{
                border: '1px solid #E3E3E7',
                borderRadius: '8px',
                '&:hover': {
                  bgcolor: '#FAFAFA',
                },
              }}
            >
              <FilterListIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search orders by ID, buyer, or item..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#71717A' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#FFFFFF',
              borderRadius: '10px',
              '& fieldset': {
                borderColor: '#E3E3E7',
              },
              '&:hover fieldset': {
                borderColor: '#D4D4D8',
              },
            },
          }}
        />
      </Box>

      {/* Filter Chips */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {filterCounts.map((filter) => (
          <Chip
            key={filter.value}
            label={`${filter.label} ${filter.count}`}
            onClick={() => handleFilterChange(filter.value)}
            sx={{
              bgcolor: activeFilter === filter.value ? '#F97316' : '#FFFFFF',
              color: activeFilter === filter.value ? '#FFFFFF' : '#27272A',
              border: '1px solid',
              borderColor: activeFilter === filter.value ? '#F97316' : '#E3E3E7',
              fontWeight: 500,
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: activeFilter === filter.value ? '#EA580C' : '#FAFAFA',
              },
            }}
          />
        ))}
      </Box>

      {/* Orders Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Etsy2OrdersTable orders={paginatedOrders} />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Showing {(page - 1) * itemsPerPage + 1} to{' '}
                {Math.min(page * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: '8px',
                  },
                }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
