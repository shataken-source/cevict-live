'use client'
import { useState, useEffect } from 'react'
import { Trash2, Edit, Plus, DollarSign, Eye, ExternalLink, RefreshCw } from 'lucide-react'

type Product = {
  id: string
  name: string
  category: string
  price: number
  affiliate_link: string
  commission_rate: number
  clicks: number
  sales: number
  created_at?: string
  updated_at?: string
}

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'cbd',
    price: '',
    link: '',
    commission_rate: '0.10'
  })
  const [saving, setSaving] = useState(false)

  const categories = ['cbd', 'vapes', 'papers', 'nicotine', 'cbd_oil', 'cbd_gummies', 'delta_8']

  // Fetch products from API
  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/products')
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized. Please log in.')
          return
        }
        throw new Error('Failed to fetch products')
      }
      const data = await res.json()
      setProducts(data.products || [])
    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const totalClicks = products.reduce((sum, p) => sum + (p.clicks || 0), 0)
  const totalSales = products.reduce((sum, p) => sum + (p.sales || 0), 0)
  const totalRevenue = products.reduce((sum, p) => {
    const commission = p.commission_rate || 0.10
    return sum + ((p.sales || 0) * p.price * commission)
  }, 0)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        // Update existing product
        const res = await fetch('/api/admin/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            name: formData.name,
            category: formData.category,
            price: formData.price,
            link: formData.link,
            commission_rate: formData.commission_rate,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to update product')
        }

        const data = await res.json()
        setProducts(products.map(p => p.id === editingId ? data.product : p))
      } else {
        // Create new product
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            price: formData.price,
            link: formData.link,
            commission_rate: formData.commission_rate,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Failed to create product')
        }

        const data = await res.json()
        setProducts([data.product, ...products])
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', category: 'cbd', price: '', link: '', commission_rate: '0.10' })
    } catch (err: any) {
      console.error('Error saving product:', err)
      setError(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      link: product.affiliate_link,
      commission_rate: (product.commission_rate || 0.10).toString(),
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }

      setProducts(products.filter(p => p.id !== id))
    } catch (err: any) {
      console.error('Error deleting product:', err)
      setError(err.message || 'Failed to delete product')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <div>Loading products...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">🚬 SmokersRights Admin</h1>
          <button
            onClick={fetchProducts}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-500/50 rounded-lg p-4">
            <div className="font-semibold">Error:</div>
            <div className="text-sm">{error}</div>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm">Total Products</div>
                <div className="text-3xl font-bold">{products.length}</div>
              </div>
              <div className="text-4xl">🛒</div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm">Total Clicks</div>
                <div className="text-3xl font-bold">{totalClicks.toLocaleString()}</div>
              </div>
              <Eye className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-sm">Estimated Revenue</div>
                <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
              </div>
              <DollarSign className="w-10 h-10 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({ name: '', category: 'cbd', price: '', link: '', commission_rate: '0.10' })
          }}
          className="mb-6 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Commission Rate (0.10 = 10%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Affiliate Link</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-white"
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded font-semibold"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add'} Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({ name: '', category: 'cbd', price: '', link: '', commission_rate: '0.10' })
                  }}
                  className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl overflow-hidden">
          {products.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No products yet. Click "Add Product" to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Price</th>
                  <th className="px-6 py-3 text-left">Clicks</th>
                  <th className="px-6 py-3 text-left">Sales</th>
                  <th className="px-6 py-3 text-left">Revenue</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const commission = product.commission_rate || 0.10
                  const revenue = (product.sales || 0) * product.price * commission
                  return (
                    <tr key={product.id} className="border-t border-slate-700">
                      <td className="px-6 py-4">{product.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-400 rounded text-sm">
                          {product.category.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                      <td className="px-6 py-4">{product.clicks || 0}</td>
                      <td className="px-6 py-4">{product.sales || 0}</td>
                      <td className="px-6 py-4 text-green-400 font-bold">
                        ${revenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(product.affiliate_link, '_blank')}
                            className="p-2 hover:bg-slate-700 rounded"
                            title="View Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 hover:bg-slate-700 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-slate-700 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
