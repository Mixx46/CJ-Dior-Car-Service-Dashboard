function Bone({ className = '' }) {
  return <div className={`bg-gray-800 rounded animate-pulse ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-28" />
        <Bone className="h-6 w-20 rounded-full" />
      </div>
      <Bone className="h-5 w-48" />
      <div className="flex gap-3">
        <Bone className="h-4 w-36" />
        <Bone className="h-4 w-24" />
      </div>
      <Bone className="h-4 w-full" />
      <Bone className="h-4 w-3/4" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-800">
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-32 flex-1" />
          <Bone className="h-4 w-28" />
          <Bone className="h-4 w-40" />
          <Bone className="h-4 w-20" />
          <Bone className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Bone className="h-7 w-44" />
          <Bone className="h-4 w-36" />
        </div>
        <Bone className="h-9 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[...Array(5)].map((_, i) => <Bone key={i} className="h-20 rounded-lg" />)}
      </div>
      {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
