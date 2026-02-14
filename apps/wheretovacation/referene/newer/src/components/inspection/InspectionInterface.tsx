import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { QRScanner } from './QRScanner';
import { SignatureCapture } from './SignatureCapture';
import { supabase } from '@/lib/supabase';
import { QrCode, Wifi, WifiOff, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

interface InspectionItem {
  id: string;
  category: string;
  requirement: string;
  checked: boolean;
  notes: string;
}

export function InspectionInterface() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScanner, setShowScanner] = useState(false);
  const [vesselId, setVesselId] = useState('');
  const [vesselData, setVesselData] = useState<any>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadInspectionItems();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadInspectionItems = () => {
    const defaultItems: InspectionItem[] = [
      { id: '1', category: 'Safety', requirement: 'Life jackets (1 per person)', checked: false, notes: '' },
      { id: '2', category: 'Safety', requirement: 'Fire extinguisher', checked: false, notes: '' },
      { id: '3', category: 'Safety', requirement: 'Visual distress signals', checked: false, notes: '' },
      { id: '4', category: 'Navigation', requirement: 'Navigation lights operational', checked: false, notes: '' },
      { id: '5', category: 'Documentation', requirement: 'Registration current', checked: false, notes: '' },
      { id: '6', category: 'Documentation', requirement: 'Insurance valid', checked: false, notes: '' },
    ];
    setItems(defaultItems);
  };

  const handleScan = async (scannedId: string) => {
    setVesselId(scannedId);
    setShowScanner(false);
    await loadVesselData(scannedId);
  };

  const loadVesselData = async (id: string) => {
    try {
      const { data, error } = await supabase.from('boats').select('*').eq('id', id).single();
      if (error) throw error;
      setVesselData(data);
      toast.success('Vessel loaded');
    } catch (err) {
      toast.error('Failed to load vessel');
    }
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const updateNotes = (id: string, notes: string) => {
    setItems(items.map(item => item.id === id ? { ...item, notes } : item));
  };

  const saveOffline = () => {
    const inspection = { vesselId, vesselData, items, generalNotes, signature, timestamp: Date.now() };
    const saved = JSON.parse(localStorage.getItem('offlineInspections') || '[]');
    saved.push(inspection);
    localStorage.setItem('offlineInspections', JSON.stringify(saved));
    toast.success('Saved offline');
  };

  const submitInspection = async () => {
    if (!signature) {
      toast.error('Signature required');
      return;
    }
    const inspection = { vessel_id: vesselId, items, general_notes: generalNotes, signature, inspector_name: 'Officer', completed_at: new Date().toISOString() };
    
    if (isOnline) {
      try {
        const { error } = await supabase.from('inspections').insert([inspection]);
        if (error) throw error;
        toast.success('Inspection submitted');
        resetForm();
      } catch (err) {
        toast.error('Failed to submit');
      }
    } else {
      saveOffline();
    }
  };

  const resetForm = () => {
    setVesselId('');
    setVesselData(null);
    setSignature('');
    setGeneralNotes('');
    loadInspectionItems();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Coast Guard Inspection</h1>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!vesselData ? (
          <Card className="p-6 text-center">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-semibold mb-2">Scan Vessel QR Code</h2>
            <Button onClick={() => setShowScanner(true)}>Start Scan</Button>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <h3 className="font-semibold mb-2">{vesselData.name}</h3>
              <p className="text-sm text-gray-600">Registration: {vesselData.registration_number}</p>
            </Card>

            {items.map(item => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={item.checked} onCheckedChange={() => toggleItem(item.id)} />
                  <div className="flex-1">
                    <p className="font-medium">{item.requirement}</p>
                    <Badge variant="outline" className="mt-1">{item.category}</Badge>
                    <Textarea
                      placeholder="Notes..."
                      value={item.notes}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-4">
              <h3 className="font-semibold mb-2">General Notes</h3>
              <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={4} />
            </Card>

            {!signature ? (
              <Button onClick={() => setShowSignature(true)} className="w-full">Add Signature</Button>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-green-600 mb-2">Signature captured</p>
                <img src={signature} alt="Signature" className="border rounded" />
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={saveOffline} variant="outline" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Offline
              </Button>
              <Button onClick={submitInspection} className="flex-1" disabled={!isOnline}>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </>
        )}
      </div>

      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      {showSignature && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <SignatureCapture onSave={(sig) => { setSignature(sig); setShowSignature(false); }} onCancel={() => setShowSignature(false)} />
        </div>
      )}
    </div>
  );
}
