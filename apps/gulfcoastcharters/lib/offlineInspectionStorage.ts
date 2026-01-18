export * from '../offlineInspectionStorage';

/**
 * Sync manager for uploading offline inspections
 */
export class InspectionSyncManager {
  private storage: OfflineInspectionStorage;
  private supabaseClient: any; // Replace with actual Supabase client type
  
  constructor(storage: OfflineInspectionStorage, supabaseClient: any) {
    this.storage = storage;
    this.supabaseClient = supabaseClient;
  }
  
  /**
   * Sync all pending inspections
   */
  async syncAll(): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const pending = await this.storage.getPendingSyncInspections();
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    console.log(`Syncing ${pending.length} offline inspections...`);
    
    for (const inspection of pending) {
      try {
        await this.storage.updateSyncStatus(inspection.id, 'syncing');
        
        // Upload to Supabase
        const { error } = await this.supabaseClient
          .from('inspections')
          .upsert({
            id: inspection.id,
            boat_id: inspection.boatId,
            inspector_id: inspection.inspectorId,
            inspection_date: inspection.inspectionDate,
            inspection_type: inspection.inspectionType,
            status: inspection.status,
            life_jackets_check: inspection.lifeJacketsCheck,
            fire_extinguisher_check: inspection.fireExtinguisherCheck,
            flares_check: inspection.flaresCheck,
            radio_check: inspection.radioCheck,
            navigation_lights_check: inspection.navigationLightsCheck,
            bilge_pump_check: inspection.bilgePumpCheck,
            horn_check: inspection.hornCheck,
            engine_oil_level: inspection.engineOilLevel,
            fuel_level: inspection.fuelLevel,
            battery_voltage: inspection.batteryVoltage,
            coolant_level: inspection.coolantLevel,
            hull_condition: inspection.hullCondition,
            deck_condition: inspection.deckCondition,
            notes: inspection.notes,
            issues_found: inspection.issuesFound,
            created_at: inspection.createdAt,
            updated_at: inspection.updatedAt
          });
        
        if (error) throw error;
        
        // Mark as synced (will delete from offline storage)
        await this.storage.updateSyncStatus(inspection.id, 'synced');
        success++;
        
      } catch (error: any) {
        console.error(`Failed to sync inspection ${inspection.id}:`, error);
        await this.storage.updateSyncStatus(inspection.id, 'failed', error.message);
        failed++;
        errors.push({ id: inspection.id, error: error.message });
      }
    }
    
    return { success, failed, errors };
  }
  
  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
  
  /**
   * Auto-sync when connection is restored
   */
  enableAutoSync(): void {
    window.addEventListener('online', async () => {
      console.log('Connection restored, syncing offline data...');
      await this.syncAll();
    });
  }
}
