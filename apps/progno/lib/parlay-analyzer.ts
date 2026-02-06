export class ParlayAnalyzer {
  static async analyze(legs: any[], stake = 100) { return { legs, stake, probability: 0.25, ev: 0 }; }
  static async analyzeTeaser(legs: any[], points = 6, stake = 100) { return { legs, points, stake }; }
}
