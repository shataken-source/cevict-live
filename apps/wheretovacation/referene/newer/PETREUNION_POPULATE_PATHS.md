# PetReunion Database Population - Full Paths

## Web Interface (Admin Panel)
**URL:** `http://localhost:3002/petreunion/admin/populate`

**Full Path:** `C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation\app\petreunion\admin\populate\page.tsx`

## API Endpoint
**URL:** `http://localhost:3002/api/petreunion/populate-database`

**Full Path:** `C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation\app\api\petreunion\populate-database\route.ts`

## PowerShell Script
**Full Path:** `C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation\scripts\populate-pet-database.ps1`

**Usage:**
```powershell
cd C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation
.\scripts\populate-pet-database.ps1 -MaxCities 50 -DelaySeconds 5
```

## Quick Access Commands

### Open Admin Panel
```
http://localhost:3002/petreunion/admin/populate
```

### Run PowerShell Script
```powershell
cd C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation
.\scripts\populate-pet-database.ps1
```

### Call API Directly (PowerShell)
```powershell
$body = @{
    maxCities = 50
    maxPetsPerCity = 50
    sources = @('adoptapet')
    delayBetweenCities = 5000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3002/api/petreunion/populate-database" -Method POST -Body $body -ContentType "application/json"
```

## Cities Included (Including South Jersey)
- Alabama: Birmingham, Mobile, Montgomery, Huntsville, Tuscaloosa
- Florida: Miami, Tampa, Orlando, Jacksonville, Tallahassee
- Georgia: Atlanta, Savannah, Augusta
- Texas: Houston, Dallas, Austin, San Antonio
- California: Los Angeles, San Diego, San Francisco, Sacramento
- New York: New York, Buffalo
- **New Jersey (South Jersey):** Camden, Cherry Hill, Vineland, Atlantic City, Millville, Bridgeton, Glassboro, Pleasantville
- Illinois: Chicago
- Arizona: Phoenix
- Washington: Seattle
- Oregon: Portland
- Colorado: Denver
- Tennessee: Nashville, Memphis
- Louisiana: New Orleans, Baton Rouge
- Mississippi: Jackson, Gulfport

**Total:** 50+ cities, 100+ searches (dogs + cats per city)


