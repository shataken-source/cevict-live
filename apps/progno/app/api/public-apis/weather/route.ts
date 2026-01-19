/**
 * Public Weather API Endpoint
 * Uses Open-Meteo (FREE - No API key required!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWeatherForDateRange, getWeatherForecast } from '../../../public-apis-integration';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Date range query
    if (startDate && endDate) {
      const weather = await getWeatherForDateRange(
        lat,
        lon,
        new Date(startDate),
        new Date(endDate)
      );

      if (!weather) {
        return NextResponse.json(
          { error: 'Failed to fetch weather data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        ...weather
      });
    }

    // Standard forecast query
    const forecast = await getWeatherForecast(lat, lon, days);

    if (!forecast) {
      return NextResponse.json(
        { error: 'Failed to fetch weather forecast' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      forecast
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

