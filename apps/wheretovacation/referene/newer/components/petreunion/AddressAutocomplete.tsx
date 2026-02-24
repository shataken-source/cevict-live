'use client';

import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AddressSuggestion {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    city_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    road?: string;
    house_number?: string;
  };
  lat?: string;
  lon?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: {
    city: string;
    state: string;
    zip: string;
    detail: string;
    fullAddress: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter address...",
  className = ""
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // State name to abbreviation mapping
  const STATE_ABBREVIATIONS: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };

  // Fetch address suggestions using Nominatim (OpenStreetMap) - free, no API key needed
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Use Nominatim API (free, no key required)
      // Add proper headers to avoid CORS issues
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=us&` + // Limit to US addresses
        `extratags=1`,
        {
          headers: {
            'User-Agent': 'PetReunion/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (value) {
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  // Parse address from Nominatim response
  const parseAddress = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    let state = addr.state || '';

    // Convert state abbreviation to full name if needed
    // Nominatim sometimes returns abbreviations, sometimes full names
    if (state.length === 2) {
      // It's an abbreviation, find the full name
      const fullState = Object.entries(STATE_ABBREVIATIONS).find(([_, abbr]) => abbr === state)?.[0];
      if (fullState) state = fullState;
    }

    const zip = addr.postcode || '';
    const road = addr.road || '';
    const houseNumber = addr.house_number || '';

    // Build detail string (street address)
    const detailParts: string[] = [];
    if (houseNumber) detailParts.push(houseNumber);
    if (road) detailParts.push(road);
    const detail = detailParts.join(' ');

    // Build full address
    const fullParts = [detail, city, state, zip].filter(Boolean);
    const fullAddress = fullParts.join(', ');

    return {
      city,
      state,
      zip,
      detail,
      fullAddress: fullAddress || suggestion.display_name
    };
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const parsed = parseAddress(suggestion);
    onChange(parsed.fullAddress);
    setShowSuggestions(false);
    setSuggestions([]);

    if (onSelect) {
      onSelect(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => {
            const parsed = parseAddress(suggestion);
            const isSelected = index === selectedIndex;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-gray-100' : ''
                  }`}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {parsed.detail || parsed.city || suggestion.display_name.split(',')[0]}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {parsed.city && parsed.state
                        ? `${parsed.city}, ${parsed.state}${parsed.zip ? ` ${parsed.zip}` : ''}`
                        : suggestion.display_name
                      }
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

