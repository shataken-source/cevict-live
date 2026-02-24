export default function CharterCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 animate-pulse">
      <div className="h-48 bg-gradient-to-br from-purple-100 to-violet-100" />
      <div className="p-6">
        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
        <div className="h-4 bg-gray-200 rounded mb-4 w-2/3" />
        
        <div className="flex items-center mb-4">
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>

        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="h-4 bg-gray-200 rounded mb-2" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 w-10 bg-gray-200 rounded-lg" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
          <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
