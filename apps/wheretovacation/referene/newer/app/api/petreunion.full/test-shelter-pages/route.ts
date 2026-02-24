import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to try accessing known shelter pages directly
export async function GET(request: NextRequest) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || 
    (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET 
      ? await getAppToken() 
      : null);
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }
  
  // Try some known public shelter pages (using their page usernames or IDs)
  const testPages = [
    'MobileCountyAnimalShelter',
    'BirminghamHumane',
    'GreaterBirminghamHumaneSociety',
    'MontgomeryHumane',
    // Add more as we discover them
  ];
  
  const results: any[] = [];
  
  for (const page of testPages) {
    try {
      // Try to get page info first
      const pageUrl = `https://graph.facebook.com/v18.0/${page}?access_token=${accessToken}&fields=id,name,username`;
      const pageResponse = await fetch(pageUrl);
      const pageData = await pageResponse.json();
      
      if (!pageData.error && pageData.id) {
        // Try to get posts
        const postsUrl = `https://graph.facebook.com/v18.0/${pageData.id}/posts?access_token=${accessToken}&fields=id,message&limit=5`;
        const postsResponse = await fetch(postsUrl);
        const postsData = await postsResponse.json();
        
        results.push({
          page: pageData.name,
          pageId: pageData.id,
          accessible: !pageData.error,
          postsCount: postsData.data?.length || 0,
          error: postsData.error?.message || null
        });
      } else {
        results.push({
          page,
          accessible: false,
          error: pageData.error?.message || 'Not found'
        });
      }
    } catch (error: any) {
      results.push({
        page,
        accessible: false,
        error: error.message
      });
    }
  }
  
  return NextResponse.json({ results });
}

async function getAppToken(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&grant_type=client_credentials`
    );
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}






