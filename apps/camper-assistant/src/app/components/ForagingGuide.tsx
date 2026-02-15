'use client';

import { useState } from 'react';
import {
  Leaf,
  AlertTriangle,
  Check,
  X,
  Search,
  MapPin,
  Info,
  Shield,
  Skull,
  Sparkles,
  BookOpen,
  Camera,
  Calendar
} from 'lucide-react';

type PlantCategory = 'edible' | 'toxic' | 'medicinal';

interface Plant {
  id: string;
  name: string;
  scientificName: string;
  category: PlantCategory;
  description: string;
  identification: string[];
  lookAlikes?: string[];
  uses?: string[];
  warnings?: string[];
  season: string;
  habitat: string;
  image?: string;
  edibility?: 'safe' | 'caution' | 'deadly';
}

const PLANTS: Plant[] = [
  // EDIBLE
  {
    id: 'dandelion',
    name: 'Dandelion',
    scientificName: 'Taraxacum officinale',
    category: 'edible',
    edibility: 'safe',
    description: 'One of the most nutritious plants. Every part is edible - roots, leaves, flowers.',
    identification: [
      'Bright yellow flowers on hollow stems',
      'Deeply toothed leaves ("lion\'s teeth")',
      'White fluffy seed head when mature',
      'Single flower per stem'
    ],
    uses: ['Salads (young leaves)', 'Coffee substitute (roasted roots)', 'Wine (flowers)', 'Tea'],
    season: 'Spring-Fall',
    habitat: 'Lawns, fields, disturbed soil everywhere'
  },
  {
    id: 'plantain',
    name: 'Plantain (Broadleaf)',
    scientificName: 'Plantago major',
    category: 'edible',
    edibility: 'safe',
    description: 'Common "weed" with edible leaves and seeds. Also medicinal.',
    identification: [
      'Broad oval leaves with parallel veins',
      'Low-growing basal rosette',
      'Small green flowers on tall slender spikes',
      'Fibrous veins when leaf torn'
    ],
    uses: ['Young leaves in salads', 'Poultice for wounds', 'Seeds as grain substitute', 'Tea'],
    season: 'Spring-Fall',
    habitat: 'Lawns, paths, compacted soil'
  },
  {
    id: 'clover',
    name: 'Clover',
    scientificName: 'Trifolium repens',
    category: 'edible',
    edibility: 'safe',
    description: 'Common lawn plant with edible flowers and leaves.',
    identification: [
      'Three oval leaflets (occasionally 4!)',
      'White or pink ball-shaped flower clusters',
      'Chevron pattern on leaflets',
      'Low creeping growth habit'
    ],
    uses: ['Flowers are sweet', 'Leaves in salads', 'Dried for flour', 'Tea'],
    warnings: ['Eat in moderation - can cause bloating in large amounts'],
    season: 'Spring-Summer',
    habitat: 'Lawns, meadows, fields'
  },
  {
    id: 'cattail',
    name: 'Cattail',
    scientificName: 'Typha latifolia',
    category: 'edible',
    edibility: 'safe',
    description: '"Nature\'s supermarket" - multiple edible parts year-round.',
    identification: [
      'Brown sausage-shaped flower spike',
      'Long flat sword-like leaves',
      'Grows in dense stands in water',
      'Flowers split into 2 parts'
    ],
    uses: ['Pollen as flour', 'Young shoots like asparagus', 'Root starch', 'Inner stem like cucumber'],
    lookAlikes: ['Iris (toxic)', 'Blue Flag (toxic) - leaves are flat and fan-like vs round'],
    season: 'Year-round',
    habitat: 'Marshes, ponds, wet areas'
  },
  {
    id: 'lambsquarters',
    name: 'Lamb\'s Quarters',
    scientificName: 'Chenopodium album',
    category: 'edible',
    edibility: 'safe',
    description: 'Wild spinach - more nutritious than cultivated spinach.',
    identification: [
      'Powdery white coating on leaves',
      'Goosefoot-shaped leaves',
      'Small green flowers in clusters',
      'Up to 3-6 feet tall'
    ],
    uses: ['Young leaves raw or cooked', 'Seeds ground for flour', 'Potherb', 'Salads'],
    season: 'Spring-Fall',
    habitat: 'Gardens, disturbed soil, fields'
  },

  // TOXIC - DEADLY
  {
    id: 'poison-ivy',
    name: 'Poison Ivy',
    scientificName: 'Toxicodendron radicans',
    category: 'toxic',
    edibility: 'deadly',
    description: 'Causes severe allergic skin reaction. "Leaves of three, let it be."',
    identification: [
      'ALWAYS 3 leaflets (compound leaf)',
      'Reddish tinge in spring',
      'Leaflets may be shiny or dull',
      'Can grow as vine, shrub, or ground cover',
      'White berries in fall'
    ],
    warnings: [
      'Urushiol oil causes rash in 85% of people',
      'Oil remains active on surfaces for years',
      'Smoke from burning poison ivy causes internal reaction',
      'NEVER BURN'
    ],
    lookAlikes: ['Virginia Creeper (5 leaves)', 'Box Elder (compound leaf but opposite arrangement)', 'Jack-in-the-Pulpit (3 leaves but distinct)'],
    season: 'Spring-Fall',
    habitat: 'Forests, edges, disturbed areas, climbs trees'
  },
  {
    id: 'deadly-nightshade',
    name: 'Deadly Nightshade',
    scientificName: 'Atropa belladonna',
    category: 'toxic',
    edibility: 'deadly',
    description: 'One of the most toxic plants in the Western world. All parts deadly.',
    identification: [
      'Dull dark purple/black bell-shaped flowers',
      'Shiny black berries (DEADLY attractive to children)',
      'Oval pointed leaves in pairs',
      'Reddish-purple stems',
      'Up to 3-4 feet tall'
    ],
    warnings: [
      '2-5 berries can kill a child',
      '10-20 berries can kill an adult',
      'Symptoms: dilated pupils, rapid heartbeat, hallucinations, death',
      'Atropine is extracted from this plant'
    ],
    lookAlikes: ['Blueberry (berries have crown/vestige)', 'Black Nightshade (less toxic but still dangerous)'],
    season: 'Summer-Fall',
    habitat: 'Disturbed areas, forests, near old settlements'
  },
  {
    id: 'water-hemlock',
    name: 'Water Hemlock',
    scientificName: 'Cicuta maculata',
    category: 'toxic',
    edibility: 'deadly',
    description: 'Most toxic plant in North America. Death within 15 minutes.',
    identification: [
      'Hollow stems with purple spots/mottling',
      'Fern-like compound leaves',
      'White flower clusters (umbels) like Queen Anne\'s Lace',
      'Tuberous root with chambered partitions',
      'Musty odor when crushed'
    ],
    warnings: [
      'Most toxic when emerging in spring',
      'Cicutoxin causes seizures and death',
      'One bite of root can be fatal',
      'No known antidote'
    ],
    lookAlikes: ['Queen Anne\'s Lace (wild carrot)', 'Wild Parsnip', 'Poison Hemlock'],
    season: 'Spring-Summer',
    habitat: 'Wet meadows, stream banks, marshes'
  },
  {
    id: 'foxglove',
    name: 'Foxglove',
    scientificName: 'Digitalis purpurea',
    category: 'toxic',
    edibility: 'deadly',
    description: 'Beautiful but deadly. Source of heart medication digitalis.',
    identification: [
      'Tall spike of purple/pink/white bell-shaped flowers',
      'Flowers have spotted throats',
      'Soft fuzzy leaves in rosette at base',
      'Up to 3-6 feet tall when flowering'
    ],
    warnings: [
      'Contains cardiac glycosides',
      'Affects heart rhythm',
      'Nausea, vomiting, convulsions, death',
      'Used to make heart medication (digoxin)'
    ],
    lookAlikes: ['Penstemon (shorter, different flowers)', 'Lupine (different leaf arrangement)'],
    season: 'Summer',
    habitat: 'Woodland edges, gardens, disturbed areas'
  },
  {
    id: 'poison-sumac',
    name: 'Poison Sumac',
    scientificName: 'Toxicodendron vernix',
    category: 'toxic',
    edibility: 'deadly',
    description: 'Worse than poison ivy - more potent urushiol oil.',
    identification: [
      '7-13 leaflets arranged in pairs',
      'Red stems',
      'Grows ONLY in wet/swampy areas',
      'Smooth-edged leaflets',
      'White/greenish berries (non-poison sumac has red)'
    ],
    warnings: [
      'More potent than poison ivy',
      'Same urushiol oil reaction',
      'Can cause severe dermatitis',
      'NEVER BURN'
    ],
    lookAlikes: ['Tree-of-Heaven (smooth bark, different leaves)', 'Staghorn Sumac (red berries, fuzzy stems, dry areas)'],
    season: 'Spring-Fall',
    habitat: 'Swamps, bogs, wet woods'
  },

  // MEDICINAL
  {
    id: 'yarrow',
    name: 'Yarrow',
    scientificName: 'Achillea millefolium',
    category: 'medicinal',
    edibility: 'caution',
    description: 'Ancient medicinal herb. Wound healer and fever reducer.',
    identification: [
      'Feathery, fern-like leaves',
      'White or pink flower clusters (flat-topped)',
      'Strong aromatic smell',
      'Alternate leaves along stem'
    ],
    uses: ['Stops bleeding (wound powder)', 'Fever reducer (tea)', 'Anti-inflammatory', 'Cold/flu remedy'],
    warnings: ['Can cause allergic reactions in ragweed-sensitive people', 'Pregnant women should avoid'],
    lookAlikes: ['Poison Hemlock (different leaves, purple spots)', 'Queen Anne\'s Lace (different flowers)'],
    season: 'Summer-Fall',
    habitat: 'Meadows, fields, roadsides'
  },
  {
    id: 'echinacea',
    name: 'Echinacea (Purple Coneflower)',
    scientificName: 'Echinacea purpurea',
    category: 'medicinal',
    edibility: 'safe',
    description: 'Immune system booster. Native American remedy.',
    identification: [
      'Purple-pink petals drooping from spiky central cone',
      'Rough, hairy stems and leaves',
      'Alternate leaves',
      'Up to 2-4 feet tall'
    ],
    uses: ['Immune support', 'Cold/flu prevention', 'Wound healing', 'Anti-inflammatory'],
    season: 'Summer-Fall',
    habitat: 'Prairies, meadows, dry open areas'
  },
  {
    id: 'jewelweed',
    name: 'Jewelweed (Touch-Me-Not)',
    scientificName: 'Impatiens capensis',
    category: 'medicinal',
    edibility: 'safe',
    description: 'Nature\'s remedy for poison ivy. Often grows near it.',
    identification: [
      'Orange or yellow spotted trumpet-shaped flowers',
      'Translucent, water-repellent leaves',
      'Succulent, watery stems',
      'Seed pods explode when touched'
    ],
    uses: ['Poison ivy rash treatment', 'Bug bite relief', 'Burns', 'Anti-itch'],
    warnings: ['Often grows NEAR poison ivy - be careful when harvesting!'],
    season: 'Summer-Fall',
    habitat: 'Moist shady areas, stream banks, wet woods'
  }
];

const getEdibilityColor = (edibility?: string) => {
  switch (edibility) {
    case 'safe': return 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50';
    case 'caution': return 'text-amber-400 bg-amber-900/30 border-amber-700/50';
    case 'deadly': return 'text-red-400 bg-red-900/30 border-red-700/50';
    default: return 'text-slate-400 bg-slate-700';
  }
};

const getCategoryIcon = (category: PlantCategory) => {
  switch (category) {
    case 'edible': return <Check className="w-5 h-5 text-emerald-400" />;
    case 'toxic': return <Skull className="w-5 h-5 text-red-400" />;
    case 'medicinal': return <Sparkles className="w-5 h-5 text-amber-400" />;
  }
};

export default function ForagingGuide() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all');
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const filteredPlants = PLANTS.filter(plant => {
    const matchesSearch = plant.name.toLowerCase().includes(search.toLowerCase()) ||
      plant.scientificName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || plant.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const edibleCount = PLANTS.filter(p => p.category === 'edible').length;
  const toxicCount = PLANTS.filter(p => p.category === 'toxic').length;
  const medicinalCount = PLANTS.filter(p => p.category === 'medicinal').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3">
          <Leaf className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-semibold">Foraging Guide</h2>
        </div>
        <p className="text-slate-400 mt-2">
          Identify edible, medicinal, and toxic plants. <strong className="text-amber-400">Always verify 100% before consuming.</strong>
        </p>
      </div>

      {/* CRITICAL Disclaimer */}
      {showDisclaimer && (
        <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-400 mb-2">⚠️ CRITICAL SAFETY WARNING</h3>
              <p className="text-red-200 text-sm mb-2">
                Misidentification can cause <strong>severe illness or death</strong>. This guide is for educational purposes only.
              </p>
              <ul className="text-red-200 text-sm space-y-1">
                <li>• NEVER eat a plant unless you are 100% certain of ID</li>
                <li>• Use multiple field guides and expert verification</li>
                <li>• Start with common, unmistakable plants</li>
                <li>• Some people have allergic reactions to safe plants</li>
                <li>• When in doubt, DON'T</li>
              </ul>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm"
              >
                I Understand the Risks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{edibleCount}</div>
          <div className="text-sm text-emerald-300">Edible</div>
        </div>
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{toxicCount}</div>
          <div className="text-sm text-red-300">Toxic</div>
        </div>
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{medicinalCount}</div>
          <div className="text-sm text-amber-300">Medicinal</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plants..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          />
          <button className="px-3 py-2 bg-slate-700 rounded-lg">
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'edible', 'medicinal', 'toxic'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Plant List */}
      <div className="space-y-3">
        {filteredPlants.map((plant) => {
          const isExpanded = expandedPlant === plant.id;
          return (
            <div
              key={plant.id}
              className={`bg-slate-800 rounded-xl border-2 overflow-hidden ${plant.category === 'toxic' ? 'border-red-700' :
                  plant.category === 'medicinal' ? 'border-amber-700' :
                    'border-emerald-700'
                }`}
            >
              <div
                onClick={() => setExpandedPlant(isExpanded ? null : plant.id)}
                className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getEdibilityColor(plant.edibility)}`}>
                      {getCategoryIcon(plant.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{plant.name}</h3>
                        {plant.edibility === 'deadly' && (
                          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">DEADLY</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 italic">{plant.scientificName}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {plant.season}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {plant.habitat}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs uppercase font-bold px-2 py-1 rounded bg-slate-700 text-slate-300">
                    {plant.category}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-700 p-4 bg-slate-850">
                  <p className="text-slate-300 mb-4">{plant.description}</p>

                  {/* Identification */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Key Identification Features
                    </h4>
                    <ul className="space-y-1">
                      {plant.identification.map((feature, i) => (
                        <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warnings */}
                  {plant.warnings && (
                    <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Warnings
                      </h4>
                      <ul className="space-y-1">
                        {plant.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Uses */}
                  {plant.uses && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Uses
                      </h4>
                      <ul className="space-y-1">
                        {plant.uses.map((use, i) => (
                          <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                            <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                            {use}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Look-alikes */}
                  {plant.lookAlikes && (
                    <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Look-Alikes (Easy to Confuse)
                      </h4>
                      <ul className="space-y-1">
                        {plant.lookAlikes.map((alike, i) => (
                          <li key={i} className="text-sm text-amber-200 flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {alike}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resources */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400 mb-2">Recommended Resources</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• "Peterson Field Guide to Edible Wild Plants" - Eastern/Central North America</li>
              <li>• "The Forager's Harvest" by Samuel Thayer</li>
              <li>• iNaturalist app - Identify plants with photos</li>
              <li>• Local foraging groups/experts - Learn from experienced foragers</li>
              <li>• Extension services - Many universities offer plant ID help</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Final Warning */}
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 text-center">
        <p className="text-amber-200 text-sm">
          <strong>Remember:</strong> When in doubt, don't eat it. Your life is worth more than a wild salad.
        </p>
      </div>
    </div>
  );
}
