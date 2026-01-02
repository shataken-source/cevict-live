'use client'
import AffiliateShop from '@/components/shop/AffiliateShop'
import { ShoppingBag } from 'lucide-react'

export default function Shop() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h1 className="text-5xl font-bold mb-4">Smoker-Approved Products</h1>
          <p className="text-xl text-gray-300">Support SmokersRights while getting the best deals</p>
        </div>
        <AffiliateShop />
      </div>
    </div>
  )
}
