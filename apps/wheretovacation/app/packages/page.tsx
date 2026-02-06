'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Plus, Trash2, DollarSign, Save, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface PackageItem {
  id: string
  type: 'rental' | 'boat' | 'activity'
  name: string
  price: number
  description?: string
}

export default function PackagesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PackageItem[]>([])
  const [packageName, setPackageName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/packages')
    }
  }, [user, router])

  const addRental = () => {
    // In production, this would open a rental selector
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        type: 'rental',
        name: 'Beachfront Condo',
        price: 200,
        description: '2BR/2BA Ocean View',
      },
    ])
  }

  const addBoat = async () => {
    try {
      // Use WTV's proxy endpoint instead of direct GCC call
      const res = await fetch('/api/gcc/boats?available=true&limit=5')
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to load boats' }))
        alert(error.error || 'GCC integration not configured. Please set GCC_BASE_URL.')
        return
      }

      const boats = await res.json()

      if (boats && Array.isArray(boats) && boats.length > 0) {
        const boat = boats[0]
        setItems([
          ...items,
          {
            id: Date.now().toString(),
            type: 'boat',
            name: boat.name || 'Boat Charter',
            price: boat.price || 300,
            description: `${boat.type || 'Charter'} • ${boat.capacity || 'N/A'} guests`,
          },
        ])
      } else {
        alert('No boats available at this time')
      }
    } catch (error) {
      alert('Failed to load boats. Please check your GCC integration configuration.')
      console.error('Boat loading error:', error)
    }
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + item.price, 0)
    const discount = items.length >= 2 ? subtotal * 0.15 : 0 // 15% discount for packages
    return {
      subtotal,
      discount,
      total: subtotal - discount,
    }
  }

  const handleSavePackage = async () => {
    if (!packageName.trim()) {
      alert('Please enter a package name')
      return
    }

    if (items.length === 0) {
      alert('Please add at least one item to the package')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/packages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packageName,
          items,
          pricing: calculateTotal(),
        }),
      })

      if (response.ok) {
        alert('Package saved! You can now book it.')
        router.push('/packages/my-packages')
      } else {
        throw new Error('Failed to save package')
      }
    } catch (error) {
      alert('Failed to save package. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const totals = calculateTotal()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-blue-600 hover:underline mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-600" />
              Build Your Vacation Package
            </h1>
            <p className="text-gray-600">
              Combine rentals, boat charters, and activities for the perfect vacation
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Builder */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Package Name</h2>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g., Family Beach Week"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Items</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={addRental}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Rental
                  </button>
                  <button
                    onClick={addBoat}
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Boat Charter
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Package Items</h2>
                {items.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No items added yet. Click above to add rentals or boat charters.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {item.type}
                            </span>
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          <p className="text-lg font-bold text-blue-600 mt-2">
                            ${item.price.toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Package Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toLocaleString()}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Package Discount (15%)</span>
                      <span>-${totals.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-5 h-5" />
                      {totals.total.toLocaleString()}
                    </span>
                  </div>
                </div>

                {items.length >= 2 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                    <p className="text-green-800 text-sm">
                      🎉 You're saving ${totals.discount.toLocaleString()} with this package!
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSavePackage}
                  disabled={saving || items.length === 0}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Package
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
