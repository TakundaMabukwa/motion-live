# Stock Ordering System Setup Guide

## Overview
This system allows users to create stock orders from the inventory page, preview invoices, generate PDFs, and store them in Supabase with automatic invoice link storage.

## Features
- **Stock Order Creation**: Select items from available stock or add new custom items
- **Invoice Preview**: View the order as a professional invoice before submission
- **PDF Generation**: Automatically generate PDF invoices using jsPDF and html2canvas
- **Supabase Integration**: Store orders in database and PDFs in storage bucket
- **Automatic Order Numbering**: Generate unique order numbers with date and sequence
- **VAT Calculations**: Automatic 15% VAT calculations for South African compliance

## Setup Instructions

### 1. Database Setup
Run the SQL commands in `stock_orders_table.sql` in your Supabase SQL editor:

```sql
-- This will create the stock_orders table with all necessary fields
-- including the invoice_link field for storing PDF URLs
```

### 2. Supabase Storage Bucket
1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket called `invoices`
4. Set bucket visibility (public or private based on your needs)
5. Configure RLS policies if needed

### 3. Environment Variables
Ensure your `.env.local` file has the necessary Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
```

### 4. Dependencies
The system requires these packages (already installed):
- `jspdf` - For PDF generation
- `html2canvas` - For converting HTML to canvas for PDF
- `@supabase/supabase-js` - For database and storage operations

## How It Works

### 1. Order Creation Flow
1. User clicks "Order Stock" button on inventory page
2. Modal opens showing available stock items from `stock_pricing` table
3. User can:
   - Add existing items to order
   - Add custom new items with pricing
   - Adjust quantities
   - Add supplier and notes

### 2. Invoice Preview
1. User clicks "Preview Invoice" to see the order as a professional invoice
2. Invoice displays company header, order details, items table, and totals
3. Includes VAT calculations and company footer information

### 3. PDF Generation & Storage
1. When user submits order:
   - PDF is generated from the invoice HTML
   - PDF is uploaded to Supabase `invoices` bucket
   - Order is saved to `stock_orders` table with invoice link
   - Success message is shown

### 4. Database Storage
Each order is stored as a single record with:
- Basic order information (number, supplier, totals, etc.)
- `order_items` as JSONB containing all item details
- `invoice_link` pointing to the stored PDF

## File Structure
```
components/accounts/
├── InventoryContent.js          # Main inventory page with Order Stock button
├── StockOrderModal.jsx          # Complete stock ordering modal component
└── ...

SQL/
└── stock_orders_table.sql       # Database setup script
```

## Customization

### Company Information
Update company details in `StockOrderModal.jsx`:
```jsx
// Company header section
<h2 className="font-bold text-blue-600 text-xl">Your Company Name</h2>
<p className="text-gray-600 text-sm">Reg No: Your_Reg_Number</p>
<p className="text-gray-600 text-sm">VAT No.: Your_VAT_Number</p>
```

### VAT Rate
Change VAT calculation in the `calculateVAT` function:
```jsx
const calculateVAT = () => {
  return calculateTotal() * 0.15; // Change 0.15 to your VAT rate
};
```

### Stock Data Source
Replace the mock `stockPricingData` with actual API calls to your `stock_pricing` table:
```jsx
// Replace this mock data with actual API call
const [stockPricingData, setStockPricingData] = useState([]);

useEffect(() => {
  const fetchStockPricing = async () => {
    const { data, error } = await supabase
      .from('stock_pricing')
      .select('*');
    
    if (data) setStockPricingData(data);
  };
  
  fetchStockPricing();
}, []);
```

## Usage Examples

### Creating a Stock Order
1. Navigate to Inventory page
2. Click "Order Stock" button
3. Fill in supplier name and notes
4. Add items from available stock or create custom items
5. Adjust quantities as needed
6. Preview invoice
7. Submit order

### Viewing Order History
Query the `stock_orders` table:
```sql
-- Get all orders
SELECT * FROM stock_orders ORDER BY created_at DESC;

-- Get orders by supplier
SELECT * FROM stock_orders WHERE supplier = 'Office Supplies Co';

-- Get orders with specific items
SELECT * FROM stock_orders 
WHERE order_items @> '[{"code": "ITEM-001"}]';
```

## Troubleshooting

### PDF Generation Issues
- Ensure `html2canvas` can access the invoice element
- Check browser console for errors
- Verify all images and fonts are loaded

### Supabase Upload Issues
- Check bucket permissions
- Verify RLS policies
- Ensure file size limits are appropriate

### Database Connection Issues
- Verify environment variables
- Check Supabase client configuration
- Ensure table exists and has correct structure

## Security Considerations
- Implement proper RLS policies for the `stock_orders` table
- Consider bucket access permissions for invoice PDFs
- Validate user permissions before allowing order creation
- Sanitize user inputs to prevent injection attacks

## Future Enhancements
- Email notifications for submitted orders
- Order approval workflow
- Integration with accounting systems
- Bulk order import/export
- Order status tracking
- Supplier management system
