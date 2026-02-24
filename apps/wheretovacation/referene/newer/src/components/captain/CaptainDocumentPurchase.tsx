import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, FileText, Heart, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DocumentProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: any;
  type: 'license' | 'insurance' | 'certification';
  duration: string;
}

export default function CaptainDocumentPurchase() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const products: DocumentProduct[] = [
    {
      id: 'uscg-renewal',
      name: 'USCG License Renewal',
      description: '5-year USCG Captain License renewal processing',
      price: 299,
      icon: ShieldCheck,
      type: 'license',
      duration: '5 years'
    },
    {
      id: 'insurance-annual',
      name: 'Marine Insurance',
      description: 'Comprehensive liability & vessel coverage',
      price: 1200,
      icon: FileText,
      type: 'insurance',
      duration: '1 year'
    },
    {
      id: 'first-aid-cert',
      name: 'First Aid Certification',
      description: 'CPR & First Aid training + certification',
      price: 89,
      icon: Heart,
      type: 'certification',
      duration: '2 years'
    },
    {
      id: 'safety-cert',
      name: 'Safety Certification',
      description: 'Vessel safety inspection & certification',
      price: 150,
      icon: AlertCircle,
      type: 'certification',
      duration: '1 year'
    }
  ];

  const handlePurchase = async (product: DocumentProduct) => {
    setLoading(product.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please login');

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          productName: product.name,
          amount: product.price * 100,
          metadata: {
            type: 'document_purchase',
            documentType: product.type,
            productId: product.id,
            userId: user.id
          }
        }
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;

    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Purchase & Renew Documents</h2>
        <p className="text-muted-foreground">Keep your certifications current</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {products.map((product) => {
          const Icon = product.icon;
          return (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {product.name}
                </CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">${product.price}</div>
                    <Badge variant="outline">{product.duration}</Badge>
                  </div>
                  <Button
                    onClick={() => handlePurchase(product)}
                    disabled={loading === product.id}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {loading === product.id ? 'Processing...' : 'Purchase'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}