/**
 * AlertShowcase - Demonstrates alert component variations
 */
import { ComponentDemo } from './ComponentDemo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function AlertShowcase() {
  const code = `import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>`;

  return (
    <ComponentDemo
      title="Alert"
      description="Displays a callout for user attention"
      category="Feedback"
      code={code}
    >
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>This is an informational alert message.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>This is an error alert message.</AlertDescription>
        </Alert>
        <Alert className="border-green-500 text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>This is a success alert message.</AlertDescription>
        </Alert>
        <Alert className="border-yellow-500 text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>This is a warning alert message.</AlertDescription>
        </Alert>
      </div>
    </ComponentDemo>
  );
}
