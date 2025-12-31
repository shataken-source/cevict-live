$DIR = "C:\gcc\cevict-app\cevict-monorepo\apps\prognostication"

Write-Host "Creating project..." -ForegroundColor Cyan

New-Item -ItemType Directory -Path "$DIR\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIR\components" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIR\lib" -Force | Out-Null

Set-Content "$DIR\package.json" @'
{
  "name": "prognostication",
  "scripts": {"dev": "next dev -p 3005"},
  "dependencies": {
    "next": "14.0.4",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
'@

Set-Content "$DIR\next.config.js" "module.exports = {}"
Set-Content "$DIR\app\page.tsx" "export default function Page() { return <div>Prognostication</div> }"
Set-Content "$DIR\.env.example" "NEXT_PUBLIC_SUPABASE_URL=`nNEXT_PUBLIC_SUPABASE_ANON_KEY="

Set-Location $DIR
npm install

Write-Host "Done! Run: npm run dev" -ForegroundColor Green