'use client';

import { useState, useEffect } from 'react';
import {
  Utensils,
  Flame,
  Search,
  ChefHat,
  Clock,
  Users,
  Leaf,
  WheatOff,
  Info,
  ExternalLink,
  Loader2,
  AlertCircle,
  FireExtinguisher
} from 'lucide-react';

// Edamam API Keys
const EDAMAM_CONFIG = {
  APP_ID: process.env.NEXT_PUBLIC_EDAMAM_APP_ID || '',
  APP_KEY: process.env.NEXT_PUBLIC_EDAMAM_APP_KEY || '',
  BASE_URL: 'https://api.edamam.com/api/recipes/v2',
};

interface EdamamRecipe {
  uri: string;
  label: string;
  image: string;
  source: string;
  url: string;
  yield: number;
  dietLabels: string[];
  healthLabels: string[];
  cautions: string[];
  ingredientLines: string[];
  ingredients: { text: string; quantity: number; measure: string; food: string }[];
  calories: number;
  totalTime: number;
  cuisineType: string[];
  mealType: string[];
  dishType: string[];
}

interface Recipe {
  id: string;
  name: string;
  image: string;
  source: string;
  url: string;
  servings: number;
  time: number;
  calories: number;
  ingredients: string[];
  dietLabels: string[];
  healthLabels: string[];
  cautions: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cookingMethods: string[];
}

const CAMPING_METHODS = [
  { id: 'all', label: 'Any Method', icon: ChefHat },
  { id: 'fire', label: 'Open Fire', icon: Flame },
  { id: 'stove', label: 'Camp Stove', icon: FireExtinguisher },
  { id: 'no-cook', label: 'No Cook', icon: Leaf },
];

// Detect cooking method from recipe data
const detectCookingMethod = (recipe: EdamamRecipe): string[] => {
  const methods: string[] = [];
  const text = recipe.ingredientLines.join(' ').toLowerCase();

  if (text.includes('grill') || text.includes('roast') || text.includes('char')) methods.push('fire');
  if (text.includes('boil') || text.includes('simmer') || text.includes('saute')) methods.push('stove');
  if (text.includes('dutch oven') || text.includes('cast iron')) methods.push('fire');
  if (recipe.totalTime <= 15 && !text.includes('cook')) methods.push('no-cook');
  if (methods.length === 0) methods.push('stove');

  return methods;
};

// Convert Edamam recipe to our format
const convertEdamamRecipe = (hit: { recipe: EdamamRecipe }): Recipe => {
  const r = hit.recipe;
  const methods = detectCookingMethod(r);

  return {
    id: r.uri.split('#recipe_')[1] || Math.random().toString(36),
    name: r.label,
    image: r.image,
    source: r.source,
    url: r.url,
    servings: r.yield,
    time: r.totalTime || 30,
    calories: Math.round(r.calories / r.yield),
    ingredients: r.ingredientLines,
    dietLabels: r.dietLabels,
    healthLabels: r.healthLabels,
    cautions: r.cautions,
    difficulty: r.totalTime <= 20 ? 'Easy' : r.totalTime <= 45 ? 'Medium' : 'Hard',
    cookingMethods: methods,
  };
};

// Default camping recipes (fallback)
const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'default-1',
    name: 'Campfire Chili',
    image: '',
    source: 'Camping Classic',
    url: '#',
    servings: 4,
    time: 30,
    calories: 450,
    ingredients: ['Ground beef', 'Beans', 'Tomatoes', 'Onion', 'Chili powder', 'Cumin'],
    dietLabels: ['High-Protein'],
    healthLabels: ['Gluten-Free'],
    cautions: [],
    difficulty: 'Easy',
    cookingMethods: ['fire'],
  },
  {
    id: 'default-2',
    name: 'Foil Pack Potatoes',
    image: '',
    source: 'Camping Classic',
    url: '#',
    servings: 2,
    time: 25,
    calories: 280,
    ingredients: ['Potatoes', 'Butter', 'Garlic', 'Salt', 'Pepper', 'Rosemary'],
    dietLabels: ['Vegetarian'],
    healthLabels: ['Vegetarian', 'Gluten-Free'],
    cautions: [],
    difficulty: 'Easy',
    cookingMethods: ['fire'],
  },
  {
    id: 'default-3',
    name: 'Camping Breakfast Burritos',
    image: '',
    source: 'Camping Classic',
    url: '#',
    servings: 4,
    time: 15,
    calories: 380,
    ingredients: ['Eggs', 'Sausage', 'Cheese', 'Tortillas', 'Salsa', 'Avocado'],
    dietLabels: ['High-Protein'],
    healthLabels: [],
    cautions: [],
    difficulty: 'Easy',
    cookingMethods: ['stove'],
  },
  {
    id: 'default-4',
    name: 'Trail Mix Energy Balls',
    image: '',
    source: 'Camping Classic',
    url: '#',
    servings: 12,
    time: 10,
    calories: 120,
    ingredients: ['Oats', 'Peanut butter', 'Honey', 'Chocolate chips', 'Dried fruit', 'Chia seeds'],
    dietLabels: ['Vegetarian'],
    healthLabels: ['Vegetarian', 'Vegan', 'Gluten-Free'],
    cautions: [],
    difficulty: 'Easy',
    cookingMethods: ['no-cook'],
  },
];

export default function RecipeManager() {
  const [ingredients, setIngredients] = useState('');
  const [cookingMethod, setCookingMethod] = useState('all');
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [isLoading, setIsLoading] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [dietFilter, setDietFilter] = useState<string>('all');

  // Fetch recipes from Edamam API
  const fetchEdamamRecipes = async (query: string): Promise<Recipe[] | null> => {
    console.log('Edamam API keys:', {
      APP_ID: EDAMAM_CONFIG.APP_ID ? 'Set' : 'Empty',
      APP_KEY: EDAMAM_CONFIG.APP_KEY ? 'Set' : 'Empty'
    });
    try {
      const params = new URLSearchParams({
        type: 'public',
        q: query || 'camping outdoor cooking',
        app_id: EDAMAM_CONFIG.APP_ID,
        app_key: EDAMAM_CONFIG.APP_KEY,
        to: '20',
      });

      if (dietFilter !== 'all') {
        params.append('health', dietFilter);
      }

      const response = await fetch(`${EDAMAM_CONFIG.BASE_URL}?${params}`, {
        headers: {
          'Edamam-Account-User': 'wildready-user',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edamam API error details:', response.status, errorText);
        throw new Error(`Edamam API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.hits?.map(convertEdamamRecipe) || [];
    } catch (err) {
      console.error('Edamam fetch error:', err);
      return null;
    }
  };

  // Search handler
  const handleSearch = async () => {
    if (!useLiveData) {
      const filtered = DEFAULT_RECIPES.filter(r => {
        const matchesMethod = cookingMethod === 'all' || r.cookingMethods.includes(cookingMethod);
        const matchesIngredients = !ingredients || r.ingredients.some(i =>
          i.toLowerCase().includes(ingredients.toLowerCase())
        );
        const matchesDiet = dietFilter === 'all' || r.healthLabels.includes(dietFilter);
        return matchesMethod && matchesIngredients && matchesDiet;
      });
      setRecipes(filtered);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const query = ingredients || 'camping outdoor recipe';
    const edamamRecipes = await fetchEdamamRecipes(query);

    if (edamamRecipes) {
      const filtered = cookingMethod === 'all'
        ? edamamRecipes
        : edamamRecipes.filter((r: Recipe) => r.cookingMethods.includes(cookingMethod));
      setRecipes(filtered.length > 0 ? filtered : DEFAULT_RECIPES);
    } else {
      setApiError('Edamam API unavailable - showing default recipes');
      setRecipes(DEFAULT_RECIPES);
    }

    setIsLoading(false);
  };

  // Auto-search on live toggle
  useEffect(() => {
    if (useLiveData) {
      handleSearch();
    }
  }, [useLiveData, dietFilter]);

  const filteredRecipes = recipes.filter(r => {
    const matchesMethod = cookingMethod === 'all' || r.cookingMethods.includes(cookingMethod);
    return matchesMethod;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-emerald-900 text-emerald-400';
      case 'Medium': return 'bg-amber-900 text-amber-400';
      case 'Hard': return 'bg-red-900 text-red-400';
      default: return 'bg-slate-700 text-slate-400';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'fire': return <Flame className="w-4 h-4 text-orange-400" />;
      case 'stove': return <FireExtinguisher className="w-4 h-4 text-blue-400" />;
      case 'no-cook': return <Leaf className="w-4 h-4 text-emerald-400" />;
      default: return <ChefHat className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Utensils className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-semibold">Camping Recipe Manager</h2>
          </div>

          {/* Live/Demo Toggle */}
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setUseLiveData(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!useLiveData ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Demo Recipes
            </button>
            <button
              onClick={() => setUseLiveData(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${useLiveData ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Live Edamam API
            </button>
          </div>
        </div>
        <p className="text-slate-400 mt-2">
          Find recipes based on your ingredients and cooking method available.
        </p>
        {useLiveData && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Edamam API Active - 10,000 free searches/month
            {apiError && <span className="text-amber-400 ml-2">⚠ {apiError}</span>}
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Ingredients</label>
            <input
              type="text"
              placeholder="e.g., eggs, potatoes, chicken..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Cooking Method</label>
            <select
              title="Cooking Method"
              value={cookingMethod}
              onChange={(e) => setCookingMethod(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              {CAMPING_METHODS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Dietary Filter</label>
            <select
              title="Dietary Filter"
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">Any Diet</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="keto-friendly">Keto</option>
              <option value="dairy-free">Dairy-Free</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isLoading ? 'Searching...' : 'Find Recipes'}
        </button>
      </div>

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all hover:bg-slate-750">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">{recipe.name}</h3>
              <div className="flex gap-1">
                {recipe.cookingMethods.map(m => (
                  <div key={m} className="p-1 bg-slate-700 rounded" title={m}>
                    {getMethodIcon(m)}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {recipe.time} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {recipe.servings} servings
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </span>
            </div>

            <div className="text-sm text-slate-400 mb-3">
              <span className="text-slate-500">From: </span>
              <span className="text-slate-300">{recipe.source}</span>
              {recipe.calories > 0 && (
                <span className="ml-3 text-slate-500">{recipe.calories} cal/serving</span>
              )}
            </div>

            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Ingredients: </span>
              {recipe.ingredients.slice(0, 4).join(', ')}
              {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} more`}
            </div>

            {/* Diet labels */}
            {recipe.dietLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {recipe.dietLabels.slice(0, 3).map(label => (
                  <span key={label} className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Health labels */}
            {recipe.healthLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {recipe.healthLabels.slice(0, 3).map(label => (
                  <span key={label} className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                    {label.includes('Vegetarian') && <Leaf className="w-3 h-3" />}
                    {label.includes('Gluten') && <WheatOff className="w-3 h-3" />}
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fire Cooking Tips */}
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Flame className="w-6 h-6 text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-400 mb-2">Fire Cooking Tips</h3>
            <ul className="text-sm text-amber-200 space-y-1">
              <li>• Let flames die down to coals for even heat</li>
              <li>• Use heavy-duty foil for foil pack meals</li>
              <li>• Rotate food frequently to prevent burning</li>
              <li>• Dutch ovens work best with 8-10 coals underneath</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
