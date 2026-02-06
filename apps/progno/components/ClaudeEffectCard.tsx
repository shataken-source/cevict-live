'use client';

interface Scores {
  sentimentField?: number;
  narrativeMomentum?: number;
  informationAsymmetry?: number;
  chaosSensitivity?: number;
  networkInfluence?: number;
  temporalDecay?: number;
  emergentPattern?: number;
}

interface Props {
  scores: Scores;
  adjustedProbability?: number;
  adjustedConfidence?: number;
  reasoning?: string[];
  recommendations?: { betSize?: string; reason?: string };
}

export default function ClaudeEffectCard({
  scores,
  adjustedProbability = 0,
  adjustedConfidence = 0,
  reasoning = [],
  recommendations = {},
}: Props) {
  const dims = [
    { label: 'Sentiment', v: scores.sentimentField },
    { label: 'Narrative', v: scores.narrativeMomentum },
    { label: 'Info asymmetry', v: scores.informationAsymmetry },
    { label: 'Chaos', v: scores.chaosSensitivity },
    { label: 'Network', v: scores.networkInfluence },
    { label: 'Temporal', v: scores.temporalDecay },
    { label: 'Emergent', v: scores.emergentPattern },
  ].filter(d => d.v != null);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-700 mb-2">7D Claude Effect</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {dims.map(({ label, v }) => (
          <span
            key={label}
            className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700"
          >
            {label}: {typeof v === 'number' ? Math.round(v * 100) : '-'}%
          </span>
        ))}
      </div>
      {(adjustedProbability > 0 || adjustedConfidence > 0) && (
        <p className="text-xs text-gray-600">
          Adjusted prob: {Math.round((adjustedProbability ?? 0) * 100)}% · Confidence: {Math.round((adjustedConfidence ?? 0) * 100)}%
        </p>
      )}
      {reasoning.length > 0 && (
        <ul className="mt-2 text-xs text-gray-600 list-disc list-inside space-y-0.5">
          {reasoning.slice(0, 3).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      {recommendations.reason && (
        <p className="mt-2 text-xs font-medium text-blue-700">{recommendations.reason}</p>
      )}
    </div>
  );
}
