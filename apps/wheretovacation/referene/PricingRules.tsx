import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PricingRule } from '@/types/host';
import { Trash2 } from 'lucide-react';

interface PricingRulesProps {
  propertyId: string;
  rules: PricingRule[];
  onAddRule: (rule: Omit<PricingRule, 'id' | 'created_at'>) => void;
  onDeleteRule: (ruleId: string) => void;
}

export function PricingRules({ propertyId, rules, onAddRule, onDeleteRule }: PricingRulesProps) {
  const [ruleType, setRuleType] = useState<string>('seasonal');
  const [modifier, setModifier] = useState('');

  const handleAddRule = () => {
    if (modifier) {
      onAddRule({
        property_id: propertyId,
        rule_type: ruleType as any,
        price_modifier: parseFloat(modifier),
      });
      setModifier('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Rule Type</Label>
          <Select value={ruleType} onValueChange={setRuleType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="weekend">Weekend</SelectItem>
              <SelectItem value="special_event">Special Event</SelectItem>
              <SelectItem value="last_minute">Last Minute</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Price Modifier (%)</Label>
          <Input 
            type="number" 
            placeholder="e.g., 20 for 20% increase"
            value={modifier}
            onChange={(e) => setModifier(e.target.value)}
          />
        </div>
        
        <Button onClick={handleAddRule}>Add Rule</Button>
        
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Active Rules</h4>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="text-sm font-medium capitalize">{rule.rule_type.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.price_modifier > 0 ? '+' : ''}{rule.price_modifier}%
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onDeleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
