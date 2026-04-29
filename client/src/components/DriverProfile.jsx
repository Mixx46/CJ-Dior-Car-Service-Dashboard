import { Star } from 'lucide-react';

export default function DriverProfile({ profile }) {
  return (
    <div className="p-6 border-b border-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-3xl font-bold text-black">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
            <p className="text-gray-400">{profile.vehicle} • {profile.license_id}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-yellow-500">
                {profile.average_rating || 0}
              </span>
              <span className="text-gray-500 text-sm">
                ({profile.total_reviews || 0} {profile.total_reviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-900 rounded border border-gray-800 p-4 text-center">
          <div className="text-3xl font-bold text-white">{profile.active || 0}</div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="bg-gray-900 rounded border border-gray-800 p-4 text-center">
          <div className="text-3xl font-bold text-emerald-400">{profile.completed || 0}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-900 rounded border border-gray-800 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-500">${(profile.total_tips || 0).toFixed(0)}</div>
          <div className="text-sm text-gray-400">Tips</div>
        </div>
      </div>
    </div>
  );
}
