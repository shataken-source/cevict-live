'use client';

import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface MatchConfidenceDisplayProps {
  match: {
    overallConfidence: number;
    photoSimilarity: number;
    breedMatch: number;
    colorMatch: number;
    locationProximity: number;
    sizeMatch: number;
    reasoning: {
      model: string;
      factors: Array<{
        factor: string;
        weight: number;
        explanation: string;
      }>;
      warnings: string[];
    };
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    requiresVerification: boolean;
  };
}

/**
 * Display AI Match with Confidence Scores
 * 
 * Addresses "Model Hallucination" audit finding:
 * Provides Explainable AI (XAI) with confidence scores
 */
export default function MatchConfidenceDisplay({ match }: MatchConfidenceDisplayProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 85) return 'High Confidence';
    if (confidence >= 70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-6 bg-white shadow-lg">
      {/* Overall Confidence */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900">Match Confidence</h3>
          <span className={`text-3xl font-bold ${getConfidenceColor(match.overallConfidence)}`}>
            {match.overallConfidence}%
          </span>
        </div>
        <div className={`text-sm font-medium ${getConfidenceColor(match.overallConfidence)}`}>
          {getConfidenceLabel(match.overallConfidence)}
        </div>
        <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getConfidenceColor(match.overallConfidence).replace('text-', 'bg-')}`}
            style={{ width: `${match.overallConfidence}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="mb-6">
        <h4 className="font-bold text-gray-900 mb-3">Confidence Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Photo Similarity</span>
            <span className="font-medium">{match.photoSimilarity}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Breed Match</span>
            <span className="font-medium">{match.breedMatch}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Color Match</span>
            <span className="font-medium">{match.colorMatch}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Location Proximity</span>
            <span className="font-medium">{match.locationProximity}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Size Match</span>
            <span className="font-medium">{match.sizeMatch}%</span>
          </div>
        </div>
      </div>

      {/* Explainable AI - WHY this match */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-600" />
          <h4 className="font-bold text-gray-900">Why This Match?</h4>
        </div>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="font-medium mb-2">AI Model: {match.reasoning.model}</div>
          {match.reasoning.factors.map((factor, idx) => (
            <div key={idx} className="text-sm">
              <strong>{factor.factor}:</strong> {factor.explanation}
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {match.reasoning.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h4 className="font-bold text-gray-900">Warnings</h4>
          </div>
          <ul className="text-sm text-yellow-800 space-y-1">
            {match.reasoning.warnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Assessment */}
      <div className={`mb-6 p-4 rounded-lg border ${
        match.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
        match.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {match.riskLevel === 'high' ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          <h4 className="font-bold text-gray-900">
            Risk Level: {match.riskLevel.toUpperCase()}
          </h4>
        </div>
        {match.riskFactors.length > 0 && (
          <ul className="text-sm space-y-1 mt-2">
            {match.riskFactors.map((factor, idx) => (
              <li key={idx}>• {factor}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Verification Requirement */}
      {match.requiresVerification && (
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-purple-600" />
            <div>
              <div className="font-bold text-gray-900">Human Verification Required</div>
              <div className="text-sm text-gray-700">
                This match requires manual verification before contact is made.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

