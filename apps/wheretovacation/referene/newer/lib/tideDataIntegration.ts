/**
 * Tide Data Integration from NOAA CO-OPS
 * 
 * Real-time tide predictions integrated from NOAA CO-OPS (Center for Operational 
 * Oceanographic Products and Services) for all Gulf Coast stations.
 * 
 * Data Sources:
 * - NOAA CO-OPS API: https://api.tidesandcurrents.noaa.gov/api/prod/
 * - Update Frequency: Every 6 hours for predictions, real-time for actual levels
 * - Major Stations: Mobile Bay, Pensacola, Destin, Panama City, Apalachicola, Tampa, Galveston, South Padre Island
 */

export interface TideStation {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  state: 'AL' | 'FL' | 'MS' | 'LA' | 'TX';
}

export interface TidePrediction {
  datetime: string;
  tideType: 'high' | 'low';
  height: number; // in feet
  isFishingWindow?: boolean;
}

export interface FishingWindow {
  start: string;
  end: string;
  type: 'pre_high' | 'post_high' | 'pre_low' | 'post_low';
  quality: 'excellent' | 'good' | 'fair';
  description: string;
}

export interface TideData {
  station: TideStation;
  predictions: TidePrediction[];
  fishingWindows: FishingWindow[];
  currentStatus: {
    status: 'rising' | 'falling' | 'high_slack' | 'low_slack';
    nextTide: string;
    nextTideType: 'high' | 'low';
    timeUntilNext: number; // minutes
  };
  fetchedAt: string;
}

export class TideDataIntegration {
  private static instance: TideDataIntegration;
  private cache: Map<string, { data: TideData; expires: number }> = new Map();
  
  // NOAA CO-OPS Gulf Coast Stations
  private readonly GULF_COAST_STATIONS: TideStation[] = [
    // Alabama
    { stationId: '8735180', stationName: 'Dauphin Island', latitude: 30.25, longitude: -88.075, timezone: 'America/Chicago', state: 'AL' },
    { stationId: '8724580', stationName: 'Mobile State Docks', latitude: 30.69, longitude: -88.04, timezone: 'America/Chicago', state: 'AL' },
    
    // Florida
    { stationId: '8723970', stationName: 'Pensacola', latitude: 30.403, longitude: -87.213, timezone: 'America/Chicago', state: 'FL' },
    { stationId: '8729108', stationName: 'Destin', latitude: 30.393, longitude: -86.495, timezone: 'America/Chicago', state: 'FL' },
    { stationId: '8729210', stationName: 'Panama City', latitude: 30.138, longitude: -85.664, timezone: 'America/Chicago', state: 'FL' },
    { stationId: '8728690', stationName: 'Apalachicola', latitude: 29.728, longitude: -84.874, timezone: 'America/Chicago', state: 'FL' },
    { stationId: '8726607', stationName: 'Clearwater Beach', latitude: 27.975, longitude: -82.827, timezone: 'America/New_York', state: 'FL' },
    { stationId: '8726520', stationName: 'St. Petersburg', latitude: 27.763, longitude: -82.635, timezone: 'America/New_York', state: 'FL' },
    { stationId: '8724580', stationName: 'Cedar Key', latitude: 29.138, longitude: -83.029, timezone: 'America/New_York', state: 'FL' },
    
    // Mississippi
    { stationId: '8745550', stationName: 'Biloxi', latitude: 30.385, longitude: -88.896, timezone: 'America/Chicago', state: 'MS' },
    { stationId: '8747437', stationName: 'Bay St. Louis', latitude: 30.316, longitude: -89.327, timezone: 'America/Chicago', state: 'MS' },
    
    // Louisiana
    { stationId: '8761724', stationName: 'Grand Isle', latitude: 29.265, longitude: -89.955, timezone: 'America/Chicago', state: 'LA' },
    { stationId: '8761306', stationName: 'New Canal Station', latitude: 30.027, longitude: -90.035, timezone: 'America/Chicago', state: 'LA' },
    { stationId: '8764317', stationName: 'Sabine Pass', latitude: 29.735, longitude: -93.881, timezone: 'America/Chicago', state: 'LA' },
    
    // Texas
    { stationId: '8771972', stationName: 'Galveston', latitude: 29.305, longitude: -94.797, timezone: 'America/Chicago', state: 'TX' },
    { stationId: '8772447', stationName: 'Freeport', latitude: 28.935, longitude: -95.305, timezone: 'America/Chicago', state: 'TX' },
    { stationId: '8775237', stationName: 'Port Mansfield', latitude: 27.471, longitude: -97.424, timezone: 'America/Chicago', state: 'TX' },
    { stationId: '8775870', stationName: 'Port Isabel', latitude: 26.055, longitude: -97.215, timezone: 'America/Chicago', state: 'TX' },
    { stationId: '8771510', stationName: 'Rockport', latitude: 28.022, longitude: -97.056, timezone: 'America/Chicago', state: 'TX' },
  ];

  public static getInstance(): TideDataIntegration {
    if (!TideDataIntegration.instance) {
      TideDataIntegration.instance = new TideDataIntegration();
    }
    return TideDataIntegration.instance;
  }

  /**
   * Get tide data for a specific station
   */
  public async getTideData(stationId: string, days: number = 7): Promise<TideData> {
    // Check cache first
    const cacheKey = `${stationId}_${days}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const station = this.GULF_COAST_STATIONS.find(s => s.stationId === stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Fetch tide predictions from NOAA
    const predictions = await this.fetchTidePredictions(stationId, days);
    
    // Calculate fishing windows
    const fishingWindows = this.calculateFishingWindows(predictions);
    
    // Determine current status
    const currentStatus = this.calculateCurrentStatus(predictions);
    
    const tideData: TideData = {
      station,
      predictions,
      fishingWindows,
      currentStatus,
      fetchedAt: new Date().toISOString(),
    };

    // Cache for 6 hours
    this.cache.set(cacheKey, {
      data: tideData,
      expires: Date.now() + (6 * 60 * 60 * 1000),
    });

    return tideData;
  }

  /**
   * Get all Gulf Coast stations
   */
  public getGulfCoastStations(): TideStation[] {
    return [...this.GULF_COAST_STATIONS];
  }

  /**
   * Get stations by state
   */
  public getStationsByState(state: 'AL' | 'FL' | 'MS' | 'LA' | 'TX'): TideStation[] {
    return this.GULF_COAST_STATIONS.filter(station => station.state === state);
  }

  /**
   * Find nearest station to coordinates
   */
  public findNearestStation(latitude: number, longitude: number): TideStation {
    let nearestStation = this.GULF_COAST_STATIONS[0];
    let minDistance = this.calculateDistance(latitude, longitude, nearestStation.latitude, nearestStation.longitude);

    for (const station of this.GULF_COAST_STATIONS) {
      const distance = this.calculateDistance(latitude, longitude, station.latitude, station.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }

    return nearestStation;
  }

  /**
   * Fetch tide predictions from NOAA API
   */
  private async fetchTidePredictions(stationId: string, days: number): Promise<TidePrediction[]> {
    const beginDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
      `product=predictions&application=GulfCoastCharters&` +
      `begin_date=${beginDate}&end_date=${endDate}&` +
      `datum=MLLW&station=${stationId}&time_zone=lst_ldt&` +
      `units=english&interval=hilo&format=json`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`NOAA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.predictions || !Array.isArray(data.predictions)) {
        throw new Error('Invalid response format from NOAA API');
      }

      return data.predictions.map((pred: any) => ({
        datetime: pred.t,
        tideType: pred.type.toLowerCase() as 'high' | 'low',
        height: parseFloat(pred.v),
      }));
    } catch (error) {
      console.error('Error fetching tide predictions:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Calculate optimal fishing windows around tide changes
   */
  private calculateFishingWindows(predictions: TidePrediction[]): FishingWindow[] {
    const windows: FishingWindow[] = [];

    for (let i = 0; i < predictions.length - 1; i++) {
      const current = predictions[i];
      const next = predictions[i + 1];

      // Pre-high tide window (1-2 hours before high tide)
      const preHighStart = new Date(current.datetime);
      preHighStart.setHours(preHighStart.getHours() - 2);
      const preHighEnd = new Date(current.datetime);
      preHighEnd.setHours(preHighEnd.getHours() - 1);

      windows.push({
        start: preHighStart.toISOString(),
        end: preHighEnd.toISOString(),
        type: 'pre_high',
        quality: 'excellent',
        description: 'Excellent fishing window before high tide',
      });

      // Post-high tide window (1-2 hours after high tide)
      const postHighStart = new Date(current.datetime);
      postHighStart.setHours(postHighStart.getHours() + 1);
      const postHighEnd = new Date(current.datetime);
      postHighEnd.setHours(postHighEnd.getHours() + 2);

      windows.push({
        start: postHighStart.toISOString(),
        end: postHighEnd.toISOString(),
        type: 'post_high',
        quality: 'good',
        description: 'Good fishing window after high tide',
      });

      // Pre-low tide window (1 hour before low tide)
      if (current.tideType === 'low') {
        const preLowStart = new Date(current.datetime);
        preLowStart.setHours(preLowStart.getHours() - 1);
        const preLowEnd = new Date(current.datetime);

        windows.push({
          start: preLowStart.toISOString(),
          end: preLowEnd.toISOString(),
          type: 'pre_low',
          quality: 'fair',
          description: 'Fair fishing window before low tide',
        });
      }
    }

    return windows;
  }

  /**
   * Calculate current tide status
   */
  private calculateCurrentStatus(predictions: TidePrediction[]): {
    status: 'rising' | 'falling' | 'high_slack' | 'low_slack';
    nextTide: string;
    nextTideType: 'high' | 'low';
    timeUntilNext: number;
  } {
    const now = new Date();
    
    // Find the next tide
    let nextTide = predictions[0];
    let previousTide: TidePrediction | null = null;

    for (let i = 0; i < predictions.length; i++) {
      const tideTime = new Date(predictions[i].datetime);
      if (tideTime > now) {
        nextTide = predictions[i];
        if (i > 0) {
          previousTide = predictions[i - 1];
        }
        break;
      }
    }

    // Calculate time until next tide
    const nextTideTime = new Date(nextTide.datetime);
    const timeUntilNext = Math.floor((nextTideTime.getTime() - now.getTime()) / (1000 * 60));

    // Determine current status
    let status: 'rising' | 'falling' | 'high_slack' | 'low_slack';
    
    if (!previousTide) {
      status = 'rising'; // Default assumption
    } else {
      const previousTideTime = new Date(previousTide.datetime);
      const timeSincePrevious = Math.floor((now.getTime() - previousTideTime.getTime()) / (1000 * 60));
      
      if (timeSincePrevious < 30) {
        // Within 30 minutes of a tide change, it's slack tide
        status = previousTide.tideType === 'high' ? 'high_slack' : 'low_slack';
      } else if (nextTide.tideType === 'high') {
        status = 'rising';
      } else {
        status = 'falling';
      }
    }

    return {
      status,
      nextTide: nextTide.datetime,
      nextTideType: nextTide.tideType,
      timeUntilNext,
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get tide data for booking date
   */
  public async getTideDataForBooking(stationId: string, bookingDate: string): Promise<{
    date: string;
    tides: TidePrediction[];
    fishingWindows: FishingWindow[];
    bestTimes: string[];
  }> {
    const tideData = await this.getTideData(stationId, 7);
    const targetDate = new Date(bookingDate).toDateString();
    
    const dateTides = tideData.predictions.filter(pred => 
      new Date(pred.datetime).toDateString() === targetDate
    );
    
    const dateWindows = tideData.fishingWindows.filter(window => 
      new Date(window.start).toDateString() === targetDate
    );

    // Get best fishing times for the day
    const bestTimes = dateWindows
      .filter(window => window.quality === 'excellent')
      .map(window => `${new Date(window.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(window.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

    return {
      date: targetDate,
      tides: dateTides,
      fishingWindows: dateWindows,
      bestTimes,
    };
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    cachedStations: string[];
    oldestCache: number | null;
    newestCache: number | null;
  } {
    const cachedStations = Array.from(this.cache.keys());
    const timestamps = Array.from(this.cache.values()).map(item => item.expires);
    
    return {
      size: this.cache.size,
      cachedStations,
      oldestCache: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestCache: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }
}

export default TideDataIntegration;
