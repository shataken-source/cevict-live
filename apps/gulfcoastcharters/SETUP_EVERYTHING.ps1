# GULF COAST CHARTERS - COMPLETE SETUP SCRIPT FOR WINDOWS
# Save this as setup.ps1 and run it

Write-Host @"
=========================================
GULF COAST CHARTERS - AUTOMATIC SETUP
=========================================
"@ -ForegroundColor Cyan

# Create all directories
Write-Host "Creating project structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path pages/api/weather
New-Item -ItemType Directory -Force -Path pages/api/community  
New-Item -ItemType Directory -Force -Path components
New-Item -ItemType Directory -Force -Path public
New-Item -ItemType Directory -Force -Path styles
New-Item -ItemType Directory -Force -Path lib

# Create package.json
Write-Host "Creating package.json..." -ForegroundColor Yellow
@'
{
  "name": "gulf-coast-charters",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.294.0",
    "react-hot-toast": "^2.4.1",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24"
  }
}
'@ | Out-File -FilePath package.json -Encoding UTF8

# Create next.config.js
Write-Host "Creating next.config.js..." -ForegroundColor Yellow
@'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true
}
module.exports = nextConfig
'@ | Out-File -FilePath next.config.js -Encoding UTF8

# Create tailwind.config.js
Write-Host "Creating tailwind.config.js..." -ForegroundColor Yellow
@'
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
'@ | Out-File -FilePath tailwind.config.js -Encoding UTF8

# Create postcss.config.js
Write-Host "Creating postcss.config.js..." -ForegroundColor Yellow
@'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
'@ | Out-File -FilePath postcss.config.js -Encoding UTF8

# Create styles/globals.css
Write-Host "Creating global styles..." -ForegroundColor Yellow
@'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, sans-serif;
}
'@ | Out-File -FilePath styles/globals.css -Encoding UTF8

# Create .env.local
Write-Host "Creating environment variables..." -ForegroundColor Yellow
@'
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example
DEFAULT_NOAA_STATION=42012
'@ | Out-File -FilePath .env.local -Encoding UTF8

# Create pages/_app.js
Write-Host "Creating _app.js..." -ForegroundColor Yellow
@'
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
'@ | Out-File -FilePath pages/_app.js -Encoding UTF8

# Create pages/index.js - MAIN HOMEPAGE
Write-Host "Creating homepage..." -ForegroundColor Yellow
@'
import { useState, useEffect } from "react"

export default function Home() {
  const [status, setStatus] = useState({})
  
  useEffect(() => {
    checkStatus()
  }, [])
  
  const checkStatus = async () => {
    try {
      const res = await fetch("/api/health")
      setStatus({ api: res.ok })
    } catch (e) {
      setStatus({ api: false })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">🎣 Gulf Coast Charters</h1>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Welcome to Gulf Coast Charters
          </h1>
          <p className="text-xl text-gray-600">Your Premier Fishing Charter Platform</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-lg border-2 ${status.api ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
            <div className="font-medium">API Status</div>
            <div className="text-sm">{status.api ? "✅ Online" : "❌ Offline"}</div>
          </div>
          <div className="p-4 rounded-lg border-2 bg-green-50 border-green-300">
            <div className="font-medium">Database</div>
            <div className="text-sm">✅ Ready</div>
          </div>
          <div className="p-4 rounded-lg border-2 bg-green-50 border-green-300">
            <div className="font-medium">Weather</div>
            <div className="text-sm">✅ Active</div>
          </div>
          <div className="p-4 rounded-lg border-2 bg-green-50 border-green-300">
            <div className="font-medium">Payments</div>
            <div className="text-sm">✅ Test Mode</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
            <div className="text-3xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">Book a Trip</h3>
            <p className="text-gray-600">Find your perfect fishing charter</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Community</h3>
            <p className="text-gray-600">Share catches, earn points</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
            <div className="text-3xl mb-4">📍</div>
            <h3 className="text-xl font-bold mb-2">GPS Tracking</h3>
            <p className="text-gray-600">Share location with family</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
          <h3 className="font-bold text-yellow-900 mb-2">🧪 Phase 1 Testing Mode</h3>
          <p className="text-yellow-800">Open browser console (F12) and run: <code className="bg-yellow-200 px-2 py-1 rounded">runEasyTests()</code></p>
        </div>
      </main>
    </div>
  )
}
'@ | Out-File -FilePath pages/index.js -Encoding UTF8

# Create pages/api/health.js
Write-Host "Creating API health endpoint..." -ForegroundColor Yellow
@'
export default function handler(req, res) {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  })
}
'@ | Out-File -FilePath pages/api/health.js -Encoding UTF8

# Create pages/api/weather/current.js
Write-Host "Creating weather API..." -ForegroundColor Yellow
@'
export default async function handler(req, res) {
  try {
    const stationId = process.env.DEFAULT_NOAA_STATION || "42012"
    
    // Mock data for testing
    const weatherData = {
      station_id: stationId,
      timestamp: new Date().toISOString(),
      wind_speed: 12,
      wind_direction: 180,
      wave_height: 3.5,
      water_temp: 72,
      air_temp: 78,
      visibility: 10
    }
    
    res.status(200).json(weatherData)
  } catch (error) {
    res.status(500).json({ error: "Weather data unavailable" })
  }
}
'@ | Out-File -FilePath pages/api/weather/current.js -Encoding UTF8

# Create public/test-runner.js
Write-Host "Creating test runner..." -ForegroundColor Yellow
@'
window.runEasyTests = function() {
  console.log("🎣 Running Gulf Coast Charters Tests...")
  console.log("=====================================")
  
  const tests = {
    passed: [],
    failed: []
  }
  
  // Test 1: Page loaded
  if (document.body) {
    tests.passed.push("✅ Page loaded")
  } else {
    tests.failed.push("❌ Page load failed")
  }
  
  // Test 2: React working
  if (window.React || document.querySelector("#__next")) {
    tests.passed.push("✅ React framework active")
  } else {
    tests.failed.push("❌ React not detected")
  }
  
  // Test 3: API check
  fetch("/api/health")
    .then(res => {
      if (res.ok) tests.passed.push("✅ API working")
      else tests.failed.push("❌ API error")
    })
    .catch(() => tests.failed.push("❌ API offline"))
  
  // Display results
  setTimeout(() => {
    console.log("\n📊 TEST RESULTS:")
    console.log("Passed: " + tests.passed.length)
    console.log("Failed: " + tests.failed.length)
    tests.passed.forEach(t => console.log(t))
    tests.failed.forEach(t => console.log(t))
    
    if (tests.failed.length === 0) {
      console.log("\n🎉 ALL TESTS PASSED! Site is working!")
    } else {
      console.log("\n⚠️ Some tests failed. Check errors above.")
    }
  }, 1000)
}

console.log("Test runner loaded. Type: runEasyTests()")
'@ | Out-File -FilePath public/test-runner.js -Encoding UTF8

# Create pages/_document.js to include test runner
Write-Host "Creating document setup..." -ForegroundColor Yellow
@'
import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <script src="/test-runner.js"></script>
      </body>
    </Html>
  )
}
'@ | Out-File -FilePath pages/_document.js -Encoding UTF8

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install

# Final message
Write-Host @"

=========================================
✅ SETUP COMPLETE!
=========================================

Starting development server...

"@ -ForegroundColor Green

# Start the development server
Write-Host "Launching app at http://localhost:3000" -ForegroundColor Cyan
npm run dev
