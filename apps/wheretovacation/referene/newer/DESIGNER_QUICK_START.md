# 🎨 Designer Quick Start Guide - WhereToVacation

## For Designers Working Remotely

This guide will get you up and running in **5 minutes** so you can work on designs locally, even if the site isn't deployed yet.

---

## 🚀 Quick Setup (Windows)

### Option 1: Automated Setup (Recommended)

1. **Open PowerShell** in the `apps/wheretovacation` folder

2. **Run the setup script:**
   ```powershell
   .\DESIGNER_SETUP.ps1
   ```

That's it! The script will:
- ✅ Check for Node.js and pnpm
- ✅ Install all dependencies
- ✅ Create a basic `.env.local` file
- ✅ Start the development server

### Option 2: Manual Setup

If the script doesn't work, follow these steps:

```powershell
# 1. Install dependencies
pnpm install

# 2. Create .env.local (optional - app will work without it for design)
# Create a file named .env.local with:
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_key

# 3. Start the dev server
pnpm dev
```

---

## 📍 Access the App

Once running, open your browser to:

**http://localhost:3003**

---

## 🎨 What You Can Do

### ✅ Works Without Database:
- View all pages and components
- See layouts and styling
- Test responsive design
- Work on UI/UX improvements
- Preview design changes in real-time

### ⚠️ Requires Database (Optional):
- User authentication
- Booking functionality
- Data persistence

**For design work, you don't need the database!** The app will run and show all the UI components.

---

## 🛠️ Common Commands

```powershell
# Start development server
pnpm dev

# Stop server
Ctrl+C

# Install new packages (if needed)
pnpm add package-name

# Check for errors
pnpm build
```

---

## 📁 Project Structure

```
apps/wheretovacation/
├── app/              # Pages and routes
│   ├── page.tsx      # Homepage
│   ├── search/       # Search pages
│   └── community/    # Community features
├── components/       # React components
├── styles/          # CSS/Tailwind styles
└── public/          # Images, fonts, etc.
```

---

## 🎯 Design Files Location

- **Components**: `apps/wheretovacation/components/`
- **Pages**: `apps/wheretovacation/app/`
- **Styles**: `apps/wheretovacation/styles/` and `tailwind.config.ts`
- **Images**: `apps/wheretovacation/public/`

---

## 🔧 Troubleshooting

### "Node.js not found"
- Install Node.js 18+ from https://nodejs.org/
- Restart your terminal after installing

### "pnpm not found"
- Run: `npm install -g pnpm`
- Or use npm instead: `npm install` then `npm run dev`

### "Port 3003 already in use"
- Close other applications using port 3003
- Or change the port in `package.json`: `"dev": "next dev -p 3004"`

### "Module not found" errors
- Run `pnpm install` again
- Delete `node_modules` and `pnpm-lock.yaml`, then run `pnpm install`

---

## 💡 Tips for Designers

1. **Hot Reload**: Changes to files automatically refresh the browser
2. **Tailwind CSS**: Most styling uses Tailwind classes (see `tailwind.config.ts`)
3. **Component Library**: Check `components/` for reusable UI elements
4. **Responsive**: Test on different screen sizes using browser dev tools

---

## 📞 Need Help?

If you run into issues:
1. Check the error message in the terminal
2. Make sure Node.js 18+ is installed
3. Try deleting `node_modules` and running `pnpm install` again
4. Check the main README.md for more details

---

## ✅ You're Ready!

Once you see "Ready - started server on 0.0.0.0:3003", you're all set to start designing! 🎨

