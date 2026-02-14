import { createClient } from '@supabase/supabase-js';

// Device types
export type DeviceType = 'android-tv' | 'firestick' | 'roku' | 'apple-tv' | 'smart-tv' | 'mobile';

export interface Device {
    id: string;
    userId: string;
    deviceId: string;
    deviceName: string;
    deviceType: DeviceType;
    licenseKey: string;
    isActive: boolean;
    lastSeen: string;
    registeredAt: string;
}

export interface LicenseInfo {
    tierId: string;
    tierName: string;
    maxDevices: number;
    activeDevices: number;
    expiresAt: string | null; // null for lifetime
    isLifetime: boolean;
}

// Get Supabase client
const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    return createClient(supabaseUrl, supabaseKey);
};

/**
 * Device Licensing Service
 *
 * Manages device licensing for IPTV Viewer:
 * - Device registration and activation
 * - License validation
 * - Device limit enforcement
 * - License transfer (for lifetime licenses)
 */
class DeviceLicensingServiceImpl {
    private static instance: DeviceLicensingServiceImpl;

    static getInstance(): DeviceLicensingServiceImpl {
        if (!DeviceLicensingServiceImpl.instance) {
            DeviceLicensingServiceImpl.instance = new DeviceLicensingServiceImpl();
        }
        return DeviceLicensingServiceImpl.instance;
    }

    /**
     * Register a new device
     */
    async registerDevice(
        userId: string,
        deviceId: string,
        deviceName: string,
        deviceType: DeviceType
    ): Promise<{ success: boolean; licenseKey: string; message: string }> {
        try {
            const supabase = getSupabase();

            // Check user's current license
            const { data: subscription } = await supabase
                .from('iptv_subscriptions')
                .select('tier_id, tier_name, expires_at, is_lifetime, max_devices')
                .eq('user_id', userId)
                .single();

            if (!subscription) {
                return { success: false, licenseKey: '', message: 'No active subscription found' };
            }

            // Count active devices
            const { count: activeDevices } = await supabase
                .from('iptv_devices')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_active', true);

            if ((activeDevices ?? 0) >= subscription.max_devices && subscription.max_devices > 0) {
                return {
                    success: false,
                    licenseKey: '',
                    message: `Device limit reached (${subscription.max_devices} devices). Please deactivate a device first.`
                };
            }

            // Generate license key
            const licenseKey = this.generateLicenseKey();

            // Register device
            const { error } = await supabase
                .from('iptv_devices')
                .upsert({
                    user_id: userId,
                    device_id: deviceId,
                    device_name: deviceName,
                    device_type: deviceType,
                    license_key: licenseKey,
                    is_active: true,
                    last_seen: new Date().toISOString(),
                    registered_at: new Date().toISOString(),
                }, { onConflict: 'device_id' });

            if (error) {
                throw error;
            }

            return {
                success: true,
                licenseKey,
                message: 'Device registered successfully',
            };
        } catch (error) {
            console.error('Device registration error:', error);
            return { success: false, licenseKey: '', message: 'Registration failed' };
        }
    }

    /**
     * Validate device license
     */
    async validateLicense(
        deviceId: string,
        licenseKey: string
    ): Promise<{ valid: boolean; licenseInfo: LicenseInfo | null; message: string }> {
        try {
            const supabase = getSupabase();

            // Get device and subscription
            const { data: device } = await supabase
                .from('iptv_devices')
                .select('*, user:iptv_subscriptions(*)')
                .eq('device_id', deviceId)
                .eq('license_key', licenseKey)
                .single();

            if (!device || !device.is_active) {
                return { valid: false, licenseInfo: null, message: 'Invalid license' };
            }

            // Check subscription expiry for non-lifetime
            const subscription = device.user;
            if (!subscription || !subscription.is_lifetime) {
                const expiresAt = new Date(subscription.expires_at);
                if (expiresAt < new Date()) {
                    return { valid: false, licenseInfo: null, message: 'Subscription expired' };
                }
            }

            // Update last seen
            await supabase
                .from('iptv_devices')
                .update({ last_seen: new Date().toISOString() })
                .eq('device_id', deviceId);

            return {
                valid: true,
                licenseInfo: {
                    tierId: subscription.tier_id,
                    tierName: subscription.tier_name,
                    maxDevices: subscription.max_devices,
                    activeDevices: 0, // Would need another query
                    expiresAt: subscription.expires_at,
                    isLifetime: subscription.is_lifetime,
                },
                message: 'License valid',
            };
        } catch (error) {
            console.error('License validation error:', error);
            return { valid: false, licenseInfo: null, message: 'Validation failed' };
        }
    }

    /**
     * Deactivate a device
     */
    async deactivateDevice(
        deviceId: string,
        userId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const supabase = getSupabase();

            const { error } = await supabase
                .from('iptv_devices')
                .update({ is_active: false })
                .eq('device_id', deviceId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true, message: 'Device deactivated' };
        } catch (error) {
            console.error('Device deactivation error:', error);
            return { success: false, message: 'Deactivation failed' };
        }
    }

    /**
     * Get user's devices
     */
    async getUserDevices(userId: string): Promise<Device[]> {
        try {
            const supabase = getSupabase();

            const { data: devices, error } = await supabase
                .from('iptv_devices')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('last_seen', { ascending: false });

            if (error) throw error;

            return devices || [];
        } catch (error) {
            console.error('Get devices error:', error);
            return [];
        }
    }

    /**
     * Transfer license to new device (lifetime only)
     */
    async transferLicense(
        fromDeviceId: string,
        toDeviceId: string,
        userId: string
    ): Promise<{ success: boolean; newLicenseKey: string; message: string }> {
        try {
            const supabase = getSupabase();

            // Check if user has lifetime license
            const { data: subscription } = await supabase
                .from('iptv_subscriptions')
                .select('is_lifetime')
                .eq('user_id', userId)
                .single();

            if (!subscription?.is_lifetime) {
                return { success: false, newLicenseKey: '', message: 'Transfer only available for lifetime licenses' };
            }

            // Deactivate old device
            await this.deactivateDevice(fromDeviceId, userId);

            // Get old device info to recreate on new device
            const { data: oldDevice } = await supabase
                .from('iptv_devices')
                .select('*')
                .eq('device_id', fromDeviceId)
                .single();

            if (!oldDevice) {
                return { success: false, newLicenseKey: '', message: 'Original device not found' };
            }

            // Generate new license key
            const newLicenseKey = this.generateLicenseKey();

            // Register new device
            await supabase
                .from('iptv_devices')
                .upsert({
                    user_id: userId,
                    device_id: toDeviceId,
                    device_name: oldDevice.device_name,
                    device_type: oldDevice.device_type,
                    license_key: newLicenseKey,
                    is_active: true,
                    last_seen: new Date().toISOString(),
                    registered_at: new Date().toISOString(),
                });

            return {
                success: true,
                newLicenseKey,
                message: 'License transferred successfully',
            };
        } catch (error) {
            console.error('License transfer error:', error);
            return { success: false, newLicenseKey: '', message: 'Transfer failed' };
        }
    }

    /**
     * Generate a unique license key
     */
    private generateLicenseKey(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 16; i++) {
            if (i > 0 && i % 4 === 0) key += '-';
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }
}

export const DeviceLicensingService = DeviceLicensingServiceImpl.getInstance();
