import { Clock, Calendar, LayoutList, Users, UserRound, Star, Settings, Map } from 'lucide-react';

const NAV = [
  { id: 'today',     label: "Today's Runs",    icon: Clock        },
  { id: 'upcoming',  label: 'Upcoming',         icon: Calendar     },
  { id: 'all',       label: 'All Reservations', icon: LayoutList   },
  { id: 'drivers',   label: 'Drivers',          icon: Users        },
  { id: 'customers', label: 'Customers',        icon: UserRound    },
  { id: 'map',       label: 'Live Map',         icon: Map          },
  { id: 'reviews',   label: 'Reviews',          icon: Star         },
  { id: 'settings',  label: 'Settings',         icon: Settings     },
];

export default function Sidebar({ currentView, onNavigate }) {
  return (
    <aside className="w-60 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-black font-bold text-sm shrink-0">
            CJ
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">CJ Dior</div>
            <div className="text-gray-500 text-[10px] uppercase tracking-widest">Car Service</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest">Dispatch Console</p>
      </div>
    </aside>
  );
}
