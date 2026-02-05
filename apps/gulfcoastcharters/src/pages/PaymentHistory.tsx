import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, CreditCard } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string;
  created_at: string;
  booking_id: string;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Payment History</h1>
      
      <div className="space-y-4">
        {payments.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No payment history yet</p>
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">
                      ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                    </h3>
                    <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(payment.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Booking ID: {payment.booking_id}</p>
                </div>
                {payment.receipt_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(payment.receipt_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Receipt
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}