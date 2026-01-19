/**
 * Code Tour Component
 * Interactive guided tour of the codebase with tooltips and explanations
 * Helps new developers understand project structure and key files
 * 
 * Features:
 * - Step-by-step walkthrough
 * - Interactive tooltips
 * - Code examples
 * - Architecture explanations
 * 
 * @component
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, Code, Database, Zap, Layout } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  file: string;
  icon: any;
  codeExample?: string;
}

export default function CodeTour() {
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps: TourStep[] = [
    {
      title: 'Project Structure',
      description: 'Gulf Coast Charters is built with React + TypeScript + Vite. The src/ folder contains all application code organized by components, pages, hooks, and utilities.',
      file: 'src/',
      icon: Layout,
      codeExample: `src/
├── components/     # Reusable UI components
├── pages/         # Route pages
├── hooks/         # Custom React hooks
├── lib/           # Core utilities
├── contexts/      # React contexts
└── stores/        # State management`
    },
    {
      title: 'Component Architecture',
      description: 'Components are organized by feature. Main layout is in AppLayout.tsx, which is rendered by Index.tsx. Never modify App.tsx directly.',
      file: 'src/components/AppLayout.tsx',
      icon: Code,
      codeExample: `// AppLayout.tsx is your main content area
export default function AppLayout() {
  return (
    <div>
      <Navigation />
      <main>{/* Your content */}</main>
      <Footer />
    </div>
  );
}`
    },
    {
      title: 'Supabase Integration',
      description: 'Database and authentication via Supabase. The client is configured in lib/supabase.ts. Always import from this file, never use environment variables directly.',
      file: 'src/lib/supabase.ts',
      icon: Database,
      codeExample: `import { supabase } from '@/lib/supabase';

// Query data
const { data } = await supabase
  .from('captains')
  .select('*');

// Call edge function
const { data } = await supabase.functions
  .invoke('function-name', { body: {} });`
    },
    {
      title: 'Edge Functions',
      description: 'Serverless functions handle backend logic, API calls, and sensitive operations. Located in Supabase dashboard, not in this repo.',
      file: 'supabase/functions/',
      icon: Zap,
      codeExample: `// Edge function structure
Deno.serve(async (req) => {
  const { data } = await req.json();
  // Process request
  return new Response(
    JSON.stringify({ result }),
    { headers: corsHeaders }
  );
});`
    }
  ];

  const currentTourStep = tourSteps[currentStep];
  const Icon = currentTourStep.icon;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icon className="w-6 h-6" />
              {currentTourStep.title}
            </CardTitle>
            <Badge variant="outline">
              {currentStep + 1} / {tourSteps.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{currentTourStep.description}</p>
          
          <div className="bg-muted p-3 rounded">
            <p className="text-sm font-mono">{currentTourStep.file}</p>
          </div>

          {currentTourStep.codeExample && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{currentTourStep.codeExample}</code>
              </pre>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.min(tourSteps.length - 1, currentStep + 1))}
              disabled={currentStep === tourSteps.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}