# PetRescue.org Stripe Payment Icon Guide

## 📦 Icon Files Created

I've created 4 versions of the PetRescue.org icon optimized for Stripe payments:

### 1. **icon-stripe.svg** (Recommended)
- **Size**: 512x512px
- **Style**: Paw print with heart overlay
- **Use**: Primary Stripe payment icon
- **Best for**: Payment buttons, checkout pages

### 2. **icon-stripe-simple.svg**
- **Size**: 512x512px  
- **Style**: Clean paw print on rounded square
- **Use**: Alternative simpler design
- **Best for**: When you need a more geometric look

### 3. **icon-stripe-minimal.svg** (Best for Stripe)
- **Size**: 512x512px
- **Style**: Minimalist paw print on circle
- **Use**: Recommended for Stripe integration
- **Best for**: Payment forms, Stripe Elements

### 4. **icon-stripe-favicon.svg**
- **Size**: 32x32px
- **Style**: Simplified for small sizes
- **Use**: Browser favicon, small UI elements

## 🎨 Design Details

**Colors:**
- Background: Purple gradient (#4F46E5 to #7C3AED) - Trustworthy, professional
- Paw: White (#FFFFFF) - Clean, visible on any background
- Heart (v1 only): Red (#EF4444) - Represents care and compassion

**Why This Design:**
- ✅ **Recognizable**: Paw print is universally associated with pets
- ✅ **Scalable**: Works at any size from 16px to 512px+
- ✅ **Professional**: Clean design suitable for payment contexts
- ✅ **Trustworthy**: Simple, clear icon builds confidence

## 📍 File Locations

All icons are in: `apps/petreunion/public/`

```
apps/petreunion/public/
├── icon-stripe.svg          (Main - with heart)
├── icon-stripe-simple.svg   (Rounded square)
├── icon-stripe-minimal.svg  (Recommended - minimal)
└── icon-stripe-favicon.svg  (Small size)
```

## 🔧 Using with Stripe

### Option 1: In Stripe Dashboard
1. Go to **Stripe Dashboard → Settings → Branding**
2. Upload `icon-stripe-minimal.svg` or convert to PNG
3. Stripe will use it in payment forms

### Option 2: In Your App
```typescript
// In your payment component
<img 
  src="/icon-stripe-minimal.svg" 
  alt="PetRescue.org" 
  width="64" 
  height="64"
/>
```

### Option 3: Convert to PNG (if needed)
```bash
# Using ImageMagick or online converter
# Convert SVG to PNG at different sizes:
# - 512x512 (Stripe recommended)
# - 256x256 (Standard)
# - 128x128 (Small)
# - 64x64 (Tiny)
```

## 🎯 Recommended Usage

**For Stripe Payment Intent/Checkout:**
- Use: `icon-stripe-minimal.svg`
- Size: 512x512px (convert to PNG if Stripe requires)
- Format: SVG preferred, PNG fallback

**For Payment Buttons:**
- Use: `icon-stripe-minimal.svg` or `icon-stripe-simple.svg`
- Size: 64x64px to 128x128px

**For Favicon:**
- Use: `icon-stripe-favicon.svg`
- Size: 32x32px or 16x16px

## ✨ Customization

Want to change colors? Edit the SVG files:
- **Background gradient**: Change `#4F46E5` and `#7C3AED` in the `<linearGradient>` stops
- **Paw color**: Change `fill="#FFFFFF"` in the paw print elements
- **Heart color**: Change `#EF4444` in icon-stripe.svg

## 📝 Next Steps

1. **Test the icons**: View them in a browser to see which you prefer
2. **Convert to PNG** (if Stripe requires): Use online converter or ImageMagick
3. **Upload to Stripe**: Add to Stripe Dashboard → Settings → Branding
4. **Use in app**: Reference in your payment components

---

**Note**: All icons are optimized for Stripe's requirements:
- ✅ Square format
- ✅ High resolution (512x512)
- ✅ Clean, simple design
- ✅ Works at small sizes
- ✅ Professional appearance
