import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { email, password, targetSite, rememberMe } = await request.json();

    if (!email || !password || !targetSite) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find user in unified users table
    const { data: user, error: userError } = await supabase
      .from('unified_users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        site: targetSite 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { 
        userId: user.id,
        type: 'refresh' 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + JWT_EXPIRES_IN * 1000);

    const { data: session, error: sessionError } = await supabase
      .from('site_sessions')
      .insert({
        id: sessionId,
        user_id: user.id,
        site: targetSite,
        session_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        is_active: true
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { success: false, message: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Update last login
    await supabase
      .from('unified_users')
      .update({ 
        last_login: new Date().toISOString(),
        last_active: new Date().toISOString()
      })
      .eq('id', user.id);

    // Get user badges
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select(`
        badge_id,
        unified_badges(id, name, display_name, icon_url)
      `)
      .eq('user_id', user.id);

    // Get site-specific profiles
    const { data: gccProfile } = await supabase
      .from('gcc_user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: wtvProfile } = await supabase
      .from('wtv_user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Format user data
    const formattedUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      avatar: user.avatar_url,
      bio: user.bio,
      location: user.location,
      trustLevel: user.trust_level,
      reputationScore: user.reputation_score,
      preferredSite: user.preferred_site,
      notificationSettings: user.notification_settings || {},
      gccProfile: gccProfile || {
        charterCount: 0,
        totalSpent: 0,
        memberSince: user.created_at,
        badges: []
      },
      wtvProfile: wtvProfile || {
        reviewCount: 0,
        favoritePlaces: 0,
        tripPlans: 0,
        badges: []
      },
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastActive: user.last_active,
      lastLogin: user.last_login
    };

    // Set secure cookies
    const response = NextResponse.json({
      success: true,
      data: {
        user: formattedUser,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: JWT_EXPIRES_IN,
          tokenType: 'Bearer'
        },
        session: {
          id: session.id,
          userId: session.user_id,
          site: session.site,
          expiresAt: session.expires_at,
          isActive: session.is_active
        }
      }
    });

    // Set HTTP-only cookies for security
    response.cookies.set('unified_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : JWT_EXPIRES_IN,
      path: '/'
    });

    response.cookies.set('unified_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    response.cookies.set('unified_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : JWT_EXPIRES_IN,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
