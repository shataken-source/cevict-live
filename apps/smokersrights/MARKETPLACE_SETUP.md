# Marketplace Setup Guide

This guide explains how to populate the Safe Haven Marketplace with affiliate products.

## Overview

The marketplace displays affiliate products from the `products` table in Supabase. Products are organized by category (CBD, Vapes, Papers, Nicotine, Accessories) and can be marked as "sponsor" products for highlighting.

## Quick Start

### 1. Populate Sample Products

Use the admin API endpoint to populate the marketplace with sample affiliate products:

```bash
# Preview products (no changes)
curl https://your-domain.com/api/admin/products/populate

# Populate products (requires admin password)
curl -X POST https://your-domain.com/api/admin/products/populate?password=YOUR_ADMIN_PASSWORD

# Or with overwrite (replaces existing)
curl -X POST https://your-domain.com/api/admin/products/populate \
  -H "Content-Type: application/json" \
  -d '{"overwrite": true}' \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD"
```

### 2. Add Your Own Products

Products are stored in the `products` table with the following schema:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  category TEXT,
  link TEXT NOT NULL,
  sponsor BOOLEAN DEFAULT false,
  commission TEXT,
  active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Add products via:
- **Supabase Dashboard**: Direct database insert
- **Admin API**: Create endpoint (to be implemented)
- **SQL Script**: Bulk insert

## Product Categories

Supported categories:
- **CBD** - CBD oils, gummies, topicals
- **Vapes** - Vape pens, e-liquids, pods
- **Papers** - Rolling papers, wraps
- **Nicotine** - Nicotine replacement products
- **Accessories** - Storage, grinders, cases, etc.

## Affiliate Links

All product links should include your affiliate tracking:

```javascript
// The shop page automatically appends ?subid=smokersrights
// But you can include it in the link itself:
https://affiliate-site.com/product?ref=smokersrights&subid=smokersrights
```

## Sample Products

The `lib/marketplace/affiliateProducts.ts` file contains 15+ sample products across all categories. These are ready to use but you should:

1. **Replace placeholder links** with real affiliate links
2. **Update prices** to match current pricing
3. **Add product images** (update `image_url` field)
4. **Verify affiliate programs** are active

## Sponsor Products

Mark products as sponsors to highlight them:

```sql
UPDATE products SET sponsor = true WHERE id = '...';
```

Or via the sample data, products with `sponsor: true` will be highlighted with a yellow border and "SPONSOR" badge.

## FTC Compliance

The marketplace includes FTC disclosure text. Ensure:
- All affiliate links are properly disclosed
- Commission rates are accurate (if displayed)
- Age verification (21+) is mentioned
- Products are legal in target states

## Admin Dashboard

Access the admin dashboard at `/admin` to:
- View product count
- Manage products (when implemented)
- View analytics

## Adding More Products

### Via SQL

```sql
INSERT INTO products (name, description, price, category, link, sponsor, commission, active)
VALUES (
  'Product Name',
  'Product description',
  '$29.99',
  'CBD',
  'https://affiliate-link.com/product?ref=smokersrights',
  false,
  '10% commission',
  true
);
```

### Via TypeScript

Add to `lib/marketplace/affiliateProducts.ts`:

```typescript
export const SAMPLE_AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  // ... existing products
  {
    name: 'New Product',
    description: 'Product description',
    price: '$29.99',
    category: 'CBD',
    link: 'https://affiliate-link.com/product',
    commission: '10% commission',
    sponsor: false,
  },
];
```

Then run the populate endpoint again with `overwrite: true`.

## Verification

After populating products:

1. Visit `/shop` - should show all products
2. Check categories - filter should work
3. Verify sponsor products - should be highlighted
4. Test affiliate links - should include tracking
5. Check mobile view - should be responsive

## Troubleshooting

**No products showing**
- Check `active = true` in database
- Verify API endpoint returns products: `/api/products`
- Check browser console for errors

**Products not categorized**
- Ensure `category` field matches supported categories
- Check category filter in shop page

**Affiliate links not working**
- Verify links are valid
- Check that tracking parameters are included
- Test links manually

## Next Steps

1. **Replace sample links** with real affiliate programs
2. **Add product images** for better presentation
3. **Set up affiliate tracking** to monitor conversions
4. **Add more products** as you find good affiliate programs
5. **Monitor performance** and remove low-performing products
