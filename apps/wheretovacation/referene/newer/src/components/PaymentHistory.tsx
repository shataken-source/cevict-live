import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Payment {
  id: string;
  payment_type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  invoice_number?: string;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data: emails } = await supabase
        .from('custom_emails')
        .select('*')
        .eq('payment_method', 'stripe')
        .order('created_at', { ascending: false });

      if (emails) {
        setPayments(emails.map(e => ({
          id: e.id,
          payment_type: 'Custom Email',
          amount: 25,
          status: e.status,
          description: `${e.email_address}@gulfcoastcharters.com`,
          created_at: e.created_at,
          invoice_number: e.stripe_session_id
        })));
      }
    } catch (error: any) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (payment: Payment) => {
    toast.info('Generating invoice...');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-muted-foreground">No payments yet</p>
        ) : (
          <div className="space-y-3">
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">${payment.amount}</p>
                    <Badge variant={payment.status === 'active' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadInvoice(payment)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}