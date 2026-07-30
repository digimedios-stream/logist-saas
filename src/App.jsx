import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'
import ChoferLayout from '@/components/layout/ChoferLayout'
import SuperAdminLayout from '@/components/layout/SuperAdminLayout'

// Admin Pages
import Login from '@/pages/Login'
import AdminDashboard from '@/pages/admin/Dashboard'
import Vehiculos from '@/pages/admin/Vehiculos'
import VehiculoForm from '@/pages/admin/VehiculoForm'
import VehiculoDetalle from '@/pages/admin/VehiculoDetalle'
import Choferes from '@/pages/admin/Choferes'
import ChoferForm from '@/pages/admin/ChoferForm'
import Combustible from '@/pages/admin/Combustible'
import Mantenimientos from '@/pages/admin/Mantenimientos'
import Seguros from '@/pages/admin/Seguros'
import Multas from '@/pages/admin/Multas'
import LineasPage from '@/pages/admin/Lineas'
import Adicionales from '@/pages/admin/Adicionales'
import Mecanicos from '@/pages/admin/Mecanicos'
import Reportes from '@/pages/admin/Reportes'
import VtvRto from '@/pages/admin/VtvRto'
import LogsActividad from '@/pages/admin/LogsActividad'
import Usuarios from '@/pages/admin/Usuarios'
import Liquidaciones from '@/pages/admin/Liquidaciones'
import Documentos from '@/pages/admin/Documentos'
import AdminNovedades from '@/pages/admin/Novedades'
import MapaVisibilidad from '@/pages/admin/MapaVisibilidad'

// Chofer Pages
import ChoferDashboard from '@/pages/chofer/Dashboard'
import ChoferTurno from '@/pages/chofer/Turno'
import ChoferCombustible from '@/pages/chofer/Combustible'
import ChoferNovedades from '@/pages/chofer/Novedades'
import ChoferAdicionales from '@/pages/chofer/Adicionales'
import ChoferMantenimientos from '@/pages/chofer/Mantenimientos'
import TrackingViaje from '@/pages/chofer/TrackingViaje'

// SuperAdmin Pages
import SuperAdminDashboard from '@/pages/superadmin/Dashboard'
import GestionEmpresas from '@/pages/superadmin/GestionEmpresas'
import EmpresaDetalle from '@/pages/superadmin/EmpresaDetalle'

// ── Pantalla de carga ──────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-lazdin-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-lazdin-emerald/30 border-t-lazdin-emerald rounded-full animate-spin" />
        <p className="text-lazdin-on-surface-variant text-sm font-medium">Cargando...</p>
      </div>
    </div>
  )
}

// ── Protector de ruta autenticada ──────────────────────────────────
function PrivateRoute({ children, requiredRole }) {
  const { user, userRole, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  if (requiredRole && userRole !== requiredRole) {
    // Admins pueden entrar a rutas de chofer
    if (userRole === 'admin' && requiredRole === 'chofer') {
      // Permitido
    } else if (userRole === null) {
      return (
        <div className="min-h-screen bg-lazdin-bg flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Error de Perfil</h2>
          <p className="text-slate-400 max-w-sm">No pudimos cargar tu rol de sistema. Verifica tu conexión o contacta a soporte.</p>
        </div>
      )
    } else {
      return <Navigate to={userRole === 'admin' || userRole === 'superadmin' ? '/admin' : '/chofer'} replace />
    }
  }
  return children
}

// ── Protector de módulo (feature toggle) ──────────────────────────
function ModuleRoute({ modulo, children }) {
  const { tieneModulo } = useAuth()
  if (!tieneModulo(modulo)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-slate-600">lock</span>
        </div>
        <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
          Módulo no disponible
        </h2>
        <p className="text-slate-400 max-w-sm text-sm">
          Este módulo no está habilitado para tu empresa. Contactá a soporte para activarlo.
        </p>
      </div>
    )
  }
  return children
}

// ── Protector de ruta SuperAdmin ───────────────────────────────────
function SuperAdminRoute({ children }) {
  const { user, isSuperAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isSuperAdmin) return <Navigate to="/admin" replace />
  return children
}

// ── Componente principal ───────────────────────────────────────────
export default function App() {
  const { user, userRole, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <>
      <PWAInstallPrompt />
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            user && userRole
              ? <Navigate to={userRole === 'superadmin' ? '/superadmin' : userRole === 'admin' ? '/admin' : '/chofer'} replace />
              : <Login />
          }
        />

        {/* ── Rutas Admin ────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <PrivateRoute requiredRole="admin">
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="vehiculos" element={<Vehiculos />} />
          <Route path="vehiculos/nuevo" element={<VehiculoForm />} />
          <Route path="vehiculos/:id/editar" element={<VehiculoForm />} />
          <Route path="vehiculos/:id" element={<VehiculoDetalle />} />
          <Route path="choferes" element={<Choferes />} />
          <Route path="choferes/nuevo" element={<ChoferForm />} />
          <Route path="choferes/:id/editar" element={<ChoferForm />} />
          <Route path="mantenimientos" element={<Mantenimientos />} />
          <Route path="usuarios" element={<Usuarios />} />
          {/* Rutas con módulo requerido */}
          <Route path="combustible"   element={<ModuleRoute modulo="combustible"><Combustible /></ModuleRoute>} />
          <Route path="seguros"       element={<ModuleRoute modulo="seguros"><Seguros /></ModuleRoute>} />
          <Route path="multas"        element={<ModuleRoute modulo="multas"><Multas /></ModuleRoute>} />
          <Route path="lineas"        element={<ModuleRoute modulo="lineas"><LineasPage /></ModuleRoute>} />
          <Route path="adicionales"   element={<ModuleRoute modulo="adicionales"><Adicionales /></ModuleRoute>} />
          <Route path="mecanicos"     element={<ModuleRoute modulo="mecanicos"><Mecanicos /></ModuleRoute>} />
          <Route path="vtv"           element={<ModuleRoute modulo="vtv"><VtvRto /></ModuleRoute>} />
          <Route path="reportes"      element={<ModuleRoute modulo="reportes"><Reportes /></ModuleRoute>} />
          <Route path="mapa"          element={<MapaVisibilidad />} />
          <Route path="logs"          element={<ModuleRoute modulo="logs"><LogsActividad /></ModuleRoute>} />
          <Route path="liquidaciones" element={<ModuleRoute modulo="liquidaciones"><Liquidaciones /></ModuleRoute>} />
          <Route path="documentos"    element={<ModuleRoute modulo="documentos"><Documentos /></ModuleRoute>} />
          <Route path="novedades"     element={<ModuleRoute modulo="novedades"><AdminNovedades /></ModuleRoute>} />
        </Route>

        {/* ── Rutas Chofer ────────────────────────────────────── */}
        <Route
          path="/chofer"
          element={
            <PrivateRoute requiredRole="chofer">
              <ChoferLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<ChoferDashboard />} />
          <Route path="turno" element={<ChoferTurno />} />
          <Route path="combustible" element={<ChoferCombustible />} />
          <Route path="novedades" element={<ChoferNovedades />} />
          <Route path="adicionales" element={<ChoferAdicionales />} />
          <Route path="mantenimientos" element={<ChoferMantenimientos />} />
          <Route path="tracking" element={<TrackingViaje />} />
        </Route>

        {/* ── Rutas SuperAdmin ────────────────────────────────── */}
        <Route
          path="/superadmin"
          element={
            <SuperAdminRoute>
              <SuperAdminLayout />
            </SuperAdminRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="empresas" element={<GestionEmpresas />} />
          <Route path="empresas/:id" element={<EmpresaDetalle />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
