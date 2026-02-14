/**
 * BadgeShowcase - Demonstrates badge variants and sizes
 */
import { useState } from 'react';
import { ComponentDemo } from './ComponentDemo';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function BadgeShowcase() {
  const [variant, setVariant] = useState<string>('default');
  const [size, setSize] = useState<string>('default');

  const code = `import { Badge } from '@/components/ui/badge';

<Badge variant="${variant}" size="${size}">Badge</Badge>`;

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
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="destructive">Destructive</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
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
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <ComponentDemo
      title="Badge"
      description="Status indicators and labels for counts or states"
      category="Feedback"
      code={code}
      controls={controls}
    >
      <div className="flex flex-wrap gap-3">
        <Badge variant={variant as any} size={size as any}>Badge</Badge>
        <Badge variant="default">Confirmed</Badge>
        <Badge variant="secondary">Pending</Badge>
        <Badge variant="destructive">Cancelled</Badge>
        <Badge variant="outline">Draft</Badge>
        <Badge variant="success">Active</Badge>
      </div>
    </ComponentDemo>
  );
}
