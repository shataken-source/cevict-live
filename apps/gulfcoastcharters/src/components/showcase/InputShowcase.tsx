/**
 * InputShowcase - Demonstrates input component with different states
 */
import { ComponentDemo } from './ComponentDemo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InputShowcase() {
  const code = `import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter your email" />
</div>`;

  return (
    <ComponentDemo
      title="Input"
      description="Displays a text input field"
      category="Form"
      code={code}
    >
      <div className="space-y-4 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter your email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="Enter your password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="disabled">Disabled</Label>
          <Input id="disabled" disabled placeholder="Disabled input" />
        </div>
      </div>
    </ComponentDemo>
  );
}
