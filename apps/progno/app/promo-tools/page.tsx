'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Gift, TrendingUp, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

// Sportsbook database with signup bonuses
const SPORTSBOOKS = [
  {
    id: 'draftkings',
    name: 'DraftKings',
    logo: '📱',
    signupBonus: '$1,000 No Sweat Bet',
    bonusType: 'risk-free',
    bonusValue: 1000,
    states: ['AZ', 'CO', 'CT', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'NJ', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    url: 'https://sportsbook.draftkings.com',
    rating: 4.8,
    features: ['Daily Odds Boosts', 'Same Game Parlay', 'Live Betting'],
  },
  {
    id: 'fanduel',
    name: 'FanDuel',
    logo: '🏆',
    signupBonus: '$1,000 No Sweat First Bet',
    bonusType: 'risk-free',
    bonusValue: 1000,
    states: ['AZ', 'CO', 'CT', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'NJ', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    url: 'https://sportsbook.fanduel.com',
    rating: 4.9,
    features: ['Profit Boosts', 'Same Game Parlay+', 'Live Streaming'],
  },
  {
    id: 'betmgm',
    name: 'BetMGM',
    logo: '🦁',
    signupBonus: '$1,500 First Bet Offer',
    bonusType: 'risk-free',
    bonusValue: 1500,
    states: ['AZ', 'CO', 'DC', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'NJ', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    url: 'https://sports.betmgm.com',
    rating: 4.6,
    features: ['Odds Boosts', 'Edit My Bet', 'Cash Out'],
  },
  {
    id: 'caesars',
    name: 'Caesars Sportsbook',
    logo: '👑',
    signupBonus: '$1,000 First Bet on Caesars',
    bonusType: 'risk-free',
    bonusValue: 1000,
    states: ['AZ', 'CO', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'NJ', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV', 'WY'],
    url: 'https://sportsbook.caesars.com',
    rating: 4.5,
    features: ['Caesars Rewards', 'Daily Promos', 'Live Betting'],
  },
  {
    id: 'pointsbet',
    name: 'PointsBet',
    logo: '🎯',
    signupBonus: '$250 in Bonus Bets',
    bonusType: 'bonus-bet',
    bonusValue: 250,
    states: ['CO', 'IL', 'IN', 'IA', 'KS', 'LA', 'MD', 'MI', 'NJ', 'NY', 'OH', 'PA', 'VA', 'WV'],
    url: 'https://pointsbet.com',
    rating: 4.3,
    features: ['PointsBetting', 'Good Karma', 'No Juice Lines'],
  },
  {
    id: 'bet365',
    name: 'bet365',
    logo: '🌟',
    signupBonus: '$150 in Bonus Bets',
    bonusType: 'bonus-bet',
    bonusValue: 150,
    states: ['AZ', 'CO', 'IA', 'KY', 'NJ', 'OH', 'VA'],
    url: 'https://bet365.com',
    rating: 4.4,
    features: ['Early Payout', 'Bet Boosts', 'Same Game Parlay'],
  },
  {
    id: 'espnbet',
    name: 'ESPN BET',
    logo: '📺',
    signupBonus: '$1,000 Second Chance Bet',
    bonusType: 'risk-free',
    bonusValue: 1000,
    states: ['AZ', 'CO', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'MD', 'MA', 'MI', 'NJ', 'NY', 'OH', 'PA', 'TN', 'VA', 'WV'],
    url: 'https://espnbet.com',
    rating: 4.2,
    features: ['ESPN Integration', 'Daily Boosts', 'Live Streaming'],
  },
  {
    id: 'fliff',
    name: 'Fliff',
    logo: '🎮',
    signupBonus: '600,000 Fliff Coins',
    bonusType: 'sweepstakes',
    bonusValue: 100,
    states: ['ALL'], // Available everywhere
    url: 'https://fliff.com',
    rating: 4.0,
    features: ['Social Betting', 'Free to Play', 'Prizes Available'],
  },
];

// Promo types with conversion rates
type PromoType = 'bonus-bet' | 'site-credit' | 'risk-free' | 'profit-boost';

interface PromoConversion {
  type: PromoType;
  amount: number;
  odds1: number; // Odds for promo bet
  odds2: number; // Odds for hedge bet
  stake2: number;
  outcome1Win: number;
  outcome1Loss: number;
  outcome2Win: number;
  outcome2Loss: number;
  guaranteedProfit: number;
  conversionRate: number;
}

function calculatePromoConversion(
  type: PromoType,
  amount: number,
  odds1: number,
  odds2: number
): PromoConversion {
  // Convert American odds to decimal
  const toDecimal = (american: number) => {
    if (american > 0) return (american / 100) + 1;
    return (100 / Math.abs(american)) + 1;
  };

  const dec1 = toDecimal(odds1);
  const dec2 = toDecimal(odds2);

  let stake2 = 0;
  let outcome1Win = 0;
  let outcome1Loss = 0;
  let outcome2Win = 0;
  let outcome2Loss = 0;

  switch (type) {
    case 'bonus-bet':
      // Bonus bet: You don't get the stake back, only winnings
      // Hedge calculation: stake2 = (amount * dec1) / dec2
      stake2 = (amount * dec1) / dec2;
      
      outcome1Win = amount * (dec1 - 1); // Win promo, lose hedge
      outcome1Loss = -stake2; // Lose promo (no stake lost), win hedge
      outcome2Win = stake2 * (dec2 - 1); // Lose promo, win hedge
      outcome2Loss = amount * (dec1 - 1) - stake2; // Win promo, lose hedge
      break;

    case 'site-credit':
      // Site credit: Full value bet, can be withdrawn
      stake2 = (amount * dec1) / dec2;
      
      outcome1Win = amount * dec1 - stake2;
      outcome1Loss = -stake2;
      outcome2Win = stake2 * dec2 - amount;
      outcome2Loss = -amount;
      break;

    case 'risk-free':
      // Risk-free: Bet with real money, get bonus bet back if lose
      // Value depends on what you'd convert the potential bonus bet to
      const bonusBetValue = amount * 0.7; // Assume 70% conversion rate for bonus bet
      stake2 = ((amount + bonusBetValue) * dec1) / dec2;
      
      outcome1Win = amount * (dec1 - 1) - stake2;
      outcome1Loss = -stake2 + bonusBetValue; // Lose and get bonus bet
      outcome2Win = stake2 * (dec2 - 1) - amount;
      outcome2Loss = stake2 * (dec2 - 1) - amount + bonusBetValue;
      break;

    case 'profit-boost':
      // Profit boost: Winnings multiplied by boost percentage
      const boostPercent = 0.5; // Default 50% boost
      const boostedDec1 = 1 + (dec1 - 1) * (1 + boostPercent);
      stake2 = (amount * boostedDec1) / dec2;
      
      outcome1Win = amount * (boostedDec1 - 1) - stake2;
      outcome1Loss = -stake2;
      outcome2Win = stake2 * (dec2 - 1) - amount;
      outcome2Loss = -amount - stake2;
      break;
  }

  // Guaranteed profit is the minimum of the two scenarios
  const guaranteedProfit = Math.min(
    outcome1Win + outcome2Win,
    outcome1Loss + outcome2Loss
  );

  // Conversion rate
  const conversionRate = (guaranteedProfit / amount) * 100;

  return {
    type,
    amount,
    odds1,
    odds2,
    stake2: Math.round(stake2 * 100) / 100,
    outcome1Win: Math.round(outcome1Win * 100) / 100,
    outcome1Loss: Math.round(outcome1Loss * 100) / 100,
    outcome2Win: Math.round(outcome2Win * 100) / 100,
    outcome2Loss: Math.round(outcome2Loss * 100) / 100,
    guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

export default function PromoTools() {
  const [activeTab, setActiveTab] = useState('finder');
  const [state, setState] = useState('');
  const [promoType, setPromoType] = useState<PromoType>('bonus-bet');
  const [promoAmount, setPromoAmount] = useState(100);
  const [odds1, setOdds1] = useState(200);
  const [odds2, setOdds2] = useState(-250);
  const [conversion, setConversion] = useState<PromoConversion | null>(null);

  const filteredBooks = state
    ? SPORTSBOOKS.filter(
        (sb) => sb.states.includes(state.toUpperCase()) || sb.states.includes('ALL')
      )
    : SPORTSBOOKS;

  const totalAvailableBonus = filteredBooks.reduce(
    (sum, sb) => sum + sb.bonusValue,
    0
  );

  useEffect(() => {
    const result = calculatePromoConversion(promoType, promoAmount, odds1, odds2);
    setConversion(result);
  }, [promoType, promoAmount, odds1, odds2]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            💰 PROGNO Promo Tools
          </h1>
          <p className="text-slate-400 text-lg">
            Find signup bonuses and convert them to guaranteed profit
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <Gift className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Bonus Value</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${totalAvailableBonus.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Sportsbooks Available</p>
                <p className="text-2xl font-bold text-blue-400">
                  {filteredBooks.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Avg Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-400">70-75%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
            <TabsTrigger value="finder" className="data-[state=active]:bg-emerald-500/20">
              <Gift className="w-4 h-4 mr-2" />
              Promo Finder
            </TabsTrigger>
            <TabsTrigger value="converter" className="data-[state=active]:bg-emerald-500/20">
              <Calculator className="w-4 h-4 mr-2" />
              Promo Converter
            </TabsTrigger>
          </TabsList>

          {/* Promo Finder Tab */}
          <TabsContent value="finder" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-400" />
                  Available Signup Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* State Filter */}
                <div className="mb-6">
                  <label className="text-sm text-slate-400 mb-2 block">
                    Filter by State (2-letter code)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., NY, CA, TX"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="w-32 bg-slate-900 border-slate-700 text-white"
                      maxLength={2}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setState('')}
                      className="border-slate-600"
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Enter your state to see available sportsbooks
                  </p>
                </div>

                {/* Sportsbook Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBooks.map((book) => (
                    <div
                      key={book.id}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{book.logo}</span>
                          <div>
                            <h3 className="font-semibold text-white">{book.name}</h3>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400">★</span>
                              <span className="text-sm text-slate-400">{book.rating}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            book.bonusType === 'risk-free'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : book.bonusType === 'bonus-bet'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }
                        >
                          {book.bonusType.replace('-', ' ')}
                        </Badge>
                      </div>

                      <div className="mb-3">
                        <p className="text-emerald-400 font-bold text-lg">{book.signupBonus}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {book.features.map((feature) => (
                          <span
                            key={feature}
                            className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => window.open(book.url, '_blank')}
                        >
                          Sign Up
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-600"
                          onClick={() => {
                            setPromoType(book.bonusType as PromoType);
                            setPromoAmount(book.bonusValue);
                            setActiveTab('converter');
                          }}
                        >
                          Convert
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredBooks.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sportsbooks available in {state} yet.</p>
                    <p className="text-sm">Try clearing the filter or check back later.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Converter Tab */}
          <TabsContent value="converter" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-400" />
                    Promo Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Promo Type */}
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Promo Type</label>
                    <Select
                      value={promoType}
                      onValueChange={(v) => setPromoType(v as PromoType)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="bonus-bet">🎁 Bonus Bet</SelectItem>
                        <SelectItem value="site-credit">💳 Site Credit</SelectItem>
                        <SelectItem value="risk-free">🛡️ Risk-Free Bet</SelectItem>
                        <SelectItem value="profit-boost">⚡ Profit Boost</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {promoType === 'bonus-bet' && "You don't keep the stake, only winnings"}
                      {promoType === 'site-credit' && 'Full credit that can be withdrawn'}
                      {promoType === 'risk-free' && 'Real money bet, bonus if it loses'}
                      {promoType === 'profit-boost' && 'Winnings multiplied by boost %'}
                    </p>
                  </div>

                  {/* Promo Amount */}
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Promo Amount ($)
                    </label>
                    <Input
                      type="number"
                      value={promoAmount}
                      onChange={(e) => setPromoAmount(Number(e.target.value))}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  {/* Odds 1 */}
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Promo Bet Odds (American)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={odds1}
                        onChange={(e) => setOdds1(Number(e.target.value))}
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                      <span className="text-slate-500 text-sm whitespace-nowrap">
                        {odds1 > 0 ? `+${odds1}` : odds1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Higher odds = better conversion, more variance
                    </p>
                  </div>

                  {/* Odds 2 */}
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Hedge Bet Odds (American)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={odds2}
                        onChange={(e) => setOdds2(Number(e.target.value))}
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                      <span className="text-slate-500 text-sm whitespace-nowrap">
                        {odds2 > 0 ? `+${odds2}` : odds2}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Should be on the opposite outcome
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Results Panel */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Conversion Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conversion && (
                    <div className="space-y-6">
                      {/* Main Result */}
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                        <p className="text-sm text-emerald-400 mb-1">Guaranteed Profit</p>
                        <p className="text-4xl font-bold text-emerald-400">
                          ${conversion.guaranteedProfit}
                        </p>
                        <p className="text-sm text-emerald-400/70 mt-1">
                          {conversion.conversionRate}% conversion rate
                        </p>
                      </div>

                      {/* Hedge Amount */}
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <p className="text-sm text-slate-400 mb-1">Hedge Bet Amount</p>
                        <p className="text-2xl font-bold text-white">${conversion.stake2}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Bet ${conversion.stake2} at {odds2 > 0 ? `+${odds2}` : odds2} on opposite outcome
                        </p>
                      </div>

                      {/* Outcome Scenarios */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                          <p className="text-xs text-emerald-400 mb-1">✅ Promo Wins</p>
                          <p className="font-semibold text-emerald-400">
                            +${conversion.outcome1Win}
                          </p>
                          <p className="text-xs text-emerald-400/70">
                            Lose hedge: ${conversion.outcome1Loss}
                          </p>
                          <p className="text-xs text-emerald-400/50 mt-1">
                            Net: ${conversion.outcome1Win + conversion.outcome1Loss}
                          </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                          <p className="text-xs text-blue-400 mb-1">🎯 Hedge Wins</p>
                          <p className="font-semibold text-blue-400">
                            +${conversion.outcome2Win}
                          </p>
                          <p className="text-xs text-blue-400/70">
                            Lose promo: ${conversion.outcome2Loss}
                          </p>
                          <p className="text-xs text-blue-400/50 mt-1">
                            Net: ${conversion.outcome2Win + conversion.outcome2Loss}
                          </p>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                        <p className="font-semibold text-white flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-400" />
                          How to execute:
                        </p>
                        <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                          <li>
                            Place <strong className="text-white">${promoAmount}</strong> promo
                            bet at <strong className="text-white">{odds1 > 0 ? `+${odds1}` : odds1}</strong>
                          </li>
                          <li>
                            Place <strong className="text-white">${conversion.stake2}</strong>{' '}
                            hedge bet at <strong className="text-white">{odds2 > 0 ? `+${odds2}` : odds2}</strong>{' '}
                            on opposite outcome
                          </li>
                          <li>Wait for both bets to settle</li>
                          <li>
                            Collect <strong className="text-emerald-400">${conversion.guaranteedProfit}</strong>{' '}
                            guaranteed profit either way
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-emerald-400 mb-2">💡 What is a Bonus Bet?</h3>
              <p className="text-sm text-slate-400">
                A bonus bet is site credit where you only keep the winnings, not the stake.
                Typical conversion: 60-75% to cash.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-emerald-400 mb-2">🎯 What is a Risk-Free Bet?</h3>
              <p className="text-sm text-slate-400">
                Bet with your own money. If you lose, get a bonus bet back. If you win, keep
                the profit. Value depends on bonus bet conversion.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-emerald-400 mb-2">⚡ Optimal Strategy</h3>
              <p className="text-sm text-slate-400">
                Use +300 to +500 odds for bonus bets. Use closer to even money (-110) for
                risk-free bets. Always hedge on a different sportsbook.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
