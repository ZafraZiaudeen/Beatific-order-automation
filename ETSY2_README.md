# Etsy 2 Order Management System

This is the new implementation of the Etsy Order Management System based on the comprehensive logic and UI guide document.

## Overview

The Etsy 2 system implements a hierarchical status logic for managing orders with multiple items (batches), where individual items may require different levels of attention. The system includes AI-driven moderation for personalized products.

## Key Features

### 1. **Hierarchical Status System**

#### Item-Level Statuses
- **AI Flagged** (Red) - AI detected potentially inappropriate content
- **Unmapped** (Gray) - Product not found in library
- **Custom** (Orange) - Product details need adjustment
- **Mapped** (Blue) - Ready for automated processing
- **In Progress** (Purple) - Files being generated
- **Shipped** (Green) - Order fulfilled and shipped

#### Batch-Level Status
The batch status is determined by the most critical item status in the hierarchy:
1. AI Flagged (highest priority)
2. Unmapped
3. Custom
4. Mapped
5. In Progress
6. Shipped (lowest priority)

### 2. **AI Moderation**
- Automatically scans personalization text for policy violations
- Flags inappropriate, offensive, or sensitive content
- Provides suggested edits for flagged content
- Requires manual review before processing

### 3. **Product Mapping**
- Compares Etsy order data with Product Library
- Highlights matches and mismatches
- Shows "Best Match" confidence indicator
- Allows manual mapping for unmapped items

## Pages

### 1. Orders List (`/orders/etsy2`)
- **Filter Chips**: Quick filters by status (All, Unmapped, Custom, Mapped, In Progress, Shipped, AI Flagged)
- **Search**: Search by order ID, buyer name, email, or item details
- **Expandable Rows**: Click to expand and see individual items within an order
- **Status Badges**: Color-coded badges for quick status identification
- **Actions**: View, Edit, and Print options for each order

### 2. Order Detail (`/orders/etsy2/:orderId`)
- **Batch Status Banner**: Prominent alert if order is AI Flagged
- **Order Info Card**: Date, buyer, items count, and total
- **Order Items**: Detailed view of each item with status
- **AI Review Section**: For flagged items, shows original vs. suggested text
- **Customer Info**: Complete customer details and order history
- **Actions**: Edit Personalization, Override Flag, Save & Map

### 3. Item Mapping & AI Review (`/orders/etsy2/:orderId/item/:itemId/mapping`)
- **Mapping Comparison**: Side-by-side comparison of Etsy data vs. Product Library
- **Visual Indicators**: Green checkmarks for matches, red X for mismatches
- **AI Personalization Review**: Edit original and suggested text
- **AI Reasoning**: Detailed explanation of why item was flagged
- **Actions**: Cancel, Override Flag, Save & Map

### 4. Status Flow Diagram (`/orders/etsy2/flow`)
- **Visual Flow**: Complete order lifecycle from import to shipment
- **Decision Points**: Shows branching logic for different statuses
- **Status Reference**: Detailed explanation of each status
- **AI Moderation Info**: Educational content about AI moderation

## File Structure

```
src/
├── lib/
│   └── etsy2Constants.js          # Status definitions and helper functions
├── components/
│   └── etsy2/
│       ├── Etsy2StatusBadge.jsx   # Status badge component
│       └── Etsy2OrdersTable.jsx   # Orders table with expandable rows
└── pages/
    ├── Etsy2OrdersPage.jsx        # Main orders list
    ├── Etsy2OrderDetailPage.jsx   # Order detail view
    ├── Etsy2ItemMappingPage.jsx   # Item mapping & AI review
    └── Etsy2StatusFlowPage.jsx    # Status flow diagram
```

## Design System

### Colors
- **AI Flagged**: Red (#EF4444, #FEE2E2)
- **Unmapped**: Gray (#71717A, #F4F4F5)
- **Custom**: Orange (#F97316, #FFF7ED)
- **Mapped**: Blue (#0EA5E9, #E0F2FE)
- **In Progress**: Purple (#A855F7, #F3E8FF)
- **Shipped**: Green (#22C55E, #DCFCE7)

### Typography
- Clean, readable fonts (Inter)
- No excessive bold text
- Consistent font sizes and weights
- Clear hierarchy

### Layout
- Clean white backgrounds
- Subtle borders (#E3E3E7)
- Rounded corners (8px-16px)
- Consistent spacing
- Responsive grid layouts

## Integration Points

### Backend API Endpoints (To Be Implemented)
```
GET    /api/orders/etsy2              # List orders
GET    /api/orders/etsy2/:id          # Get order details
POST   /api/orders/etsy2/sync         # Sync with Etsy
PATCH  /api/orders/etsy2/:id/item/:itemId  # Update item
POST   /api/orders/etsy2/:id/item/:itemId/map  # Map item to product
POST   /api/orders/etsy2/:id/item/:itemId/override-flag  # Override AI flag
```

### Data Models

#### Order
```javascript
{
  orderId: string,
  buyerName: string,
  buyerEmail: string,
  date: ISO8601,
  total: number,
  address: {
    street: string,
    city: string,
    state: string,
    zip: string,
    country: string
  },
  items: [Item]
}
```

#### Item
```javascript
{
  id: string,
  name: string,
  variant: string,
  sku: string,
  quantity: number,
  price: number,
  status: ItemStatus,
  aiFlag?: {
    reason: string,
    originalText: string,
    suggestedText: string,
    details: string
  }
}
```

## Usage

### Navigation
Access Etsy 2 from the sidebar navigation:
- Click "Etsy 2" in the main navigation menu
- Or navigate directly to `/orders/etsy2`

### Workflow
1. **Import Orders**: Orders are imported from Etsy
2. **AI Moderation**: System automatically checks personalization text
3. **Mapping Check**: System matches orders to Product Library
4. **Review Flagged Items**: Manually review AI-flagged or unmapped items
5. **Process Orders**: Mapped items move to "In Progress"
6. **Fulfillment**: Orders are sent to Lulu and marked as "Shipped"

## Development Notes

### Mock Data
Currently using mock data in the pages. Replace with actual API calls:
- `MOCK_ORDERS` in `Etsy2OrdersPage.jsx`
- `MOCK_ORDER` in `Etsy2OrderDetailPage.jsx`
- `MOCK_ITEM` in `Etsy2ItemMappingPage.jsx`

### Status Logic
The status hierarchy is implemented in `etsy2Constants.js`:
- `deriveBatchStatus()` - Determines batch status from items
- `isBatchShipped()` - Checks if all items are shipped
- `getStatusBadgeProps()` - Returns status configuration

### Customization
To customize colors or status labels, edit `etsy2Constants.js`:
```javascript
export const ITEM_STATUS_CONFIG = {
  [ITEM_STATUSES.AI_FLAGGED]: {
    label: 'AI Flagged',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    // ...
  },
  // ...
}
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live order updates
2. **Bulk Actions**: Select multiple orders for batch operations
3. **Advanced Filters**: Date ranges, price ranges, customer filters
4. **Export**: Export orders to CSV/Excel
5. **Analytics**: Order statistics and trends
6. **Notifications**: Email/SMS alerts for flagged orders
7. **AI Training**: Improve AI moderation with feedback loop

## Testing

### Manual Testing Checklist
- [ ] Orders list loads with mock data
- [ ] Filter chips work correctly
- [ ] Search filters orders
- [ ] Expandable rows show item details
- [ ] Order detail page displays correctly
- [ ] AI flagged items show review section
- [ ] Item mapping page shows comparison
- [ ] Status flow diagram renders
- [ ] Navigation between pages works
- [ ] Responsive design on mobile/tablet

## Support

For questions or issues with the Etsy 2 implementation, refer to:
- Original document: `Etsy-Order-Management-System-Logic-and-UI-Guide-compressed.pdf`
- UI mockups in the project images
- This README file

---

**Version**: 1.0.0  
**Last Updated**: May 22, 2026  
**Author**: Manus AI (via Kiro)
