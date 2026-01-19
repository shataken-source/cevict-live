# Marine Equipment Marketplace System

## Overview
Gulf Coast Charters now features a comprehensive marketplace where captains and boaters can buy and sell used marine equipment, boats, electronics, fishing gear, and safety equipment.

## Features

### For Sellers
- **Create Listings**: Upload up to 5 images, set prices, and mark items as negotiable
- **Manage Offers**: Review, accept, reject, or counter buyer offers
- **Track Sales**: Monitor views, offers, and completed transactions
- **Seller Ratings**: Build reputation through buyer reviews

### For Buyers
- **Browse Marketplace**: Filter by category, search, and sort listings
- **Make Offers**: Negotiate prices on items marked as negotiable
- **Secure Payments**: Purchase through Stripe with buyer protection
- **Leave Reviews**: Rate sellers after successful transactions

## Categories
- **Boats**: Used vessels, dinghies, kayaks
- **Electronics**: GPS, fishfinders, radios, navigation equipment
- **Fishing Gear**: Rods, reels, tackle, nets
- **Safety Equipment**: Life jackets, flares, fire extinguishers
- **Other**: Miscellaneous marine equipment

## How to Create a Listing

1. Navigate to the Marketplace page
2. Click "Create Listing" button
3. Fill in listing details:
   - Title and description
   - Category and condition
   - Price (mark as negotiable if willing to negotiate)
   - Location
   - Upload images (up to 5)
4. Submit listing for immediate publication

## Making Offers

For items marked as negotiable:
1. Click on a listing to view details
2. Go to "Make Offer" tab
3. Enter your offer amount and optional message
4. Submit offer to seller
5. Seller can accept, reject, or counter your offer

## Purchase Flow

1. **Select Item**: Browse and click on listing
2. **Buy Now or Offer**: Choose to buy at list price or make an offer
3. **Enter Shipping**: Provide shipping address
4. **Payment**: Secure payment via Stripe
5. **Confirmation**: Receive email confirmation with transaction details
6. **Shipping**: Seller ships item and provides tracking
7. **Review**: Leave review after receiving item

## Payment & Fees

- **Platform Fee**: 5% of sale price
- **Seller Payout**: 95% of sale price
- **Payment Processing**: Handled securely by Stripe
- **Buyer Protection**: Dispute resolution available

## Shipping Integration

Sellers are responsible for:
- Packaging items securely
- Shipping within 3 business days
- Providing tracking numbers
- Communicating with buyers

## Review System

After successful transactions, buyers can:
- Rate sellers 1-5 stars
- Leave detailed review text
- Help build seller reputation

Sellers can:
- Respond to reviews
- Build trust through positive ratings

## API Endpoints

### marketplace-manager Edge Function

**Create Listing**
```javascript
{
  action: 'create_listing',
  seller_id: 'user-uuid',
  title: 'Item Title',
  description: 'Detailed description',
  category: 'fishing_gear',
  condition: 'good',
  price: 299.99,
  negotiable: true,
  location: 'Tampa, FL',
  images: ['url1', 'url2']
}
```

**Get Listings**
```javascript
{
  action: 'get_listings',
  category: 'electronics', // optional
  status: 'active'
}
```

**Make Offer**
```javascript
{
  action: 'create_offer',
  listing_id: 'listing-uuid',
  buyer_id: 'user-uuid',
  seller_id: 'seller-uuid',
  offer_amount: 250.00,
  message: 'Would you accept this offer?'
}
```

**Process Payment**
```javascript
{
  action: 'process_payment',
  listing_id: 'listing-uuid',
  buyer_id: 'user-uuid',
  seller_id: 'seller-uuid',
  amount: 299.99,
  payment_method_id: 'pm_xxx',
  shipping_address: { ... }
}
```

## Security Features

- **RLS Policies**: Row-level security on all tables
- **Secure Payments**: PCI-compliant Stripe integration
- **User Verification**: Only authenticated users can create listings
- **Fraud Prevention**: Transaction monitoring and dispute resolution

## Best Practices

### For Sellers
- Use high-quality photos from multiple angles
- Write detailed, honest descriptions
- Price competitively based on condition
- Respond to offers promptly
- Ship items quickly with tracking

### For Buyers
- Read descriptions carefully
- Check seller ratings and reviews
- Ask questions before purchasing
- Inspect items upon delivery
- Leave honest reviews

## Email Notifications

Automated emails are sent for:
- New offer received (seller)
- Offer accepted/rejected (buyer)
- Purchase confirmation (buyer)
- Shipping notification with tracking (buyer)
- Review reminder (buyer)

## Mobile Optimization

The marketplace is fully responsive:
- Touch-friendly interface
- Mobile image upload
- Easy messaging
- Quick checkout

## Future Enhancements

Planned features:
- In-app messaging between buyers and sellers
- Saved searches and favorites
- Price drop alerts
- Shipping label generation
- Escrow service for high-value items
- Video uploads for listings
- Live chat support

## Support

For marketplace issues:
- Contact support@gulfcoastcharters.com
- Use in-app help chat
- Report listings for policy violations
- Request refunds through dispute system

## Terms & Policies

- Sellers must accurately describe items
- Prohibited items: weapons, illegal goods
- Refund policy: 7 days for items not as described
- Seller fees: 5% platform fee on completed sales
- Buyer protection: Full refund if item significantly misrepresented
