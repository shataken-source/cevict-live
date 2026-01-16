/**
 * Pet Alert Service
 * Amber Alert-style notifications for lost pets
 * Competitor feature: PawBoost Lost Pet Alert
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

export interface LostPetAlert {
  id: string;
  petName: string;
  petType: 'dog' | 'cat' | 'bird' | 'other';
  breed: string;
  color: string;
  size: 'small' | 'medium' | 'large';
  gender: 'male' | 'female' | 'unknown';
  age: string;
  lastSeenLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  lastSeenDate: string;
  description: string;
  photoUrl: string;
  contactPhone: string;
  contactEmail: string;
  reward?: number;
  microchipped: boolean;
  collar: boolean;
  collarDescription?: string;
  status: 'active' | 'found' | 'closed';
  createdAt: string;
  alertRadius: number; // miles
  viewCount: number;
  shareCount: number;
}

export interface AlertNotification {
  type: 'email' | 'sms' | 'push';
  recipient: string;
  alertId: string;
  sent: boolean;
  sentAt?: string;
}

// Create a new lost pet alert
export async function createLostPetAlert(
  alert: Omit<LostPetAlert, 'id' | 'createdAt' | 'status' | 'viewCount' | 'shareCount'>
): Promise<LostPetAlert | null> {
  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }

  const newAlert: LostPetAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: 'active',
    createdAt: new Date().toISOString(),
    viewCount: 0,
    shareCount: 0,
  };

  try {
    const { error } = await supabase
      .from('pet_alerts')
      .insert(newAlert);

    if (error) throw error;

    // Trigger notifications to nearby users
    await sendNearbyNotifications(newAlert);

    return newAlert;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
}

// Send notifications to users within alert radius
async function sendNearbyNotifications(alert: LostPetAlert): Promise<void> {
  if (!supabase) return;

  try {
    // Get users who opted in for alerts within radius
    const { data: users } = await supabase
      .from('alert_subscribers')
      .select('*')
      .eq('active', true);

    if (!users) return;

    // Filter users within radius
    const nearbyUsers = users.filter(user => {
      const distance = calculateDistance(
        alert.lastSeenLocation.lat,
        alert.lastSeenLocation.lng,
        user.lat,
        user.lng
      );
      return distance <= alert.alertRadius;
    });

    // Send notifications
    for (const user of nearbyUsers) {
      if (user.email && user.emailAlerts) {
        await sendEmailAlert(user.email, alert);
      }
      if (user.phone && user.smsAlerts) {
        await sendSmsAlert(user.phone, alert);
      }
      if (user.pushToken && user.pushAlerts) {
        await sendPushAlert(user.pushToken, alert);
      }
    }

    console.log(`Sent alerts to ${nearbyUsers.length} users`);
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Send email alert
async function sendEmailAlert(email: string, alert: LostPetAlert): Promise<boolean> {
  // In production, integrate with email service (SendGrid, SES, etc.)
  console.log(`Sending email alert to ${email} for ${alert.petName}`);
  
  // Simulate API call
  try {
    // await fetch('/api/email/send', { ... });
    return true;
  } catch {
    return false;
  }
}

// Send SMS alert
async function sendSmsAlert(phone: string, alert: LostPetAlert): Promise<boolean> {
  // In production, integrate with Sinch or Twilio
  console.log(`Sending SMS alert to ${phone} for ${alert.petName}`);
  
  const message = `🐕 LOST PET ALERT: ${alert.petName} (${alert.breed}) last seen near ${alert.lastSeenLocation.address}. ${alert.reward ? `$${alert.reward} reward. ` : ''}More info: petreunion.com/alert/${alert.id}`;
  
  try {
    // await fetch('/api/sms/send', { body: { phone, message } });
    return true;
  } catch {
    return false;
  }
}

// Send push notification
async function sendPushAlert(pushToken: string, alert: LostPetAlert): Promise<boolean> {
  console.log(`Sending push alert for ${alert.petName}`);
  
  try {
    // await fetch('/api/push/send', { body: { token: pushToken, ... } });
    return true;
  } catch {
    return false;
  }
}

// Get alerts near a location
export async function getAlertsNearLocation(
  lat: number,
  lng: number,
  radiusMiles: number = 25
): Promise<LostPetAlert[]> {
  if (!supabase) return getSampleAlerts();

  try {
    const { data, error } = await supabase
      .from('pet_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by distance
    const nearbyAlerts = (data as LostPetAlert[]).filter(alert => {
      const distance = calculateDistance(
        lat,
        lng,
        alert.lastSeenLocation.lat,
        alert.lastSeenLocation.lng
      );
      return distance <= radiusMiles;
    });

    return nearbyAlerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return getSampleAlerts();
  }
}

// Subscribe to alerts
export async function subscribeToAlerts(
  email: string,
  phone: string | null,
  lat: number,
  lng: number,
  radius: number
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('alert_subscribers')
      .upsert({
        email,
        phone,
        lat,
        lng,
        radius,
        emailAlerts: true,
        smsAlerts: !!phone,
        pushAlerts: false,
        active: true,
        updatedAt: new Date().toISOString(),
      });

    return !error;
  } catch {
    return false;
  }
}

// Track alert view
export async function trackAlertView(alertId: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.rpc('increment_alert_views', { alert_id: alertId });
  } catch (error) {
    console.error('Error tracking view:', error);
  }
}

// Track alert share
export async function trackAlertShare(alertId: string, platform: string): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.rpc('increment_alert_shares', { alert_id: alertId });
    await supabase.from('alert_shares').insert({
      alert_id: alertId,
      platform,
      shared_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking share:', error);
  }
}

// Sample alerts for demo
function getSampleAlerts(): LostPetAlert[] {
  return [
    {
      id: 'alert_sample_1',
      petName: 'Max',
      petType: 'dog',
      breed: 'Golden Retriever',
      color: 'Golden',
      size: 'large',
      gender: 'male',
      age: '3 years',
      lastSeenLocation: {
        address: '123 Oak Street, Atlanta, GA 30301',
        lat: 33.7490,
        lng: -84.3880,
      },
      lastSeenDate: new Date(Date.now() - 86400000).toISOString(),
      description: 'Friendly, wearing a red collar with tags. Responds to Max. May be scared of strangers.',
      photoUrl: '',
      contactPhone: '555-123-4567',
      contactEmail: 'owner@example.com',
      reward: 500,
      microchipped: true,
      collar: true,
      collarDescription: 'Red collar with bone-shaped tag',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      alertRadius: 10,
      viewCount: 1234,
      shareCount: 89,
    },
    {
      id: 'alert_sample_2',
      petName: 'Luna',
      petType: 'cat',
      breed: 'Tabby',
      color: 'Gray with stripes',
      size: 'small',
      gender: 'female',
      age: '2 years',
      lastSeenLocation: {
        address: '456 Pine Ave, Atlanta, GA 30305',
        lat: 33.7920,
        lng: -84.3640,
      },
      lastSeenDate: new Date(Date.now() - 172800000).toISOString(),
      description: 'Indoor cat, may be hiding. Has a small notch in left ear.',
      photoUrl: '',
      contactPhone: '555-987-6543',
      contactEmail: 'catowner@example.com',
      reward: 250,
      microchipped: false,
      collar: false,
      status: 'active',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      alertRadius: 5,
      viewCount: 567,
      shareCount: 45,
    },
  ];
}

