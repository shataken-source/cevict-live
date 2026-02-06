/**
 * API Tests for /api/report-found endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

global.fetch = jest.fn();

const API_URL = process.env.API_URL || 'http://localhost:3006';

describe('POST /api/report-found', () => {
  beforeAll(() => {
    // Setup
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should accept valid found pet report', async () => {
    const validPayload = {
      petName: 'Fluffy',
      petType: 'cat',
      breed: 'Tabby',
      color: 'Orange',
      size: 'medium',
      location: 'Birmingham, Alabama',
      date_found: '2026-01-12',
      finder_name: 'Good Samaritan',
      finder_email: 'finder@example.com',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: '456', ...validPayload, status: 'found' },
      }),
    });

    const response = await fetch(`${API_URL}/api/report-found`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('found');
  });

  it('should reject missing required fields', async () => {
    const invalidPayload = {
      petName: 'Fluffy',
      // Missing: petType, color, location, date_found
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Missing required fields: petType, color, location, and date_found are required',
      }),
    });

    const response = await fetch(`${API_URL}/api/report-found`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should parse location and set required fields', async () => {
    const payload = {
      petType: 'cat',
      color: 'Orange',
      location: 'Mobile, Alabama',
      date_found: '2026-01-12',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          location_city: 'Mobile',
          location_state: 'AL',
          owner_name: 'Community', // Default value
          date_lost: null, // Required but null for found pets
        },
      }),
    });

    const response = await fetch(`${API_URL}/api/report-found`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.data.location_city).toBe('Mobile');
    expect(data.data.location_state).toBe('AL');
    expect(data.data.owner_name).toBe('Community');
  });
});
