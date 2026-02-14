import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Charter {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  capacity: number;
  description?: string;
}

// Fetch all charters
export function useCharters() {
  return useQuery({
    queryKey: ['charters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charters')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Charter[];
    },
  });
}

// Fetch single charter
export function useCharter(id: string) {
  return useQuery({
    queryKey: ['charter', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charters')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Charter;
    },
    enabled: !!id,
  });
}

// Create charter booking
export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: Record<string, unknown>) => {

      const { data, error } = await supabase
        .from('bookings')
        .insert(booking)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking created successfully!');
    },
  });
}
