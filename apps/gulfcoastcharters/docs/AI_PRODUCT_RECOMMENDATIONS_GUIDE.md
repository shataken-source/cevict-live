# AI-Powered Product Recommendation System

## Overview
The Marine Gear Shop now features an intelligent AI-powered recommendation engine that suggests relevant products based on user browsing history, charter bookings, and purchase patterns.

## Features

### 1. **Frequently Bought Together**
- AI analyzes product relationships and suggests complementary items
- Interactive bundle selection with checkboxes
- Real-time price calculation with savings display
- One-click add multiple items to cart
- Auto-selects recommended items for convenience

### 2. **You May Also Like**
- Personalized recommendations based on:
  - User's browsing history (last 20 viewed products)
  - Past purchases (last 10 purchased items)
  - Current product category
  - Similar product attributes
- Displays 6 AI-curated product suggestions
- Updates dynamically as user browses

### 3. **User Behavior Tracking**
- Tracks product views automatically
- Records purchase history
- Maintains shopping cart state
- Session-based tracking for anonymous users

## Database Tables

### product_views
Tracks when users view products:
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- product_id: TEXT
- viewed_at: TIMESTAMP
- session_id: TEXT
```

### product_purchases
Records completed purchases:
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- product_id: TEXT
- purchased_at: TIMESTAMP
- price: DECIMAL
```

### cart_items
Manages shopping cart:
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- product_id: TEXT
- quantity: INTEGER
- added_at: TIMESTAMP
```

## Edge Function: product-recommendations

### Endpoint
`/functions/v1/product-recommendations`

### Actions

#### 1. Get Recommendations
```javascript
{
  "action": "get-recommendations",
  "userId": "user-uuid",
  "productId": "current-product-id",
  "products": [/* all available products */]
}
```

Returns:
```javascript
{
  "recommendations": ["id1", "id2", "id3", "id4", "id5", "id6"],
  "success": true
}
```

#### 2. Frequently Bought Together
```javascript
{
  "action": "frequently-bought-together",
  "userId": "user-uuid",
  "productId": "main-product-id",
  "products": [/* all available products */]
}
```

Returns:
```javascript
{
  "recommendations": ["id1", "id2", "id3"],
  "success": true
}
```

#### 3. Track Product View
```javascript
{
  "action": "track-view",
  "userId": "user-uuid",
  "productId": "viewed-product-id"
}
```

## AI Model

Uses **Google Gemini 2.5 Flash** via API Gateway for:
- Fast response times
- Cost-effective recommendations
- High-quality product matching
- Natural language understanding of product relationships

## Recommendation Logic

### Complementary Products
The AI considers:
- **Safety Equipment**: Life jackets → First aid kits, flares
- **Fishing Gear**: Rods → Tackle boxes, lures, fish finders
- **Navigation**: GPS → Marine radios, compasses
- **Maintenance**: Cleaning supplies → Wax, battery chargers

### Similarity Matching
- Same category products
- Similar price ranges
- Matching quality levels
- Complementary features

### Purchase Patterns
- Products frequently bought together
- Upgrade opportunities
- Seasonal recommendations
- Bundle suggestions

## Components

### ProductRecommendations
Location: `src/components/gear/ProductRecommendations.tsx`

Props:
- `currentProductId?: string` - Current product being viewed
- `allProducts: MarineProduct[]` - Full product catalog
- `userId?: string` - Current user ID

Features:
- Automatic loading state
- Fallback to random products if AI fails
- Responsive grid layout
- Integration with product cards

### FrequentlyBoughtTogether
Location: `src/components/gear/FrequentlyBoughtTogether.tsx`

Props:
- `mainProduct: MarineProduct` - Primary product
- `allProducts: MarineProduct[]` - Full product catalog
- `onAddToCart: (products) => void` - Cart handler
- `userId?: string` - Current user ID

Features:
- AI-powered product selection
- Interactive bundle builder
- Price calculation with savings
- One-click multi-add to cart
- Fallback to category matching

## Usage Examples

### In MarineGearShop Page
```typescript
// Track user
const [userId, setUserId] = useState<string>();

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUserId(data.user?.id);
  });
}, []);

// Show recommendations
<ProductRecommendations
  allProducts={marineProducts}
  userId={userId}
/>

// Show bundle suggestions
<FrequentlyBoughtTogether
  mainProduct={featuredProduct}
  allProducts={marineProducts}
  onAddToCart={addMultipleToCart}
  userId={userId}
/>
```

### Track Product Views
```typescript
const addToCart = (product: MarineProduct) => {
  // Add to cart logic...
  
  // Track view
  if (userId) {
    supabase.functions.invoke('product-recommendations', {
      body: {
        userId,
        productId: product.id,
        action: 'track-view'
      }
    });
  }
};
```

## Performance Optimizations

1. **Caching**: AI recommendations cached for 5 minutes
2. **Fallbacks**: Instant category-based suggestions if AI fails
3. **Lazy Loading**: Recommendations load after main products
4. **Batch Processing**: Multiple views tracked in batches

## Privacy & Security

- RLS policies ensure users only see their own data
- Anonymous users tracked by session ID
- No sensitive data stored in tracking tables
- GDPR-compliant data retention

## Testing

### Test Recommendations
1. Browse multiple products in same category
2. Add items to cart
3. Check "You May Also Like" section updates
4. Verify "Frequently Bought Together" shows relevant items

### Test Tracking
```sql
-- View user's browsing history
SELECT * FROM product_views WHERE user_id = 'your-user-id';

-- Check purchase history
SELECT * FROM product_purchases WHERE user_id = 'your-user-id';
```

## Troubleshooting

### No Recommendations Showing
- Check if GATEWAY_API_KEY is configured
- Verify user is logged in (or session ID exists)
- Check browser console for errors
- Ensure products array is populated

### AI Returns Poor Recommendations
- Increase user browsing history (view more products)
- Adjust AI prompt in edge function
- Check product category distribution
- Verify product metadata is complete

### Tracking Not Working
- Verify RLS policies are enabled
- Check user authentication status
- Ensure edge function is deployed
- Review Supabase logs for errors

## Future Enhancements

1. **Real-time Personalization**: Update recommendations as user browses
2. **A/B Testing**: Test different recommendation algorithms
3. **Email Campaigns**: Send personalized product suggestions
4. **Price Drop Alerts**: Notify users about price changes on viewed items
5. **Seasonal Recommendations**: Adjust suggestions based on time of year
6. **Cross-sell Opportunities**: Suggest products based on charter bookings

## Analytics

Track recommendation performance:
- Click-through rate on recommended products
- Conversion rate from recommendations
- Average order value with bundles
- Most frequently recommended products

## Support

For issues or questions:
1. Check Supabase edge function logs
2. Review browser console errors
3. Test with sample data
4. Verify API Gateway connectivity
