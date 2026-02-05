/**
 * Kaggle Integration Module for Progno
 * Handles dataset downloads, competition submissions, and model training
 */

export interface KaggleDataset {
  name: string;
  type: 'binary' | 'regression' | 'time-series' | 'classification';
  category: string;
  description: string;
  source: string;
  size: number;
  columns: string[];
  target_column: string;
}

export interface KaggleCompetition {
  name: string;
  slug: string;
  category: string;
  deadline: string;
  prize: string;
  metric: string;
  description: string;
}

export interface PredictionResult {
  id: string | number;
  prediction: number | string;
  confidence?: number;
}

/**
 * Load Kaggle dataset metadata
 */
export async function loadKaggleDataset(datasetName: string): Promise<KaggleDataset | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const metadataPath = path.join(
      process.cwd(),
      'apps',
      'progno',
      'data',
      'kaggle',
      datasetName,
      'metadata.json'
    );

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      return metadata as KaggleDataset;
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        console.warn(`Metadata not found for dataset: ${datasetName}`);
        return null;
      }
      throw fileError;
    }
  } catch (error) {
    console.error(`Error loading dataset ${datasetName}:`, error);
    return null;
  }
}

/**
 * Load training data from CSV
 */
export async function loadTrainingData(datasetName: string): Promise<any[]> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const dataPath = path.join(
      process.cwd(),
      'apps',
      'progno',
      'data',
      'kaggle',
      datasetName,
      'train_and_test2.csv'
    );

    try {
      // Simple CSV parser (for small files)
      const csvContent = await fs.readFile(dataPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        console.warn(`Data file is empty: ${dataPath}`);
        return [];
      }

      const headers = lines[0].split(',').map(h => h.trim());

      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        return row;
      });

      return data;
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        console.warn(`Data file not found: ${dataPath}`);
        return [];
      }
      throw fileError;
    }
  } catch (error) {
    console.error(`Error loading training data:`, error);
    return [];
  }
}

/**
 * Simple binary classifier for Titanic competition
 * Uses basic feature engineering and decision rules
 */
export class SimpleTitanicClassifier {
  private survivalRules: Map<string, number> = new Map();

  train(data: any[]): void {
    // Analyze survival patterns
    let femaleSurvival = 0;
    let femaleCount = 0;
    let maleSurvival = 0;
    let maleCount = 0;
    let class1Survival = 0;
    let class1Count = 0;
    let class2Survival = 0;
    let class2Count = 0;
    let class3Survival = 0;
    let class3Count = 0;
    let childSurvival = 0;
    let childCount = 0;

    data.forEach(row => {
      const survived = parseInt(row['2urvived'] || row['Survived'] || '0');
      // Handle both text and numeric sex encoding (0=male, 1=female)
      let sex = (row['Sex'] || '').toLowerCase();
      if (sex === '0' || sex === '') sex = 'male';
      if (sex === '1') sex = 'female';
      const pclass = parseInt(row['Pclass'] || '0');
      const age = parseFloat(row['Age'] || '0');

      if (sex === 'female') {
        femaleCount++;
        if (survived === 1) femaleSurvival++;
      } else if (sex === 'male') {
        maleCount++;
        if (survived === 1) maleSurvival++;
      }

      if (pclass === 1) {
        class1Count++;
        if (survived === 1) class1Survival++;
      } else if (pclass === 2) {
        class2Count++;
        if (survived === 1) class2Survival++;
      } else if (pclass === 3) {
        class3Count++;
        if (survived === 1) class3Survival++;
      }

      if (age < 18) {
        childCount++;
        if (survived === 1) childSurvival++;
      }
    });

    // Store survival rates
    this.survivalRules.set('female_rate', femaleCount > 0 ? femaleSurvival / femaleCount : 0);
    this.survivalRules.set('male_rate', maleCount > 0 ? maleSurvival / maleCount : 0);
    this.survivalRules.set('class1_rate', class1Count > 0 ? class1Survival / class1Count : 0);
    this.survivalRules.set('class2_rate', class2Count > 0 ? class2Survival / class2Count : 0);
    this.survivalRules.set('class3_rate', class3Count > 0 ? class3Survival / class3Count : 0);
    this.survivalRules.set('child_rate', childCount > 0 ? childSurvival / childCount : 0);

    console.log('Training complete. Survival rates:', {
      female: this.survivalRules.get('female_rate'),
      male: this.survivalRules.get('male_rate'),
      class1: this.survivalRules.get('class1_rate'),
      class2: this.survivalRules.get('class2_rate'),
      class3: this.survivalRules.get('class3_rate'),
      child: this.survivalRules.get('child_rate'),
    });
  }

  predict(row: any): { prediction: number; confidence: number } {
    // Handle both text and numeric sex encoding
    let sex = (row['Sex'] || '').toLowerCase();
    if (sex === '0' || sex === '') sex = 'male';
    if (sex === '1') sex = 'female';
    const pclass = parseInt(row['Pclass'] || '0');
    const age = parseFloat(row['Age'] || '30');
    const fare = parseFloat(row['Fare'] || '0');

    let survivalScore = 0.5; // Base probability
    let confidence = 0.5;

    // Gender factor (strongest predictor)
    if (sex === 'female') {
      survivalScore = this.survivalRules.get('female_rate') || 0.74;
      confidence = 0.8;
    } else if (sex === 'male') {
      survivalScore = this.survivalRules.get('male_rate') || 0.19;
      confidence = 0.8;
    }

    // Class factor
    if (pclass === 1) {
      survivalScore = (survivalScore + (this.survivalRules.get('class1_rate') || 0.63)) / 2;
      confidence += 0.1;
    } else if (pclass === 2) {
      survivalScore = (survivalScore + (this.survivalRules.get('class2_rate') || 0.47)) / 2;
    } else if (pclass === 3) {
      survivalScore = (survivalScore + (this.survivalRules.get('class3_rate') || 0.24)) / 2;
      confidence -= 0.1;
    }

    // Age factor (children had higher survival)
    if (age < 18) {
      survivalScore = (survivalScore + (this.survivalRules.get('child_rate') || 0.5)) / 2;
      confidence += 0.05;
    }

    // Fare factor (higher fare = better class = better survival)
    if (fare > 50) {
      survivalScore += 0.1;
    } else if (fare < 10) {
      survivalScore -= 0.1;
    }

    // Normalize
    survivalScore = Math.max(0, Math.min(1, survivalScore));
    confidence = Math.max(0.3, Math.min(0.95, confidence));

    const prediction = survivalScore > 0.5 ? 1 : 0;

    return { prediction, confidence };
  }
}

/**
 * Generate competition submission file
 */
export async function generateSubmission(
  predictions: PredictionResult[],
  outputPath: string
): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const fullPath = path.join(process.cwd(), 'apps', 'progno', 'data', 'kaggle', outputPath);

    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (mkdirError: any) {
      // Directory might already exist, that's okay
      if (mkdirError.code !== 'EEXIST') {
        throw mkdirError;
      }
    }

    // Generate CSV submission
    let csv = 'PassengerId,Survived\n';
    predictions.forEach(pred => {
      csv += `${pred.id},${pred.prediction}\n`;
    });

    await fs.writeFile(fullPath, csv, 'utf-8');
    console.log(`Submission file created: ${fullPath}`);
  } catch (error) {
    console.error('Error generating submission:', error);
    throw error;
  }
}

/**
 * List available Kaggle competitions
 */
export const AVAILABLE_COMPETITIONS: KaggleCompetition[] = [
  {
    name: 'Titanic - Machine Learning from Disaster',
    slug: 'titanic',
    category: 'Getting Started',
    deadline: 'Ongoing',
    prize: 'Knowledge',
    metric: 'Accuracy',
    description: 'Predict survival on the Titanic - perfect for learning binary classification'
  },
  {
    name: 'House Prices - Advanced Regression Techniques',
    slug: 'house-prices-advanced-regression-techniques',
    category: 'Getting Started',
    deadline: 'Ongoing',
    prize: 'Knowledge',
    metric: 'RMSE',
    description: 'Predict house prices using regression techniques'
  },
  {
    name: 'Store Item Demand Forecasting',
    slug: 'demand-forecasting-kernels-only',
    category: 'Time Series',
    deadline: 'Ongoing',
    prize: 'Knowledge',
    metric: 'SMAPE',
    description: 'Forecast future demand for store items'
  }
];

