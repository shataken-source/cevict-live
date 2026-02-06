/**
 * Probability Modeling Bot
 * Specialist in probability theory, Bayesian inference, and probability calibration for PROGNO Massager
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Prob (Probability Modeling)',
  specialty: 'Probability Theory, Bayesian Inference, Calibration, PROGNO Massager',
  systemPrompt: `You are Prob, an expert probability modeling AI assistant specializing in:
- Probability Theory for Sports Prediction (PROGNO Massager)
- Bayesian Inference and Updating
- Probability Calibration
- Prior and Posterior Distributions
- Likelihood Functions
- Maximum Likelihood Estimation
- Bayesian Networks
- Monte Carlo Methods
- Probability Distributions
- Conditional Probability
- Joint and Marginal Probabilities
- Probability Aggregation
- Uncertainty Quantification
- Credible Intervals
- Posterior Predictive Distributions

You work specifically with the PROGNO Massager system to:
- Model probabilities for game outcomes
- Calibrate prediction probabilities
- Apply Bayesian updating
- Quantify prediction uncertainty
- Aggregate multiple probability sources
- Validate probability estimates

You help ensure PROGNO Massager probabilities are well-calibrated and theoretically sound.`,
  learningTopics: [
    'Bayesian probability theory',
    'Probability calibration methods',
    'Bayesian updating techniques',
    'Monte Carlo simulation',
    'Probability aggregation',
    'Uncertainty quantification',
    'Prior specification',
    'Likelihood modeling',
    'Posterior inference',
    'Probability distributions',
    'Conditional probability models',
    'Credible interval calculation',
  ],
  dailyTasks: [
    'Review probability calibration',
    'Analyze prediction uncertainty',
    'Validate probability estimates',
    'Update Bayesian priors',
  ],
};

export class ProbabilityModelingBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review probability calibration':
        return this.reviewCalibration();
      case 'Analyze prediction uncertainty':
        return this.analyzeUncertainty();
      case 'Validate probability estimates':
        return this.validateProbabilities();
      case 'Update Bayesian priors':
        return this.updatePriors();
      default:
        return this.ask(task);
    }
  }

  private async reviewCalibration(): Promise<string> {
    return this.ask(`How to review and improve probability calibration in PROGNO Massager?
Include:
1. Calibration curve analysis
2. Brier score decomposition
3. Reliability diagrams
4. Calibration metrics
5. Recalibration methods
6. Continuous calibration strategies`);
  }

  private async analyzeUncertainty(): Promise<string> {
    return this.ask(`How to analyze and quantify prediction uncertainty in PROGNO Massager?
Include:
1. Uncertainty sources
2. Confidence intervals
3. Credible intervals
4. Prediction intervals
5. Uncertainty propagation
6. Uncertainty visualization`);
  }

  private async validateProbabilities(): Promise<string> {
    return this.ask(`How to validate probability estimates in PROGNO Massager?
Include:
1. Probability validation metrics
2. Out-of-sample validation
3. Probability sharpness
4. Probability resolution
5. Reliability assessment
6. Validation frameworks`);
  }

  private async updatePriors(): Promise<string> {
    return this.ask(`How to update Bayesian priors in PROGNO Massager?
Include:
1. Prior specification methods
2. Prior sensitivity analysis
3. Posterior updating
4. Prior-data conflict detection
5. Informative vs. non-informative priors
6. Prior updating strategies`);
  }

  /**
   * Model probability
   */
  async modelProbability(event: string, data: string, method: string): Promise<string> {
    return this.ask(`Model probability for PROGNO Massager:
Event: ${event}
Data: ${data}
Method: ${method}

Include:
1. Probability model specification
2. Prior distribution (if Bayesian)
3. Likelihood function
4. Posterior distribution
5. Point estimate and uncertainty
6. Model validation`);
  }

  /**
   * Calibrate probabilities
   */
  async calibrateProbabilities(predictions: string, outcomes: string): Promise<string> {
    return this.ask(`Calibrate probabilities for PROGNO Massager:
Predictions: ${predictions}
Outcomes: ${outcomes}

Include:
1. Calibration assessment
2. Calibration curve
3. Recalibration method
4. Calibrated probabilities
5. Calibration metrics
6. Validation results`);
  }

  /**
   * Aggregate probabilities
   */
  async aggregateProbabilities(sources: string, weights: string): Promise<string> {
    return this.ask(`Aggregate probabilities from multiple sources for PROGNO Massager:
Sources: ${sources}
Weights: ${weights}

Include:
1. Aggregation method
2. Weight optimization
3. Aggregated probability
4. Uncertainty quantification
5. Validation
6. Sensitivity analysis`);
  }

  /**
   * Apply Bayesian updating
   */
  async applyBayesianUpdate(prior: string, likelihood: string, data: string): Promise<string> {
    return this.ask(`Apply Bayesian updating for PROGNO Massager:
Prior: ${prior}
Likelihood: ${likelihood}
Data: ${data}

Include:
1. Prior specification
2. Likelihood calculation
3. Posterior calculation
4. Posterior distribution
5. Credible intervals
6. Interpretation`);
  }
}

