/**
 * API Tests for /api/report-lost endpoint
 * Run with: npm test or tsx __tests__/api/report-lost.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock fetch for testing
global.fetch = jest.fn();

const API_URL = process.env.API_URL || 'http://localhost:3006';

describe('POST /api/report-lost', () => {
  beforeAll(() => {
    // Setup
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should accept valid lost pet report', async () => {
    const validPayload = {
      petName: 'Buddy',
      petType: 'dog',
      breed: 'Golden Retriever',
      color: 'Golden',
      size: 'large',
      age: '5 years',
      gender: 'male',
      description: 'Friendly dog with collar',
      location: 'Columbus, Indiana',
      date_lost: '2026-01-10',
      owner_name: 'John Doe',
      owner_email: 'john@example.com',
      owner_phone: '5551234567',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Pet report created successfully',
        pet: { id: '123', ...validPayload },
      }),
    });

    const response = await fetch(`${API_URL}/api/report-lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.pet).toBeDefined();
  });

  it('should reject missing required fields', async () => {
    const invalidPayload = {
      petName: 'Buddy',
      // Missing: petType, color, location, date_lost
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Validation failed',
        errors: {
          petType: 'Please select a pet type (dog or cat)',
          color: 'Please enter your pet\'s color',
          date_lost: 'Please select the date your pet was lost',
          location: 'Please enter the location where your pet was last seen',
        },
      }),
    });

    const response = await fetch(`${API_URL}/api/report-lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.errors).toBeDefined();
  });

  it('should reject invalid pet type', async () => {
    const invalidPayload = {
      petType: 'hamster', // Invalid
      color: 'Brown',
      location: 'Columbus, Indiana',
      date_lost: '2026-01-10',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Invalid pet type. Must be "dog" or "cat"',
      }),
    });

    const response = await fetch(`${API_URL}/api/report-lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid pet type');
  });

  it('should sanitize input strings', async () => {
    const payloadWithXSS = {
      petName: '<script>alert("xss")</script>',
      petType: 'dog',
      color: 'Brown',
      location: 'Columbus, Indiana',
      date_lost: '2026-01-10',
      description: '<img src=x onerror=alert(1)>',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        pet: {
          pet_name: 'alert("xss")', // Script tags removed
          description: 'img src=x onerror=alert(1)', // HTML removed
        },
      }),
    });

    const response = await fetch(`${API_URL}/api/report-lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithXSS),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.pet.pet_name).not.toContain('<script>');
    expect(data.pet.description).not.toContain('<img');
  });

  it('should parse location correctly', async () => {
    const payload = {
      petType: 'dog',
      color: 'Brown',
      location: 'Columbus, Indiana', // Should parse to city and state
      date_lost: '2026-01-10',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        pet: {
          location_city: 'Columbus',
          location_state: 'IN',
        },
      }),
    });

    const response = await fetch(`${API_URL}/api/report-lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.pet.location_city).toBe('Columbus');
    expect(data.pet.location_state).toBeDefined();
  });
});
