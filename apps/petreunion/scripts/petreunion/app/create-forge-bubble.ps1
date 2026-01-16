# Create PetReunion Redesign Bubble in Forge

# FIXED PORT: PetReunion Forge API runs on port 3001
$FORGE_PORT = 3001
$baseUrl = "http://localhost:$FORGE_PORT/api/bubble"

Write-Host "Connecting to PetReunion Forge API on port $FORGE_PORT..." -ForegroundColor Yellow

# Consistent bubble name - must match trigger script
$bubbleName = "PetReunion Complete Website Redesign"
$description = @"
Create a COMPLETE, production-ready redesign package for the PetReunion website. This is a FREE lost pet recovery service that needs a professional, compassionate, and accessible design.

## Your Team Roles

You are acting as a COMPLETE MULTI-DISCIPLINARY DESIGN TEAM:

1. **ARCHITECT** - Overall project structure and coordination
2. **ENGINEER** - Implementation-ready code and technical specs
3. **VALIDATOR** - Quality assurance and completeness checks
4. **UI/UX Designer** - User interfaces, layouts, user flows, component designs
5. **Graphic Designer** - Logo design, illustrations, iconography, photography direction
6. **Design System Architect** - Comprehensive design tokens, guidelines, component library
7. **Legal Consultant** - Privacy Policy, Terms of Service, Disclaimers, Cookie Policy
8. **Technical Writer** - Implementation documentation, usage guides, code examples
9. **Accessibility Specialist** - WCAG 2.1 AA compliance, accessibility features

## Current State

- **Tech Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Current Design:** Basic, functional but ugly - needs complete overhaul
- **Pages:** Home, Search, Report Lost Pet, My Pets, Admin Dashboard
- **Functionality:** Works but looks unprofessional

## Complete Deliverables Required (100% - NOT 10%)

### 1. COMPLETE VISUAL DESIGN (UI/UX Designer + Design System Architect)

**Design System:**
- Complete color palette with hex codes and usage guidelines
- Typography system (fonts, sizes, weights, line heights)
- Spacing system (scale from 4px to 128px)
- Shadow system (small, medium, large, XL)
- Border radius system
- Animation/transition guidelines
- Design tokens in Tailwind CSS format

**Component Specifications:**
- Button variants (primary, secondary, outline, ghost) with states (hover, active, disabled)
- Form components (inputs, selects, textareas, checkboxes, radios)
- Card components (default, elevated, outlined)
- Navigation components (header, footer, breadcrumbs)
- Modal/dialog components
- Loading states (skeletons, spinners)
- Error states (inline, page-level)
- Empty states (no results, no pets, errors)

**Page Layouts:**
- Homepage: Hero section, stats, action cards, features, recent pets, footer
- Search Page: Filters, results grid/list, pet cards, pagination
- Report Form: Multi-step form with progress indicator
- My Pets Dashboard: Pet list, status indicators, quick actions
- All layouts must include mobile responsive breakpoints

**User Flows:**
- Report lost pet flow
- Search for pet flow
- View pet details flow
- Dashboard navigation flow

### 2. GRAPHICS & VISUAL ELEMENTS (Graphic Designer)

**Logo Design:**
- Primary logo (wordmark + icon combination)
- Icon-only variations (for favicon, app icons)
- Logo color variations (light background, dark background)
- Logo usage guidelines (spacing, sizing, don'ts)
- Favicon specifications (16x16, 32x32, 48x48, 180x180, 192x192, 512x512)

**Illustrations:**
- Hero section illustration concept (style, colors, elements)
- Empty state illustrations (no results, no pets, errors)
- Success state illustrations (reunion, form submitted)
- Illustration style guide (art style, color palette, line weight)

**Icons:**
- Complete icon set specifications (size variants: 16px, 20px, 24px, 32px, 48px)
- Icon library recommendations (or custom icon requirements)
- Icon usage guidelines
- Social media icons needed

**Photography:**
- Photography style guide (mood, lighting, composition)
- Image specifications (sizes, formats, aspect ratios)
- Stock photo recommendations (sources, keywords, style)
- User photo guidelines (requirements, best practices)

**Brand Visual Identity:**
- Brand color palette (primary, secondary, accent, semantic colors)
- Typography choices and rationale
- Visual style guide (do's and don'ts)
- Brand voice and tone guidelines

### 3. COMPLETE LEGAL CONTENT (Legal Consultant)

**Privacy Policy:**
- Complete, ready-to-publish Privacy Policy
- Sections: Information collection, usage, sharing, user rights, cookies, contact
- GDPR/CCPA compliance considerations
- Data retention policies
- Security measures

**Terms of Service:**
- Complete, ready-to-publish Terms of Service
- Sections: Service description, user responsibilities, prohibited uses, intellectual property, limitation of liability, disclaimers
- Clear language (not overly legal)
- Contact information

**Disclaimer:**
- Complete, ready-to-publish Disclaimer
- No guarantees of pet recovery
- User responsibility statements
- Safety disclaimers
- Limitation of liability

**Cookie Policy:**
- Complete, ready-to-publish Cookie Policy
- What cookies are used
- Why they're used
- How to manage cookies

**Accessibility Statement:**
- Complete, ready-to-publish Accessibility Statement
- Our commitment to accessibility
- WCAG 2.1 AA compliance statement
- How to report accessibility issues
- Contact information

### 4. COMPLETE DOCUMENTATION (Technical Writer + Design System Architect)

**Design System Documentation:**
- Color usage guidelines (when to use each color)
- Typography scale and usage examples
- Component library with full specs
- Spacing system usage
- Shadow system usage
- Border radius guidelines
- Animation/transition guidelines

**Component Documentation:**
- Button component: All variants, states, usage examples
- Form components: Inputs, selects, textareas with validation states
- Card components: All variants and usage
- Navigation components: Header, footer, breadcrumbs
- Modal components: Usage and accessibility
- Loading/Error/Empty states: When and how to use

**Implementation Guide:**
- How to use the design system in Tailwind CSS
- Code examples for all components
- Component structure and organization
- Best practices and patterns
- Common mistakes to avoid

**Usage Examples:**
- Real code examples for each component
- Tailwind CSS class combinations
- Responsive design patterns
- Accessibility implementation examples

### 5. CODE-READY SPECIFICATIONS (Engineer)

**Tailwind CSS Configuration:**
- Complete tailwind.config.js with all design tokens
- Custom colors, spacing, typography, shadows
- Plugin configurations if needed

**Component Code:**
- React/TypeScript component code for all components
- Proper TypeScript types and interfaces
- Accessibility attributes (ARIA labels, roles)
- Responsive classes
- State management examples

**Page Implementation:**
- Complete code for homepage redesign
- Complete code for search page
- Complete code for report form
- Complete code for dashboard
- All with proper TypeScript types

**Responsive Breakpoints:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Mobile, tablet, desktop layouts for all pages

## Brand Identity

**Mission:** Help reunite lost pets with their families - 100% free, no registration required

**Brand Values:**
- Compassionate
- Trustworthy
- Helpful
- Professional
- Accessible

**Target Audience:**
- Pet owners who lost their pet (stressed, emotional, need clear guidance)
- People who found a pet (wanting to help, need easy search)
- Animal shelters (professional users, need efficiency)

**Tone:**
- Warm but professional
- Clear and simple language
- Empathetic but not overly emotional
- Action-oriented

## Design Requirements

**Must Have:**
- Professional appearance (competes with paid services)
- Easy navigation (users may be stressed/distracted)
- Clear call-to-actions
- Mobile responsive (most users on phones)
- Accessible (WCAG 2.1 AA: keyboard nav, screen readers, color contrast)
- Fast loading (optimized images, minimal animations)
- Trust-building elements (testimonials, stats, security indicators)

**Should Have:**
- Modern, clean aesthetic
- Emotional connection (but not cheesy)
- Clear visual hierarchy
- Consistent design language
- Helpful micro-interactions

**Nice to Have:**
- Dark mode support (future consideration)
- Subtle animations (not distracting)
- Progressive enhancement

## Technical Constraints

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS (already configured)
- **Components:** React with TypeScript
- **Icons:** Currently using Lucide React (can change if needed)
- **Images:** Next.js Image component (optimization required)
- **Responsive:** Mobile-first approach
- **Performance:** Fast loading, optimized images, minimal JavaScript

## Output Format

Provide everything in organized markdown files:

1. **design-system.md** - Complete design tokens, colors, typography, spacing
2. **components.md** - All component specifications with code examples
3. **page-layouts.md** - All page layouts with wireframes/descriptions
4. **graphics-specs.md** - Logo, illustrations, icons, photography guidelines
5. **legal-content/** - All legal pages (privacy, terms, disclaimer, cookies, accessibility)
6. **implementation-guide.md** - How to implement everything
7. **code-examples/** - Ready-to-use component code

## Quality Checklist

**From UI/UX Designer:**
- [ ] Complete design system (colors, typography, spacing, components)
- [ ] Page layouts for all pages (homepage, search, report, dashboard)
- [ ] Component specifications (buttons, cards, forms, inputs)
- [ ] Responsive breakpoints and mobile designs
- [ ] Accessibility specifications (WCAG 2.1 AA)
- [ ] User flow diagrams

**From Graphic Designer:**
- [ ] Logo design (primary, variations, favicon)
- [ ] Illustration concepts and style guide
- [ ] Icon specifications and recommendations
- [ ] Photography guidelines and recommendations
- [ ] Brand visual identity guide

**From Legal Consultant:**
- [ ] Privacy Policy (complete, ready to publish)
- [ ] Terms of Service (complete, ready to publish)
- [ ] Disclaimer (complete, ready to publish)
- [ ] Cookie Policy (complete, ready to publish)
- [ ] Accessibility Statement (complete, ready to publish)

**From Design System Architect:**
- [ ] Design tokens (all values, hex codes, measurements)
- [ ] Component library documentation
- [ ] Usage guidelines and best practices
- [ ] Tailwind CSS configuration

**From Technical Writer:**
- [ ] Implementation guide
- [ ] Code examples (Tailwind CSS, React/TypeScript)
- [ ] Component usage documentation
- [ ] Best practices guide

**From Engineer:**
- [ ] Complete component code (React/TypeScript)
- [ ] Tailwind CSS configuration
- [ ] Page implementation code
- [ ] TypeScript types and interfaces

**From Accessibility Specialist:**
- [ ] WCAG 2.1 AA compliance verification
- [ ] Keyboard navigation specifications
- [ ] Screen reader compatibility
- [ ] Color contrast verification
- [ ] ARIA labels and roles

**From Validator:**
- [ ] All deliverables are 100% complete (not 10%)
- [ ] Code is production-ready
- [ ] Legal content is ready to publish
- [ ] Documentation is comprehensive
- [ ] Everything is implementable

## Important Notes

- This is a FREE service - design should reflect that (not too corporate/expensive looking)
- Users are often stressed/emotional - design should be calming and easy to use
- Must be accessible - many users may have disabilities
- Legal content must be clear and protect the service
- Everything should be implementable with Tailwind CSS
- Consider performance - no heavy graphics or animations
- All code must be TypeScript-compliant
- All components must be accessible (keyboard nav, screen readers)

## Success Criteria

The redesign package is complete when:
1. All design system tokens are defined
2. All components are specified with code
3. All pages are designed and documented
4. All graphics are specified
5. All legal content is ready to publish
6. All documentation is comprehensive
7. All code is production-ready
8. Everything is 100% complete (not 10%)

## Start Working

Begin by having ARCHITECT coordinate the team, then each specialist should work on their deliverables. VALIDATOR should ensure everything is 100% complete before finalizing. The output should be ready for immediate implementation in Windsurf.
"@

$agents = @("USER", "ARCHITECT", "ENGINEER", "VALIDATOR")

$body = @{
    name = $bubbleName
    description = $description
    agents = $agents
} | ConvertTo-Json -Depth 10

# Check if bubble already exists
Write-Host "Checking if bubble already exists..." -ForegroundColor Yellow
try {
    $existingBubbles = Invoke-RestMethod -Uri "$baseUrl/create" -Method GET
    if ($existingBubbles.success -and $existingBubbles.bubbles) {
        $existing = $existingBubbles.bubbles | Where-Object { 
            $_.name -eq $bubbleName -or $_.name -like "*PetReunion*" 
        } | Select-Object -First 1
        
        if ($existing) {
            Write-Host "✅ Bubble already exists!" -ForegroundColor Green
            Write-Host "Bubble ID: $($existing.id)" -ForegroundColor Green
            Write-Host "Bubble Name: $($existing.name)" -ForegroundColor Green
            Write-Host "`nUse trigger-bubble-agents.ps1 to start working." -ForegroundColor Cyan
            exit 0
        }
    }
} catch {
    Write-Host "Could not check existing bubbles (this is okay if server just started)" -ForegroundColor Gray
}

Write-Host "Creating bubble: $bubbleName" -ForegroundColor Yellow
Write-Host "Sending to: $baseUrl/create" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Bubble created successfully!" -ForegroundColor Green
        Write-Host "Bubble ID: $($response.bubbleId)" -ForegroundColor Cyan
        Write-Host "Bubble ID: $($response.bubble.id)" -ForegroundColor Green
        Write-Host "Bubble Name: $($response.bubble.name)" -ForegroundColor Green
        Write-Host "`nBubble is ready in Forge!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to create bubble: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nMake sure the Forge server is running:" -ForegroundColor Yellow
    Write-Host "  cd apps/cevict" -ForegroundColor Cyan
    Write-Host "  pnpm dev" -ForegroundColor Cyan
    Write-Host "`nOr from monorepo root:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter cevict dev" -ForegroundColor Cyan
}

