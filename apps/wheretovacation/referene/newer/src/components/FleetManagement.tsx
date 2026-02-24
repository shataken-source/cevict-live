import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Ship, Plus } from 'lucide-react';
import { BoatCard } from './fleet/BoatCard';
import { BoatProfile } from './fleet/BoatProfile';
import { MaintenanceScheduler } from './fleet/MaintenanceScheduler';
import { FuelTracker } from './fleet/FuelTracker';
import { EquipmentInventory } from './fleet/EquipmentInventory';
import { DocumentManager } from './fleet/DocumentManager';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';


export function FleetManagement() {
  const [boats, setBoats] = useState<any[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<any>(null);
  const [showAddBoat, setShowAddBoat] = useState(false);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);

  useEffect(() => {
    loadBoats();
  }, []);

  const loadBoats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fleet-management', {
        body: { action: 'getBoats' }
      });
      if (error) throw error;
      setBoats(data.boats || []);
    } catch (error) {
      console.error('Error loading boats:', error);
    }
  };

  const handleSaveBoat = async (boatData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('fleet-management', {
        body: { action: 'addBoat', boatData }
      });
      if (error) throw error;
      toast.success('Boat saved successfully');
      loadBoats();
      setShowAddBoat(false);
    } catch (error) {
      toast.error('Failed to save boat');
    }
  };

  const handleAddMaintenance = async (maintenanceData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('fleet-management', {
        body: { action: 'addMaintenance', maintenanceData, boatId: selectedBoat.id }
      });
      if (error) throw error;
      toast.success('Maintenance task added');
      setMaintenance([...maintenance, data]);
    } catch (error) {
      toast.error('Failed to add maintenance task');
    }
  };

  const handleAddFuelLog = async (fuelData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('fleet-management', {
        body: { action: 'addFuelLog', fuelData, boatId: selectedBoat.id }
      });
      if (error) throw error;
      toast.success('Fuel log added');
      setFuelLogs([...fuelLogs, data]);
    } catch (error) {
      toast.error('Failed to add fuel log');
    }
  };

  const handleAddEquipment = async (equipmentData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('fleet-management', {
        body: { action: 'addEquipment', equipmentData, boatId: selectedBoat.id }
      });
      if (error) throw error;
      toast.success('Equipment added');
      setEquipment([...equipment, data]);
    } catch (error) {
      toast.error('Failed to add equipment');
    }
  };

  if (showAddBoat) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={() => setShowAddBoat(false)} className="mb-4">Back to Fleet</Button>
        <BoatProfile onSave={handleSaveBoat} />
      </div>
    );
  }

  if (selectedBoat) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={() => setSelectedBoat(null)} className="mb-4">Back to Fleet</Button>
        <h1 className="text-3xl font-bold mb-6">{selectedBoat.name}</h1>
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
          </TabsList>
          <TabsContent value="documents">
            <DocumentManager boatId={selectedBoat.id} captainId={selectedBoat.captain_id || 'current-captain'} />
          </TabsContent>
          <TabsContent value="maintenance">
            <MaintenanceScheduler boatId={selectedBoat.id} maintenance={maintenance} onAdd={handleAddMaintenance} />
          </TabsContent>
          <TabsContent value="fuel">
            <FuelTracker boatId={selectedBoat.id} fuelLogs={fuelLogs} onAdd={handleAddFuelLog} />
          </TabsContent>
          <TabsContent value="equipment">
            <EquipmentInventory boatId={selectedBoat.id} equipment={equipment} onAdd={handleAddEquipment} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ship className="h-8 w-8" />
          Fleet Management
        </h1>
        <Button onClick={() => setShowAddBoat(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Boat
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boats.map((boat) => (
          <BoatCard key={boat.id} boat={boat} onSelect={setSelectedBoat} />
        ))}
      </div>
    </div>
  );
}
