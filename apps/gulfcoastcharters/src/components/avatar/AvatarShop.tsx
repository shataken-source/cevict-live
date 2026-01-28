import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Check, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AvatarShopProps {
  userId: string;
  userPoints: number;
  onPointsChange: (newPoints: number) => void;
}

export default function AvatarShop({ userId, userPoints, onPointsChange }: AvatarShopProps) {
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadShopData();
  }, [userId]);

  const loadShopData = async () => {
    setLoading(true);
    try {
      const [itemsRes, inventoryRes] = await Promise.all([
        supabase.from('avatar_shop_items').select('*').eq('is_active', true).order('category'),
        supabase.from('user_avatar_inventory').select('item_id').eq('user_id', userId)
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (inventoryRes.data) setInventory(inventoryRes.data.map(i => i.item_id));

      // Analytics
      await supabase.from('avatar_analytics').insert({
        event_type: 'shop_viewed',
        user_id: userId,
        metadata: { timestamp: new Date().toISOString() }
      });
    } catch (error: any) {
      toast({ title: 'Error loading shop', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (item: any) => {
    if (userPoints < item.price_points) {
      toast({ title: 'Not enough points!', description: `You need ${item.price_points} points.`, variant: 'destructive' });
      return;
    }

    setPurchasing(item.id);
    try {
      // Check if already owned
      const { data: existing } = await supabase
        .from('user_avatar_inventory')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', item.id)
        .single();

      if (existing) {
        toast({ title: 'Already owned', description: 'You already have this item!', variant: 'destructive' });
        return;
      }

      // Get current points from shared_users
      const { data: sharedUser } = await supabase
        .from('shared_users')
        .select('total_points')
        .eq('id', userId)
        .single();

      if (!sharedUser || sharedUser.total_points < item.price_points) {
        toast({ title: 'Insufficient points', variant: 'destructive' });
        return;
      }

      // Use the purchase_avatar_item function if available, otherwise manual transaction
      const { data: purchaseResult, error: purchaseError } = await supabase.rpc('purchase_avatar_item', {
        user_uuid: userId,
        item_uuid: item.id,
      });

      if (purchaseError) {
        // Fallback to manual transaction
        const newPoints = sharedUser.total_points - item.price_points;
        const [updateRes, inventoryRes, logRes] = await Promise.all([
          supabase.from('shared_users').update({ total_points: newPoints }).eq('id', userId),
          supabase.from('user_avatar_inventory').insert({ user_id: userId, item_id: item.id }),
          supabase.from('avatar_purchase_log').insert({
            user_id: userId,
            item_id: item.id,
            points_spent: item.price_points
          })
        ]);

        if (updateRes.error || inventoryRes.error) throw new Error('Transaction failed');
      }

      // Analytics
      await supabase.from('avatar_analytics').insert({
        event_type: 'item_purchased',
        user_id: userId,
        item_id: item.id,
        metadata: { price: item.price_points, item_name: item.name }
      });

      // Award points for first purchase (gamification)
      const isFirstPurchase = inventory.length === 0;
      if (isFirstPurchase) {
        try {
          await supabase.functions.invoke('points-rewards-system', {
            body: {
              action: 'award_points',
              userId,
              actionType: 'avatar_first_purchase',
              amount: 25,
            },
          });
          toast({ 
            title: 'Item purchased!', 
            description: `${item.name} added to your inventory. +25 bonus points for first purchase!` 
          });
        } catch (error) {
          console.error('Error awarding first purchase points:', error);
        }
      } else {
        toast({ title: 'Item purchased!', description: `${item.name} added to your inventory` });
      }

      // Get updated points
      const { data: updatedUser } = await supabase
        .from('shared_users')
        .select('total_points')
        .eq('id', userId)
        .single();

      onPointsChange(updatedUser?.total_points || sharedUser.total_points - item.price_points);
      setInventory([...inventory, item.id]);
    } catch (error: any) {
      toast({ title: 'Purchase failed', description: error.message, variant: 'destructive' });
    } finally {
      setPurchasing(null);
    }
  };

  const equipItem = async (itemId: string) => {
    try {
      const { data: item } = await supabase
        .from('avatar_shop_items')
        .select('category')
        .eq('id', itemId)
        .single();

      if (item) {
        await supabase
          .from('user_avatar_inventory')
          .update({ is_equipped: false })
          .eq('user_id', userId)
          .eq('item_id', itemId);
      }

      await supabase
        .from('user_avatar_inventory')
        .update({ is_equipped: true })
        .eq('user_id', userId)
        .eq('item_id', itemId);

      toast({ title: 'Item equipped!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const categories = ['hat', 'sunglasses', 'accessory', 'top', 'bottom'];

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" />
          Avatar Shop
        </h2>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {userPoints} Points
        </Badge>
      </div>

      <Tabs defaultValue="hat">
        <TabsList className="grid grid-cols-5 mb-6">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">{cat}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.filter(item => item.category === category).map(item => {
                const owned = inventory.includes(item.id);
                const isPurchasing = purchasing === item.id;
                return (
                  <Card key={item.id} className="p-4 text-center">
                    <div className="w-full h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mb-3 flex items-center justify-center text-4xl">
                      {item.name}
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{item.name}</h3>
                    <Badge variant="outline" className="mb-3">{item.price_points} pts</Badge>
                    {owned ? (
                      <Button size="sm" variant="secondary" onClick={() => equipItem(item.id)} className="w-full">
                        <Check className="w-4 h-4 mr-1" /> Equip
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => purchaseItem(item)} 
                        disabled={userPoints < item.price_points || isPurchasing} 
                        className="w-full"
                      >
                        {isPurchasing ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : userPoints < item.price_points ? (
                          <Lock className="w-4 h-4 mr-1" />
                        ) : null}
                        {isPurchasing ? 'Buying...' : 'Buy'}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
