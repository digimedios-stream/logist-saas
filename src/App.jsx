import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'
import ChoferLayout from '@/components/layout/ChoferLayout'

// Pages
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

import ChoferDashboard from '@/pages/chofer/Dashboard'
import ChoferTurno from '@/pages/chofer/Turno'
import ChoferCombustible from '@/pages/chofer/Combustible'
import ChoferNovedades from '@/pages/chofer/Novedades'
import ChoferAdicionales from '@/pages/chofer/Adicionales'
import ChoferMantenimientos from '@/pages/chofer/Mantenimientos'

// Loading spinner
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

// Route protector
function PrivateRoute({ children, requiredRole }) {
  const { user, userRole, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  
  if (requiredRole && userRole !== requiredRole) {
    // Permitir que admins entren a rutas de chofer si es necesario
    if (userRole === 'admin' && requiredRole === 'chofer') {
      // Continuar (permitido)
    } else {
      if (userRole === null) {
        return (
          <div className="min-h-screen bg-lazdin-bg flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Error de Perfil</h2>
            <p className="text-slate-400 max-w-sm">No pudimos cargar tu rol de sistema. Verifica tu conexión o contacta a soporte.</p>
          </div>
        )
      }
      return <Navigate to={userRole === 'admin' ? '/admin' : '/chofer'} replace />
    }
  }
  return children
}

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
          element={user && userRole ? <Navigate to={userRole === 'admin' ? '/admin' : '/chofer'} replace /> : <Login />}
        />

        {/* Admin routes */}
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
          <Route path="combustible" element={<Combustible />} />
          <Route path="mantenimientos" element={<Mantenimientos />} />
          <Route path="seguros" element={<Seguros />} />
          <Route path="multas" element={<Multas />} />
          <Route path="lineas" element={<LineasPage />} />
          <Route path="adicionales" element={<Adicionales />} />
          <Route path="mecanicos" element={<Mecanicos />} />
          <Route path="vtv" element={<VtvRto />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="logs" element={<LogsActividad />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="liquidaciones" element={<Liquidaciones />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="novedades" element={<AdminNovedades />} />
        </Route>

        {/* Chofer routes */}
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
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
