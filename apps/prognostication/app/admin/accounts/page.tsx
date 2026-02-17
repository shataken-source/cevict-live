"use client"

import { useState, useEffect } from "react"
import { getAllAccounts, createAccount, updateAccountTier, deleteAccount, type UserAccount } from "@/app/admin/actions"
import { Plus, Trash2, Crown, User, Loader2 } from "lucide-react"

export default function AccountsAdminPage() {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    tier: "pro" as "pro" | "elite",
    fundAccess: false
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    const { accounts: data } = await getAllAccounts()
    setAccounts(data)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const result = await createAccount(
      formData.email,
      formData.password,
      formData.tier,
      formData.fundAccess
    )
    
    if (result.success) {
      setFormData({ email: "", password: "", tier: "pro", fundAccess: false })
      setShowCreate(false)
      loadAccounts()
    } else {
      alert("Error: " + result.error)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this account?")) return
    const result = await deleteAccount(userId)
    if (result.success) {
      loadAccounts()
    }
  }

  async function handleUpgrade(userId: string, tier: "pro" | "elite", fundAccess: boolean) {
    const result = await updateAccountTier(userId, tier, fundAccess)
    if (result.success) {
      loadAccounts()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Account
        </button>
      </div>

      {/* Create Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Account</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) => {
                    const tier = e.target.value as "pro" | "elite"
                    setFormData({ 
                      ...formData, 
                      tier,
                      fundAccess: tier === "elite" ? true : formData.fundAccess
                    })
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="pro">Pro ($19/mo)</option>
                  <option value="elite">Elite / Fund ($49/mo)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fundAccess"
                  checked={formData.fundAccess}
                  onChange={(e) => setFormData({ ...formData, fundAccess: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="fundAccess" className="text-sm text-gray-700">
                  Grant Fund Access (early signals, backtests, fund page)
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund Access</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No accounts found
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-6 py-4">{account.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      account.tier === "elite" 
                        ? "bg-purple-100 text-purple-800" 
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {account.tier === "elite" ? <Crown size={12} /> : <User size={12} />}
                      {account.tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {account.fund_access ? (
                      <span className="text-green-600 font-medium">✓ Enabled</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(account.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {!account.fund_access && (
                        <button
                          onClick={() => handleUpgrade(account.id, "elite", true)}
                          className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Grant Fund
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Create Fund Account Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <h3 className="font-semibold text-gray-900 mb-2">Quick Fund Account Creation</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a fund-level access account with pre-filled credentials
        </p>
        <button
          onClick={() => {
            setFormData({
              email: "shataken@gmail.com",
              password: "C0zum3118421",
              tier: "elite",
              fundAccess: true
            })
            setShowCreate(true)
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
        >
          Create Fund Account (shataken@gmail.com)
        </button>
      </div>
    </div>
  )
}
