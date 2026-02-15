'use client';

import { useState } from 'react';
import { Utensils, Flame, Search, ChefHat, Clock, Users } from 'lucide-react';

export default function RecipeManager() {
  const [ingredients, setIngredients] = useState('');
  const [cookingMethod, setCookingMethod] = useState('fire');

  const recipes = [
    {
      name: 'Campfire Chili',
      ingredients: ['Ground beef', 'Beans', 'Tomatoes', 'Onion', 'Chili powder'],
      time: '30 min',
      servings: 4,
      method: 'fire',
      difficulty: 'Easy',
    },
    {
      name: 'Foil Pack Potatoes',
      ingredients: ['Potatoes', 'Butter', 'Garlic', 'Salt', 'Pepper'],
      time: '25 min',
      servings: 2,
      method: 'fire',
      difficulty: 'Easy',
    },
    {
      name: 'Camping Breakfast Burritos',
      ingredients: ['Eggs', 'Sausage', 'Cheese', 'Tortillas', 'Salsa'],
      time: '15 min',
      servings: 4,
      method: 'stove',
      difficulty: 'Easy',
    },
    {
      name: 'Dutch Oven Peach Cobbler',
      ingredients: ['Canned peaches', 'Cake mix', 'Butter', 'Cinnamon'],
      time: '45 min',
      servings: 6,
      method: 'dutch-oven',
      difficulty: 'Medium',
    },
    {
      name: 'Grilled Corn on Cob',
      ingredients: ['Corn', 'Butter', 'Salt', 'Pepper'],
      time: '20 min',
      servings: 4,
      method: 'fire',
      difficulty: 'Easy',
    },
  ];

  const filteredRecipes = recipes.filter(
    (r) => cookingMethod === 'all' || r.method === cookingMethod
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Utensils className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-semibold">Camping Recipe Manager</h2>
        </div>
        <p className="text-slate-400">
          Find recipes based on your ingredients and cooking method available.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Your Ingredients</label>
            <input
              type="text"
              placeholder="e.g., eggs, potatoes, cheese..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Cooking Method</label>
            <select
              value={cookingMethod}
              onChange={(e) => setCookingMethod(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="all">All Methods</option>
              <option value="fire">Open Fire</option>
              <option value="stove">Camp Stove</option>
              <option value="dutch-oven">Dutch Oven</option>
            </select>
          </div>
        </div>
        <button className="mt-4 w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2">
          <Search className="w-4 h-4" />
          Find Recipes
        </button>
      </div>

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.map((recipe) => (
          <div key={recipe.name} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">{recipe.name}</h3>
              {recipe.method === 'fire' && <Flame className="w-5 h-5 text-orange-400" />}
              {recipe.method === 'stove' && <ChefHat className="w-5 h-5 text-blue-400" />}
              {recipe.method === 'dutch-oven' && <Utensils className="w-5 h-5 text-amber-400" />}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {recipe.time}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {recipe.servings} servings
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                recipe.difficulty === 'Easy' ? 'bg-emerald-900 text-emerald-400' :
                recipe.difficulty === 'Medium' ? 'bg-amber-900 text-amber-400' :
                'bg-red-900 text-red-400'
              }`}>
                {recipe.difficulty}
              </span>
            </div>

            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Ingredients: </span>
              {recipe.ingredients.join(', ')}
            </div>

            <button className="mt-4 w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-medium transition-colors">
              View Recipe
            </button>
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
