'use client';

/**
 * Expert Consensus Component
 * Shows aggregated expert picks and records
 * Competitor feature: Covers.com Expert Consensus
 */

interface ExpertPick {
  name: string;
  pick: string;
  record: string;
  roi: number;
}

interface ExpertConsensusData {
  total: number;
  home: number;
  away: number;
  over: number;
  under: number;
}

interface Props {
  homeTeam: string;
  awayTeam: string;
  expertPicks: ExpertConsensusData;
  topExperts: ExpertPick[];
  consensusPick: string;
  consensusConfidence: number;
}

export default function ExpertConsensus({
  homeTeam,
  awayTeam,
  expertPicks,
  topExperts,
  consensusPick,
  consensusConfidence,
}: Props) {
  const spreadTotal = expertPicks.home + expertPicks.away;
  const totalTotal = expertPicks.over + expertPicks.under;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <h3 className="font-bold text-white">Expert Consensus</h3>
          <span className="text-xs text-white/40">({expertPicks.total} experts)</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Consensus Pick */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="text-xs text-purple-300 mb-1">CONSENSUS PICK</div>
          <div className="text-xl font-bold text-white">{consensusPick}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                style={{ width: `${consensusConfidence}%` }}
              />
            </div>
            <span className="text-sm font-bold text-purple-300">{consensusConfidence.toFixed(0)}%</span>
          </div>
        </div>

        {/* Spread Picks */}
        <div>
          <div className="text-xs text-white/50 mb-2">SPREAD PICKS</div>
          <div className="flex gap-2">
            <div className={`flex-1 p-3 rounded-xl ${
              expertPicks.away > expertPicks.home 
                ? 'bg-emerald-500/20 border border-emerald-500/30' 
                : 'bg-white/5'
            }`}>
              <div className="text-sm text-white/70">{awayTeam}</div>
              <div className="text-2xl font-bold text-white">{expertPicks.away}</div>
              <div className="text-xs text-white/40">
                {spreadTotal > 0 ? ((expertPicks.away / spreadTotal) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className={`flex-1 p-3 rounded-xl ${
              expertPicks.home > expertPicks.away 
                ? 'bg-emerald-500/20 border border-emerald-500/30' 
                : 'bg-white/5'
            }`}>
              <div className="text-sm text-white/70">{homeTeam}</div>
              <div className="text-2xl font-bold text-white">{expertPicks.home}</div>
              <div className="text-xs text-white/40">
                {spreadTotal > 0 ? ((expertPicks.home / spreadTotal) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Total Picks */}
        <div>
          <div className="text-xs text-white/50 mb-2">TOTAL PICKS</div>
          <div className="flex gap-2">
            <div className={`flex-1 p-3 rounded-xl ${
              expertPicks.over > expertPicks.under 
                ? 'bg-blue-500/20 border border-blue-500/30' 
                : 'bg-white/5'
            }`}>
              <div className="text-sm text-white/70">Over</div>
              <div className="text-2xl font-bold text-white">{expertPicks.over}</div>
              <div className="text-xs text-white/40">
                {totalTotal > 0 ? ((expertPicks.over / totalTotal) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className={`flex-1 p-3 rounded-xl ${
              expertPicks.under > expertPicks.over 
                ? 'bg-blue-500/20 border border-blue-500/30' 
                : 'bg-white/5'
            }`}>
              <div className="text-sm text-white/70">Under</div>
              <div className="text-2xl font-bold text-white">{expertPicks.under}</div>
              <div className="text-xs text-white/40">
                {totalTotal > 0 ? ((expertPicks.under / totalTotal) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Top Experts */}
        <div>
          <div className="text-xs text-white/50 mb-2">TOP EXPERTS</div>
          <div className="space-y-2">
            {topExperts.map((expert, i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-yellow-500 text-black' :
                    i === 1 ? 'bg-slate-400 text-black' :
                    i === 2 ? 'bg-amber-700 text-white' :
                    'bg-white/20 text-white'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">{expert.name}</div>
                    <div className="text-xs text-white/50">{expert.record}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{expert.pick}</div>
                  <div className={`text-xs ${expert.roi > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {expert.roi > 0 ? '+' : ''}{expert.roi}% ROI
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

