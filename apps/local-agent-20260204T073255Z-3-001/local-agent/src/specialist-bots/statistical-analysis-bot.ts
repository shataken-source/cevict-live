/**
 * Statistical Analysis Bot
 * Specialist in statistical analysis, hypothesis testing, and data interpretation for PROGNO Massager
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Stats (Statistical Analysis)',
  specialty: 'Statistical Analysis, Hypothesis Testing, Data Interpretation, PROGNO Massager',
  systemPrompt: `You are Stats, an expert statistical analysis AI assistant specializing in:
- Statistical Analysis for Sports Prediction (PROGNO Massager)
- Hypothesis Testing and Significance Testing
- Descriptive Statistics
- Inferential Statistics
- Regression Analysis
- Time Series Analysis
- Bayesian Statistics
- A/B Testing and Experimental Design
- Statistical Modeling
- Data Interpretation
- Confidence Intervals and P-values
- Correlation and Causation Analysis
- Statistical Power Analysis
- Multiple Testing Corrections
- Non-parametric Statistics

You work specifically with the PROGNO Massager system to:
- Perform statistical analysis on sports data
- Test hypotheses about game outcomes
- Validate statistical models
- Interpret statistical results
- Design experiments
- Calculate confidence intervals
- Assess statistical significance

You help ensure PROGNO Massager predictions are statistically sound and reliable.`,
  learningTopics: [
    'Sports statistics analysis',
    'Hypothesis testing methods',
    'Bayesian inference',
    'Regression techniques',
    'Time series statistics',
    'Experimental design',
    'Statistical validation',
    'Multiple comparison corrections',
    'Non-parametric methods',
    'Statistical power analysis',
    'Effect size calculations',
    'Statistical reporting best practices',
  ],
  dailyTasks: [
    'Review statistical assumptions',
    'Analyze prediction distributions',
    'Test statistical hypotheses',
    'Validate model assumptions',
  ],
};

export class StatisticalAnalysisBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review statistical assumptions':
        return this.reviewAssumptions();
      case 'Analyze prediction distributions':
        return this.analyzeDistributions();
      case 'Test statistical hypotheses':
        return this.testHypotheses();
      case 'Validate model assumptions':
        return this.validateAssumptions();
      default:
        return this.ask(task);
    }
  }

  private async reviewAssumptions(): Promise<string> {
    return this.ask(`What statistical assumptions should be checked for PROGNO Massager models?
Include:
1. Normality assumptions
2. Independence assumptions
3. Homoscedasticity
4. Linearity assumptions
5. Sample size requirements
6. Assumption testing methods`);
  }

  private async analyzeDistributions(): Promise<string> {
    return this.ask(`How to analyze prediction distributions in PROGNO Massager?
Include:
1. Distribution shape analysis
2. Outlier detection
3. Skewness and kurtosis
4. Distribution fitting
5. Transformation techniques
6. Distribution comparison methods`);
  }

  private async testHypotheses(): Promise<string> {
    return this.ask(`What hypothesis tests are relevant for PROGNO Massager?
Include:
1. Tests for prediction accuracy
2. Tests for model improvement
3. Tests for feature significance
4. Tests for distribution differences
5. Non-parametric alternatives
6. Multiple testing corrections`);
  }

  private async validateAssumptions(): Promise<string> {
    return this.ask(`How to validate statistical assumptions in PROGNO Massager models?
Include:
1. Normality tests
2. Independence tests
3. Homoscedasticity tests
4. Residual analysis
5. Diagnostic plots
6. Remedial measures`);
  }

  /**
   * Perform statistical analysis
   */
  async performAnalysis(data: string, researchQuestion: string): Promise<string> {
    return this.ask(`Perform statistical analysis for PROGNO Massager:
Data: ${data}
Research Question: ${researchQuestion}

Include:
1. Descriptive statistics
2. Appropriate statistical tests
3. Test results and interpretation
4. Effect sizes
5. Confidence intervals
6. Statistical conclusions`);
  }

  /**
   * Test hypothesis
   */
  async testHypothesis(hypothesis: string, data: string, testType: string): Promise<string> {
    return this.ask(`Test this hypothesis for PROGNO Massager:
Hypothesis: ${hypothesis}
Data: ${data}
Test Type: ${testType}

Include:
1. Null and alternative hypotheses
2. Test statistic calculation
3. P-value and significance
4. Effect size
5. Confidence interval
6. Interpretation and conclusion`);
  }

  /**
   * Analyze correlation
   */
  async analyzeCorrelation(variables: string, data: string): Promise<string> {
    return this.ask(`Analyze correlations for PROGNO Massager:
Variables: ${variables}
Data: ${data}

Include:
1. Correlation coefficients
2. Significance testing
3. Correlation matrix
4. Partial correlations
5. Causation considerations
6. Interpretation`);
  }

  /**
   * Design experiment
   */
  async designExperiment(objective: string, constraints: string): Promise<string> {
    return this.ask(`Design a statistical experiment for PROGNO Massager:
Objective: ${objective}
Constraints: ${constraints}

Include:
1. Experimental design
2. Sample size calculation
3. Randomization strategy
4. Control variables
5. Statistical power analysis
6. Analysis plan`);
  }
}

