import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/admin',
  '/admin/(.*)',
  '/command-center',
  '/command-center/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  // Signed-out users hitting / go to landing (cevict.ai marketing first)
  if (req.nextUrl.pathname === '/' && !userId) {
    return NextResponse.redirect(new URL('/landing', req.url));
  }
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|map)).*)',
    '/(api|trpc)(.*)',
  ],
};
