export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow"><div className="text-sm text-gray-600">Stat 1</div><div className="text-3xl font-bold">0</div></div>
        <div className="bg-white p-6 rounded-lg shadow"><div className="text-sm text-gray-600">Stat 2</div><div className="text-3xl font-bold">0</div></div>
        <div className="bg-white p-6 rounded-lg shadow"><div className="text-sm text-gray-600">Stat 3</div><div className="text-3xl font-bold">0</div></div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900">🚀 Admin Active</h3>
        <p className="text-sm text-blue-700 mt-2">Connect database to see real data.</p>
      </div>
    </div>
  )
}
