"use client";

// Using simple emoji/icons instead of lucide-react to avoid dependency
const BarChart3Icon = () => <span style={{ fontSize: '1.5rem' }}>📊</span>;
const DownloadIcon = () => <span style={{ fontSize: '1.5rem' }}>⬇️</span>;
const PlayIcon = () => <span style={{ fontSize: '1.5rem' }}>▶️</span>;
const TargetIcon = () => <span style={{ fontSize: '1.5rem' }}>🎯</span>;
const TrophyIcon = () => <span style={{ fontSize: '1.5rem' }}>🏆</span>;
import { useState } from 'react';

interface Competition {
  name: string;
  slug: string;
  category: string;
  deadline: string;
  prize: string;
  metric: string;
  description: string;
}

interface PredictionResult {
  success: boolean;
  dataset?: any;
  training?: any;
  predictions?: any;
  submission?: any;
  error?: string;
}

export default function KaggleCompetitionPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('titanic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string>('');

  const competitions: Competition[] = [
    {
      name: 'Titanic - Machine Learning from Disaster',
      slug: 'titanic',
      category: 'Getting Started',
      deadline: 'Ongoing',
      prize: 'Knowledge & Experience',
      metric: 'Accuracy',
      description: 'Predict survival on the Titanic - perfect for learning binary classification. This is the classic "Hello World" of machine learning competitions.'
    },
    {
      name: 'House Prices - Advanced Regression',
      slug: 'house-prices',
      category: 'Getting Started',
      deadline: 'Ongoing',
      prize: 'Knowledge & Experience',
      metric: 'RMSE',
      description: 'Predict house prices using regression techniques. Great for learning feature engineering and regression models.'
    },
    {
      name: 'Store Item Demand Forecasting',
      slug: 'demand-forecasting',
      category: 'Time Series',
      deadline: 'Ongoing',
      prize: 'Knowledge & Experience',
      metric: 'SMAPE',
      description: 'Forecast future demand for store items. Perfect for learning time series forecasting.'
    }
  ];

  const handleRunCompetition = async () => {
    setLoading(true);
    setResult(null);
    setTrainingStatus('Loading dataset...');

    try {
      const response = await fetch(`/api/kaggle/${selectedCompetition}`);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response. Status: ${response.status}. Response: ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setTrainingStatus('✅ Model trained and predictions generated!');
      } else {
        setResult({ success: false, error: data.error || 'Unknown error' });
        setTrainingStatus('❌ Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect to server';
      setResult({ success: false, error: errorMessage });
      setTrainingStatus('❌ Error: ' + errorMessage);
      console.error('Competition error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSubmission = () => {
    if (result?.submission?.path) {
      // In a real app, this would download the file
      alert(`Submission file ready: ${result.submission.path}\n\nDownload from: apps/progno/data/kaggle/${result.submission.path}`);
    }
  };

  const currentCompetition = competitions.find(c => c.slug === selectedCompetition);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', color: 'white' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Kaggle Competitions
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Train models, generate predictions, and compete on Kaggle!
          </p>
        </div>

        {/* Competition Selector */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
            Select Competition
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {competitions.map((comp) => (
              <div
                key={comp.slug}
                onClick={() => setSelectedCompetition(comp.slug)}
                style={{
                  padding: '1.5rem',
                  border: selectedCompetition === comp.slug ? '3px solid #667eea' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: selectedCompetition === comp.slug ? '#f0f4ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <TrophyIcon />
                  <h3 style={{ fontWeight: 'bold', color: '#1f2937' }}>{comp.name}</h3>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  {comp.description}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                  <span>📊 {comp.metric}</span>
                  <span>🏅 {comp.prize}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Competition Info */}
        {currentCompetition && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <TargetIcon />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                {currentCompetition.name}
              </h2>
            </div>
            <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
              {currentCompetition.description}
            </p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: '#6b7280' }}>Category:</strong>{' '}
                <span style={{ color: '#1f2937' }}>{currentCompetition.category}</span>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Metric:</strong>{' '}
                <span style={{ color: '#1f2937' }}>{currentCompetition.metric}</span>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Status:</strong>{' '}
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{currentCompetition.deadline}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <button
            onClick={handleRunCompetition}
            disabled={loading}
            style={{
              padding: '1rem 3rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {loading ? (
              <>
                <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Training Model...
              </>
            ) : (
              <>
                <PlayIcon />
                Train Model & Generate Predictions
              </>
            )}
          </button>
          {trainingStatus && (
            <p style={{ marginTop: '1rem', color: trainingStatus.includes('✅') ? '#10b981' : '#ef4444', fontWeight: '600' }}>
              {trainingStatus}
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3Icon />
              Results
            </h2>

            {result.success ? (
              <>
                {result.dataset && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f4ff', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Dataset Info</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <strong>Type:</strong> {result.dataset.type}
                      </div>
                      <div>
                        <strong>Size:</strong> {result.dataset.size} samples
                      </div>
                      <div>
                        <strong>Features:</strong> {result.dataset.columns} columns
                      </div>
                    </div>
                  </div>
                )}

                {result.training && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Training Stats</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <strong>Training Samples:</strong> {result.training.samples}
                      </div>
                      <div>
                        <strong>Test Samples:</strong> {result.training.testSamples}
                      </div>
                    </div>
                  </div>
                )}

                {result.predictions && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Predictions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <strong>Count:</strong> {result.predictions.count}
                      </div>
                      <div>
                        <strong>Avg Confidence:</strong> {(result.predictions.averageConfidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}

                {result.submission && (
                  <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '8px', marginBottom: '1rem' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Submission File</h3>
                    <p style={{ marginBottom: '1rem' }}>{result.submission.message}</p>
                    <button
                      onClick={handleDownloadSubmission}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: '600'
                      }}
                    >
                      <DownloadIcon />
                      View Submission Path
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0f4ff', borderRadius: '12px', border: '2px solid #667eea' }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#667eea' }}>Next Steps</h3>
                  <ol style={{ paddingLeft: '1.5rem', lineHeight: '2' }}>
                    <li>Download the submission file from the path shown above</li>
                    <li>Go to <a href="https://www.kaggle.com/c/titanic/submit" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'underline' }}>Kaggle Titanic Competition</a></li>
                    <li>Upload your submission CSV file</li>
                    <li>Check your score on the leaderboard!</li>
                  </ol>
                </div>
              </>
            ) : (
              <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '8px', color: '#dc2626' }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '2rem',
          marginTop: '2rem',
          color: 'white'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            🎯 How It Works
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>1️⃣</div>
              <strong>Select Competition</strong>
              <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem' }}>
                Choose from available Kaggle competitions
              </p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>2️⃣</div>
              <strong>Train Model</strong>
              <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem' }}>
                Our model learns patterns from training data
              </p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>3️⃣</div>
              <strong>Generate Predictions</strong>
              <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem' }}>
                Model makes predictions on test data
              </p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>4️⃣</div>
              <strong>Submit to Kaggle</strong>
              <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem' }}>
                Download submission file and compete!
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

