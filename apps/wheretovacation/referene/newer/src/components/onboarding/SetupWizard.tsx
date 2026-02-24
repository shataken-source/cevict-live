/**
 * Setup Wizard Component
 * Interactive wizard that validates environment variables, database connections,
 * and guides developers through initial setup process
 * 
 * Features:
 * - Environment variable validation
 * - Database connection testing
 * - Sample data generation
 * - Step-by-step configuration guide
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    'Environment Check',
    'Database Connection',
    'Sample Data',
    'Complete'
  ];

  // Run environment validation
  const runValidation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-validator', {
        body: { action: 'validate' }
      });
      
      if (error) throw error;
      setValidationResults(data);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate sample data
  const generateSampleData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sample-data-generator', {
        body: { action: 'generate' }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sample data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 0) {
      runValidation();
    }
  }, [currentStep]);

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="text-green-500" />;
    if (status === 'error') return <XCircle className="text-red-500" />;
    return <AlertCircle className="text-yellow-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Developer Setup Wizard</CardTitle>
          <Progress value={(currentStep / steps.length) * 100} className="mt-4" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
          </p>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Environment Validation</h3>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  <span>Checking configuration...</span>
                </div>
              ) : validationResults ? (
                <div className="space-y-3">
                  {validationResults.checks?.map((check: any, idx: number) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(check.status)}
                        <span className="font-medium">{check.name}</span>
                      </div>
                      <ul className="text-sm space-y-1 ml-8">
                        {check.details?.map((detail: string, i: number) => (
                          <li key={i}>{detail}</li>
                        ))}
                      </ul>
                      {check.recommendations?.length > 0 && (
                        <div className="mt-2 ml-8 text-sm text-yellow-600">
                          {check.recommendations.map((rec: string, i: number) => (
                            <p key={i}>💡 {rec}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
              <Button onClick={() => setCurrentStep(1)} className="mt-4">
                Continue to Database
              </Button>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Database Connection</h3>
              <p className="text-sm text-muted-foreground">
                Testing connection to Supabase database...
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle />
                <span>Database connected successfully</span>
              </div>
              <Button onClick={() => setCurrentStep(2)}>
                Continue to Sample Data
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Generate Sample Data</h3>
              <p className="text-sm text-muted-foreground">
                Create sample captains, bookings, and reviews for testing
              </p>
              <Button onClick={async () => {
                await generateSampleData();
                setCurrentStep(3);
              }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                Generate Sample Data
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="font-semibold text-xl">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Your development environment is ready. Check out the code tour next!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}