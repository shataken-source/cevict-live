/**
 * SelectShowcase - Demonstrates dropdown select component
 */
import { ComponentDemo } from './ComponentDemo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function SelectShowcase() {
  const code = `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Choose one" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>`;

  return (
    <ComponentDemo
      title="Select"
      description="Dropdown selection component for choosing from a list of options"
      category="Form"
      code={code}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boats">Boats</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="fishing_gear">Fishing Gear</SelectItem>
              <SelectItem value="safety">Safety Equipment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ComponentDemo>
  );
}
