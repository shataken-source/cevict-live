import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  console.log('=== DATE DEBUG ===');
  console.log('Raw date param:', dateParam);
  console.log('Type of date param:', typeof dateParam);
  
  // Test date parsing
  let parsedDate = null;
  if (dateParam) {
    try {
      parsedDate = new Date(dateParam);
      console.log('Parsed date:', parsedDate.toISOString());
      console.log('Parsed date string:', parsedDate.toLocaleDateString());
    } catch (error) {
      console.error('Date parsing error:', error);
    }
  }
  
  // Test default date
  const defaultDate = new Date().toISOString().split('T')[0];
  console.log('Default date:', defaultDate);
  
  return NextResponse.json({
    dateParam,
    parsedDate: parsedDate?.toISOString(),
    defaultDate,
    debug: {
      raw: dateParam,
      parsed: parsedDate?.toISOString(),
      default: defaultDate
    }
  });
}
