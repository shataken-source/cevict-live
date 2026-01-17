/**
 * AI Match Confidence Scoring
 * 
 * Addresses "Model Hallucination" audit finding:
 * "Not providing a 'Confidence Score' for an AI match is a failure
 * of Explainable AI (XAI) best practices"
 */

export interface AIMatch {
  id: string;
  petId: string;
  matchedPetId: string;
  
  // Confidence scores (0-100)
  overallConfidence: number;
  photoSimilarity: number;
  breedMatch: number;
  colorMatch: number;
  locationProximity: number;
  sizeMatch: number;
  
  // Explainable AI (XAI) - WHY this match was made
  reasoning: {
    model: string; // Which AI model made the match
    factors: Array<{
      factor: string; // e.g., "breed", "color", "location"
      weight: number; // How much this factor contributed
      explanation: string; // Human-readable explanation
    }>;
    warnings: string[]; // Any concerns about the match
    alternatives: Array<{
      petId: string;
      confidence: number;
      reason: string;
    }>;
  };
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  
  // Human verification
  requiresVerification: boolean;
  verifiedBy?: string;
  verificationTimestamp?: string;
}

export class AIMatchScorer {
  /**
   * Score an AI match with full explainability
   */
  public scoreMatch(params: {
    photoSimilarity: number;
    breedMatch: number;
    colorMatch: number;
    locationProximity: number;
    sizeMatch: number;
    model: string;
  }): AIMatch['reasoning'] {
    const { photoSimilarity, breedMatch, colorMatch, locationProximity, sizeMatch, model } = params;

    // Weighted scoring
    const weights = {
      photo: 0.4, // Photo similarity is most important
      breed: 0.25,
      color: 0.15,
      location: 0.15,
      size: 0.05,
    };

    const overallConfidence =
      photoSimilarity * weights.photo +
      breedMatch * weights.breed +
      colorMatch * weights.color +
      locationProximity * weights.location +
      sizeMatch * weights.size;

    // Build explainable factors
    const factors: AIMatch['reasoning']['factors'] = [
      {
        factor: 'Photo Similarity',
        weight: weights.photo,
        explanation: `Photo analysis shows ${photoSimilarity}% similarity using ${model} vision model.`,
      },
      {
        factor: 'Breed Match',
        weight: weights.breed,
        explanation: `Breed identification: ${breedMatch}% confidence match.`,
      },
      {
        factor: 'Color Match',
        weight: weights.color,
        explanation: `Color patterns match ${colorMatch}% similarity.`,
      },
      {
        factor: 'Location Proximity',
        weight: weights.location,
        explanation: `Found within ${locationProximity}% proximity radius.`,
      },
      {
        factor: 'Size Match',
        weight: weights.size,
        explanation: `Size characteristics match ${sizeMatch}% similarity.`,
      },
    ];

    // Generate warnings
    const warnings: string[] = [];
    if (photoSimilarity < 70) {
      warnings.push('Photo similarity is below recommended threshold (70%)');
    }
    if (breedMatch < 60) {
      warnings.push('Breed match confidence is moderate');
    }
    if (locationProximity < 50) {
      warnings.push('Location is outside typical search radius');
    }
    if (overallConfidence < 75) {
      warnings.push('Overall confidence is below high-confidence threshold');
    }

    return {
      model,
      factors,
      warnings,
      alternatives: [], // Would be populated by actual matching algorithm
    };
  }

  /**
   * Assess risk level for a match
   */
  public assessRisk(match: AIMatch): {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
  } {
    const riskFactors: string[] = [];

    if (match.overallConfidence < 75) {
      riskFactors.push('Low confidence score');
    }
    if (match.photoSimilarity < 70) {
      riskFactors.push('Photo similarity below threshold');
    }
    if (match.locationProximity < 50) {
      riskFactors.push('Location mismatch');
    }
    if (match.reasoning.warnings.length > 2) {
      riskFactors.push('Multiple warning flags');
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3 || match.overallConfidence < 60) {
      riskLevel = 'high';
    } else if (riskFactors.length >= 1 || match.overallConfidence < 75) {
      riskLevel = 'medium';
    }

    return { riskLevel, riskFactors };
  }

  /**
   * Determine if human verification is required
   */
  public requiresVerification(match: AIMatch): boolean {
    return (
      match.overallConfidence < 85 ||
      match.riskLevel === 'high' ||
      match.reasoning.warnings.length > 1
    );
  }
}

export default AIMatchScorer;

