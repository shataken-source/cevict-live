/**
 * Gulf Coast Fish Species Database
 * 
 * Complete catalog of Gulf Coast fish species with regulations, seasons, and
 * identification information for anglers and captains.
 * 
 * Key Gulf Coast Species:
 * - Redfish (Inshore, Year-round, ⭐⭐⭐⭐⭐)
 * - Speckled Trout (Inshore, Fall-Spring, ⭐⭐⭐⭐⭐)
 * - Red Snapper (Offshore, Summer, ⭐⭐⭐⭐⭐)
 * - King Mackerel (Nearshore, Spring-Fall, ⭐⭐⭐⭐)
 * - Mahi-Mahi (Pelagic, Spring-Summer, ⭐⭐⭐⭐⭐)
 * - Grouper (Offshore, Year-round, ⭐⭐⭐⭐)
 */

export interface FishSpecies {
  speciesId: string;
  commonName: string;
  scientificName: string;
  alternateNames: string[];
  category: SpeciesCategory;
  habitat: string;
  description: string;
  avgWeight: number;        // in pounds
  maxWeight: number;         // in pounds
  avgLength: number;         // in inches
  maxLength: number;         // in inches
  eatingQuality: EatingQuality;
  popularity: number;        // 1-5 stars
  imageUrl: string;
  identification: {
    keyFeatures: string[];
    similarSpecies: string[];
    coloration: string[];
    habitat: string;
  };
  behavior: {
    feeding: string;
    spawning: string;
    migration: string;
  };
  fishing: {
    bestMethods: string[];
    bestBaits: string[];
    bestSeasons: string[];
    bestTimes: string[];
    difficulty: number;      // 1-5 scale
  };
}

export type SpeciesCategory = 'inshore' | 'nearshore' | 'offshore' | 'pelagic';
export type EatingQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface SpeciesSeason {
  speciesId: string;
  region: string;
  peakSeasonStart: string;
  peakSeasonEnd: string;
  availability: 'abundant' | 'common' | 'occasional' | 'rare';
  notes?: string;
}

export interface FishingRegulations {
  speciesId: string;
  state: 'AL' | 'FL' | 'MS' | 'LA' | 'TX';
  minSize: number;           // inches
  maxSize?: number;          // inches (for slot limits)
  bagLimit: number;          // per person per day
  possessionLimit?: number;  // total possession
  closedSeason?: {
    start: string;
    end: string;
  };
  specialNotes: string;
  lastUpdated: string;
}

export interface SpeciesSearchResult {
  species: FishSpecies;
  matchScore: number;
  matchReasons: string[];
}

export class FishSpeciesDatabase {
  private static instance: FishSpeciesDatabase;
  private species: Map<string, FishSpecies> = new Map();
  private seasons: Map<string, SpeciesSeason[]> = new Map();
  private regulations: Map<string, Map<string, FishingRegulations>> = new Map();

  // Comprehensive Gulf Coast species database
  private readonly GULF_COAST_SPECIES: FishSpecies[] = [
    {
      speciesId: 'redfish',
      commonName: 'Redfish',
      scientificName: 'Sciaenops ocellatus',
      alternateNames: ['Red Drum', 'Channel Bass', 'Bull Red'],
      category: 'inshore',
      habitat: 'Shallow coastal waters, marshes, estuaries',
      description: 'The iconic Gulf Coast game fish known for its copper color and distinctive spot near the tail. Powerful fighters and excellent table fare.',
      avgWeight: 6,
      maxWeight: 50,
      avgLength: 24,
      maxLength: 45,
      eatingQuality: 'excellent',
      popularity: 5,
      imageUrl: '/species/redfish.jpg',
      identification: {
        keyFeatures: ['Copper-bronze body', 'Single black spot near tail', 'Powerful tail', 'Sloping forehead'],
        similarSpecies: ['Black Drum', 'Sheepshead'],
        coloration: ['Copper-bronze back', 'White belly', 'Dark spot on tail'],
        habitat: 'Shallow flats, mangroves, oyster bars'
      },
      behavior: {
        feeding: 'Opportunistic predator feeding on crabs, shrimp, and small fish',
        spawning: 'Spawns in nearshore waters during late summer and fall',
        migration: 'Limited migration, moves between shallow and deeper waters'
      },
      fishing: {
        bestMethods: ['Light tackle spinning', 'Fly fishing', 'Bait casting'],
        bestBaits: ['Live shrimp', 'Cut mullet', 'Gold spoons', 'Soft plastics'],
        bestSeasons: ['Spring', 'Summer', 'Fall'],
        bestTimes: ['Dawn', 'Dusk', 'Incoming tide'],
        difficulty: 2
      }
    },
    {
      speciesId: 'speckled_trout',
      commonName: 'Speckled Trout',
      scientificName: 'Cynoscion nebulosus',
      alternateNames: ['Spotted Seatrout', 'Speck'],
      category: 'inshore',
      habitat: 'Seagrass beds, shallow bays, estuaries',
      description: ' prized game fish with distinctive spots on its dorsal fins and tail. Known for aggressive strikes and excellent eating quality.',
      avgWeight: 2,
      maxWeight: 12,
      avgLength: 18,
      maxLength: 30,
      eatingQuality: 'excellent',
      popularity: 5,
      imageUrl: '/species/speckled_trout.jpg',
      identification: {
        keyFeatures: ['Numerous black spots on dorsal fins and tail', 'Silver body with olive back', 'Canine teeth', 'Lower jaw extends beyond upper'],
        similarSpecies: ['Weakfish', 'Sand Trout'],
        coloration: ['Silver sides', 'Olive-green back', 'Black spots on fins'],
        habitat: 'Seagrass beds, shallow flats, channel edges'
      },
      behavior: {
        feeding: 'Ambush predator feeding on shrimp, small fish, and crustaceans',
        spawning: 'Spawns multiple times during spring and summer',
        migration: 'Seasonal movement between shallow and deeper waters'
      },
      fishing: {
        bestMethods: ['Light tackle spinning', 'Fly fishing', 'Popping cork'],
        bestBaits: ['Live shrimp', 'Croaker', 'DOA Shrimp', 'Topwater lures'],
        bestSeasons: ['Spring', 'Fall'],
        bestTimes: ['Dawn', 'Dusk', 'Moving tides'],
        difficulty: 2
      }
    },
    {
      speciesId: 'red_snapper',
      commonName: 'Red Snapper',
      scientificName: 'Lutjanus campechanus',
      alternateNames: ['American Red Snapper', 'Gulf Red Snapper'],
      category: 'offshore',
      habitat: 'Reefs, wrecks, oil platforms, structure',
      description: 'Highly prized offshore species known for excellent fighting ability and superb table fare. One of the most sought-after Gulf Coast fish.',
      avgWeight: 10,
      maxWeight: 40,
      avgLength: 20,
      maxLength: 36,
      eatingQuality: 'excellent',
      popularity: 5,
      imageUrl: '/species/red_snapper.jpg',
      identification: {
        keyFeatures: ['Bright red body', 'Long pointed snout', 'Powerful jaws', 'Red eyes'],
        similarSpecies: ['Vermilion Snapper', 'Mangrove Snapper'],
        coloration: ['Brilliant red overall', 'Pinkish belly', 'White underside'],
        habitat: 'Natural reefs, artificial reefs, wrecks, oil rigs'
      },
      behavior: {
        feeding: 'Opportunistic predator feeding on fish, squid, and crustaceans',
        spawning: 'Spawns from June to October in offshore waters',
        migration: 'Moves between reefs based on water temperature and food availability'
      },
      fishing: {
        bestMethods: ['Bottom fishing', 'Trolling', 'Jigging'],
        bestBaits: ['Cut bait', 'Live bait', 'Jigs', 'Deep-diving lures'],
        bestSeasons: ['Summer'],
        bestTimes: ['Morning', 'Afternoon'],
        difficulty: 3
      }
    },
    {
      speciesId: 'king_mackerel',
      commonName: 'King Mackerel',
      scientificName: 'Scomberomorus cavalla',
      alternateNames: ['Kingfish', 'Smoker'],
      category: 'nearshore',
      habitat: 'Nearshore waters, beaches, piers, offshore reefs',
      description: 'Fast, powerful pelagic fish known for blistering runs and aerial displays. A favorite of tournament anglers.',
      avgWeight: 15,
      maxWeight: 90,
      avgLength: 30,
      maxLength: 60,
      eatingQuality: 'good',
      popularity: 4,
      imageUrl: '/species/king_mackerel.jpg',
      identification: {
        keyFeatures: ['Streamlined body', 'Sharp teeth', 'Lateral line dips sharply', 'Dark iridescent blue-green back'],
        similarSpecies: ['Spanish Mackerel', 'Cero Mackerel'],
        coloration: ['Dark blue-green back', 'Silver sides', 'White belly'],
        habitat: 'Nearshore waters, beaches, piers, offshore structure'
      },
      behavior: {
        feeding: 'Aggressive predator feeding on smaller fish and squid',
        spawning: 'Spawns offshore during summer months',
        migration: 'Seasonal migration following warm water and bait schools'
      },
      fishing: {
        bestMethods: ['Trolling', 'Drift fishing', 'Live baiting'],
        bestBaits: ['Live menhaden', 'Spoons', 'Trolling lures', 'Rigged eels'],
        bestSeasons: ['Spring', 'Summer', 'Fall'],
        bestTimes: ['Early morning', 'Late afternoon'],
        difficulty: 3
      }
    },
    {
      speciesId: 'mahi_mahi',
      commonName: 'Mahi-Mahi',
      scientificName: 'Coryphaena hippurus',
      alternateNames: ['Dolphin', 'Dorado', 'Dolphin Fish'],
      category: 'pelagic',
      habitat: 'Open ocean, weed lines, floating debris',
      description: 'Spectacular pelagic fish known for brilliant colors, acrobatic fights, and excellent eating. Color fades quickly after death.',
      avgWeight: 20,
      maxWeight: 80,
      avgLength: 36,
      maxLength: 72,
      eatingQuality: 'excellent',
      popularity: 5,
      imageUrl: '/species/mahi_mahi.jpg',
      identification: {
        keyFeatures: ['Brilliant blue-green and yellow colors', 'Steep forehead profile in males', 'Long dorsal fin', 'Scales on chest'],
        similarSpecies: ['Wahoo', 'Tuna'],
        coloration: ['Metallic blue-green back', 'Golden yellow sides', 'Blue spots'],
        habitat: 'Open ocean, sargassum weed, floating debris'
      },
      behavior: {
        feeding: 'Surface predator feeding on flying fish, squid, and small fish',
        spawning: 'Spawns multiple times in warm offshore waters',
        migration: 'Highly migratory, follows warm currents and weed lines'
      },
      fishing: {
        bestMethods: ['Trolling', 'Casting', 'Fly fishing'],
        bestBaits: ['Ballyhoo', 'Lures', 'Feathers', 'Flying fish'],
        bestSeasons: ['Spring', 'Summer'],
        bestTimes: ['Morning', 'Afternoon'],
        difficulty: 3
      }
    },
    {
      speciesId: 'gag_grouper',
      commonName: 'Gag Grouper',
      scientificName: 'Mycteroperca microlepis',
      alternateNames: ['Gag', 'Black Grouper'],
      category: 'offshore',
      habitat: 'Reefs, rock ledges, wrecks, structure',
      description: 'Powerful bottom-dwelling predator known for strong fights and excellent eating. Highly sought after by reef fishermen.',
      avgWeight: 15,
      maxWeight: 80,
      avgLength: 25,
      maxLength: 48,
      eatingQuality: 'excellent',
      popularity: 4,
      imageUrl: '/species/gag_grouper.jpg',
      identification: {
        keyFeatures: ['Brownish-gray body', 'Scattered irregular spots', 'Powerful jaws', 'Rounded tail fin'],
        similarSpecies: ['Black Grouper', 'Red Grouper'],
        coloration: ['Brownish-gray', 'Dark blotches', 'White belly'],
        habitat: 'Natural reefs, artificial reefs, rock ledges'
      },
      behavior: {
        feeding: 'Ambush predator feeding on fish, crabs, and lobsters',
        spawning: 'Spawns in offshore waters during winter months',
        migration: 'Limited movement, territorial around structure'
      },
      fishing: {
        bestMethods: ['Bottom fishing', 'Jigging', 'Live baiting'],
        bestBaits: ['Live pinfish', 'Cut bait', 'Jigs', 'Large lures'],
        bestSeasons: ['Spring', 'Fall', 'Winter'],
        bestTimes: ['Morning', 'Afternoon'],
        difficulty: 4
      }
    },
    {
      speciesId: 'snook',
      commonName: 'Snook',
      scientificName: 'Centropomus undecimalis',
      alternateNames: ['Common Snook', 'Linesider'],
      category: 'inshore',
      habitat: 'Mangroves, bridges, passes, beaches',
      description: 'Elusive inshore predator known for explosive strikes and powerful runs. Highly prized by experienced anglers.',
      avgWeight: 8,
      maxWeight: 50,
      avgLength: 28,
      maxLength: 48,
      eatingQuality: 'good',
      popularity: 4,
      imageUrl: '/species/snook.jpg',
      identification: {
        keyFeatures: ['Distinctive black lateral line', 'High dorsal fin', 'Yellow pelvic fins', 'Large mouth'],
        similarSpecies: ['Fat Snook', 'Tarpon Snook'],
        coloration: ['Silvery body', 'Yellow fins', 'Black lateral line'],
        habitat: 'Mangrove shorelines, bridges, passes, beaches'
      },
      behavior: {
        feeding: 'Ambush predator feeding on fish, shrimp, and crabs',
        spawning: 'Spawns in nearshore passes during summer',
        migration: 'Seasonal movement between inshore and offshore waters'
      },
      fishing: {
        bestMethods: ['Light tackle', 'Fly fishing', 'Live baiting'],
        bestBaits: ['Live shrimp', 'Pinfish', 'Streamers', 'Topwater lures'],
        bestSeasons: ['Spring', 'Summer', 'Fall'],
        bestTimes: ['Dawn', 'Dusk', 'Night'],
        difficulty: 4
      }
    },
    {
      speciesId: 'flounder',
      commonName: 'Southern Flounder',
      scientificName: 'Paralichthys lethostigma',
      alternateNames: ['Fluke', 'Flatfish'],
      category: 'inshore',
      habitat: 'Muddy bottoms, estuaries, nearshore waters',
      description: 'Bottom-dwelling flatfish with both eyes on one side. Excellent table fare and fun to catch on light tackle.',
      avgWeight: 2,
      maxWeight: 20,
      avgLength: 15,
      maxLength: 30,
      eatingQuality: 'excellent',
      popularity: 3,
      imageUrl: '/species/flounder.jpg',
      identification: {
        keyFeatures: ['Flat body', 'Both eyes on left side', 'Mouth extends to eyes', 'Rough teeth'],
        similarSpecies: ['Gulf Flounder', 'Summer Flounder'],
        coloration: ['Brown to olive on eyed side', 'White on blind side'],
        habitat: 'Muddy or sandy bottoms, estuaries, nearshore waters'
      },
      behavior: {
        feeding: 'Ambush predator buried in sand feeding on fish and crustaceans',
        spawning: 'Spawns in offshore waters during winter',
        migration: 'Moves between estuaries and offshore waters'
      },
      fishing: {
        bestMethods: ['Bottom fishing', 'Gigging', 'Drift fishing'],
        bestBaits: ['Live shrimp', 'Mud minnows', 'Cut bait', 'Jigs'],
        bestSeasons: ['Fall', 'Winter'],
        bestTimes: ['Night', 'Moving tides'],
        difficulty: 2
      }
    },
    {
      speciesId: 'sheepshead',
      commonName: 'Sheepshead',
      scientificName: 'Archosargus probatocephalus',
      alternateNames: ['Convict Fish', 'Sheephead'],
      category: 'inshore',
      habitat: 'Rocky structure, bridges, jetties, oyster bars',
      description: 'Distinctive fish with vertical stripes and human-like teeth. Excellent eating and challenging to catch due to bait-stealing ability.',
      avgWeight: 3,
      maxWeight: 15,
      avgLength: 14,
      maxLength: 30,
      eatingQuality: 'excellent',
      popularity: 3,
      imageUrl: '/species/sheepshead.jpg',
      identification: {
        keyFeatures: ['Vertical black stripes', 'Human-like teeth', 'Oval body', 'Dorsal spines'],
        similarSpecies: ['Black Drum', 'Porgy'],
        coloration: ['Silvery-white with black stripes', 'Yellowish fins'],
        habitat: 'Rocky structure, bridge pilings, jetties, oyster bars'
      },
      behavior: {
        feeding: 'Feeds on crustaceans, mollusks, and small fish using powerful teeth',
        spawning: 'Spawns in nearshore waters during spring',
        migration: 'Limited movement, stays near structure'
      },
      fishing: {
        bestMethods: ['Light tackle', 'Bottom fishing', 'Structure fishing'],
        bestBaits: ['Fiddler crabs', 'Shrimp', 'Barnacles', 'Small crabs'],
        bestSeasons: ['Winter', 'Spring'],
        bestTimes: ['Moving tides'],
        difficulty: 3
      }
    },
    {
      speciesId: 'black_drum',
      commonName: 'Black Drum',
      scientificName: 'Pogonias cromis',
      alternateNames: ['Drum', 'Big Drum'],
      category: 'inshore',
      habitat: 'Shallow bays, estuaries, nearshore waters',
      description: 'Large member of the drum family known for powerful fights and whisker-like barbels. Excellent eating when small.',
      avgWeight: 15,
      maxWeight: 100,
      avgLength: 30,
      maxLength: 60,
      eatingQuality: 'fair',
      popularity: 2,
      imageUrl: '/species/black_drum.jpg',
      identification: {
        keyFeatures: ['Dark gray to black color', 'Whisker-like barbels', 'Heavy body', 'Deep body'],
        similarSpecies: ['Redfish', 'Sheepshead'],
        coloration: ['Dark gray to black', 'White belly', 'Dark fins'],
        habitat: 'Shallow bays, estuaries, channels, nearshore waters'
      },
      behavior: {
        feeding: 'Bottom feeder eating crabs, shrimp, mollusks, and worms',
        spawning: 'Spawns in nearshore waters during spring and fall',
        migration: 'Seasonal movement between bays and nearshore waters'
      },
      fishing: {
        bestMethods: ['Bottom fishing', 'Surf fishing', 'Light tackle for smaller fish'],
        bestBaits: ['Shrimp', 'Crabs', 'Clams', 'Cut bait'],
        bestSeasons: ['Spring', 'Fall'],
        bestTimes: ['Moving tides'],
        difficulty: 2
      }
    },
    {
      speciesId: 'spanish_mackerel',
      commonName: 'Spanish Mackerel',
      scientificName: 'Scomberomorus maculatus',
      alternateNames: ['Spanish', 'Mac'],
      category: 'nearshore',
      habitat: 'Nearshore waters, beaches, piers, bays',
      description: 'Fast, schooling predator known for aggressive strikes and excellent eating. Smaller cousin of the king mackerel.',
      avgWeight: 2,
      maxWeight: 12,
      avgLength: 20,
      maxLength: 36,
      eatingQuality: 'good',
      popularity: 3,
      imageUrl: '/species/spanish_mackerel.jpg',
      identification: {
        keyFeatures: ['Golden spots on sides', 'Greenish back', 'Sharp teeth', 'Forked tail'],
        similarSpecies: ['King Mackerel', 'Cero Mackerel'],
        coloration: ['Greenish back', 'Silver sides', 'Golden spots'],
        habitat: 'Nearshore waters, beaches, piers, bays'
      },
      behavior: {
        feeding: 'Aggressive predator feeding on small fish and squid',
        spawning: 'Spawns offshore during summer',
        migration: 'Seasonal migration following bait schools'
      },
      fishing: {
        bestMethods: ['Trolling', 'Casting', 'Light tackle'],
        bestBaits: ['Small lures', 'Spoons', 'Jigs', 'Live bait'],
        bestSeasons: ['Spring', 'Summer', 'Fall'],
        bestTimes: ['Morning', 'Afternoon'],
        difficulty: 2
      }
    },
    {
      speciesId: 'jack_crevalle',
      commonName: 'Jack Crevalle',
      scientificName: 'Caranx hippos',
      alternateNames: ['Jack', 'Crevalle Jack'],
      category: 'nearshore',
      habitat: 'Nearshore waters, beaches, passes, offshore',
      description: 'Powerful, hard-fighting fish known for blistering runs and aggressive nature. Popular sport fish but fair table fare.',
      avgWeight: 10,
      maxWeight: 50,
      avgLength: 24,
      maxLength: 40,
      eatingQuality: 'fair',
      popularity: 3,
      imageUrl: '/species/jack_crevalle.jpg',
      identification: {
        keyFeatures: ['Deep body', 'Dark spot on gill cover', 'Scuted lateral line', 'Yellowish fins'],
        similarSpecies: ['Blue Runner', 'Horse-eye Jack'],
        coloration: ['Dark green to bluish back', 'Silvery sides', 'Yellow fins'],
        habitat: 'Nearshore waters, beaches, passes, offshore waters'
      },
      behavior: {
        feeding: 'Aggressive predator feeding on fish and crustaceans',
        spawning: 'Spawns offshore during spring and summer',
        migration: 'Highly migratory, follows bait schools'
      },
      fishing: {
        bestMethods: ['Light tackle', 'Fly fishing', 'Topwater'],
        bestBaits: ['Lures', 'Flies', 'Live bait', 'Topwater plugs'],
        bestSeasons: ['Spring', 'Summer', 'Fall'],
        bestTimes: ['Morning', 'Afternoon'],
        difficulty: 2
      }
    },
    {
      speciesId: 'tarpon',
      commonName: 'Tarpon',
      scientificName: 'Megalops atlanticus',
      alternateNames: ['Silver King', 'Poon'],
      category: 'inshore',
      habitat: 'Coastal waters, passes, beaches, backwaters',
      description: 'Majestic game fish known for spectacular aerial displays and powerful runs. The ultimate fly fishing challenge.',
      avgWeight: 50,
      maxWeight: 250,
      avgLength: 60,
      maxLength: 96,
      eatingQuality: 'poor',
      popularity: 5,
      imageUrl: '/species/tarpon.jpg',
      identification: {
        keyFeatures: ['Large silver scales', 'Upturned mouth', 'Large dorsal fin', 'Streamlined body'],
        similarSpecies: ['Ladyfish', 'Bonefish'],
        coloration: ['Bright silver sides', 'Dark green to blue back', 'Large scales'],
        habitat: 'Coastal waters, passes, beaches, backwaters, mangroves'
      },
      behavior: {
        feeding: 'Feeds on fish, crabs, and shrimp, often rolling at surface',
        spawning: 'Spawns in offshore waters during summer',
        migration: 'Seasonal migration between inshore and offshore waters'
      },
      fishing: {
        bestMethods: ['Fly fishing', 'Light tackle', 'Live baiting'],
        bestBaits: ['Live crabs', 'Mullet', 'Pinfish', 'Streamers'],
        bestSeasons: ['Spring', 'Summer', 'Fall'],
        bestTimes: ['Dawn', 'Dusk', 'Night'],
        difficulty: 5
      }
    }
  ];

  // Fishing regulations by state
  private readonly REGULATIONS: FishingRegulations[] = [
    // Alabama
    {
      speciesId: 'redfish',
      state: 'AL',
      minSize: 16,
      maxSize: 26,
      bagLimit: 3,
      specialNotes: 'Slot limit 16-26 inches. Captain may possess 2 over slot limit.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'speckled_trout',
      state: 'AL',
      minSize: 15,
      bagLimit: 6,
      specialNotes: 'May possess 1 over 25 inches.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'flounder',
      state: 'AL',
      minSize: 14,
      bagLimit: 6,
      specialNotes: 'May possess 1 over 18 inches.',
      lastUpdated: '2024-01-01'
    },
    // Florida
    {
      speciesId: 'redfish',
      state: 'FL',
      minSize: 18,
      maxSize: 27,
      bagLimit: 1,
      specialNotes: 'Slot limit 18-27 inches. Captain may possess 2 over slot limit in Gulf.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'speckled_trout',
      state: 'FL',
      minSize: 15,
      maxSize: 19,
      bagLimit: 3,
      specialNotes: 'Slot limit 15-19 inches in Northeast zone. South zone different.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'snook',
      state: 'FL',
      minSize: 28,
      maxSize: 32,
      bagLimit: 1,
      closedSeason: { start: '12-01', end: '02-28' },
      specialNotes: 'Slot limit 28-32 inches. Harvest prohibited Dec-Feb in Gulf.',
      lastUpdated: '2024-01-01'
    },
    // Mississippi
    {
      speciesId: 'redfish',
      state: 'MS',
      minSize: 18,
      maxSize: 30,
      bagLimit: 3,
      specialNotes: 'Slot limit 18-30 inches.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'speckled_trout',
      state: 'MS',
      minSize: 15,
      bagLimit: 15,
      specialNotes: 'No size limit in certain areas.',
      lastUpdated: '2024-01-01'
    },
    // Louisiana
    {
      speciesId: 'redfish',
      state: 'LA',
      minSize: 16,
      maxSize: 27,
      bagLimit: 5,
      specialNotes: 'Slot limit 16-27 inches.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'speckled_trout',
      state: 'LA',
      minSize: 12,
      bagLimit: 25,
      specialNotes: 'Different limits in certain areas.',
      lastUpdated: '2024-01-01'
    },
    // Texas
    {
      speciesId: 'redfish',
      state: 'TX',
      minSize: 20,
      maxSize: 28,
      bagLimit: 3,
      specialNotes: 'Slot limit 20-28 inches.',
      lastUpdated: '2024-01-01'
    },
    {
      speciesId: 'speckled_trout',
      state: 'TX',
      minSize: 15,
      bagLimit: 10,
      specialNotes: 'May possess 1 over 25 inches.',
      lastUpdated: '2024-01-01'
    }
  ];

  public static getInstance(): FishSpeciesDatabase {
    if (!FishSpeciesDatabase.instance) {
      FishSpeciesDatabase.instance = new FishSpeciesDatabase();
    }
    return FishSpeciesDatabase.instance;
  }

  private constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize the species database
   */
  private initializeDatabase(): void {
    // Load species
    this.GULF_COAST_SPECIES.forEach(species => {
      this.species.set(species.speciesId, species);
    });

    // Load regulations
    this.REGULATIONS.forEach(reg => {
      if (!this.regulations.has(reg.speciesId)) {
        this.regulations.set(reg.speciesId, new Map());
      }
      this.regulations.get(reg.speciesId)!.set(reg.state, reg);
    });

    // Generate seasonal data
    this.generateSeasonalData();
  }

  /**
   * Get all species
   */
  public getAllSpecies(): FishSpecies[] {
    return Array.from(this.species.values());
  }

  /**
   * Get species by ID
   */
  public getSpecies(speciesId: string): FishSpecies | null {
    return this.species.get(speciesId) || null;
  }

  /**
   * Get species by category
   */
  public getSpeciesByCategory(category: SpeciesCategory): FishSpecies[] {
    return Array.from(this.species.values()).filter(
      species => species.category === category
    );
  }

  /**
   * Search species by name or characteristics
   */
  public searchSpecies(query: string): SpeciesSearchResult[] {
    const results: SpeciesSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const species of this.species.values()) {
      let matchScore = 0;
      const matchReasons: string[] = [];

      // Check common name
      if (species.commonName.toLowerCase().includes(lowerQuery)) {
        matchScore += 50;
        matchReasons.push(`Name matches: ${species.commonName}`);
      }

      // Check alternate names
      for (const altName of species.alternateNames) {
        if (altName.toLowerCase().includes(lowerQuery)) {
          matchScore += 30;
          matchReasons.push(`Alternate name: ${altName}`);
          break;
        }
      }

      // Check scientific name
      if (species.scientificName.toLowerCase().includes(lowerQuery)) {
        matchScore += 20;
        matchReasons.push(`Scientific name: ${species.scientificName}`);
      }

      // Check category
      if (species.category.toLowerCase().includes(lowerQuery)) {
        matchScore += 15;
        matchReasons.push(`Category: ${species.category}`);
      }

      // Check habitat
      if (species.habitat.toLowerCase().includes(lowerQuery)) {
        matchScore += 10;
        matchReasons.push(`Habitat: ${species.habitat}`);
      }

      // Check key features
      for (const feature of species.identification.keyFeatures) {
        if (feature.toLowerCase().includes(lowerQuery)) {
          matchScore += 10;
          matchReasons.push(`Feature: ${feature}`);
          break;
        }
      }

      if (matchScore > 0) {
        results.push({
          species,
          matchScore,
          matchReasons,
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get regulations for species and state
   */
  public getRegulations(speciesId: string, state: 'AL' | 'FL' | 'MS' | 'LA' | 'TX'): FishingRegulations | null {
    const stateRegs = this.regulations.get(speciesId);
    return stateRegs ? stateRegs.get(state) || null : null;
  }

  /**
   * Get all regulations for a species
   */
  public getAllRegulations(speciesId: string): Map<string, FishingRegulations> {
    return this.regulations.get(speciesId) || new Map();
  }

  /**
   * Get seasonal availability for species
   */
  public getSeasonalAvailability(speciesId: string, region: string): SpeciesSeason[] {
    return this.seasons.get(speciesId) || [];
  }

  /**
   * Get popular species
   */
  public getPopularSpecies(limit: number = 10): FishSpecies[] {
    return Array.from(this.species.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Get species by eating quality
   */
  public getSpeciesByEatingQuality(quality: EatingQuality): FishSpecies[] {
    return Array.from(this.species.values()).filter(
      species => species.eatingQuality === quality
    );
  }

  /**
   * Get species by difficulty
   */
  public getSpeciesByDifficulty(maxDifficulty: number): FishSpecies[] {
    return Array.from(this.species.values()).filter(
      species => species.fishing.difficulty <= maxDifficulty
    );
  }

  /**
   * Get recommended species for current conditions
   */
  public getRecommendedSpecies(
    season: string,
    location: string,
    difficulty: number = 3
  ): FishSpecies[] {
    const allSpecies = this.getAllSpecies();
    
    return allSpecies.filter(species => {
      // Check difficulty
      if (species.fishing.difficulty > difficulty) return false;
      
      // Check season
      if (!species.fishing.bestSeasons.includes(season)) return false;
      
      // Check if species is available in region
      const seasons = this.getSeasonalAvailability(species.speciesId, location);
      if (seasons.length > 0) {
        const currentSeason = seasons.find(s => {
          const now = new Date();
          const start = new Date(s.peakSeasonStart);
          const end = new Date(s.peakSeasonEnd);
          return now >= start && now <= end;
        });
        
        if (!currentSeason && seasons[0].availability === 'rare') return false;
      }
      
      return true;
    }).sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Generate seasonal data
   */
  private generateSeasonalData(): void {
    const regions = ['Alabama Gulf Coast', 'Florida Panhandle', 'Mississippi Gulf Coast', 'Louisiana Gulf Coast', 'Texas Gulf Coast'];
    
    for (const [speciesId, species] of this.species.entries()) {
      const speciesSeasons: SpeciesSeason[] = [];
      
      for (const region of regions) {
        const season = this.generateSpeciesSeason(species, region);
        speciesSeasons.push(season);
      }
      
      this.seasons.set(speciesId, speciesSeasons);
    }
  }

  private generateSpeciesSeason(species: FishSpecies, region: string): SpeciesSeason {
    const now = new Date();
    let peakStart: Date;
    let peakEnd: Date;
    let availability: 'abundant' | 'common' | 'occasional' | 'rare';
    
    // Generate seasonal patterns based on species
    if (species.speciesId === 'redfish' || species.speciesId === 'flounder') {
      // Year-round with peaks
      peakStart = new Date(now.getFullYear(), 3, 1); // April
      peakEnd = new Date(now.getFullYear(), 10, 31); // October
      availability = 'abundant';
    } else if (species.speciesId === 'speckled_trout') {
      // Spring and fall
      peakStart = new Date(now.getFullYear(), 2, 1); // March
      peakEnd = new Date(now.getFullYear(), 5, 31); // May
      availability = 'abundant';
    } else if (species.speciesId === 'red_snapper') {
      // Summer only
      peakStart = new Date(now.getFullYear(), 5, 1); // June
      peakEnd = new Date(now.getFullYear(), 8, 31); // August
      availability = 'common';
    } else if (species.speciesId === 'mahi_mahi' || species.speciesId === 'king_mackerel') {
      // Spring and summer
      peakStart = new Date(now.getFullYear(), 4, 1); // May
      peakEnd = new Date(now.getFullYear(), 9, 30); // September
      availability = 'common';
    } else {
      // Default pattern
      peakStart = new Date(now.getFullYear(), 4, 1); // May
      peakEnd = new Date(now.getFullYear(), 9, 30); // September
      availability = species.popularity >= 4 ? 'common' : 'occasional';
    }
    
    return {
      speciesId: species.speciesId,
      region,
      peakSeasonStart: peakStart.toISOString().split('T')[0],
      peakSeasonEnd: peakEnd.toISOString().split('T')[0],
      availability,
    };
  }

  /**
   * Get database statistics
   */
  public getDatabaseStats(): {
    totalSpecies: number;
    byCategory: Record<SpeciesCategory, number>;
    byEatingQuality: Record<EatingQuality, number>;
    totalRegulations: number;
    statesCovered: string[];
  } {
    const allSpecies = this.getAllSpecies();
    
    const byCategory = {
      inshore: 0,
      nearshore: 0,
      offshore: 0,
      pelagic: 0,
    };
    
    const byEatingQuality = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };
    
    allSpecies.forEach(species => {
      byCategory[species.category]++;
      byEatingQuality[species.eatingQuality]++;
    });
    
    const statesCovered = ['AL', 'FL', 'MS', 'LA', 'TX'];
    const totalRegulations = Array.from(this.regulations.values())
      .reduce((sum, stateRegs) => sum + stateRegs.size, 0);
    
    return {
      totalSpecies: allSpecies.length,
      byCategory,
      byEatingQuality,
      totalRegulations,
      statesCovered,
    };
  }

  /**
   * Validate regulations are up to date
   */
  public validateRegulations(): {
    valid: boolean;
    outdatedCount: number;
    lastUpdate: string;
  } {
    // Convert Map values to array and flatten properly
    const allRegs: FishingRegulations[] = [];
    for (const stateRegs of this.regulations.values()) {
      for (const reg of stateRegs.values()) {
        allRegs.push(reg);
      }
    }
    
    const outdatedRegs = allRegs.filter((reg: FishingRegulations) => {
      const lastUpdate = new Date(reg.lastUpdated);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return lastUpdate < sixMonthsAgo;
    });
    
    const mostRecent = allRegs
      .map((reg: FishingRegulations) => new Date(reg.lastUpdated))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return {
      valid: outdatedRegs.length === 0,
      outdatedCount: outdatedRegs.length,
      lastUpdate: mostRecent ? mostRecent.toISOString() : '',
    };
  }
}

export default FishSpeciesDatabase;
