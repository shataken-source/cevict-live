# Component Showcase Guide

## Overview
The Component Showcase is an interactive documentation system that displays all UI components with live examples, code snippets, and interactive controls. It's similar to Storybook but built directly into the application.

## Access
Navigate to: **http://localhost:5173/components-showcase**

## Features

### 1. **Live Component Previews**
- See components rendered in real-time
- Interactive examples you can click and interact with
- Visual representation of all component states

### 2. **Code Snippets**
- Copy-paste ready code examples
- Syntax-highlighted code display
- One-click copy to clipboard functionality

### 3. **Interactive Controls**
- Modify component props in real-time
- See changes reflected immediately
- Test different variants and sizes

### 4. **Search & Filter**
- Search components by name
- Filter by category (Form, Layout, Feedback, Navigation)
- Quick access to specific components

## Component Categories

### Form Components
- **Button**: Various variants (default, destructive, outline, secondary, ghost, link) and sizes
- **Input**: Text inputs with different states (normal, disabled, error)
- **Select**: Dropdown selection components
- **Checkbox**: Toggle checkboxes
- **Radio**: Radio button groups
- **Switch**: Toggle switches
- **Textarea**: Multi-line text inputs

### Layout Components
- **Card**: Container with header, content, and footer
- **Tabs**: Tabbed content sections
- **Accordion**: Collapsible content panels
- **Separator**: Visual dividers
- **Sheet**: Side panels and drawers

### Feedback Components
- **Alert**: Informational messages (info, success, warning, error)
- **Toast**: Temporary notification messages
- **Progress**: Progress bars and indicators
- **Skeleton**: Loading placeholders
- **Badge**: Status indicators and labels

### Navigation Components
- **Navigation Menu**: Main navigation bars
- **Breadcrumb**: Hierarchical navigation
- **Pagination**: Page navigation controls
- **Dropdown Menu**: Contextual menus

## Adding New Components

To add a new component to the showcase:

### 1. Create Component Showcase File
```tsx
// src/components/showcase/YourComponentShowcase.tsx
import { ComponentDemo } from './ComponentDemo';
import { YourComponent } from '@/components/ui/your-component';

export function YourComponentShowcase() {
  const code = `import { YourComponent } from '@/components/ui/your-component';

<YourComponent>Example</YourComponent>`;

  return (
    <ComponentDemo
      title="Your Component"
      description="Description of what this component does"
      category="Form" // or Layout, Feedback, Navigation
      code={code}
    >
      <YourComponent>Live Example</YourComponent>
    </ComponentDemo>
  );
}
```

### 2. Add to ComponentShowcase Page
```tsx
// src/pages/ComponentShowcase.tsx
import { YourComponentShowcase } from '@/components/showcase/YourComponentShowcase';

const components = [
  // ... existing components
  { 
    id: 'your-component', 
    component: <YourComponentShowcase />, 
    category: 'Form', 
    name: 'Your Component' 
  },
];
```

### 3. Add Interactive Controls (Optional)
```tsx
const [variant, setVariant] = useState('default');

const controls = (
  <div className="space-y-4">
    <Label>Variant</Label>
    <Select value={variant} onValueChange={setVariant}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default</SelectItem>
        <SelectItem value="secondary">Secondary</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

// Pass controls prop to ComponentDemo
<ComponentDemo controls={controls}>
```

## Usage Examples

### Viewing Components
1. Navigate to `/components-showcase`
2. Browse all available components
3. Click between Preview, Code, and Controls tabs

### Searching
1. Use the search bar to find specific components
2. Type component name (e.g., "button", "card")
3. Results update in real-time

### Filtering by Category
1. Click the category dropdown
2. Select a category (Form, Layout, Feedback, Navigation)
3. Only components in that category will display

### Copying Code
1. Click the "Code" tab on any component
2. Click the copy icon in the top-right
3. Paste the code into your project

### Testing Variants
1. Click the "Controls" tab (if available)
2. Change dropdown values or toggle switches
3. See the component update in the Preview tab

## Technical Details

### ComponentDemo Wrapper
The `ComponentDemo` component provides:
- Tabbed interface (Preview, Code, Controls)
- Code syntax highlighting
- Copy-to-clipboard functionality
- Category badges
- Consistent styling

### File Structure
```
src/
├── components/
│   └── showcase/
│       ├── ComponentDemo.tsx       # Wrapper component
│       ├── ButtonShowcase.tsx      # Button examples
│       ├── CardShowcase.tsx        # Card examples
│       ├── InputShowcase.tsx       # Input examples
│       ├── AlertShowcase.tsx       # Alert examples
│       └── ...                     # More component showcases
└── pages/
    └── ComponentShowcase.tsx       # Main showcase page
```

## Best Practices

### 1. **Keep Examples Simple**
- Show the most common use case first
- Add complexity gradually
- Focus on one feature per example

### 2. **Provide Clear Code**
- Include all necessary imports
- Use realistic prop values
- Add comments for complex patterns

### 3. **Document Props**
- Show all available variants
- Demonstrate different sizes
- Include disabled/error states

### 4. **Interactive Controls**
- Add controls for frequently changed props
- Use appropriate input types (select, checkbox, etc.)
- Update code snippet based on control values

## Related Resources

- **shadcn/ui Documentation**: https://ui.shadcn.com/
- **Radix UI Primitives**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Lucide Icons**: https://lucide.dev/

## Troubleshooting

### Component Not Showing
- Check that the showcase file is created
- Verify import in ComponentShowcase.tsx
- Ensure component is added to the components array

### Code Snippet Not Updating
- Make sure code variable reflects current state
- Use template literals to include dynamic values
- Check that controls update the code string

### Styling Issues
- Verify Tailwind classes are correct
- Check that component has proper spacing
- Ensure preview container has appropriate background

## Future Enhancements

Potential additions to the component showcase:
- [ ] Props table with types and descriptions
- [ ] Accessibility information for each component
- [ ] Dark mode preview toggle
- [ ] Responsive preview at different breakpoints
- [ ] Export component configurations
- [ ] Share component examples via URL
- [ ] Component usage analytics
- [ ] Version history for components

## Support

For questions or issues with the component showcase:
1. Check this guide for common solutions
2. Review the component's source code
3. Consult shadcn/ui documentation
4. Ask in the development team chat
