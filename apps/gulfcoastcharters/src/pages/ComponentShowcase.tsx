/**
 * ComponentShowcase - Interactive component library showcase
 * Displays all UI components with live examples, code snippets, and controls
 * URL: /components-showcase
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { ButtonShowcase } from '@/components/showcase/ButtonShowcase';
import { CardShowcase } from '@/components/showcase/CardShowcase';
import { InputShowcase } from '@/components/showcase/InputShowcase';
import { SelectShowcase } from '@/components/showcase/SelectShowcase';
import { TabsShowcase } from '@/components/showcase/TabsShowcase';
import { BadgeShowcase } from '@/components/showcase/BadgeShowcase';
import { AlertShowcase } from '@/components/showcase/AlertShowcase';

export default function ComponentShowcase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  const components = [
    { id: 'button', component: <ButtonShowcase />, category: 'Form', name: 'Button' },
    { id: 'input', component: <InputShowcase />, category: 'Form', name: 'Input' },
    { id: 'select', component: <SelectShowcase />, category: 'Form', name: 'Select' },
    { id: 'card', component: <CardShowcase />, category: 'Layout', name: 'Card' },
    { id: 'tabs', component: <TabsShowcase />, category: 'Layout', name: 'Tabs' },
    { id: 'badge', component: <BadgeShowcase />, category: 'Feedback', name: 'Badge' },
    { id: 'alert', component: <AlertShowcase />, category: 'Feedback', name: 'Alert' },
  ];


  const filteredComponents = components.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || comp.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Component Showcase</h1>
          <p className="text-gray-600">Interactive examples of all UI components with live code</p>
        </div>

        <div className="mb-8 flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Form">Form</SelectItem>
              <SelectItem value="Layout">Layout</SelectItem>
              <SelectItem value="Feedback">Feedback</SelectItem>
              <SelectItem value="Navigation">Navigation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">
          {filteredComponents.length > 0 ? (
            filteredComponents.map(comp => (
              <div key={comp.id}>{comp.component}</div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No components found matching your search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
