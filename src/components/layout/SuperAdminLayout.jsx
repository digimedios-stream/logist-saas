import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/superadmin',          icon: 'dashboard',     label: 'Dashboard',   end: true },
  { to: '/superadmin/empresas', icon: 'corporate_fare', label: 'Empresas' },
]

export default function SuperAdminLayout() {
  const { adminNombre, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar SuperAdmin */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-purple-900/30 flex flex-col py-6 z-50 shadow-2xl">
        {/* Logo / Branding */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-purple-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                admin_panel_settings
              </span>
            </div>
            <div>
              <h1 className="text-base font-black text-slate-100 tracking-tight">Super Admin</h1>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Plataforma SaaS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="px-3 pt-4 border-t border-slate-800 space-y-1">
          <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">account_circle</span>
            <span className="truncate font-medium">{adminNombre}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg w-full"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Header */}
        <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center px-8 gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Modo SuperAdmin</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden md:block">{adminNombre}</span>
            <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-400 text-lg">person</span>
            </div>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
