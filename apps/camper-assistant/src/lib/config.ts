// App configuration and constants

export const APP_CONFIG = {
  name: 'Camper Assistant',
  version: '1.0.0',
  description: 'All-in-one camping companion',
};

// Solar system defaults
export const SOLAR_DEFAULTS = {
  panelWatts: 300,
  batteryCapacityAh: 200,
  batteryVoltage: 12,
  efficiency: 0.85,
  minSunHours: 4,
  maxSunHours: 8,
};

// Weather thresholds for alerts
export const WEATHER_ALERTS = {
  highTemp: 95,
  lowTemp: 32,
  highWind: 25,
  highPrecipitation: 70,
  lowVisibility: 1,
};

// Battery thresholds
export const BATTERY_ALERTS = {
  low: 20,
  critical: 10,
  highTemp: 100,
  lowTemp: 20,
};

// Recipe categories
export const RECIPE_CATEGORIES = [
  { id: 'breakfast', name: 'Breakfast', icon: 'Sun' },
  { id: 'lunch', name: 'Lunch', icon: 'Sandwich' },
  { id: 'dinner', name: 'Dinner', icon: 'Utensils' },
  { id: 'dessert', name: 'Dessert', icon: 'Cookie' },
  { id: 'snack', name: 'Snacks', icon: 'Apple' },
];

// Cooking methods
export const COOKING_METHODS = [
  { id: 'fire', name: 'Open Fire', description: 'Direct cooking over campfire' },
  { id: 'stove', name: 'Camp Stove', description: 'Portable propane/butane stove' },
  { id: 'dutch-oven', name: 'Dutch Oven', description: 'Cast iron pot over coals' },
  { id: 'grill', name: 'Portable Grill', description: 'Charcoal or propane grill' },
  { id: 'no-cook', name: 'No Cook', description: 'Ready-to-eat meals' },
];

// Packing list categories
export const PACKING_CATEGORIES = [
  { id: 'clothing', name: 'Clothing & Footwear' },
  { id: 'shelter', name: 'Shelter & Sleep' },
  { id: 'cooking', name: 'Cooking & Food' },
  { id: 'gear', name: 'Camping Gear' },
  { id: 'safety', name: 'Safety & First Aid' },
  { id: 'electronics', name: 'Electronics & Power' },
  { id: 'personal', name: 'Personal Items' },
];

// Common camping locations (for demo/testing)
export const DEMO_LOCATIONS = [
  { name: 'Yellowstone NP', lat: 44.4280, lon: -110.5885, zip: '82190' },
  { name: 'Yosemite NP', lat: 37.8651, lon: -119.5383, zip: '95389' },
  { name: 'Grand Canyon NP', lat: 36.1069, lon: -112.1129, zip: '86023' },
  { name: 'Zion NP', lat: 37.2982, lon: -113.0263, zip: '84767' },
  { name: 'Great Smoky Mountains', lat: 35.6532, lon: -83.5070, zip: '37738' },
];
