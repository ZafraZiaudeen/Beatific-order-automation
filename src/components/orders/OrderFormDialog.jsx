import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import api from '../../lib/api'
import AssetInputField from '../common/AssetInputField'

const blankCommon = {
  orderNumber: '',
  storeId: '',
  shop: '',
  customerName: '',
  customerEmail: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  paymentDate: '',
  shipBy: '',
  buyerNote: '',
  shipping: '',
  salesTax: '',
  discount: '',
}

const blankItem = () => ({
  transactionId: '',
  listingId: '',
  cleanTitle: '',
  option1Name: 'Size',
  option1Value: '',
  option2Name: 'Paper',
  option2Value: '',
  quantity: 1,
  itemPrice: '',
  personalizationText: '',
  coverImageUrl: '',
  interiorPdfUrl: '',
  podPackageId: '',
  shippingLevel: 'MAIL',
})

const formatDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const serializePersonalization = (personalization = {}) =>
  Object.entries(personalization)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')

const parsePersonalization = (text = '') =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':')
      return { label: label?.trim() || 'Personalization', value: rest.join(':').trim() }
    })
    .filter((item) => item.value)

const recordPersonalization = (text = '') =>
  Object.fromEntries(parsePersonalization(text).map((item) => [item.label, item.value]))

const money = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

export default function OrderFormDialog({ open, onClose, mode = 'create', activeStore, orderGroup, onSaved }) {
  const editing = mode === 'edit'
  const [common, setCommon] = useState(blankCommon)
  const [items, setItems] = useState([blankItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState({})

  useEffect(() => {
    if (!open) return
    setError('')
    setWarnings({})

    if (editing && orderGroup?.items?.length) {
      const first = orderGroup.firstOrder || orderGroup.items[0]
      const pricing = first.pricing || {}
      setCommon({
        orderNumber: first.etsyOrderId || '',
        storeId: String(first.storeId || activeStore?._id || ''),
        shop: first.shop || '',
        customerName: first.customerName || '',
        customerEmail: first.customerEmail || '',
        street1: first.shippingAddress?.street1 || '',
        street2: first.shippingAddress?.street2 || '',
        city: first.shippingAddress?.city || '',
        state: first.shippingAddress?.state || '',
        zip: first.shippingAddress?.zip || '',
        country: first.shippingAddress?.country || '',
        paymentDate: formatDateInput(first.orderedAt),
        shipBy: formatDateInput(first.shipByDate),
        buyerNote: first.buyerNote || first.notes || '',
        shipping: pricing.shipping ?? first.shippingCost ?? '',
        salesTax: pricing.salesTax ?? '',
        discount: pricing.discount ?? '',
      })
      setItems(orderGroup.items.map((item) => ({
        _id: item._id,
        transactionId: item.etsyItemId || '',
        listingId: item.listingId || '',
        cleanTitle: item.productTitle || '',
        option1Name: item.option1Name || 'Size',
        option1Value: item.option1Value || '',
        option2Name: item.option2Name || 'Paper',
        option2Value: item.option2Value || '',
        quantity: item.quantity || 1,
        itemPrice: item.price ?? '',
        personalizationText: serializePersonalization(item.personalization || {}),
        coverImageUrl: item.coverImageUrl || '',
        interiorPdfUrl: item.interiorPdfUrl || '',
        podPackageId: item.podPackageId || '',
        shippingLevel: item.shippingLevel || 'MAIL',
      })))
      return
    }

    setCommon({ ...blankCommon, storeId: activeStore?._id || '', shop: activeStore?.name || '' })
    setItems([blankItem()])
  }, [activeStore, editing, open, orderGroup])

  const updateCommon = (key, value) => setCommon((current) => ({ ...current, [key]: value }))
  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )))
  }

  const validateTransactions = async () => {
    const nextWarnings = {}
    const normalized = items.map((item) => item.transactionId.trim()).filter(Boolean)
    const duplicates = normalized.filter((value, index) => normalized.indexOf(value) !== index)
    duplicates.forEach((value) => { nextWarnings[value] = 'Duplicate transaction ID in this form.' })

    if (normalized.length !== items.length) {
      setWarnings(nextWarnings)
      throw new Error('Every item needs a transaction ID.')
    }

    for (const item of items) {
      if (nextWarnings[item.transactionId]) continue
      const { data } = await api.get(`/orders/transactions/${encodeURIComponent(item.transactionId.trim())}`, {
        params: item._id ? { excludeOrderId: item._id } : {},
      })
      if (data.exists) {
        nextWarnings[item.transactionId] = `Already used by order #${data.order?.etsyOrderId || 'unknown'}.`
      }
    }

    setWarnings(nextWarnings)
    if (Object.keys(nextWarnings).length > 0) {
      throw new Error('Resolve transaction ID warnings before saving.')
    }
  }

  const buildPricing = () => {
    const subtotal = items.reduce((sum, item) => sum + money(item.itemPrice) * Number(item.quantity || 1), 0)
    const shipping = money(common.shipping)
    const salesTax = money(common.salesTax)
    const discount = money(common.discount)
    return {
      itemTotal: subtotal,
      subtotal,
      shipping,
      salesTax,
      discount,
      orderTotal: Math.max(0, subtotal + shipping + salesTax - discount),
      note: items.length > 1 ? 'Order-level totals cover all items in this order' : '',
    }
  }

  const manualPayload = () => ({
    storeId: common.storeId,
    orderNumber: common.orderNumber.trim(),
    shop: common.shop || activeStore?.name || null,
    buyerNote: common.buyerNote || '',
    paymentDate: common.paymentDate || null,
    shipBy: common.shipBy || null,
    customer: {
      name: common.customerName || '',
      email: common.customerEmail || null,
      address: {
        name: common.customerName || '',
        street1: common.street1 || '',
        street2: common.street2 || '',
        city: common.city || '',
        state: common.state || '',
        zip: common.zip || '',
        country: common.country || '',
      },
    },
    pricing: buildPricing(),
    items: items.map((item) => ({
      transactionId: item.transactionId.trim(),
      listingId: item.listingId || null,
      cleanTitle: item.cleanTitle || null,
      option1Name: item.option1Name || null,
      option1Value: item.option1Value || null,
      option2Name: item.option2Name || null,
      option2Value: item.option2Value || null,
      quantity: Number(item.quantity || 1),
      itemPrice: money(item.itemPrice),
      personalization: parsePersonalization(item.personalizationText),
      coverImageUrl: item.coverImageUrl || null,
      interiorPdfUrl: item.interiorPdfUrl || null,
      podPackageId: item.podPackageId || null,
      shippingLevel: item.shippingLevel || 'MAIL',
    })),
  })

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await validateTransactions()
      if (!common.orderNumber.trim()) throw new Error('Order number is required.')
      if (!common.storeId) throw new Error('Store is required.')

      if (!editing) {
        const { data } = await api.post('/orders/manual', manualPayload())
        onSaved?.(data)
        onClose()
        return
      }

      const pricing = buildPricing()
      await Promise.all(items.map((item, index) => api.patch(`/orders/${item._id}`, {
        etsyOrderId: common.orderNumber.trim(),
        etsyItemId: item.transactionId.trim(),
        storeId: common.storeId,
        shop: common.shop || null,
        customerName: common.customerName || 'Unknown',
        customerEmail: common.customerEmail || null,
        shippingAddress: {
          name: common.customerName || '',
          street1: common.street1 || '',
          street2: common.street2 || '',
          city: common.city || '',
          state: common.state || '',
          zip: common.zip || '',
          country: common.country || '',
        },
        orderedAt: common.paymentDate || null,
        shipByDate: common.shipBy || null,
        buyerNote: common.buyerNote || null,
        notes: common.buyerNote || '',
        pricing: index === 0 ? pricing : null,
        shippingCost: index === 0 ? money(common.shipping) : 0,
        listingId: item.listingId || null,
        productTitle: item.cleanTitle || 'Unknown Product',
        option1Name: item.option1Name || null,
        option1Value: item.option1Value || null,
        option2Name: item.option2Name || null,
        option2Value: item.option2Value || null,
        quantity: Number(item.quantity || 1),
        price: money(item.itemPrice),
        personalization: recordPersonalization(item.personalizationText),
        coverImageUrl: item.coverImageUrl || null,
        interiorPdfUrl: item.interiorPdfUrl || null,
        podPackageId: item.podPackageId || null,
        shippingLevel: item.shippingLevel || 'MAIL',
        totalItemsInOrder: items.length,
        itemIndexInOrder: index,
        isFirstItem: index === 0,
      })))
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {editing ? `Edit Order #${orderGroup?.etsyOrderId || ''}` : 'Add Manual Etsy Order'}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
            <TextField label="Order number" size="small" value={common.orderNumber} onChange={(e) => updateCommon('orderNumber', e.target.value)} />
            <TextField label="Store ID" size="small" value={common.storeId} onChange={(e) => updateCommon('storeId', e.target.value)} disabled={Boolean(activeStore?._id)} />
            <TextField label="Shop" size="small" value={common.shop} onChange={(e) => updateCommon('shop', e.target.value)} />
            <TextField label="Customer name" size="small" value={common.customerName} onChange={(e) => updateCommon('customerName', e.target.value)} />
            <TextField label="Customer email" size="small" value={common.customerEmail} onChange={(e) => updateCommon('customerEmail', e.target.value)} />
            <TextField label="Payment date" type="date" size="small" value={common.paymentDate} onChange={(e) => updateCommon('paymentDate', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Ship by" type="date" size="small" value={common.shipBy} onChange={(e) => updateCommon('shipBy', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Shipping $" size="small" value={common.shipping} onChange={(e) => updateCommon('shipping', e.target.value)} />
            <TextField label="Tax $" size="small" value={common.salesTax} onChange={(e) => updateCommon('salesTax', e.target.value)} />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Shipping Address</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1.5fr 1fr 0.7fr 0.8fr 1fr' }, gap: 1.25 }}>
              <TextField label="Street 1" size="small" value={common.street1} onChange={(e) => updateCommon('street1', e.target.value)} />
              <TextField label="Street 2" size="small" value={common.street2} onChange={(e) => updateCommon('street2', e.target.value)} />
              <TextField label="City" size="small" value={common.city} onChange={(e) => updateCommon('city', e.target.value)} />
              <TextField label="State" size="small" value={common.state} onChange={(e) => updateCommon('state', e.target.value)} />
              <TextField label="ZIP" size="small" value={common.zip} onChange={(e) => updateCommon('zip', e.target.value)} />
              <TextField label="Country" size="small" value={common.country} onChange={(e) => updateCommon('country', e.target.value)} />
            </Box>
          </Box>

          <TextField
            label="Buyer note / internal note"
            size="small"
            value={common.buyerNote}
            onChange={(e) => updateCommon('buyerNote', e.target.value)}
            multiline
            minRows={2}
          />

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items</Typography>
              {!editing && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setItems((current) => [...current, blankItem()])}>
                  Add item
                </Button>
              )}
            </Box>

            <Stack spacing={1.5}>
              {items.map((item, index) => (
                <Box key={item._id || index} sx={{ p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                    <Chip label={`Item ${index + 1}`} size="small" sx={{ fontWeight: 700 }} />
                    {!editing && items.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 2fr 0.6fr 0.7fr' }, gap: 1.25 }}>
                    <TextField
                      label="Transaction ID"
                      size="small"
                      value={item.transactionId}
                      error={Boolean(warnings[item.transactionId])}
                      helperText={warnings[item.transactionId] || ''}
                      onChange={(e) => updateItem(index, 'transactionId', e.target.value)}
                    />
                    <TextField label="Listing ID" size="small" value={item.listingId} onChange={(e) => updateItem(index, 'listingId', e.target.value)} />
                    <TextField label="Product title" size="small" value={item.cleanTitle} onChange={(e) => updateItem(index, 'cleanTitle', e.target.value)} />
                    <TextField label="Qty" size="small" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                    <TextField label="Price $" size="small" value={item.itemPrice} onChange={(e) => updateItem(index, 'itemPrice', e.target.value)} />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1.25, mt: 1.25 }}>
                    <TextField label="Option 1 name" size="small" value={item.option1Name} onChange={(e) => updateItem(index, 'option1Name', e.target.value)} />
                    <TextField label="Option 1 value" size="small" value={item.option1Value} onChange={(e) => updateItem(index, 'option1Value', e.target.value)} />
                    <TextField label="Option 2 name" size="small" value={item.option2Name} onChange={(e) => updateItem(index, 'option2Name', e.target.value)} />
                    <TextField label="Option 2 value" size="small" value={item.option2Value} onChange={(e) => updateItem(index, 'option2Value', e.target.value)} />
                  </Box>
                  <TextField
                    label="Personalization, one per line as Label: value"
                    size="small"
                    value={item.personalizationText}
                    onChange={(e) => updateItem(index, 'personalizationText', e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                    sx={{ mt: 1.25 }}
                  />
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.25 }}>
                    <AssetInputField
                      label="Cover PDF"
                      value={item.coverImageUrl}
                      folder="covers"
                      accept="application/pdf,.pdf"
                      allowPdf
                      helperText="Upload/link the finished cover PDF for this transaction item."
                      openLabel="Open cover PDF"
                      onChange={(value) => updateItem(index, 'coverImageUrl', value)}
                    />
                    <AssetInputField
                      label="Inside Pages PDF"
                      value={item.interiorPdfUrl}
                      folder="interiors"
                      accept="application/pdf,.pdf"
                      allowPdf
                      helperText="Upload/link the finished inside-pages PDF for this transaction item."
                      openLabel="Open inside pages PDF"
                      onChange={(value) => updateItem(index, 'interiorPdfUrl', value)}
                    />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 0.8fr' }, gap: 1.25, mt: 1.25 }}>
                    <TextField label="POD package ID" size="small" value={item.podPackageId} onChange={(e) => updateItem(index, 'podPackageId', e.target.value)} />
                    <TextField label="Shipping level" size="small" value={item.shippingLevel} onChange={(e) => updateItem(index, 'shippingLevel', e.target.value)} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Order'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
