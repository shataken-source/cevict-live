# Fishing License Purchase & Verification System

## Overview
Complete fishing license management system allowing users to purchase state fishing licenses online and captains to verify guest compliance before departure.

## Features

### For Guests/Users
- **Online License Purchase**: Buy fishing licenses for any Gulf Coast state
- **Instant Digital Delivery**: Licenses emailed immediately after purchase
- **State-Specific Pricing**: Automatic calculation based on resident status and duration
- **Multiple Duration Options**: 1-day, 3-day, 7-day, or annual licenses
- **Secure Payment**: Stripe integration for safe transactions
- **License Storage**: Digital copies accessible anytime

### For Captains
- **Quick Verification**: Scan or enter license numbers to verify validity
- **Pre-Departure Checks**: Ensure all guests have required licenses
- **Compliance Tracking**: Record verified licenses for each booking
- **Guest Assistance**: Help guests purchase licenses on the spot

## Supported States

### Texas (TX)
- Resident Saltwater Annual: $35
- Non-Resident Saltwater Annual: $63
- One-Day All Water: $11

### Louisiana (LA)
- Resident Basic Annual: $20
- Non-Resident Basic Annual: $60
- 3-Day Trip License: $15

### Mississippi (MS)
- Resident All Water Annual: $23
- Non-Resident All Water Annual: $58
- One-Day All Water: $8

### Alabama (AL)
- Resident Saltwater Annual: $26.40
- Non-Resident Saltwater Annual: $56.40
- 7-Day Trip License: $30.90

### Florida (FL)
- Resident Saltwater Annual: $17
- Non-Resident Saltwater Annual: $47
- Non-Resident 3-Day: $17

## User Purchase Flow

### Step 1: License Selection
```typescript
// User selects:
- State (TX, LA, MS, AL, FL)
- License Type (Saltwater, Freshwater, All Water)
- Resident Status (Resident/Non-Resident)
- Duration (1-day, 3-day, 7-day, Annual)
```

### Step 2: Personal Information
```typescript
// Required fields:
- Full Name
- Email Address
- Phone Number
- Date of Birth
- Physical Address
- City, State, ZIP
```

### Step 3: Payment & Issuance
- Secure Stripe payment processing
- Automatic license number generation
- Instant email delivery with license details
- Digital license stored in user account

## Captain Verification

### Verification Panel
Located in Captain Dashboard under each booking:

```typescript
// Captain can:
1. Enter guest license number
2. Verify license validity
3. Check expiration date
4. Record verification timestamp
5. Help guests purchase if needed
```

### Verification Process
```typescript
// License number format: XX-YYYY-NNNNNN
// Example: TX-2024-123456

const verification = {
  licenseNumber: "TX-2024-123456",
  valid: true,
  status: "active",
  expirationDate: "2025-12-31",
  verifiedAt: "2024-11-19T08:00:00Z",
  captainId: "captain-uuid"
}
```

## Edge Function API

### Endpoint
`fishing-license-manager`

### Actions

#### 1. Get Requirements
```typescript
{
  action: "get_requirements",
  stateCode: "TX"
}

// Returns:
{
  minAge: 17,
  exemptions: ["Under 17", "Over 65", "Charter guest with captain license"]
}
```

#### 2. Calculate Price
```typescript
{
  action: "calculate_price",
  stateCode: "TX",
  licenseType: "saltwater",
  residentStatus: "nonResident",
  duration: "day"
}

// Returns: { price: 11 }
```

#### 3. Purchase License
```typescript
{
  action: "purchase_license",
  userId: "user-uuid",
  bookingId: "booking-uuid",
  stateCode: "TX",
  licenseType: "saltwater",
  residentStatus: "nonResident",
  duration: "day",
  guestName: "John Doe",
  guestEmail: "john@example.com",
  guestPhone: "555-1234",
  dateOfBirth: "1990-01-01",
  address: { street: "123 Main St", city: "Houston", state: "TX", zipCode: "77001" },
  price: 11
}

// Returns:
{
  success: true,
  license: { licenseNumber, expirationDate, ... },
  clientSecret: "stripe-client-secret"
}
```

#### 4. Verify License
```typescript
{
  action: "verify_license",
  licenseNumber: "TX-2024-123456",
  captainId: "captain-uuid"
}

// Returns:
{
  valid: true,
  license: { licenseNumber, status, verifiedAt }
}
```

#### 5. Get User Licenses
```typescript
{
  action: "get_user_licenses",
  userId: "user-uuid"
}

// Returns: { licenses: [...] }
```

## Email Notifications

### License Delivery Email
Sent immediately after purchase:
- License number
- State and type
- Issue and expiration dates
- Guest name and details
- Important compliance notes

### Email Template
```html
Subject: Your TX Fishing License - TX-2024-123456

Dear John Doe,

Your fishing license has been successfully issued!

License Details:
- License Number: TX-2024-123456
- State: TX
- Type: Saltwater Fishing
- Issue Date: 11/19/2024
- Expiration Date: 11/20/2024

Keep this email for your records. You may be required to show
this license to your charter captain or wildlife officers.

Thank you for choosing Gulf Coast Charters!
```

## Integration Points

### Customer Dashboard
- View all purchased licenses
- Download/print licenses
- Check expiration dates
- Renew expired licenses

### Captain Dashboard
- Access verification panel for each booking
- View guest license status
- Help guests purchase licenses
- Track compliance records

### Booking Flow
- Optional license purchase during booking
- Pre-trip license reminders
- Automatic state detection from charter location

## Compliance & Legal

### State Requirements
- Minimum age requirements vary by state (16-17)
- Exemptions for seniors, children, and charter guests
- Some states exempt charter guests with licensed captain
- Always check current state regulations

### Record Keeping
- All purchases logged with timestamp
- Verification records maintained
- Stripe payment receipts stored
- Email delivery confirmation tracked

## Testing

### Test License Purchase
1. Navigate to /fishing-licenses
2. Select state and license type
3. Enter test information
4. Use Stripe test card: 4242 4242 4242 4242
5. Verify email delivery

### Test Captain Verification
1. Login as captain
2. Navigate to booking details
3. Enter license number format: XX-YYYY-NNNNNN
4. Verify validation works
5. Check verification timestamp

## Future Enhancements

### Planned Features
- Real-time state wildlife API integration
- Automatic license renewal reminders
- Multi-license family packages
- QR code scanning for verification
- Offline license validation
- License transfer between bookings
- Bulk purchase for groups

### API Integrations
- Texas Parks & Wildlife API
- Louisiana Wildlife & Fisheries API
- Mississippi Department of Wildlife API
- Alabama Outdoor Alabama API
- Florida FWC API

## Support

### For Users
- Email: licenses@gulfcoastcharters.com
- Phone: 1-800-GCC-FISH
- Live chat available 24/7

### For Captains
- Captain support hotline: 1-800-GCC-CAPT
- Verification issues: captains@gulfcoastcharters.com
- Training videos in Captain Academy

## Conclusion

The fishing license system provides a seamless way for guests to obtain required licenses and for captains to verify compliance, ensuring legal and hassle-free fishing charters across the Gulf Coast.
