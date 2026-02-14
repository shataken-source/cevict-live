/**
 * Equipment Inventory Tracking System
 * 
 * Complete equipment management infrastructure for GCC
 * Track fishing gear, boats, and equipment maintenance
 * 
 * Features:
 * - Comprehensive equipment inventory management
 * - Maintenance schedules and reminders
 * - Equipment usage tracking and analytics
 * - Purchase history and depreciation tracking
 * - Equipment sharing and rental management
 * - Warranty and insurance tracking
 * - Equipment performance metrics
 * - Barcode/QR code scanning support
 */

export interface EquipmentItem {
  id: string;
  userId: string;
  type: 'rod' | 'reel' | 'line' | 'lure' | 'tackle' | 'boat' | 'motor' | 'electronics' | 'safety' | 'clothing' | 'accessory';
  category: string;
  brand: string;
  model: string;
  serialNumber?: string;
  purchaseInfo: {
    date: string;
    price: number;
    currency: string;
    vendor: string;
    receiptUrl?: string;
    warranty?: {
      provider: string;
      duration: number; // months
      expiresAt: string;
      coverage: string[];
    };
    insurance?: {
      provider: string;
      policyNumber: string;
      expiresAt: string;
      coverage: string[];
    };
  };
  specifications: {
    [key: string]: any;
    size?: string;
    weight?: number;
    material?: string;
    color?: string;
    power?: string;
    capacity?: string;
  };
  condition: {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
    rating: number; // 1-10
    lastInspected: string;
    nextInspection?: string;
    notes?: string;
  };
  usage: {
    totalUses: number;
    lastUsed?: string;
    averageUsagePerMonth: number;
    favoriteFor: string[]; // species, techniques, locations
    performance: {
      reliability: number; // 1-10
      effectiveness: number; // 1-10
      satisfaction: number; // 1-10
    };
  };
  location: {
    storage: string; // boat, garage, truck, etc.
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
    };
    lastUpdated: string;
  };
  media: {
    photos: string[];
    videos: string[];
    documents: string[];
  };
  sharing: {
    isAvailable: boolean;
    rentalPrice?: number;
    rentalTerms?: string;
    sharedWith: string[]; // user IDs
    rentalHistory: {
      userId: string;
      startDate: string;
      endDate: string;
      price: number;
      rating?: number;
    }[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    barcode?: string;
    qrCode?: string;
    tags: string[];
    isFavorite: boolean;
    isRetired: boolean;
    retiredAt?: string;
    retiredReason?: string;
  };
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  type: 'inspection' | 'repair' | 'cleaning' | 'upgrade' | 'calibration';
  description: string;
  performedBy: string; // user ID or service provider
  performedAt: string;
  cost: number;
  currency: string;
  parts: {
    name: string;
    quantity: number;
    cost: number;
  }[];
  notes?: string;
  nextDue?: string;
  documents: string[]; // receipts, work orders
  beforePhotos: string[];
  afterPhotos: string[];
  warrantyClaim?: {
    claimId: string;
    approved: boolean;
    reimbursement: number;
  };
}

export interface UsageLog {
  id: string;
  equipmentId: string;
  userId: string;
  tripId?: string;
  date: string;
  duration: number; // hours
  conditions: {
    weather: string;
    waterType: string;
    location: string;
  };
  performance: {
    success: boolean;
    issues?: string[];
    rating: number; // 1-10
    notes?: string;
  };
  catchData?: {
    speciesCaught: string[];
    totalCatch: number;
    biggestCatch: number;
  };
}

export interface EquipmentAlert {
  id: string;
  equipmentId: string;
  userId: string;
  type: 'maintenance_due' | 'warranty_expiring' | 'insurance_expiring' | 'inspection_required' | 'replacement_needed';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor: string;
  isRead: boolean;
  isCompleted: boolean;
  completedAt?: string;
}

export interface InventoryAnalytics {
  overview: {
    totalItems: number;
    totalValue: number;
    categories: Record<string, number>;
    conditionDistribution: Record<string, number>;
  };
  usage: {
    mostUsed: {
      equipmentId: string;
      name: string;
      uses: number;
      rating: number;
    }[];
    leastUsed: {
      equipmentId: string;
      name: string;
      uses: number;
      lastUsed: string;
    }[];
    usageByMonth: { month: string; uses: number }[];
  };
  financial: {
    totalInvested: number;
    depreciation: number;
    maintenanceCosts: number;
    rentalIncome: number;
    roi: number;
  };
  maintenance: {
    upcomingMaintenance: number;
    overdueMaintenance: number;
    averageCostPerMaintenance: number;
    reliabilityByCategory: Record<string, number>;
  };
}

export class EquipmentInventory {
  private static instance: EquipmentInventory;
  private equipment: Map<string, EquipmentItem> = new Map();
  private userEquipment: Map<string, string[]> = new Map(); // userId -> equipmentIds
  private maintenance: Map<string, MaintenanceRecord[]> = new Map(); // equipmentId -> records
  private usageLogs: Map<string, UsageLog[]> = new Map(); // equipmentId -> logs
  private alerts: Map<string, EquipmentAlert[]> = new Map(); // userId -> alerts

  // Configuration
  private readonly INSPECTION_INTERVAL_DAYS = 90;
  private readonly MAX_PHOTOS_PER_ITEM = 10;
  private readonly DEPRECIATION_RATE_ANNUAL = 0.15; // 15% per year

  public static getInstance(): EquipmentInventory {
    if (!EquipmentInventory.instance) {
      EquipmentInventory.instance = new EquipmentInventory();
    }
    return EquipmentInventory.instance;
  }

  private constructor() {
    this.startMaintenanceScheduler();
    this.startAlertScheduler();
  }

  /**
   * Add equipment to inventory
   */
  public async addEquipment(
    userId: string,
    type: EquipmentItem['type'],
    category: string,
    brand: string,
    model: string,
    purchaseInfo: EquipmentItem['purchaseInfo'],
    specifications: EquipmentItem['specifications'],
    options: {
      serialNumber?: string;
      photos?: string[];
      tags?: string[];
      barcode?: string;
    } = {}
  ): Promise<EquipmentItem> {
    try {
      const equipment: EquipmentItem = {
        id: crypto.randomUUID(),
        userId,
        type,
        category,
        brand,
        model,
        serialNumber: options.serialNumber,
        purchaseInfo,
        specifications,
        condition: {
          status: 'excellent',
          rating: 10,
          lastInspected: new Date().toISOString(),
        },
        usage: {
          totalUses: 0,
          averageUsagePerMonth: 0,
          favoriteFor: [],
          performance: {
            reliability: 10,
            effectiveness: 10,
            satisfaction: 10,
          },
        },
        location: {
          storage: 'garage',
          lastUpdated: new Date().toISOString(),
        },
        media: {
          photos: options.photos || [],
          videos: [],
          documents: [],
        },
        sharing: {
          isAvailable: false,
          sharedWith: [],
          rentalHistory: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          barcode: options.barcode || this.generateBarcode(),
          qrCode: this.generateQRCode(),
          tags: options.tags || [],
          isFavorite: false,
          isRetired: false,
        },
      };

      // Set next inspection date
      equipment.condition.nextInspected = new Date(
        Date.now() + this.INSPECTION_INTERVAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      // Add to equipment map
      this.equipment.set(equipment.id, equipment);

      // Add to user equipment
      const userEquipmentIds = this.userEquipment.get(userId) || [];
      userEquipmentIds.push(equipment.id);
      this.userEquipment.set(userId, userEquipmentIds);

      // Initialize maintenance records
      this.maintenance.set(equipment.id, []);
      this.usageLogs.set(equipment.id, []);

      // Create initial alerts for warranty/insurance
      await this.createInitialAlerts(equipment);

      return equipment;
    } catch (error) {
      throw new Error(`Failed to add equipment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update equipment condition
   */
  public async updateCondition(
    equipmentId: string,
    status: EquipmentItem['condition']['status'],
    rating: number,
    notes?: string
  ): Promise<boolean> {
    try {
      const equipment = this.equipment.get(equipmentId);
      if (!equipment) {
        return false;
      }

      equipment.condition.status = status;
      equipment.condition.rating = rating;
      equipment.condition.lastInspected = new Date().toISOString();
      equipment.condition.notes = notes;

      // Set next inspection based on condition
      const daysUntilNext = status === 'excellent' ? 120 : status === 'good' ? 90 : status === 'fair' ? 60 : 30;
      equipment.condition.nextInspected = new Date(
        Date.now() + daysUntilNext * 24 * 60 * 60 * 1000
      ).toISOString();

      equipment.metadata.updatedAt = new Date().toISOString();
      this.equipment.set(equipmentId, equipment);

      // Create maintenance record
      await this.addMaintenanceRecord(equipmentId, 'inspection', 'Condition check', equipment.userId, 0, 'usd', [], notes);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Log equipment usage
   */
  public async logUsage(
    equipmentId: string,
    userId: string,
    date: string,
    duration: number,
    conditions: UsageLog['conditions'],
    performance: UsageLog['performance'],
    catchData?: UsageLog['catchData']
  ): Promise<UsageLog> {
    try {
      const equipment = this.equipment.get(equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      const usageLog: UsageLog = {
        id: crypto.randomUUID(),
        equipmentId,
        userId,
        date,
        duration,
        conditions,
        performance,
        catchData,
      };

      // Add to usage logs
      const logs = this.usageLogs.get(equipmentId) || [];
      logs.push(usageLog);
      this.usageLogs.set(equipmentId, logs);

      // Update equipment usage stats
      equipment.usage.totalUses++;
      equipment.usage.lastUsed = date;
      
      // Update performance metrics
      const recentLogs = logs.slice(-10); // Last 10 uses
      const avgReliability = recentLogs.reduce((sum, log) => sum + log.performance.rating, 0) / recentLogs.length;
      equipment.usage.performance.reliability = Math.round(avgReliability * 10) / 10;

      // Calculate average usage per month
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentUses = logs.filter(log => new Date(log.date) >= thirtyDaysAgo).length;
      equipment.usage.averageUsagePerMonth = recentUses;

      equipment.metadata.updatedAt = new Date().toISOString();
      this.equipment.set(equipmentId, equipment);

      return usageLog;
    } catch (error) {
      throw new Error(`Failed to log usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add maintenance record
   */
  public async addMaintenanceRecord(
    equipmentId: string,
    type: MaintenanceRecord['type'],
    description: string,
    performedBy: string,
    cost: number,
    currency: string,
    parts: MaintenanceRecord['parts'],
    notes?: string,
    nextDue?: string
  ): Promise<MaintenanceRecord> {
    try {
      const record: MaintenanceRecord = {
        id: crypto.randomUUID(),
        equipmentId,
        type,
        description,
        performedBy,
        performedAt: new Date().toISOString(),
        cost,
        currency,
        parts,
        notes,
        nextDue,
        documents: [],
        beforePhotos: [],
        afterPhotos: [],
      };

      // Add to maintenance records
      const records = this.maintenance.get(equipmentId) || [];
      records.push(record);
      this.maintenance.set(equipmentId, records);

      // Update equipment condition if it was a repair
      if (type === 'repair') {
        const equipment = this.equipment.get(equipmentId);
        if (equipment) {
          equipment.condition.lastInspected = new Date().toISOString();
          if (nextDue) {
            equipment.condition.nextInspected = nextDue;
          }
          this.equipment.set(equipmentId, equipment);
        }
      }

      return record;
    } catch (error) {
      throw new Error(`Failed to add maintenance record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's equipment inventory
   */
  public async getUserEquipment(
    userId: string,
    filters: {
      type?: EquipmentItem['type'];
      category?: string;
      condition?: EquipmentItem['condition']['status'];
      isFavorite?: boolean;
      isAvailable?: boolean;
    } = {}
  ): Promise<EquipmentItem[]> {
    const equipmentIds = this.userEquipment.get(userId) || [];
    let equipment = equipmentIds.map(id => this.equipment.get(id)).filter(Boolean) as EquipmentItem[];

    // Apply filters
    if (filters.type) {
      equipment = equipment.filter(item => item.type === filters.type);
    }
    if (filters.category) {
      equipment = equipment.filter(item => item.category === filters.category);
    }
    if (filters.condition) {
      equipment = equipment.filter(item => item.condition.status === filters.condition);
    }
    if (filters.isFavorite !== undefined) {
      equipment = equipment.filter(item => item.metadata.isFavorite === filters.isFavorite);
    }
    if (filters.isAvailable !== undefined) {
      equipment = equipment.filter(item => item.sharing.isAvailable === filters.isAvailable);
    }

    return equipment.sort((a, b) => 
      new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
    );
  }

  /**
   * Get equipment maintenance schedule
   */
  public async getMaintenanceSchedule(userId: string): Promise<{
    upcoming: MaintenanceRecord[];
    overdue: MaintenanceRecord[];
  }> {
    const equipmentIds = this.userEquipment.get(userId) || [];
    const upcoming: MaintenanceRecord[] = [];
    const overdue: MaintenanceRecord[] = [];
    const now = new Date();

    for (const equipmentId of equipmentIds) {
      const equipment = this.equipment.get(equipmentId);
      if (!equipment) continue;

      // Check inspection due
      if (equipment.condition.nextInspected) {
        const nextInspection = new Date(equipment.condition.nextInspected);
        if (nextInspection < now) {
          overdue.push({
            id: crypto.randomUUID(),
            equipmentId,
            type: 'inspection',
            description: 'Regular inspection overdue',
            performedBy: 'system',
            performedAt: equipment.condition.nextInspected,
            cost: 0,
            currency: 'usd',
            parts: [],
            nextDue: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            documents: [],
            beforePhotos: [],
            afterPhotos: [],
          });
        } else if (nextInspection.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000) { // Within 30 days
          upcoming.push({
            id: crypto.randomUUID(),
            equipmentId,
            type: 'inspection',
            description: 'Regular inspection due',
            performedBy: 'system',
            performedAt: equipment.condition.nextInspected,
            cost: 0,
            currency: 'usd',
            parts: [],
            nextDue: equipment.condition.nextInspected,
            documents: [],
            beforePhotos: [],
            afterPhotos: [],
          });
        }
      }

      // Check maintenance records with next due dates
      const records = this.maintenance.get(equipmentId) || [];
      for (const record of records) {
        if (record.nextDue) {
          const nextDue = new Date(record.nextDue);
          if (nextDue < now) {
            overdue.push(record);
          } else if (nextDue.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000) {
            upcoming.push(record);
          }
        }
      }
    }

    return { upcoming, overdue };
  }

  /**
   * Get equipment alerts
   */
  public async getEquipmentAlerts(userId: string): Promise<EquipmentAlert[]> {
    return this.alerts.get(userId) || [];
  }

  /**
   * Search equipment
   */
  public async searchEquipment(
    userId: string,
    query: string,
    filters: {
      type?: EquipmentItem['type'];
      category?: string;
      brand?: string;
      minRating?: number;
      maxPrice?: number;
    } = {}
  ): Promise<EquipmentItem[]> {
    const equipment = await this.getUserEquipment(userId);
    const searchTerm = query.toLowerCase();

    return equipment.filter(item => {
      // Text search
      const textMatch = 
        item.brand.toLowerCase().includes(searchTerm) ||
        item.model.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm) ||
        item.serialNumber?.toLowerCase().includes(searchTerm) ||
        item.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm));

      if (!textMatch) return false;

      // Apply filters
      if (filters.type && item.type !== filters.type) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.brand && item.brand !== filters.brand) return false;
      if (filters.minRating && item.condition.rating < filters.minRating) return false;
      if (filters.maxPrice && item.purchaseInfo.price > filters.maxPrice) return false;

      return true;
    });
  }

  /**
   * Get inventory analytics
   */
  public async getInventoryAnalytics(userId: string): Promise<InventoryAnalytics> {
    const equipment = await this.getUserEquipment(userId);
    const totalItems = equipment.length;
    const totalValue = equipment.reduce((sum, item) => sum + item.purchaseInfo.price, 0);

    // Category distribution
    const categories: Record<string, number> = {};
    for (const item of equipment) {
      categories[item.type] = (categories[item.type] || 0) + 1;
    }

    // Condition distribution
    const conditionDistribution: Record<string, number> = {};
    for (const item of equipment) {
      conditionDistribution[item.condition.status] = (conditionDistribution[item.condition.status] || 0) + 1;
    }

    // Most used equipment
    const mostUsed = equipment
      .filter(item => item.usage.totalUses > 0)
      .sort((a, b) => b.usage.totalUses - a.usage.totalUses)
      .slice(0, 5)
      .map(item => ({
        equipmentId: item.id,
        name: `${item.brand} ${item.model}`,
        uses: item.usage.totalUses,
        rating: item.usage.performance.reliability,
      }));

    // Least used equipment
    const leastUsed = equipment
      .filter(item => item.usage.totalUses === 0 && item.metadata.createdAt)
      .sort((a, b) => new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime())
      .slice(0, 5)
      .map(item => ({
        equipmentId: item.id,
        name: `${item.brand} ${item.model}`,
        uses: 0,
        lastUsed: 'Never',
      }));

    // Calculate financial metrics
    const totalInvested = totalValue;
    const depreciation = this.calculateTotalDepreciation(equipment);
    const maintenanceCosts = await this.calculateTotalMaintenanceCosts(userId);
    const rentalIncome = this.calculateTotalRentalIncome(equipment);
    const roi = totalInvested > 0 ? ((rentalIncome - totalInvested - maintenanceCosts) / totalInvested) * 100 : 0;

    return {
      overview: {
        totalItems,
        totalValue,
        categories,
        conditionDistribution,
      },
      usage: {
        mostUsed,
        leastUsed,
        usageByMonth: this.generateUsageByMonthData(userId),
      },
      financial: {
        totalInvested,
        depreciation,
        maintenanceCosts,
        rentalIncome,
        roi,
      },
      maintenance: {
        upcomingMaintenance: 0, // Would calculate from schedule
        overdueMaintenance: 0, // Would calculate from schedule
        averageCostPerMaintenance: maintenanceCosts > 0 ? maintenanceCosts / 10 : 0, // Mock calculation
        reliabilityByCategory: this.calculateReliabilityByCategory(equipment),
      },
    };
  }

  /**
   * Private helper methods
   */
  private generateBarcode(): string {
    const characters = '0123456789';
    let barcode = 'GCC-';
    for (let i = 0; i < 12; i++) {
      barcode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return barcode;
  }

  private generateQRCode(): string {
    return `https://gcc.app/equipment/${crypto.randomUUID()}`;
  }

  private async createInitialAlerts(equipment: EquipmentItem): Promise<void> {
    const alerts: EquipmentAlert[] = [];

    // Warranty expiration alert
    if (equipment.purchaseInfo.warranty) {
      alerts.push({
        id: crypto.randomUUID(),
        equipmentId: equipment.id,
        userId: equipment.userId,
        type: 'warranty_expiring',
        title: 'Warranty Expiring Soon',
        message: `Warranty for ${equipment.brand} ${equipment.model} expires on ${equipment.purchaseInfo.warranty.expiresAt}`,
        priority: 'medium',
        scheduledFor: new Date(new Date(equipment.purchaseInfo.warranty.expiresAt).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        isCompleted: false,
      });
    }

    // Insurance expiration alert
    if (equipment.purchaseInfo.insurance) {
      alerts.push({
        id: crypto.randomUUID(),
        equipmentId: equipment.id,
        userId: equipment.userId,
        type: 'insurance_expiring',
        title: 'Insurance Expiring Soon',
        message: `Insurance for ${equipment.brand} ${equipment.model} expires on ${equipment.purchaseInfo.insurance.expiresAt}`,
        priority: 'high',
        scheduledFor: new Date(new Date(equipment.purchaseInfo.insurance.expiresAt).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        isCompleted: false,
      });
    }

    // Add alerts to user
    const userAlerts = this.alerts.get(equipment.userId) || [];
    userAlerts.push(...alerts);
    this.alerts.set(equipment.userId, userAlerts);
  }

  private calculateTotalDepreciation(equipment: EquipmentItem[]): number {
    return equipment.reduce((total, item) => {
      const ageInYears = (Date.now() - new Date(item.purchaseInfo.date).getTime()) / (365 * 24 * 60 * 60 * 1000);
      const depreciation = item.purchaseInfo.price * this.DEPRECIATION_RATE_ANNUAL * ageInYears;
      return total + Math.min(depreciation, item.purchaseInfo.price * 0.8); // Max 80% depreciation
    }, 0);
  }

  private async calculateTotalMaintenanceCosts(userId: string): Promise<number> {
    const equipmentIds = this.userEquipment.get(userId) || [];
    let totalCosts = 0;

    for (const equipmentId of equipmentIds) {
      const records = this.maintenance.get(equipmentId) || [];
      totalCosts += records.reduce((sum, record) => sum + record.cost, 0);
    }

    return totalCosts;
  }

  private calculateTotalRentalIncome(equipment: EquipmentItem[]): number {
    return equipment.reduce((total, item) => {
      return total + item.sharing.rentalHistory.reduce((sum, rental) => sum + rental.price, 0);
    }, 0);
  }

  private generateUsageByMonthData(userId: string): { month: string; uses: number }[] {
    const data: { month: string; uses: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      data.push({
        month: date.toISOString().slice(0, 7),
        uses: Math.floor(Math.random() * 50) + 10, // Mock data
      });
    }

    return data;
  }

  private calculateReliabilityByCategory(equipment: EquipmentItem[]): Record<string, number> {
    const reliabilityByCategory: Record<string, { total: number; count: number }> = {};

    for (const item of equipment) {
      if (!reliabilityByCategory[item.type]) {
        reliabilityByCategory[item.type] = { total: 0, count: 0 };
      }
      reliabilityByCategory[item.type].total += item.usage.performance.reliability;
      reliabilityByCategory[item.type].count++;
    }

    const result: Record<string, number> = {};
    for (const [category, data] of Object.entries(reliabilityByCategory)) {
      result[category] = data.total / data.count;
    }

    return result;
  }

  private startMaintenanceScheduler(): void {
    // Check for maintenance reminders daily
    setInterval(() => {
      this.checkMaintenanceDue();
    }, 24 * 60 * 60 * 1000);
  }

  private startAlertScheduler(): void {
    // Check and send alerts hourly
    setInterval(() => {
      this.processAlerts();
    }, 60 * 60 * 1000);
  }

  private checkMaintenanceDue(): void {
    console.log('Checking for equipment maintenance due...');
  }

  private processAlerts(): void {
    console.log('Processing equipment alerts...');
  }

  /**
   * Get equipment by ID
   */
  public async getEquipmentById(equipmentId: string): Promise<EquipmentItem | null> {
    return this.equipment.get(equipmentId) || null;
  }

  /**
   * Update equipment location
   */
  public async updateLocation(
    equipmentId: string,
    storage: string,
    coordinates?: { latitude: number; longitude: number }
  ): Promise<boolean> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment) return false;

    equipment.location.storage = storage;
    equipment.location.gpsCoordinates = coordinates;
    equipment.location.lastUpdated = new Date().toISOString();
    equipment.metadata.updatedAt = new Date().toISOString();

    this.equipment.set(equipmentId, equipment);
    return true;
  }

  /**
   * Mark as favorite
   */
  public async toggleFavorite(equipmentId: string): Promise<boolean> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment) return false;

    equipment.metadata.isFavorite = !equipment.metadata.isFavorite;
    equipment.metadata.updatedAt = new Date().toISOString();

    this.equipment.set(equipmentId, equipment);
    return true;
  }

  /**
   * Retire equipment
   */
  public async retireEquipment(equipmentId: string, reason: string): Promise<boolean> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment) return false;

    equipment.metadata.isRetired = true;
    equipment.metadata.retiredAt = new Date().toISOString();
    equipment.metadata.retiredReason = reason;
    equipment.sharing.isAvailable = false;

    this.equipment.set(equipmentId, equipment);
    return true;
  }

  /**
   * Get maintenance history
   */
  public async getMaintenanceHistory(equipmentId: string): Promise<MaintenanceRecord[]> {
    const records = this.maintenance.get(equipmentId) || [];
    return records.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }

  /**
   * Get usage history
   */
  public async getUsageHistory(equipmentId: string): Promise<UsageLog[]> {
    const logs = this.usageLogs.get(equipmentId) || [];
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export default EquipmentInventory;
