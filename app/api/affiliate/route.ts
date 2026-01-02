import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { productUrl, affiliateCode } = await request.json();
  
  // Add your affiliate code to the URL
  const affiliateUrl = `${productUrl}?ref=${affiliateCode}`;
  
  return NextResponse.json({ url: affiliateUrl });
}
