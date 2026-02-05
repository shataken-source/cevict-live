@echo off
echo Fixing all files...
cd C:\gcc\charter-booking-platform

echo Creating _app.js...
(
echo import { useEffect, useState } from 'react'
echo import { supabase } from '@/lib/supabase'
echo import '../styles/globals.css'
echo.
echo export default function App^(^{ Component, pageProps ^}^) ^{
echo   const [session, setSession] = useState^(null^)
echo   
echo   useEffect^(^(^) =^> ^{
echo     supabase.auth.getSession^(^).then^(^(result^) =^> setSession^(result.data.session^)^)
echo   ^}, []^)
echo   
echo   return ^<Component session={session} ^{...pageProps^} /^>
echo ^}
) > pages\_app.js

echo Creating index.js...
(
echo import Link from 'next/link'
echo import Layout from '@/components/Layout'
echo.
echo export default function Home^(^{ session ^}^) ^{
echo   return ^(
echo     ^<Layout session={session}^>
echo       ^<div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24 text-center"^>
echo         ^<h1 className="text-6xl font-bold mb-6"^>Gulf Coast Charters^</h1^>
echo         ^<Link href="/captains" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold inline-block"^>
echo           Find a Captain
echo         ^</Link^>
echo       ^</div^>
echo     ^</Layout^>
echo   ^)
echo ^}
) > pages\index.js

echo Creating Layout.js...
(
echo import Link from 'next/link'
echo.
echo export default function Layout^(^{ children, session ^}^) ^{
echo   return ^(
echo     ^<div className="min-h-screen"^>
echo       ^<nav className="bg-white shadow p-4"^>
echo         ^<div className="max-w-7xl mx-auto flex justify-between"^>
echo           ^<Link href="/" className="text-xl font-bold text-blue-600"^>
echo             Gulf Coast Charters
echo           ^</Link^>
echo         ^</div^>
echo       ^</nav^>
echo       ^<main^>{children}^</main^>
echo     ^</div^>
echo   ^)
echo ^}
) > components\Layout.js

echo Creating captains page...
(
echo import { useState, useEffect } from 'react'
echo import Layout from '@/components/Layout'
echo import { db } from '@/lib/supabase'
echo.
echo export default function Captains^(^{ session ^}^) ^{
echo   const [captains, setCaptains] = useState^([]^)
echo   const [loading, setLoading] = useState^(true^)
echo   
echo   useEffect^(^(^) =^> ^{
echo     db.getCaptains^(^).then^(setCaptains^).finally^(^(^) =^> setLoading^(false^)^)
echo   ^}, []^)
echo   
echo   return ^(
echo     ^<Layout session={session}^>
echo       ^<div className="max-w-7xl mx-auto p-8"^>
echo         ^<h1 className="text-4xl font-bold mb-8"^>Find Your Captain^</h1^>
echo         {loading ? ^<p^>Loading...^</p^> : captains.length === 0 ? ^<p^>No captains yet^</p^> : ^<div className="grid grid-cols-3 gap-6"^>{captains.map^(c =^> ^<div key={c.id} className="bg-white p-6 rounded shadow"^>^<h3 className="font-bold"^>{c.boat_name}^</h3^>^<p className="text-blue-600 font-bold mt-2"^>${c.hourly_rate}/hr^</p^>^</div^>^)}^</div^>}
echo       ^</div^>
echo     ^</Layout^>
echo   ^)
echo ^}
) > pages\captains\index.js

echo.
echo ========================================
echo ALL FILES FIXED!
echo ========================================
echo.
echo Server should auto-reload.
echo Refresh browser at http://localhost:3000
echo.
pause