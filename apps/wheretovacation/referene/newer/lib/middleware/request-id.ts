/**
 * Request ID Tracking Middleware
 * Adds unique request ID to all requests for tracing
 */

import { NextRequest, NextResponse } from 'next/server';

// UUID generation (fallback if uuid package not installed)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const REQUEST_ID_HEADER = 'x-request-id';

export function getRequestId(request: NextRequest): string {
  // Get existing request ID or generate new one
  const existingId = request.headers.get(REQUEST_ID_HEADER);
  if (existingId) return existingId;
  
  return generateUUID();
}

export function addRequestId(request: NextRequest, response: NextResponse): NextResponse {
  const requestId = getRequestId(request);
  
  // Add to response headers
  response.headers.set(REQUEST_ID_HEADER, requestId);
  
  // Also add to response body if JSON
  return response;
}

// Middleware function for Next.js
export function requestIdMiddleware(request: NextRequest): NextResponse {
  const requestId = getRequestId(request);
  
  // Create response with request ID header
  const response = NextResponse.next();
  response.headers.set(REQUEST_ID_HEADER, requestId);
  
  return response;
}

// Helper to get request ID from context
export function getRequestIdFromHeaders(headers: Headers): string | null {
  return headers.get(REQUEST_ID_HEADER);
}

