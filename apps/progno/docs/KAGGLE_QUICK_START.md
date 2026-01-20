# Kaggle Quick Start Guide for Progno

## Top 10 Kaggle Datasets for "Predict Anything" Feature

### 1. **Titanic - Machine Learning from Disaster**
- **Dataset**: `titanic`
- **Type**: Binary Classification
- **Use**: Train yes/no outcome predictions
- **Download**: `kaggle competitions download -c titanic`
- **Perfect for**: "Will X happen?" questions

### 2. **House Prices - Advanced Regression Techniques**
- **Dataset**: `house-prices-advanced-regression-techniques`
- **Type**: Regression (continuous values)
- **Use**: Train numerical value predictions
- **Download**: `kaggle competitions download -c house-prices-advanced-regression-techniques`
- **Perfect for**: "What will be the value/price of X?" questions

### 3. **Store Item Demand Forecasting Challenge**
- **Dataset**: `demand-forecasting-kernels-only`
- **Type**: Time Series Forecasting
- **Use**: Train time-based predictions
- **Download**: `kaggle competitions download -c demand-forecasting-kernels-only`
- **Perfect for**: "What will happen in X months?" questions

### 4. **NFL Big Data Bowl**
- **Dataset**: `nfl-big-data-bowl-2024`
- **Type**: Sports Analytics
- **Use**: Improve sports predictions
- **Download**: `kaggle competitions download -c nfl-big-data-bowl-2024`
- **Perfect for**: Sports-related questions

### 5. **Google Analytics Customer Revenue Prediction**
- **Dataset**: `ga-customer-revenue-prediction`
- **Type**: Revenue Forecasting
- **Use**: Train on business outcome predictions
- **Download**: `kaggle competitions download -c ga-customer-revenue-prediction`
- **Perfect for**: Business/financial outcome questions

### 6. **New York City Taxi Trip Duration**
- **Dataset**: `nyc-taxi-trip-duration`
- **Type**: Time Prediction
- **Use**: Train on duration/time predictions
- **Download**: `kaggle competitions download -c nyc-taxi-trip-duration`
- **Perfect for**: "How long will X take?" questions

### 7. **Santander Customer Transaction Prediction**
- **Dataset**: `santander-customer-transaction-prediction`
- **Type**: Binary Classification
- **Use**: Train on transaction/action predictions
- **Download**: `kaggle competitions download -c santander-customer-transaction-prediction`
- **Perfect for**: "Will user do X?" questions

### 8. **Weather Dataset**
- **Dataset**: Search "weather" on Kaggle
- **Type**: Time Series
- **Use**: Improve weather predictions
- **Perfect for**: Weather-related questions

### 9. **Stock Market Data**
- **Dataset**: Search "stock market" or "S&P 500" on Kaggle
- **Type**: Time Series Financial
- **Use**: Train on market movement predictions
- **Perfect for**: Financial/market questions

### 10. **Customer Churn Prediction**
- **Dataset**: Search "customer churn" on Kaggle
- **Type**: Binary Classification
- **Use**: Train on retention/outcome predictions
- **Perfect for**: "Will customer do X?" questions

## Quick Setup Commands

### 1. Install Kaggle CLI
```bash
pip install kaggle
```

### 2. Setup Authentication
1. Go to https://www.kaggle.com/settings
2. Click "Create New Token"
3. Download `kaggle.json`
4. Place in:
   - **Windows**: `C:\Users\<username>\.kaggle\kaggle.json`
   - **Mac/Linux**: `~/.kaggle/kaggle.json`
5. Set permissions: `chmod 600 ~/.kaggle/kaggle.json` (Linux/Mac)

### 3. Download a Dataset
```bash
# Competition dataset
kaggle competitions download -c titanic

# Regular dataset (format: username/dataset-name)
kaggle datasets download -d username/dataset-name

# Unzip automatically
kaggle datasets download -d username/dataset-name --unzip
```

## Integration Example (TypeScript/Node.js)

Since Progno is a Next.js app, you'll need to use Python for Kaggle API, then process data in TypeScript:

### Option 1: Python Script + TypeScript
```python
# scripts/download_kaggle_data.py
from kaggle.api.kaggle_api_extended import KaggleApi
import json
import pandas as pd

api = KaggleApi()
api.authenticate()

# Download dataset
api.dataset_download_files('username/dataset-name', path='./data/kaggle', unzip=True)

# Process and convert to JSON
df = pd.read_csv('./data/kaggle/train.csv')
df.to_json('./data/kaggle/processed.json', orient='records')
```

### Option 2: Kaggle API via HTTP (Limited)
Kaggle doesn't have a public REST API, so you need the Python CLI or use their web interface.

### Option 3: Pre-downloaded Data
1. Download datasets manually or via script
2. Store in `apps/progno/data/kaggle/`
3. Load in TypeScript using `fs` or fetch

## TypeScript Integration Example

```typescript
// apps/progno/app/kaggle-loader.ts
import fs from 'fs';
import path from 'path';

export interface TrainingExample {
  features: Record<string, any>;
  outcome: string | number;
  questionType: string;
}

export async function loadKaggleTrainingData(
  datasetName: string
): Promise<TrainingExample[]> {
  const dataPath = path.join(
    process.cwd(),
    'data',
    'kaggle',
    datasetName,
    'processed.json'
  );

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);

  // Transform to training format
  return data.map((item: any) => ({
    features: extractFeatures(item),
    outcome: item.target || item.outcome,
    questionType: categorizeQuestion(item)
  }));
}

function extractFeatures(item: any): Record<string, any> {
  // Extract relevant features for prediction
  return {
    // Map dataset columns to features
  };
}

function categorizeQuestion(item: any): string {
  // Categorize based on dataset type
  return 'general';
}
```

## Next Steps

1. **Choose 3-5 datasets** from the list above
2. **Download them** using Kaggle CLI
3. **Process and store** in `apps/progno/data/kaggle/`
4. **Create training pipeline** to extract features
5. **Train simple models** (start with scikit-learn)
6. **Integrate into** `anything-predictor.ts`

## Tips

- Start with **Titanic** (easiest, well-documented)
- Use **pandas** for data processing
- Convert to JSON for TypeScript consumption
- Focus on **feature extraction** from user questions
- Track **model accuracy** over time
- Use **ensemble methods** (combine multiple models)

