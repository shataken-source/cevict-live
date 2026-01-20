# API Reference - Gulf Coast Charters Platform
## Complete Endpoint Documentation

---

## 📋 Overview

**Base URL:** `https://your-domain.com/api`  
**Authentication:** Supabase Auth (JWT tokens)  
**Rate Limiting:** 100 requests/minute per user  
**Response Format:** JSON  

### Quick Links
- [Authentication](#authentication)
- [Community & Points](#community--points-api)
- [Location Sharing](#location-sharing-api)
- [Weather Alerts](#weather-alerts-api)
- [Bookings](#bookings-api)
- [Fishing Reports](#fishing-reports-api)
- [User Management](#user-management-api)

---

## 🔐 Authentication

All API requests require authentication except where noted.

### Headers Required
```http
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

### Getting JWT Token
```javascript
// Using Supabase client
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;

// Use in requests
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 🎮 Community & Points API

### Award Points

Award points to a user for completing an action.

**Endpoint:** `POST /api/community`

**Authentication:** Service role only (server-side)

**Request Body:**
```json
{
  "action": "awardPoints",
  "userId": "uuid",
  "pointsAction": "CREATE_FISHING_REPORT" | "ADD_COMMENT" | "DAILY_CHECKIN" | "HELPFUL_VOTE" | "ANSWER_QUESTION" | "BEST_ANSWER" | "REPORT_HAZARD" | "COMPLETE_COURSE",
  "metadata": {
    "reportId": "uuid",
    "postId": "uuid",
    "hasPhoto": true,
    "hasVideo": true
  }
}
```

**Points Awarded:**
- `CREATE_FISHING_REPORT`: 25 (+10 with photo, +25 with video)
- `ADD_COMMENT`: 5
- `DAILY_CHECKIN`: 3
- `HELPFUL_VOTE`: 15
- `ANSWER_QUESTION`: 15
- `BEST_ANSWER`: 50
- `REPORT_HAZARD`: 30
- `COMPLETE_COURSE`: 75

**Response:**
```json
{
  "success": true,
  "pointsEarned": 35,
  "totalPoints": 1,285,
  "newBadges": [
    {
      "id": "reporter",
      "name": "Reporter",
      "description": "Created 10 fishing reports",
      "icon": "📝"
    }
  ],
  "trustLevelUp": false,
  "currentTrustLevel": 2
}
```

**Example:**
```javascript
// Award points for fishing report with photo
const response = await fetch('/api/community', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'awardPoints',
    userId: currentUser.id,
    pointsAction: 'CREATE_FISHING_REPORT',
    metadata: {
      reportId: report.id,
      hasPhoto: true,
      hasVideo: false
    }
  })
});

const data = await response.json();
console.log(`+${data.pointsEarned} points!`);
```

---

### Handle Fishing Report Created

Automatically award points and check for badges when user creates fishing report.

**Endpoint:** `POST /api/community`

**Request Body:**
```json
{
  "action": "handleFishingReportCreated",
  "userId": "uuid",
  "reportId": "uuid",
  "hasPhoto": true,
  "hasVideo": false
}
```

**Response:**
```json
{
  "success": true,
  "pointsEarned": 35,
  "badges": ["breaking_the_ice"],
  "notification": {
    "title": "Great report! 🎣",
    "message": "You earned 35 points and unlocked Breaking the Ice badge!"
  }
}
```

---

### Handle Comment Created

Award points when user comments on a post.

**Endpoint:** `POST /api/community`

**Request Body:**
```json
{
  "action": "handleCommentCreated",
  "userId": "uuid",
  "commentId": "uuid",
  "postId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "pointsEarned": 5,
  "totalComments": 42
}
```

---

### Handle Helpful Vote

Award points when user receives helpful vote.

**Endpoint:** `POST /api/community`

**Request Body:**
```json
{
  "action": "handleHelpfulVote",
  "voterId": "uuid",
  "recipientId": "uuid",
  "postId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "pointsEarned": 15,
  "helpfulVotes": 12,
  "badges": []
}
```

---

### Get Leaderboard

Retrieve top users by points.

**Endpoint:** `POST /api/community`

**Request Body:**
```json
{
  "action": "getLeaderboard",
  "period": "weekly" | "monthly" | "all_time",
  "limit": 100,
  "userType": "all" | "captain" | "user"
}
```

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid",
      "displayName": "Captain Mike",
      "avatar": "https://...",
      "totalPoints": 12,450,
      "badges": 15,
      "trustLevel": 5,
      "streak": 45
    },
    ...
  ],
  "currentUser": {
    "rank": 42,
    "totalPoints": 1,285
  }
}
```

---

### Get Community Profile

Get detailed community stats for a user.

**Endpoint:** `POST /api/community`

**Request Body:**
```json
{
  "action": "getCommunityProfile",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "userId": "uuid",
    "displayName": "Captain Mike",
    "totalPoints": 12,450,
    "currentStreak": 45,
    "longestStreak": 67,
    "totalPosts": 234,
    "totalComments": 567,
    "helpfulVotes": 89,
    "badges": [
      {
        "id": "legend",
        "name": "Legend",
        "earnedAt": "2024-10-15T10:30:00Z"
      }
    ],
    "trustLevel": 5,
    "joinedAt": "2024-01-01T00:00:00Z",
    "lastActivity": "2024-11-22T04:30:00Z"
  }
}
```

---

## 📍 Location Sharing API

### Update Location

Update user's current GPS location.

**Endpoint:** `POST /api/location`

**Request Body:**
```json
{
  "action": "updateLocation",
  "userId": "uuid",
  "location": {
    "latitude": 30.273859,
    "longitude": -87.592847,
    "accuracy": 10.5,
    "heading": 180.0,
    "speed": 5.5,
    "sharingMode": "public" | "friends" | "private",
    "userType": "captain" | "user"
  }
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "userId": "uuid",
    "latitude": 30.273859,
    "longitude": -87.592847,
    "updatedAt": "2024-11-22T04:45:00Z",
    "expiresAt": "2024-11-23T04:45:00Z"
  }
}
```

---

### Get Nearby Users

Find users/captains within a radius.

**Endpoint:** `POST /api/location`

**Request Body:**
```json
{
  "action": "getNearbyUsers",
  "latitude": 30.273859,
  "longitude": -87.592847,
  "radius": 50,
  "userType": "captain" | "user" | "all"
}
```

**Response:**
```json
{
  "success": true,
  "nearbyUsers": [
    {
      "userId": "uuid",
      "displayName": "Captain John",
      "userType": "captain",
      "latitude": 30.280000,
      "longitude": -87.600000,
      "distance": 2.5,
      "heading": 90,
      "speed": 8.5,
      "lastUpdate": "2024-11-22T04:44:00Z"
    }
  ],
  "count": 12
}
```

---

### Pin Location

Save a favorite fishing spot.

**Endpoint:** `POST /api/location`

**Request Body:**
```json
{
  "action": "pinLocation",
  "userId": "uuid",
  "pin": {
    "name": "Great Redfish Spot",
    "latitude": 30.273859,
    "longitude": -87.592847,
    "type": "favorite" | "hazard" | "reef" | "wreck",
    "notes": "Caught 10 redfish here on 11/15",
    "private": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "pin": {
    "id": "uuid",
    "name": "Great Redfish Spot",
    "latitude": 30.273859,
    "longitude": -87.592847,
    "createdAt": "2024-11-22T04:45:00Z"
  }
}
```

---

### Get User Pins

Retrieve all saved pins for a user.

**Endpoint:** `POST /api/location`

**Request Body:**
```json
{
  "action": "getUserPins",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "pins": [
    {
      "id": "uuid",
      "name": "Great Redfish Spot",
      "latitude": 30.273859,
      "longitude": -87.592847,
      "type": "favorite",
      "notes": "Caught 10 redfish here",
      "private": true,
      "createdAt": "2024-11-20T10:00:00Z"
    }
  ],
  "count": 15
}
```

---

## 🌦️ Weather Alerts API

### Trigger Weather Check

Manually trigger weather alert check (normally runs via cron).

**Endpoint:** `POST /api/weather-alerts`

**Authentication:** Service role only

**Request Body:**
```json
{
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "bookingsChecked": 1,247,
  "alertsSent": 23,
  "emailsSent": 23,
  "processingTime": "1m 45s",
  "alerts": [
    {
      "bookingId": "uuid",
      "severity": "HIGH",
      "conditions": {
        "windSpeed": 28,
        "waveHeight": 6.5,
        "pressure": 1008
      },
      "recommendation": "cancel"
    }
  ]
}
```

---

### Get Weather Forecast

Get weather forecast for a location.

**Endpoint:** `GET /api/weather/forecast`

**Query Parameters:**
- `lat`: Latitude (required)
- `lon`: Longitude (required)
- `days`: Number of days (1-7, default: 3)

**Example:**
```http
GET /api/weather/forecast?lat=30.273859&lon=-87.592847&days=3
```

**Response:**
```json
{
  "success": true,
  "location": {
    "latitude": 30.273859,
    "longitude": -87.592847,
    "name": "Orange Beach, AL"
  },
  "forecast": [
    {
      "date": "2024-11-22",
      "conditions": {
        "windSpeed": 12,
        "windDirection": "SE",
        "waveHeight": 2.5,
        "pressure": 1015,
        "temperature": 72,
        "visibility": "good"
      },
      "severity": "LOW",
      "fishingConditions": "excellent"
    }
  ],
  "buoyData": {
    "buoyId": "42040",
    "name": "Luke Offshore Test Platform",
    "distance": 15.2
  }
}
```

---

## 🎣 Fishing Reports API

### Create Fishing Report

Create a new fishing report.

**Endpoint:** `POST /api/fishing-reports`

**Request Body:**
```json
{
  "title": "Great day on the reef!",
  "content": "Caught multiple red snapper...",
  "locationName": "Orange Beach Reef",
  "latitude": 30.273859,
  "longitude": -87.592847,
  "speciesCaught": ["Red Snapper", "Grouper"],
  "photos": ["https://...", "https://..."],
  "videos": ["https://..."],
  "weatherConditions": {
    "windSpeed": 10,
    "waveHeight": 1.5,
    "temperature": 75
  },
  "visibility": "public" | "private"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "title": "Great day on the reef!",
    "createdAt": "2024-11-22T04:45:00Z",
    "pointsEarned": 35
  }
}
```

---

### Get Fishing Reports

Retrieve fishing reports with filters.

**Endpoint:** `GET /api/fishing-reports`

**Query Parameters:**
- `species`: Filter by species
- `location`: Filter by location name
- `userId`: Filter by user
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset
- `sort`: `recent` | `popular` | `nearby`

**Example:**
```http
GET /api/fishing-reports?species=Red%20Snapper&limit=10&sort=recent
```

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": "uuid",
      "title": "Great day on the reef!",
      "author": {
        "id": "uuid",
        "name": "Captain Mike",
        "avatar": "https://..."
      },
      "locationName": "Orange Beach Reef",
      "speciesCaught": ["Red Snapper", "Grouper"],
      "photos": ["https://..."],
      "createdAt": "2024-11-22T04:45:00Z",
      "likes": 42,
      "comments": 12
    }
  ],
  "total": 1,247,
  "hasMore": true
}
```

---

## 📅 Bookings API

### Create Booking

Create a new trip booking.

**Endpoint:** `POST /api/bookings`

**Request Body:**
```json
{
  "captainId": "uuid",
  "tripDate": "2024-12-15T08:00:00Z",
  "tripLocation": "Orange Beach",
  "tripLatitude": 30.273859,
  "tripLongitude": -87.592847,
  "durationHours": 4,
  "passengers": 4,
  "totalPrice": 500.00,
  "depositPaid": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "confirmationCode": "GCC-2024-12345",
    "status": "pending",
    "tripDate": "2024-12-15T08:00:00Z",
    "totalPrice": 500.00,
    "depositPaid": 100.00,
    "balanceDue": 400.00,
    "balanceDueDate": "2024-12-12T00:00:00Z",
    "createdAt": "2024-11-22T04:45:00Z"
  },
  "paymentIntent": {
    "clientSecret": "pi_...",
    "amount": 10000
  }
}
```

---

### Get Bookings

Retrieve user's bookings.

**Endpoint:** `GET /api/bookings`

**Query Parameters:**
- `status`: `pending` | `confirmed` | `cancelled` | `completed`
- `userId`: User ID (optional, defaults to current user)
- `captainId`: Captain ID (for captain's bookings)

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": "uuid",
      "confirmationCode": "GCC-2024-12345",
      "captain": {
        "id": "uuid",
        "name": "Captain John",
        "avatar": "https://..."
      },
      "tripDate": "2024-12-15T08:00:00Z",
      "tripLocation": "Orange Beach",
      "status": "confirmed",
      "passengers": 4,
      "totalPrice": 500.00
    }
  ],
  "count": 12
}
```

---

### Update Booking Status

Update booking status (confirm, cancel, complete).

**Endpoint:** `PATCH /api/bookings/:id`

**Request Body:**
```json
{
  "status": "confirmed" | "cancelled" | "completed",
  "reason": "Weather conditions unsafe" // Optional for cancellations
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "status": "cancelled",
    "refundAmount": 100.00,
    "refundStatus": "processing"
  }
}
```

---

## 👤 User Management API

### Get User Profile

Retrieve user profile.

**Endpoint:** `GET /api/users/:id`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "displayName": "Captain Mike",
    "email": "mike@example.com",
    "avatar": "https://...",
    "isCaptain": true,
    "bio": "30 years fishing the Gulf",
    "location": "Orange Beach, AL",
    "notificationPreferences": {
      "weatherAlerts": true,
      "communityUpdates": true,
      "bookingReminders": true
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### Update User Profile

Update user profile information.

**Endpoint:** `PATCH /api/users/:id`

**Request Body:**
```json
{
  "displayName": "Captain Mike",
  "bio": "Updated bio...",
  "avatar": "https://...",
  "notificationPreferences": {
    "weatherAlerts": true,
    "communityUpdates": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "displayName": "Captain Mike",
    "updatedAt": "2024-11-22T04:45:00Z"
  }
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "latitude",
      "issue": "Must be between -90 and 90"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., double booking) |
| `RATE_LIMIT` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## 🔒 Rate Limiting

**Limits:**
- Authenticated users: 100 requests/minute
- Anonymous users: 20 requests/minute
- Service role: No limit

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700650800
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Try again in 45 seconds.",
    "retryAfter": 45
  }
}
```

---

## 📝 Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Skip N results

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 1247,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

---

## 🧪 Testing

### Test Environment

**Base URL:** `https://test.your-domain.com/api`

**Test Users:**
```
Regular User:
  Email: test.user@example.com
  Password: TestUser123!
  
Captain:
  Email: test.captain@example.com
  Password: TestCaptain123!
```

### Example Requests (cURL)

```bash
# Get fishing reports
curl -X GET \
  'https://your-domain.com/api/fishing-reports?limit=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Create fishing report
curl -X POST \
  'https://your-domain.com/api/fishing-reports' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Great day!",
    "content": "Caught lots of fish",
    "latitude": 30.273859,
    "longitude": -87.592847
  }'

# Award points (service role)
curl -X POST \
  'https://your-domain.com/api/community' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "awardPoints",
    "userId": "uuid",
    "pointsAction": "CREATE_FISHING_REPORT"
  }'
```

---

## 📚 SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @gulfcoast/api-client
```

```javascript
import { GulfCoastAPI } from '@gulfcoast/api-client';

const api = new GulfCoastAPI({
  apiKey: 'your-api-key'
});

// Award points
const result = await api.community.awardPoints({
  userId: 'uuid',
  action: 'CREATE_FISHING_REPORT'
});

// Get nearby users
const nearby = await api.location.getNearby({
  latitude: 30.273859,
  longitude: -87.592847,
  radius: 50
});
```

---

## 🔔 Webhooks

Subscribe to events via webhooks.

**Available Events:**
- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `fishing_report.created`
- `weather_alert.sent`
- `user.badge_earned`

**Webhook Payload:**
```json
{
  "event": "booking.confirmed",
  "timestamp": "2024-11-22T04:45:00Z",
  "data": {
    "bookingId": "uuid",
    "captainId": "uuid",
    "userId": "uuid",
    "tripDate": "2024-12-15T08:00:00Z"
  }
}
```

---

**API Version:** v1  
**Last Updated:** November 22, 2024  
**Support:** api-support@gulfcoastcharters.com
