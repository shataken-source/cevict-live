'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TreePine,
  Tent,
  Mountain,
  MapPin,
  Search,
  ExternalLink,
  Wifi,
  Droplets,
  Flame,
  Dog,
  Accessibility,
  Camera,
  Calendar,
  DollarSign,
  Filter,
  Loader2,
  AlertCircle,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Navigation,
  Star,
  Check,
  X
} from 'lucide-react';

// RIDB API Configuration
const RIDB_CONFIG = {
  BASE_URL: 'https://ridb.recreation.gov/api/v1',
  API_KEY: process.env.NEXT_PUBLIC_RIDB_API_KEY || '',
};

// Types
interface RIDBRecArea {
  RecAreaID: string;
  RecAreaName: string;
  RecAreaDescription?: string;
  RecAreaLatitude?: number;
  RecAreaLongitude?: number;
  RecAreaPhone?: string;
  RecAreaEmail?: string;
  RecAreaReservationURL?: string;
  RecAreaMapURL?: string;
  RecAreaFeeDescription?: string;
  RecAreaDirections?: string;
  Keywords?: string;
  ACTIVITY?: Array<{ ActivityID: string; ActivityName: string }>;
  MEDIA?: Array<{ MediaID: string; URL: string; Title: string }>;
}

interface RIDBFacility {
  FacilityID: string;
  FacilityName: string;
  FacilityDescription?: string;
  FacilityLatitude?: number;
  FacilityLongitude?: number;
  FacilityPhone?: string;
  FacilityEmail?: string;
  FacilityReservationURL?: string;
  FacilityMapURL?: string;
  FacilityFeeDescription?: string;
  FacilityDirections?: string;
  FacilityUseFeeDescription?: string;
  Keywords?: string;
  ENABLED?: boolean;
  RESERVABLE?: boolean;
  ACTIVITY?: Array<{ ActivityID: string; ActivityName: string }>;
  MEDIA?: Array<{ MediaID: string; URL: string; Title: string }>;
}

interface RIDBCampsite {
  CampsiteID: string;
  CampsiteName: string;
  CampsiteType?: string;
  TypeOfUse?: string;
  Loop?: string;
  CampsiteLatitude?: number;
  CampsiteLongitude?: number;
  CampsiteAccessible?: boolean;
  ATTRIBUTES?: Array<{ AttributeID: string; AttributeName: string; AttributeValue: string }>;
  PERMITTEDEQUIPMENT?: Array<{ EquipmentName: string }>;
}

interface CampsiteWithFacility extends RIDBCampsite {
  facilityName: string;
  facilityID: string;
  recAreaName?: string;
}

// Fetch functions
const fetchRecAreas = async (query?: string, state?: string, activity?: string): Promise<RIDBRecArea[]> => {
  try {
    let url = `${RIDB_CONFIG.BASE_URL}/recareas?limit=50`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (state) url += `&state=${state}`;
    if (activity) url += `&activity=${activity}`;

    const response = await fetch(url, {
      headers: { 'apikey': RIDB_CONFIG.API_KEY }
    });

    if (!response.ok) throw new Error('Failed to fetch recreation areas');
    const data = await response.json();
    return data.RECDATA || [];
  } catch (err) {
    console.error('RIDB RecAreas error:', err);
    return [];
  }
};

const fetchFacilities = async (recAreaID?: string, query?: string): Promise<RIDBFacility[]> => {
  try {
    let url = `${RIDB_CONFIG.BASE_URL}/facilities?limit=50`;
    if (recAreaID) url += `&recarea=${recAreaID}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: { 'apikey': RIDB_CONFIG.API_KEY }
    });

    if (!response.ok) throw new Error('Failed to fetch facilities');
    const data = await response.json();
    return data.RECDATA || [];
  } catch (err) {
    console.error('RIDB Facilities error:', err);
    return [];
  }
};

const fetchCampsites = async (facilityID: string): Promise<RIDBCampsite[]> => {
  try {
    const url = `${RIDB_CONFIG.BASE_URL}/facilities/${facilityID}/campsites?limit=100`;
    const response = await fetch(url, {
      headers: { 'apikey': RIDB_CONFIG.API_KEY }
    });

    if (!response.ok) throw new Error('Failed to fetch campsites');
    const data = await response.json();
    return data.RECDATA || [];
  } catch (err) {
    console.error('RIDB Campsites error:', err);
    return [];
  }
};

// Helper functions
const getAmenityIcon = (attributeName: string) => {
  const name = attributeName.toLowerCase();
  if (name.includes('electric')) return <Droplets className="w-4 h-4" />;
  if (name.includes('water')) return <Droplets className="w-4 h-4" />;
  if (name.includes('sewer')) return <Droplets className="w-4 h-4" />;
  if (name.includes('wifi')) return <Wifi className="w-4 h-4" />;
  if (name.includes('fire')) return <Flame className="w-4 h-4" />;
  if (name.includes('pet') || name.includes('dog')) return <Dog className="w-4 h-4" />;
  if (name.includes('accessible')) return <Accessibility className="w-4 h-4" />;
  return <Check className="w-4 h-4" />;
};

const getCampsiteTypeIcon = (type?: string) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('rv')) return <Tent className="w-5 h-5" />;
  if (t.includes('tent')) return <Tent className="w-5 h-5" />;
  if (t.includes('cabin')) return <TreePine className="w-5 h-5" />;
  return <Tent className="w-5 h-5" />;
};

export default function FederalCampsites() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [recAreas, setRecAreas] = useState<RIDBRecArea[]>([]);
  const [facilities, setFacilities] = useState<RIDBFacility[]>([]);
  const [campsites, setCampsites] = useState<CampsiteWithFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [selectedRecArea, setSelectedRecArea] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'areas' | 'facilities' | 'campsites'>('areas');
  const [apiKeyMissing, setApiKeyMissing] = useState(!RIDB_CONFIG.API_KEY);

  const US_STATES = [
    { code: '', name: 'All States' },
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  ];

  const ACTIVITIES = [
    { id: '', name: 'All Activities' },
    { id: '4', name: 'Auto Touring' },
    { id: '5', name: 'Biking' },
    { id: '6', name: 'Boating' },
    { id: '7', name: 'Camping' },
    { id: '8', name: 'Climbing' },
    { id: '9', name: 'Fishing' },
    { id: '10', name: 'Hiking' },
    { id: '11', name: 'Horseback Riding' },
    { id: '14', name: 'Hunting' },
    { id: '16', name: 'Nature Viewing' },
    { id: '18', name: 'Picnicking' },
    { id: '20', name: 'RV Camping' },
    { id: '22', name: 'Scenic Driving' },
    { id: '23', name: 'Skiing' },
    { id: '24', name: 'Snowboarding' },
    { id: '26', name: 'Swimming' },
    { id: '28', name: 'Water Sports' },
    { id: '29', name: 'Wildlife Viewing' },
    { id: '30', name: 'Visitor Center' },
  ];

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setRecAreas([]);
    setFacilities([]);
    setCampsites([]);
    setViewMode('areas');

    try {
      const areas = await fetchRecAreas(searchQuery || undefined, selectedState || undefined, selectedActivity || undefined);
      setRecAreas(areas);
      if (areas.length === 0) {
        setError('No recreation areas found. Try adjusting your search.');
      }
    } catch (err) {
      setError('Failed to search. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecAreaClick = async (recArea: RIDBRecArea) => {
    setSelectedRecArea(recArea.RecAreaID);
    setLoading(true);
    setError(null);

    try {
      const facs = await fetchFacilities(recArea.RecAreaID);
      setFacilities(facs);
      setViewMode('facilities');
    } catch (err) {
      setError('Failed to load facilities.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacilityClick = async (facility: RIDBFacility) => {
    const isExpanded = expandedFacility === facility.FacilityID;

    if (isExpanded) {
      setExpandedFacility(null);
      return;
    }

    setExpandedFacility(facility.FacilityID);
    setLoading(true);

    try {
      const sites = await fetchCampsites(facility.FacilityID);
      const sitesWithFacility = sites.map(site => ({
        ...site,
        facilityName: facility.FacilityName,
        facilityID: facility.FacilityID,
        recAreaName: recAreas.find(ra => ra.RecAreaID === selectedRecArea)?.RecAreaName
      }));
      setCampsites(sitesWithFacility);
      setViewMode('campsites');
    } catch (err) {
      setCampsites([]);
    } finally {
      setLoading(false);
    }
  };

  const getRecreationPassInfo = (feeDesc?: string) => {
    if (!feeDesc) return null;
    const lower = feeDesc.toLowerCase();
    if (lower.includes('america the beautiful') || lower.includes('national parks pass')) {
      return {
        name: 'America the Beautiful Pass',
        url: 'https://store.usgs.gov/america-the-beautiful-national-parks-recreation-lands-pass-1-year-pass.html',
        icon: <TreePine className="w-4 h-4 text-green-400" />
      };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/30 rounded-xl p-6 border border-green-700/50">
        <div className="flex items-center gap-3 mb-2">
          <TreePine className="w-7 h-7 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Federal Campsites</h2>
          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-700/30">
            recreation.gov
          </span>
        </div>
        <p className="text-slate-400">
          Search 2,000+ national parks, forests, and federal recreation areas. Find campsites with real-time data from the Recreation Information Database (RIDB).
        </p>
      </div>

      {/* API Key Warning */}
      {apiKeyMissing && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">API Key Required</p>
            <p className="text-sm text-slate-400 mt-1">
              Get your free RIDB API key from{' '}
              <a
                href="https://ridb.recreation.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline"
              >
                ridb.recreation.gov
              </a>
              {' '}and add it to your environment as <code className="text-amber-300">NEXT_PUBLIC_RIDB_API_KEY</code>.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 block mb-1">Search Parks & Forests</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Yellowstone, Yosemite, Grand Canyon"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-40"
              title="Select state"
            >
              {US_STATES.map(state => (
                <option key={state.code} value={state.code}>{state.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Activity</label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-40"
              title="Select activity"
            >
              {ACTIVITIES.map(act => (
                <option key={act.id} value={act.id}>{act.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {viewMode !== 'areas' && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => { setViewMode('areas'); setSelectedRecArea(null); }}
            className="text-green-400 hover:underline"
          >
            Recreation Areas
          </button>
          <>
            <span className="text-slate-500">/</span>
            <button
              onClick={() => setViewMode('facilities')}
              className={viewMode === 'facilities' ? 'text-white' : 'text-green-400 hover:underline'}
            >
              Facilities
            </button>
          </>
          {viewMode === 'campsites' && (
            <>
              <span className="text-slate-500">/</span>
              <span className="text-white">Campsites</span>
            </>
          )}
        </div>
      )}

      {/* Results Count */}
      {!loading && !error && (
        <div className="text-sm text-slate-400">
          {viewMode === 'areas' && recAreas.length > 0 && `Found ${recAreas.length} recreation areas`}
          {viewMode === 'facilities' && facilities.length > 0 && `Found ${facilities.length} facilities`}
          {viewMode === 'campsites' && campsites.length > 0 && `Found ${campsites.length} campsites`}
        </div>
      )}

      {/* Recreation Areas List */}
      {viewMode === 'areas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recAreas.map(area => (
            <div
              key={area.RecAreaID}
              onClick={() => handleRecAreaClick(area)}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-green-600 cursor-pointer transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-green-900/30 text-green-400 group-hover:bg-green-800/30">
                  <Mountain className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{area.RecAreaName}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                    {area.RecAreaDescription || 'No description available'}
                  </p>

                  {area.ACTIVITY && area.ACTIVITY.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {area.ACTIVITY.slice(0, 4).map(act => (
                        <span key={act.ActivityID} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          {act.ActivityName}
                        </span>
                      ))}
                      {area.ACTIVITY.length > 4 && (
                        <span className="text-xs text-slate-500">+{area.ACTIVITY.length - 4} more</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    {area.RecAreaPhone && (
                      <a
                        href={`tel:${area.RecAreaPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-400 hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                    {area.RecAreaLatitude && area.RecAreaLongitude && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {area.RecAreaLatitude.toFixed(2)}, {area.RecAreaLongitude.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Facilities List */}
      {viewMode === 'facilities' && (
        <div className="space-y-3">
          {facilities.map(facility => (
            <div key={facility.FacilityID} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div
                onClick={() => handleFacilityClick(facility)}
                className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-emerald-900/30 text-emerald-400">
                      <Tent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{facility.FacilityName}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {facility.FacilityDescription || 'No description available'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {facility.RESERVABLE && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Reservable
                          </span>
                        )}
                        {facility.FacilityFeeDescription && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Fees apply
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedFacility === facility.FacilityID ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Campsites */}
              {expandedFacility === facility.FacilityID && (
                <div className="border-t border-slate-700 bg-slate-900/30 p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      <span className="ml-2 text-slate-400">Loading campsites...</span>
                    </div>
                  ) : campsites.length === 0 ? (
                    <div className="text-center py-6">
                      <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400">No individual campsites found</p>
                      <p className="text-sm text-slate-500 mt-1">This facility may have first-come, first-served camping</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {campsites.map(site => {
                        const attributes = site.ATTRIBUTES || [];
                        const hasHookups = attributes.some(a =>
                          a.AttributeName.toLowerCase().includes('electric') ||
                          a.AttributeName.toLowerCase().includes('water') ||
                          a.AttributeName.toLowerCase().includes('sewer')
                        );
                        const isAccessible = site.CampsiteAccessible;
                        const equipment = site.PERMITTEDEQUIPMENT || [];

                        return (
                          <div key={site.CampsiteID} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {getCampsiteTypeIcon(site.CampsiteType)}
                                <span className="font-medium text-white">{site.CampsiteName}</span>
                              </div>
                              {isAccessible && (
                                <span className="text-blue-400" title="Accessible">
                                  <Accessibility className="w-4 h-4" />
                                </span>
                              )}
                            </div>

                            {site.Loop && (
                              <p className="text-xs text-slate-500 mt-1">Loop: {site.Loop}</p>
                            )}

                            {/* Amenities */}
                            {attributes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {attributes.slice(0, 4).map(attr => (
                                  <span
                                    key={attr.AttributeID}
                                    className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1"
                                  >
                                    {getAmenityIcon(attr.AttributeName)}
                                    {attr.AttributeName}
                                  </span>
                                ))}
                                {attributes.length > 4 && (
                                  <span className="text-xs text-slate-500">+{attributes.length - 4} more</span>
                                )}
                              </div>
                            )}

                            {/* Equipment */}
                            {equipment.length > 0 && (
                              <div className="mt-2 text-xs text-slate-400">
                                Equipment: {equipment.map(e => e.EquipmentName).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reservation Link */}
                  {facility.FacilityReservationURL && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <a
                        href={facility.FacilityReservationURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-green-400 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Reserve on Recreation.gov
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recAreas.length === 0 && !apiKeyMissing && (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
          <TreePine className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300">Search Federal Recreation Areas</h3>
          <p className="text-slate-400 mt-2 max-w-md mx-auto">
            Search for national parks, forests, campgrounds, and recreation areas across the United States.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <button
              onClick={() => { setSearchQuery('Yellowstone'); handleSearch(); }}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
            >
              Yellowstone
            </button>
            <button
              onClick={() => { setSearchQuery('Yosemite'); handleSearch(); }}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
            >
              Yosemite
            </button>
            <button
              onClick={() => { setSelectedState('UT'); handleSearch(); }}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
            >
              Utah Parks
            </button>
            <button
              onClick={() => { setSelectedActivity('7'); handleSearch(); }}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
            >
              Camping Areas
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={handleSearch}
            className="mt-3 text-sm bg-red-900/50 hover:bg-red-800/50 text-red-300 px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-green-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-2">
              <strong className="text-slate-300">Data Source:</strong>{' '}
              Recreation Information Database (RIDB) from{' '}
              <a
                href="https://www.recreation.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline"
              >
                Recreation.gov
              </a>
            </p>
            <p>
              <strong className="text-slate-300">Passes:</strong> Many federal sites require an{' '}
              <a
                href="https://store.usgs.gov/america-the-beautiful-national-parks-recreation-lands-pass-1-year-pass.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline"
              >
                America the Beautiful Pass
              </a>
              {' '}for entry. Always check individual site fees and reservation requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
