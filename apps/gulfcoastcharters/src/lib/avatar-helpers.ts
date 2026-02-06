/**
 * Avatar Helpers
 * Utilities to fetch and display user avatars
 */

// Use the shared supabase client instead of creating a new one
import { supabase } from '@/lib/supabase';

export interface UserAvatarData {
  sex: string;
  skin_color: string;
  hair_style: string;
  hair_color: string;
  body_type?: string;
  equipped_items: string[];
}

/**
 * Get user's avatar data
 */
export async function getUserAvatar(userId: string): Promise<UserAvatarData | null> {
  // Skip invalid user IDs
  if (!userId || userId === 'system' || userId === 'anonymous' || userId.length < 10) {
    return null;
  }

  try {
    // Get avatar customization
    const { data: avatar, error: avatarError } = await supabase
      .from('user_avatars')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no row exists

    if (avatarError) {
      // Table doesn't exist or other error - return null gracefully
      if (avatarError.code === 'PGRST205' || avatarError.code === '42P01') {
        // Table doesn't exist - that's okay, return default
        return null;
      }
      // Only log non-404 errors
      if (avatarError.code !== 'PGRST116') {
        console.error('Error fetching avatar:', avatarError);
      }
    }

    // Try to get equipped items from loadout table first (newer system)
    let equippedItems: string[] = [];
    
    try {
      const { data: loadout, error: loadoutError } = await supabase
        .from('user_avatar_loadout')
        .select('hat_id, shirt_id, gear_id, effect_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!loadoutError && loadout) {
        // Use loadout system
        if (loadout.hat_id) equippedItems.push('hat');
        if (loadout.shirt_id) equippedItems.push('shirt');
        if (loadout.gear_id) equippedItems.push('gear');
        if (loadout.effect_id) equippedItems.push('effect');
      } else {
        // Fallback to inventory system
        const { data: inventory, error: inventoryError } = await supabase
          .from('user_avatar_inventory')
          .select(`
            is_equipped,
            item_id,
            avatar_shop_items:item_id (
              category
            )
          `)
          .eq('user_id', userId)
          .eq('is_equipped', true);

        if (!inventoryError && inventory) {
          inventory.forEach((item: any) => {
            if (item.avatar_shop_items?.category) {
              equippedItems.push(item.avatar_shop_items.category);
            }
          });
        }
      }
    } catch (error) {
      // Silently fail - just use default avatar
      console.debug('Could not load equipped items:', error);
    }

    return {
      sex: avatar?.sex || 'male',
      skin_color: avatar?.skin_color || '#f5d0a9',
      hair_style: avatar?.hair_style || 'short',
      hair_color: avatar?.hair_color || '#4a3728',
      body_type: avatar?.body_type || 'average',
      equipped_items: equippedItems,
    };
  } catch (error) {
    console.error('Error in getUserAvatar:', error);
    return null;
  }
}

/**
 * Get user's point balance
 */
export async function getUserPoints(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('shared_users')
      .select('total_points')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // Only log if it's not a "not found" error
      if (error.code !== 'PGRST116') {
        console.error('Error fetching points:', error);
      }
      return 0;
    }

    return data?.total_points || 0;
  } catch (error) {
    console.error('Error in getUserPoints:', error);
    return 0;
  }
}
