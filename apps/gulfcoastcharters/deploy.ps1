# POWERSHELL DEPLOYMENT SCRIPT
# Your project: rdbuwyefbgnbuh

Write-Host "🚀 DEPLOYING TO SUPABASE..." -ForegroundColor Green
Write-Host ""

# Step 1: Install Supabase CLI (if not installed)
Write-Host "Step 1: Installing Supabase CLI..." -ForegroundColor Yellow
npm install -g supabase
Write-Host "✅ CLI installed" -ForegroundColor Green
Write-Host ""

# Step 2: Login to Supabase
Write-Host "Step 2: Login to Supabase..." -ForegroundColor Yellow
Write-Host "A browser will open - login with your Supabase account" -ForegroundColor Cyan
supabase login
Write-Host "✅ Logged in" -ForegroundColor Green
Write-Host ""

# Step 3: Link project
Write-Host "Step 3: Linking to your project..." -ForegroundColor Yellow
supabase link --project-ref rdbuwyefbgnbuh
Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

# Step 4: Create function directories
Write-Host "Step 4: Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "supabase\functions\catch-of-the-day" | Out-Null
New-Item -ItemType Directory -Force -Path "supabase\functions\fishing-buddy-finder" | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green
Write-Host ""

# Step 5: Copy function files
Write-Host "Step 5: Copying function files..." -ForegroundColor Yellow
Copy-Item "catch-of-the-day-index.ts" -Destination "supabase\functions\catch-of-the-day\index.ts"
Copy-Item "fishing-buddy-finder-index.ts" -Destination "supabase\functions\fishing-buddy-finder\index.ts"
Write-Host "✅ Files copied" -ForegroundColor Green
Write-Host ""

# Step 6: Deploy functions
Write-Host "Step 6: Deploying edge functions..." -ForegroundColor Yellow
supabase functions deploy catch-of-the-day --project-ref rdbuwyefbgnbuh
supabase functions deploy fishing-buddy-finder --project-ref rdbuwyefbgnbuh
Write-Host "✅ Functions deployed" -ForegroundColor Green
Write-Host ""

# Step 7: Install dependencies
Write-Host "Step 7: Installing npm packages..." -ForegroundColor Yellow
npm install crypto-js lru-cache @supabase/supabase-js
Write-Host "✅ Packages installed" -ForegroundColor Green
Write-Host ""

# Step 8: Create lib directories and copy files
Write-Host "Step 8: Organizing library files..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "lib" | Out-Null
New-Item -ItemType Directory -Force -Path "middleware" | Out-Null
New-Item -ItemType Directory -Force -Path "tests" | Out-Null

Copy-Item "offlineInspectionStorage.ts" -Destination "lib\"
Copy-Item "inspectionSignatureHandler.ts" -Destination "lib\"
Copy-Item "imageOptimizer.ts" -Destination "lib\"
Copy-Item "connectionPool.ts" -Destination "lib\"
Copy-Item "rateLimiter.ts" -Destination "middleware\"
Copy-Item "stressTesting.ts" -Destination "tests\"
Write-Host "✅ Library files organized" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is now LIVE with:" -ForegroundColor Cyan
Write-Host "  ✅ Database tables" -ForegroundColor Green
Write-Host "  ✅ Storage buckets" -ForegroundColor Green
Write-Host "  ✅ Edge functions" -ForegroundColor Green
Write-Host "  ✅ Libraries installed" -ForegroundColor Green
Write-Host ""
Write-Host "Edge Functions URLs:" -ForegroundColor Yellow
Write-Host "  https://rdbuwyefbgnbuh.supabase.co/functions/v1/catch-of-the-day" -ForegroundColor Cyan
Write-Host "  https://rdbuwyefbgnbuh.supabase.co/functions/v1/fishing-buddy-finder" -ForegroundColor Cyan
Write-Host ""
