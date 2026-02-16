'use client';

import { useState } from 'react';
import { useProfiles, EquipmentType, LocationProfile } from '../context/ProfileContext';
import { useLocation } from '../context/LocationContext';
import { 
  Home, 
  Caravan, 
  Waves, 
  Anchor, 
  Mountain, 
  TreePine,
  Plus,
  Settings,
  ChevronDown,
  Trash2,
  Copy,
  Wifi,
  Zap,
  Sun,
  Battery
} from 'lucide-react';

const EQUIPMENT_OPTIONS: { value: EquipmentType; label: string; icon: any }[] = [
  { value: 'ampinvt', label: 'AmpinVT Solar', icon: Sun },
  { value: 'victron', label: 'Victron Inverter', icon: Zap },
  { value: 'sma', label: 'SMA Inverter', icon: Battery },
  { value: 'none', label: 'No Solar Equipment', icon: Wifi },
];

const ICON_OPTIONS = ['🏠', '🚐', '🏖️', '⚓', '🏔️', '🌲', '🏕️', '⛵', '🏡', '🌊'];

export default function ProfileSwitcher() {
  const { profiles, activeProfile, activeProfileId, setActiveProfile, addProfile, updateProfile, deleteProfile, duplicateProfile } = useProfiles();
  const { setZipCode, setLocationName, setCoordinates } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<LocationProfile | null>(null);

  const handleSwitchProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setActiveProfile(profileId);
      // Sync with LocationContext
      setZipCode(profile.zipCode);
      setLocationName(profile.locationName);
      setCoordinates(profile.coordinates);
    }
    setIsOpen(false);
  };

  const handleAddProfile = () => {
    const newProfile = {
      name: 'New Location',
      icon: '🏕️',
      zipCode: '82190',
      locationName: 'New Location',
      coordinates: null as { lat: number; lng: number } | null,
      equipment: {
        type: 'none' as EquipmentType,
        name: 'No Equipment',
      },
    };
    addProfile(newProfile);
    setIsEditing(true);
    setEditingProfile(profiles[profiles.length - 1] || null);
  };

  const handleEditProfile = (profile: LocationProfile) => {
    setEditingProfile({ ...profile });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    if (editingProfile && editingProfile.id) {
      updateProfile(editingProfile.id, editingProfile);
      // If editing the active profile, sync location
      if (editingProfile.id === activeProfileId) {
        setZipCode(editingProfile.zipCode);
        setLocationName(editingProfile.locationName);
        setCoordinates(editingProfile.coordinates);
      }
    }
    setIsEditing(false);
    setEditingProfile(null);
  };

  const getEquipmentIcon = (type: EquipmentType) => {
    const equipment = EQUIPMENT_OPTIONS.find(e => e.value === type);
    const Icon = equipment?.icon || Zap;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="relative">
      {/* Profile Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 transition-colors"
      >
        <span className="text-lg">{activeProfile?.icon || '🏠'}</span>
        <span className="hidden sm:inline font-medium text-sm">{activeProfile?.name || 'Select Location'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Locations</h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => handleSwitchProfile(profile.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    activeProfileId === profile.id 
                      ? 'bg-emerald-900/30 border border-emerald-600/50' 
                      : 'hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl">{profile.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{profile.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      {getEquipmentIcon(profile.equipment.type)}
                      <span className="capitalize">{profile.equipment.type}</span>
                      {profile.zipCode && <span className="ml-1">• {profile.zipCode}</span>}
                    </div>
                  </div>
                  {activeProfileId === profile.id && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                  
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProfile(profile);
                    }}
                    className="p-1 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit profile"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Profile */}
            <button
              onClick={handleAddProfile}
              className="w-full mt-3 flex items-center gap-2 p-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Location</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && editingProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold">Edit Location Profile</h2>
              <p className="text-sm text-slate-400 mt-1">Configure your location and solar equipment</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Profile Name */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Profile Name</label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g., Home, RV, Lakehouse"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setEditingProfile({ ...editingProfile, icon })}
                      className={`w-10 h-10 rounded-lg text-xl transition-colors ${
                        editingProfile.icon === icon 
                          ? 'bg-emerald-600' 
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* ZIP Code */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">ZIP Code</label>
                <input
                  type="text"
                  value={editingProfile.zipCode}
                  onChange={(e) => setEditingProfile({ ...editingProfile, zipCode: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="82190"
                  maxLength={5}
                />
              </div>

              {/* Equipment Type */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Solar Equipment</label>
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setEditingProfile({
                          ...editingProfile,
                          equipment: { ...editingProfile.equipment, type: option.value, name: option.label }
                        })}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                          editingProfile.equipment.type === option.value
                            ? 'bg-emerald-900/30 border-emerald-600 text-emerald-400'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MQTT Settings (if equipment selected) */}
              {editingProfile.equipment.type !== 'none' && (
                <div className="space-y-3 p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">MQTT Broker IP</label>
                    <input
                      type="text"
                      value={editingProfile.equipment.mqttBroker || ''}
                      onChange={(e) => setEditingProfile({
                        ...editingProfile,
                        equipment: { ...editingProfile.equipment, mqttBroker: e.target.value }
                      })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Device ID</label>
                    <input
                      type="text"
                      value={editingProfile.equipment.deviceId || ''}
                      onChange={(e) => setEditingProfile({
                        ...editingProfile,
                        equipment: { ...editingProfile.equipment, deviceId: e.target.value }
                      })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="solar-controller-1"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Notes</label>
                <textarea
                  value={editingProfile.notes || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, notes: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                  rows={2}
                  placeholder="Any notes about this location..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingProfile(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Save Profile
              </button>
              {editingProfile.id !== 'home' && editingProfile.id !== 'rv' && (
                <button
                  onClick={() => {
                    if (confirm('Delete this profile?')) {
                      deleteProfile(editingProfile.id);
                      setIsEditing(false);
                      setEditingProfile(null);
                    }
                  }}
                  className="px-4 bg-red-900/50 hover:bg-red-900 text-red-400 py-2 rounded-lg transition-colors"
                  title="Delete profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
