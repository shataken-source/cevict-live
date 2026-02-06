# Testing Guide for PetReunion

## Quick Start

### Run API Endpoint Tests
```bash
# Make sure dev server is running first
npm run dev

# In another terminal, run tests
npm run test:api
```

### Run Unit Tests (if Jest is set up)
```bash
npm test
```

## Test Files

### 1. `test-api-endpoints.ts`
End-to-end API tests that hit the actual running server.

**Tests:**
- ✅ Valid lost pet report
- ✅ Missing required fields (should reject)
- ✅ Valid found pet report
- ✅ Missing required fields (should reject)
- ✅ Invalid pet type (should reject)
- ✅ Invalid location (should reject)

**Usage:**
```bash
# Default: http://localhost:3006
npm run test:api

# Custom URL
API_URL=http://localhost:3000 npm run test:api
```

### 2. `__tests__/api/report-lost.test.ts`
Unit tests for `/api/report-lost` endpoint (requires Jest setup).

**Tests:**
- Valid requests
- Missing required fields
- Invalid pet types
- Input sanitization
- Location parsing

### 3. `__tests__/api/report-found.test.ts`
Unit tests for `/api/report-found` endpoint.

**Tests:**
- Valid found pet reports
- Missing required fields
- Location parsing
- Required field defaults

### 4. `__tests__/validation.test.ts`
Unit tests for validation utility functions.

**Tests:**
- String sanitization
- Email validation
- Phone validation
- Date validation
- Pet type validation
- Size validation
- URL validation

## Setting Up Jest (Optional)

If you want to run the Jest tests:

```bash
npm install --save-dev jest @types/jest ts-jest @jest/globals
```

Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
};
```

## Rate Limiting Tests

To test rate limiting:

```bash
# Send 11 requests quickly (limit is 10 per minute)
for i in {1..11}; do
  curl -X POST http://localhost:3006/api/report-lost \
    -H "Content-Type: application/json" \
    -d '{"petType":"dog","color":"Brown","location":"Test","date_lost":"2026-01-10"}'
  echo ""
done
```

The 11th request should return `429 Too Many Requests`.

## Manual Testing

### Test Report Lost Endpoint
```bash
curl -X POST http://localhost:3006/api/report-lost \
  -H "Content-Type: application/json" \
  -d '{
    "petName": "Buddy",
    "petType": "dog",
    "breed": "Golden Retriever",
    "color": "Golden",
    "size": "large",
    "location": "Columbus, Indiana",
    "date_lost": "2026-01-10",
    "owner_name": "John Doe",
    "owner_email": "john@example.com"
  }'
```

### Test Report Found Endpoint
```bash
curl -X POST http://localhost:3006/api/report-found \
  -H "Content-Type: application/json" \
  -d '{
    "petType": "cat",
    "color": "Orange",
    "location": "Birmingham, Alabama",
    "date_found": "2026-01-12",
    "finder_name": "Good Samaritan"
  }'
```

## Expected Results

### ✅ Success Response
```json
{
  "success": true,
  "message": "Pet report created successfully",
  "pet": {
    "id": "...",
    "pet_name": "...",
    ...
  }
}
```

### ❌ Validation Error
```json
{
  "error": "Validation failed",
  "errors": {
    "petType": "Please select a pet type (dog or cat)",
    "color": "Please enter your pet's color",
    ...
  }
}
```

### ❌ Rate Limit Error
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run API Tests
  run: |
    npm run dev &
    sleep 5
    npm run test:api
```
