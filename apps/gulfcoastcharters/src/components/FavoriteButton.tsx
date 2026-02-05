import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface FavoriteButtonProps {
  charterId: string;
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({ charterId, userId, size = 'md' }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      checkFavoriteStatus();
    }
  }, [userId, charterId]);

  const checkFavoriteStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke('favorites-manager', {
        body: { action: 'list', userId }
      });
      
      if (data?.favorites) {
        setIsFavorite(data.favorites.some((f: any) => f.charter_id === charterId));
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      toast({
        title: 'Login Required',
        description: 'Please login to save favorites',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const action = isFavorite ? 'remove' : 'add';
      const { data, error } = await supabase.functions.invoke('favorites-manager', {
        body: { action, userId, charterId }
      });

      if (error) throw error;

      setIsFavorite(!isFavorite);
      toast({
        title: isFavorite ? 'Removed from favorites' : 'Added to favorites',
        description: isFavorite ? 'Charter removed from your wishlist' : 'Charter saved to your wishlist'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`${sizeClasses[size]} rounded-full bg-white/90 hover:bg-white shadow-md`}
      onClick={toggleFavorite}
      disabled={loading}
    >
      <Heart
        className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
      />
    </Button>
  );
}
