'use client'
import { useState, useEffect } from 'react'
export default function AdminAuth({ children }: { children: React.ReactNode }) {
  const [isAuth, setAuth] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { if(sessionStorage.getItem('admin_auth')==='authenticated') setAuth(true) }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const r = await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
      if(r.ok) { sessionStorage.setItem('admin_auth','authenticated'); setAuth(true) }
      else { setErr('Incorrect'); setPw('') }
    } catch { setErr('Failed') }
  }
  if(!isAuth) return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4"><div className="max-w-md w-full bg-white rounded-2xl p-8"><div className="text-center mb-8"><div className="text-4xl mb-4">🔐</div><h1 className="text-3xl font-bold mb-2">Admin Access</h1></div><form onSubmit={submit} className="space-y-6"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Password" required autoFocus/>{err&&<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{err}</div>}<button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">Unlock</button></form><div className="mt-6 pt-6 border-t text-center"><a href="/" className="text-sm text-gray-600">← Back</a></div></div></div>
  return <>{children}<div className="fixed top-4 right-4"><button onClick={()=>{sessionStorage.removeItem('admin_auth');setAuth(false)}} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">🔒 Logout</button></div></>
}
