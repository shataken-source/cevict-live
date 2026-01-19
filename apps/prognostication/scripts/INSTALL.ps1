# ================================================================
# PROGNOSTICATION.COM - SIMPLE INSTALLATION SCRIPT
# ================================================================

Write-Host "`n=== PROGNOSTICATION INSTALLATION ===" -ForegroundColor Cyan

# Project root (C:\cevict-live\apps\prognostication). Script lives in apps\prognostication\scripts\
$PROJECT_DIR = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# Create directories
Write-Host "`nCreating directories..." -ForegroundColor Green
New-Item -ItemType Directory -Path "$PROJECT_DIR\app\api\checkout" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\app\api\webhooks\stripe" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\app\picks\free" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\app\picks\premium" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\app\pricing" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\app\admin" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\components" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\lib" -Force | Out-Null
New-Item -ItemType Directory -Path "$PROJECT_DIR\scripts" -Force | Out-Null

# Create package.json
Write-Host "Creating package.json..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\package.json" -Value '{
  "name": "prognostication",
  "version": "2.0.0",
  "scripts": {
    "dev": "next dev -p 3005",
    "build": "next build",
    "start": "next start -p 3005"
  },
  "dependencies": {
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.1",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "stripe": "^14.10.0",
    "@stripe/stripe-js": "^2.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "chokidar": "^3.5.3",
    "date-fns": "^3.0.6",
    "lucide-react": "^0.303.0",
    "react-hot-toast": "^2.4.1"
  }
}'

# Create .env.example
Write-Host "Creating .env.example..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\.env.example" -Value 'NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3005'

# Create next.config.js
Write-Host "Creating next.config.js..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\next.config.js" -Value 'module.exports = {}'

# Create tailwind.config.js  
Write-Host "Creating tailwind.config.js..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\tailwind.config.js" -Value 'module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: []
}'

# Create postcss.config.js
Write-Host "Creating postcss.config.js..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\postcss.config.js" -Value 'module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}'

# Create tsconfig.json
Write-Host "Creating tsconfig.json..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\tsconfig.json" -Value '{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}'

# Create globals.css
Write-Host "Creating globals.css..." -ForegroundColor Green
Set-Content -Path "$PROJECT_DIR\app\globals.css" -Value '@tailwind base;
@tailwind components;
@tailwind utilities;'

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
Set-Location $PROJECT_DIR
npm install

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Project created at: $PROJECT_DIR" -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Copy source files from prognostication-complete folder" -ForegroundColor White
Write-Host "2. Run SQL in Supabase" -ForegroundColor White
Write-Host "3. Configure .env.local" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White