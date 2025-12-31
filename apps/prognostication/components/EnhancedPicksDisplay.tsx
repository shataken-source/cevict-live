'use client';

import { EnhancedPrediction } from '@/types/prediction';

interface PicksPageProps {
  predictions: EnhancedPrediction[];
}

export default function PicksPage({ predictions }: PicksPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          ?? Today's Picks
        </h1>
        
        {predictions.map((pred) => (
          <div key={pred.id} className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {pred.homeTeam} vs {pred.awayTeam}
                </h2>
                <p className="text-slate-400">{pred.league} • {pred.gameDate}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-400">
                  {pred.prediction.confidence}%
                </div>
                <div className="text-sm text-slate-400">Confidence</div>
              </div>
            </div>

            {/* Prediction */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">RECOMMENDED BET</p>
                  <p className="text-white text-2xl font-bold">
                    ? {pred.recommendedBet}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-100 text-sm mb-1">PREDICTED SCORE</p>
                  <p className="text-white text-xl font-bold">
                    {pred.prediction.score.home} - {pred.prediction.score.away}
                  </p>
                </div>
              </div>
            </div>

            {/* Teams Analysis */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Home Team */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  ?? {pred.analysis.homeTeam.name}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300">
                    ?? Record: <span className="text-white font-semibold">{pred.analysis.homeTeam.record}</span>
                  </p>
                  <p className="text-slate-300">
                    ?? Form: <span className="text-white font-semibold">{pred.analysis.homeTeam.form}</span>
                  </p>
                  <p className="text-slate-300">
                    ?? Last: <span className="text-white">{pred.analysis.homeTeam.lastGame}</span>
                  </p>
                  
                  {pred.analysis.homeTeam.injuries.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-red-400 font-semibold mb-1">?? Injuries:</p>
                      {pred.analysis.homeTeam.injuries.map((inj, i) => (
                        <p key={i} className="text-slate-300 text-xs">{inj}</p>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-green-400 font-semibold mb-1">Strengths:</p>
                    {pred.analysis.homeTeam.strengths.map((str, i) => (
                      <p key={i} className="text-slate-300 text-xs">{str}</p>
                    ))}
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-orange-400 font-semibold mb-1">Weaknesses:</p>
                    {pred.analysis.homeTeam.weaknesses.map((weak, i) => (
                      <p key={i} className="text-slate-300 text-xs">{weak}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Away Team */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  ?? {pred.analysis.awayTeam.name}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300">
                    ?? Record: <span className="text-white font-semibold">{pred.analysis.awayTeam.record}</span>
                  </p>
                  <p className="text-slate-300">
                    ?? Form: <span className="text-white font-semibold">{pred.analysis.awayTeam.form}</span>
                  </p>
                  <p className="text-slate-300">
                    ?? Last: <span className="text-white">{pred.analysis.awayTeam.lastGame}</span>
                  </p>
                  
                  {pred.analysis.awayTeam.injuries.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-red-400 font-semibold mb-1">?? Injuries:</p>
                      {pred.analysis.awayTeam.injuries.map((inj, i) => (
                        <p key={i} className="text-slate-300 text-xs">{inj}</p>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-green-400 font-semibold mb-1">Strengths:</p>
                    {pred.analysis.awayTeam.strengths.map((str, i) => (
                      <p key={i} className="text-slate-300 text-xs">{str}</p>
                    ))}
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-orange-400 font-semibold mb-1">Weaknesses:</p>
                    {pred.analysis.awayTeam.weaknesses.map((weak, i) => (
                      <p key={i} className="text-slate-300 text-xs">{weak}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Matchup Analysis */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold text-white mb-3">?? Matchup Analysis</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">Head to Head</p>
                  <p className="text-white">{pred.analysis.matchup.headToHead}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Home Advantage</p>
                  <p className="text-white">+{pred.analysis.matchup.homeAdvantage} points</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-slate-400 mb-1">??? Weather Impact</p>
                  <p className="text-white">{pred.analysis.matchup.weatherImpact}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-slate-400 mb-2 font-semibold">?? Key Matchups:</p>
                {pred.analysis.matchup.keyMatchups.map((matchup, i) => (
                  <p key={i} className="text-white text-sm mb-1">• {matchup}</p>
                ))}
              </div>
            </div>

            {/* Betting Info */}
            <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold text-white mb-3">?? Betting Lines</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">Spread</p>
                  <p className="text-white font-bold">{pred.analysis.betting.spread}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Over/Under</p>
                  <p className="text-white font-bold">{pred.analysis.betting.overUnder}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Home ML</p>
                  <p className="text-white font-bold">{pred.analysis.betting.moneyline.home}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Away ML</p>
                  <p className="text-white font-bold">{pred.analysis.betting.moneyline.away}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-slate-400 mb-2">?? Public Betting:</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{pred.homeTeam}</span>
                      <span className="text-white font-bold">{pred.analysis.betting.publicBetting.home}%</span>
                    </div>
                    <div className="bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${pred.analysis.betting.publicBetting.home}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{pred.awayTeam}</span>
                      <span className="text-white font-bold">{pred.analysis.betting.publicBetting.away}%</span>
                    </div>
                    <div className="bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${pred.analysis.betting.publicBetting.away}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-green-900/20 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold text-green-400 mb-3">? Why This Pick</h3>
              <ul className="space-y-2">
                {pred.reasoning.map((reason, i) => (
                  <li key={i} className="text-white text-sm">{reason}</li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            {pred.risks.length > 0 && (
              <div className="bg-orange-900/20 rounded-lg p-4">
                <h3 className="text-lg font-bold text-orange-400 mb-3">?? Potential Risks</h3>
                <ul className="space-y-2">
                  {pred.risks.map((risk, i) => (
                    <li key={i} className="text-white text-sm">{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
