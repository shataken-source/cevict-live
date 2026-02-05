/**
 * ButtonShowcase - Demonstrates all button variants and sizes
 */
import { useState } from 'react';
import { ComponentDemo } from './ComponentDemo';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ButtonShowcase() {
  const [variant, setVariant] = useState<any>('default');
  const [size, setSize] = useState<any>('default');

  const code = `import { Button } from '@/components/ui/button';

<Button variant="${variant}" size="${size}">
  Click Me
</Button>`;

  const controls = (
    <div className="space-y-4">
      <div>
        <Label>Variant</Label>
        <Select value={variant} onValueChange={setVariant}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="destructive">Destructive</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="ghost">Ghost</SelectItem>
            <SelectItem value="link">Link</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Size</Label>
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
            <SelectItem value="icon">Icon</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <ComponentDemo
      title="Button"
      description="Displays a button or a component that looks like a button"
      category="Form"
      code={code}
      controls={controls}
    >
      <div className="flex gap-4 flex-wrap">
        <Button variant={variant} size={size}>Click Me</Button>
      </div>
    </ComponentDemo>
  );
}
