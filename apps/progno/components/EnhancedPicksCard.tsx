'use client';

interface Pick {
  sport?: string;
  home_team?: string;
  away_team?: string;
  game_time?: string;
  confidence?: number;
  analysis?: string;
  pick?: string;
  odds?: number;
  mc_win_probability?: number;
  mc_predicted_score?: { home: number; away: number };
  value_bet_edge?: number;
  value_bet_ev?: number;
  has_value?: boolean;
}

interface Props {
  pick: Pick;
  showDetails?: boolean;
}

export default function EnhancedPicksCard({ pick, showDetails }: Props) {
  const conf = pick.confidence ?? 0;
  const edge = pick.value_bet_edge ?? 0;
  const score = pick.mc_predicted_score;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{pick.sport}</p>
          <p className="font-semibold text-gray-900">
            {pick.home_team} vs {pick.away_team}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Pick: <span className="font-bold text-blue-700">{pick.pick}</span>
            {conf > 0 && (
              <span className="ml-2 text-gray-500">Confidence: {Math.round(conf)}%</span>
            )}
          </p>
          {score && (
            <p className="text-sm text-gray-600 mt-0.5">
              Projected: {score.home} – {score.away}
            </p>
          )}
          {edge > 0 && (
            <p className="text-sm font-semibold text-green-600 mt-1">+{edge}% edge</p>
          )}
        </div>
      </div>
      {showDetails && pick.analysis && (
        <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-3">
          {pick.analysis}
        </pre>
      )}
    </div>
  );
}
