import { NextResponse } from 'next/server';

interface PaidBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  alt: string;
  active: boolean;
  position: string[];
  startDate?: string;
  endDate?: string;
}

// In production, this would come from a database
// For now, using environment variables or a simple config
const getPaidBanners = (): PaidBanner[] => {
  // Check for paid banners from environment or database
  // Example: JSON.parse(process.env.PAID_BANNERS || '[]')
  
  // Return empty array if no paid banners configured
  // This allows AdSense to show as fallback
  return [];
};

export async function GET() {
  try {
    const banners = getPaidBanners();
    
    return NextResponse.json({
      success: true,
      banners: banners.filter(b => b.active)
    });
  } catch (error) {
    console.error('Error fetching paid banners:', error);
    return NextResponse.json({
      success: false,
      banners: []
    });
  }
}

