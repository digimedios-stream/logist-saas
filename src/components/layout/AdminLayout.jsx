import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const NAV_ITEMS = [
  { to: '/admin', icon: 'dashboard', label: 'Panel Control', end: true },
  { to: '/admin/vehiculos', icon: 'local_shipping', label: 'Flota' },
  { to: '/admin/choferes', icon: 'group', label: 'Choferes' },
  { to: '/admin/novedades', icon: 'notifications_active', label: 'Novedades' },
  { to: '/admin/lineas', icon: 'route', label: 'Líneas / Rutas' },
  { to: '/admin/adicionales', icon: 'local_mall', label: 'Adicionales' },
  { to: '/admin/combustible', icon: 'local_gas_station', label: 'Combustible' },
  { to: '/admin/mantenimientos', icon: 'build', label: 'Mantenimientos' },
  { to: '/admin/mecanicos', icon: 'engineering', label: 'Mecánicos' },
  { to: '/admin/seguros', icon: 'shield', label: 'Seguros' },
  { to: '/admin/vtv', icon: 'verified', label: 'VTV / RTO' },
  { to: '/admin/multas', icon: 'gavel', label: 'Multas' },
  { to: '/admin/documentos', icon: 'description', label: 'Documentos' },
  { to: '/admin/liquidaciones', icon: 'payments', label: 'Liquidaciones' },
  { to: '/admin/reportes', icon: 'analytics', label: 'Reportes' },
  { to: '/admin/logs', icon: 'history', label: 'Actividad' },
  { to: '/admin/usuarios', icon: 'manage_accounts', label: 'Usuarios' },
]

const MOBILE_NAV = [
  { to: '/admin', icon: 'dashboard', label: 'Panel', end: true },
  { to: '/admin/vehiculos', icon: 'local_shipping', label: 'Flota' },
  { to: '/admin/choferes', icon: 'group', label: 'Choferes' },
  { to: '/admin/reportes', icon: 'analytics', label: 'Reportes' },
]

export default function AdminLayout() {
  const { user, logout, adminNombre, choferData } = useAuth()
  const { tema, modoClaro, toggleTemaClaroOscuro } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-lazdin-bg flex flex-col">
      {/* Overlay para móvil cuando el menú está abierto */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Desktop & Mobile */}
      <aside className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 shadow-xl flex flex-col py-4 z-50 transition-all duration-300 
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'} 
        ${!sidebarOpen && 'md:flex'}`}
      >
        {/* Logo area */}
        <div className={`px-6 mb-6 ${!sidebarOpen && 'md:px-4'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-lazdin-primary-container rounded-lg flex items-center justify-center flex-shrink-0 border border-lazdin-outline-variant/20 shadow-lg">
              <span className="material-symbols-outlined text-lazdin-emerald text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            </div>
            {(sidebarOpen || (window.innerWidth < 768)) && (
              <div className={!sidebarOpen ? 'md:hidden' : ''}>
                <h1 className="text-lg font-black text-slate-100 tracking-tighter">Lazdin</h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Admin / Operativo</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle (Solo Desktop) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-md"
        >
          <span className="material-symbols-outlined text-sm">{sidebarOpen ? 'chevron_left' : 'chevron_right'}</span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 custom-scrollbar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => {
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ease-in-out duration-200 group ${
                  isActive
                    ? tema.sidebarActive
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                } ${!sidebarOpen && 'md:justify-center md:px-2'}`
              }
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {(sidebarOpen || (window.innerWidth < 768)) && (
                <span className={`text-sm font-medium truncate ${!sidebarOpen && 'md:hidden'}`}>{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pt-4 border-t border-slate-800 space-y-1">
          {choferData && (
            <NavLink
              to="/chofer"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ease-in-out duration-200 group text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 ${!sidebarOpen && 'md:justify-center md:px-2'}`}
              title={!sidebarOpen ? 'Vista Chofer' : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">person_pin_circle</span>
              {(sidebarOpen || (window.innerWidth < 768)) && (
                <span className={`text-sm font-bold truncate ${!sidebarOpen && 'md:hidden'}`}>VISTA CHOFER</span>
              )}
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg w-full ${!sidebarOpen && 'md:justify-center md:px-2'}`}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {(sidebarOpen || (window.innerWidth < 768)) && (
              <span className={`text-sm font-medium ${!sidebarOpen && 'md:hidden'}`}>Cerrar Sesión</span>
            )}
          </button>
        </div>
      </aside>

      {/* Top Navigation Bar */}
      <header className={`fixed top-0 right-0 z-30 h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm flex items-center justify-between px-6 transition-all duration-300 ${sidebarOpen ? 'md:left-64' : 'md:left-20'} left-0`}>
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile menu button */}
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span className="material-symbols-outlined">menu</span>
          </button>

          <span className="text-lg font-bold tracking-tighter text-lazdin-emerald md:hidden">Logística Lazdin</span>

          {/* Search */}
          <div className="relative w-full max-w-md hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
            <input
              className="w-full bg-slate-800/50 border-none rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 focus:ring-1 focus:ring-lazdin-emerald/50 placeholder:text-slate-500"
              placeholder="Buscar vehículo, chofer o ruta..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTemaClaroOscuro}
            className="p-2 text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors rounded-full active:scale-95 flex items-center justify-center"
            title={modoClaro ? "Modo oscuro" : "Modo claro"}
          >
            <span className="material-symbols-outlined">{modoClaro ? 'dark_mode' : 'light_mode'}</span>
          </button>
          <button className="p-2 text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors rounded-full active:scale-95">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-px bg-slate-800 mx-1 hidden sm:block" />
          <button className="flex items-center gap-2 p-1 pl-3 text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors rounded-full active:scale-95">
            <span className="text-xs font-semibold hidden lg:block">{adminNombre}</span>
            <span className="material-symbols-outlined text-2xl text-slate-200">account_circle</span>
          </button>
          {/* Botón de logout rápido para móvil */}
          <button 
            onClick={handleLogout}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 active:scale-90 transition-all ml-1"
            title="Cerrar Sesión"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className={`flex-1 pt-20 pb-8 px-4 md:px-8 transition-all duration-300 w-full ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={`mt-auto pt-6 pb-24 md:pb-6 px-8 border-t border-slate-800/50 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Sistemas en línea — v1.0.0</span>
          </div>
          <p>© 2026 DigimediosApps — Sistemas de Gestión</p>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-around items-center py-2 px-2 z-50">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                isActive
                  ? `${tema.accentText} ${tema.accentBg}`
                  : 'text-slate-500'
              }`
            }
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
