export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 p-4 sm:p-6 animate-pulse">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 sm:h-10 bg-gray-200 rounded w-64 mb-6" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-md">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-md">
              <div className="h-5 bg-gray-200 rounded w-40 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
