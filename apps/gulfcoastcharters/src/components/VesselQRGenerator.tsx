import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Download, Printer, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface Vessel {
  id: string;
  name: string;
  registration_number: string;
  documentation_number?: string;
}

export function VesselQRGenerator() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVessels();
  }, []);

  const loadVessels = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('boats')
      .select('id, name, registration_number, documentation_number')
      .eq('owner_id', user.id);

    if (error) {
      toast.error('Failed to load vessels');
      return;
    }

    setVessels(data || []);
  };

  const generateQR = async (vesselId: string) => {
    setLoading(true);
    const vessel = vessels.find(v => v.id === vesselId);
    if (!vessel) return;

    const qrData = {
      vesselId: vessel.id,
      name: vessel.name,
      registration: vessel.registration_number,
      documentation: vessel.documentation_number,
      timestamp: new Date().toISOString()
    };

    try {
      const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleVesselChange = (vesselId: string) => {
    setSelectedVessel(vesselId);
    generateQR(vesselId);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `vessel-qr-${selectedVessel}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const vessel = vessels.find(v => v.id === selectedVessel);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Vessel QR Code Generator</h1>
      </div>

      <Card className="p-6 space-y-6 print:hidden">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Vessel</label>
            <Select value={selectedVessel} onValueChange={handleVesselChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vessel" />
              </SelectTrigger>
              <SelectContent>
                {vessels.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Label Size</label>
            <Select value={labelSize} onValueChange={(v: any) => setLabelSize(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (2" x 2")</SelectItem>
                <SelectItem value="medium">Medium (4" x 4")</SelectItem>
                <SelectItem value="large">Large (6" x 6")</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {qrDataUrl && (
          <div className="flex gap-3">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Label
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download PNG
            </Button>
          </div>
        )}
      </Card>

      {qrDataUrl && vessel && (
        <div className={`print:block bg-white p-8 ${
          labelSize === 'small' ? 'max-w-xs' : labelSize === 'medium' ? 'max-w-md' : 'max-w-lg'
        } mx-auto border-2 border-dashed border-gray-300 print:border-solid print:border-black`}>
          <div className="text-center space-y-4">
            <img src={qrDataUrl} alt="Vessel QR Code" className="w-full h-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-lg">{vessel.name}</h3>
              <p className="text-sm">Reg: {vessel.registration_number}</p>
              {vessel.documentation_number && (
                <p className="text-sm">Doc: {vessel.documentation_number}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
