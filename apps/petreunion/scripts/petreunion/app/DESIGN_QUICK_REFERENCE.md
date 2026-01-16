# PetReunion Design Quick Reference

## 🎨 Color Codes (Copy-Paste Ready)

```css
/* Primary Colors */
--blue-primary: #2563EB;
--blue-hover: #1D4ED8;
--blue-light: #DBEAFE;

--purple-primary: #7C3AED;
--purple-hover: #6D28D9;
--purple-light: #EDE9FE;

--pink-primary: #EC4899;
--pink-hover: #DB2777;
--pink-light: #FCE7F3;

/* Semantic Colors */
--green-success: #10B981;
--orange-warning: #F59E0B;
--red-error: #EF4444;
--blue-info: #3B82F6;

/* Grays */
--gray-900: #111827;
--gray-700: #374151;
--gray-500: #6B7280;
--gray-300: #D1D5DB;
--gray-100: #F3F4F6;
--gray-50: #F9FAFB;
```

## 📐 Spacing Scale

```
4px   → 0.25rem  (xs)
8px   → 0.5rem   (sm)
12px  → 0.75rem
16px  → 1rem     (base)
20px  → 1.25rem
24px  → 1.5rem   (md)
32px  → 2rem     (lg)
40px  → 2.5rem
48px  → 3rem     (xl)
64px  → 4rem     (2xl)
80px  → 5rem
96px  → 6rem     (3xl)
128px → 8rem     (4xl)
```

## 🔤 Typography Classes

```css
/* Headings */
.hero-text { font-size: 4rem; line-height: 1.1; font-weight: 700; }
.h1 { font-size: 3rem; line-height: 1.2; font-weight: 700; }
.h2 { font-size: 2.25rem; line-height: 1.3; font-weight: 600; }
.h3 { font-size: 1.875rem; line-height: 1.4; font-weight: 600; }
.h4 { font-size: 1.5rem; line-height: 1.5; font-weight: 600; }

/* Body */
.body-large { font-size: 1.125rem; line-height: 1.6; }
.body { font-size: 1rem; line-height: 1.6; }
.body-small { font-size: 0.875rem; line-height: 1.5; }
.caption { font-size: 0.75rem; line-height: 1.4; }
```

## 🎯 Component Specifications

### Buttons

**Primary Button:**
```css
background: #2563EB;
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
hover: #1D4ED8;
```

**Secondary Button:**
```css
background: transparent;
color: #2563EB;
border: 2px solid #2563EB;
padding: 12px 24px;
border-radius: 8px;
```

### Cards

```css
background: white;
border-radius: 12px;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
padding: 24px;
hover: shadow-lg;
```

### Input Fields

```css
background: white;
border: 1px solid #D1D5DB;
border-radius: 8px;
padding: 12px 16px;
focus: border-blue-500, ring-2 ring-blue-200;
```

## 📱 Breakpoints

```css
sm: 640px   (mobile landscape)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
2xl: 1536px (extra large)
```

## 🎭 Common Patterns

### Gradient Background
```css
background: linear-gradient(to bottom right, #2563EB, #7C3AED, #EC4899);
```

### Card Grid (3 columns)
```css
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 24px;
@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
```

### Stat Card
```css
background: linear-gradient(to bottom right, #DBEAFE, #BFDBFE);
border: 1px solid #93C5FD;
border-radius: 12px;
padding: 24px;
text-align: center;
```

## ✅ Checklist for New Pages

- [ ] Uses design system colors
- [ ] Proper typography hierarchy
- [ ] Responsive (mobile-first)
- [ ] Accessible (keyboard nav, ARIA labels)
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Consistent spacing
- [ ] Proper contrast ratios
- [ ] Tested on mobile devices

## 🚫 Common Mistakes to Avoid

- ❌ Using arbitrary colors (use design system)
- ❌ Inconsistent spacing (use spacing scale)
- ❌ Too many font sizes (stick to type scale)
- ❌ Poor contrast (check WCAG AA)
- ❌ Missing hover states
- ❌ No loading/error states
- ❌ Not mobile responsive
- ❌ Inaccessible forms

## 📞 Quick Links

- Full Design Plan: `DESIGN_REDESIGN_PLAN.md`
- Legal Templates: `LEGAL_TEMPLATES.md`
- Component Library: (create in `/components/petreunion/`)

