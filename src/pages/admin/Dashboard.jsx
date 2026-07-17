import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getSaludo, formatFechaCorta, estadoVencimiento, formatKm, formatConsumo, formatMoneda } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

function KPICard({ icon, label, value, badge, badgeColor, borderColor }) {
  return (
    <div className={`kpi-card border-l-4 ${borderColor}`}>
      <div className="flex justify-between items-start mb-4">
        <span className={`material-symbols-outlined text-3xl ${borderColor.replace('border-l-', 'text-')}`}>{icon}</span>
        {badge && (
          <span className={`text-xs font-bold px-2 py-1 rounded ${badgeColor}`}>{badge}</span>
        )}
      </div>
      <h3 className="text-lazdin-on-surface-variant text-xs font-bold uppercase tracking-wider">{label}</h3>
      <p className="text-3xl font-black mt-1 text-lazdin-on-surface">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { adminNombre } = useAuth()
  const [stats, setStats] = useState(null)
  const [vencimientos, setVencimientos] = useState([])
  const [mantenimientosPendientes, setMantenimientosPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      // Dashboard stats
      const { data: statsData } = await supabase.rpc('fn_dashboard_stats')
      setStats(statsData)

      // Próximos vencimientos
      const { data: venc } = await supabase.rpc('fn_obtener_vencimientos_proximos', { p_dias: 60 })
      setVencimientos(venc || [])

      // Mantenimientos pendientes / próximos (800km)
      const { data: mants } = await supabase
        .from('mantenimientos')
        .select(`
          id, 
          descripcion, 
          proximo_km, 
          estado,
          fecha,
          vehiculo:vehiculos(id, patente, marca, modelo, kilometraje_actual)
        `)
        .eq('estado', 'programado')

      if (mants) {
         // Agrupar por vehículo y quedarse con el que tiene el mayor proximo_km
         const mantsMap = new Map();
         mants.forEach(m => {
            if (!m.vehiculo || !m.proximo_km) return;
            const existing = mantsMap.get(m.vehiculo.id);
            if (!existing || m.proximo_km > existing.proximo_km) {
                mantsMap.set(m.vehiculo.id, m);
            }
         });

         const pendientes = Array.from(mantsMap.values()).filter(m => {
           return m.vehiculo.kilometraje_actual >= (m.proximo_km - 800)
         }).sort((a, b) => (a.proximo_km - a.vehiculo.kilometraje_actual) - (b.proximo_km - b.vehiculo.kilometraje_actual))
         
         setMantenimientosPendientes(pendientes)
      }

    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-lazdin-surface-high rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-lazdin-surface rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{getSaludo()}, {adminNombre}</h2>
        <p className="text-lazdin-on-surface-variant text-sm mt-1">Estado actual de la red logística de Lazdin</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <KPICard
          icon="local_shipping"
          label="Total Vehículos"
          value={stats?.total_vehiculos || 0}
          badge={`${stats?.vehiculos_propios || 0}P / ${stats?.vehiculos_terceros || 0}T`}
          badgeColor="text-lazdin-emerald bg-lazdin-emerald-dark/50"
          borderColor="border-l-blue-400"
        />
        <KPICard
          icon="person_pin"
          label="Conductores Activos"
          value={stats?.choferes_activos || 0}
          badge={`${stats?.turnos_activos || 0} en turno`}
          badgeColor="text-lazdin-emerald bg-lazdin-emerald-dark/50"
          borderColor="border-l-lazdin-emerald"
        />
        <KPICard
          icon="event_busy"
          label="Vencimientos Doc."
          value={String(stats?.proximos_vencimientos || 0).padStart(2, '0')}
          badge="Revisar"
          badgeColor="text-red-400 bg-red-900/20"
          borderColor="border-l-red-400"
        />
        <KPICard
          icon="build"
          label="Services Requeridos"
          value={String(mantenimientosPendientes.length).padStart(2, '0')}
          badge={mantenimientosPendientes.filter(m => m.vehiculo.kilometraje_actual >= m.proximo_km).length + " Vencidos"}
          badgeColor={mantenimientosPendientes.some(m => m.vehiculo.kilometraje_actual >= m.proximo_km) ? "text-red-400 bg-red-900/20" : "text-amber-400 bg-amber-900/20"}
          borderColor={mantenimientosPendientes.some(m => m.vehiculo.kilometraje_actual >= m.proximo_km) ? "border-l-red-400" : "border-l-amber-400"}
        />
        <KPICard
          icon="speed"
          label="Consumo Medio"
          value={stats?.consumo_medio ? `${stats.consumo_medio}` : '—'}
          badge="L/100km"
          badgeColor="text-sky-400 bg-sky-900/20"
          borderColor="border-l-sky-400"
        />
      </div>

      {/* Charts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gastos por Categoría */}
        <div className="lg:col-span-2 bg-lazdin-surface rounded-xl p-6 border border-lazdin-outline-variant/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Resumen Operativo</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-lazdin-surface-high/50 p-4 rounded-lg text-center">
              <span className="material-symbols-outlined text-amber-400 text-2xl mb-2">pending_actions</span>
              <p className="text-2xl font-bold">{stats?.adicionales_pendientes || 0}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Adicionales Pend.</p>
            </div>
            <div className="bg-lazdin-surface-high/50 p-4 rounded-lg text-center">
              <span className="material-symbols-outlined text-lazdin-emerald text-2xl mb-2">local_gas_station</span>
              <p className="text-2xl font-bold">{stats?.consumo_medio || '—'}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">L/100km Promedio</p>
            </div>
            <Link to="/admin/novedades" className="bg-lazdin-surface-high/50 p-4 rounded-lg text-center hover:bg-lazdin-surface-highest transition-all active:scale-95 group">
              <span className="material-symbols-outlined text-blue-400 text-2xl mb-2 group-hover:animate-bounce">mark_email_unread</span>
              <p className="text-2xl font-bold">{stats?.novedades_no_leidas || 0}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Novedades</p>
            </Link>
            <div className="bg-lazdin-surface-high/50 p-4 rounded-lg text-center">
              <span className="material-symbols-outlined text-red-400 text-2xl mb-2">gavel</span>
              <p className="text-2xl font-bold">{stats?.multas_pendientes || 0}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Multas Pend.</p>
            </div>
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="bg-lazdin-surface rounded-xl p-6 border border-lazdin-outline-variant/20">
          <h3 className="font-bold text-lg mb-6">Accesos Rápidos</h3>
          <div className="space-y-3">
            <Link to="/admin/vehiculos/nuevo" className="flex items-center gap-3 p-3 bg-lazdin-surface-high rounded-lg hover:bg-lazdin-surface-highest transition-colors">
              <span className="material-symbols-outlined text-lazdin-emerald">add_circle</span>
              <span className="text-sm font-medium">Registrar Vehículo</span>
            </Link>
            <Link to="/admin/choferes/nuevo" className="flex items-center gap-3 p-3 bg-lazdin-surface-high rounded-lg hover:bg-lazdin-surface-highest transition-colors">
              <span className="material-symbols-outlined text-blue-400">person_add</span>
              <span className="text-sm font-medium">Nuevo Chofer</span>
            </Link>
            <Link to="/admin/reportes" className="flex items-center gap-3 p-3 bg-lazdin-surface-high rounded-lg hover:bg-lazdin-surface-highest transition-colors">
              <span className="material-symbols-outlined text-amber-400">analytics</span>
              <span className="text-sm font-medium">Ver Reportes</span>
            </Link>
            <Link to="/admin/combustible" className="flex items-center gap-3 p-3 bg-lazdin-surface-high rounded-lg hover:bg-lazdin-surface-highest transition-colors">
              <span className="material-symbols-outlined text-sky-400">local_gas_station</span>
              <span className="text-sm font-medium">Control Combustible</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Próximos Vencimientos Table */}
      <div className="bg-lazdin-surface rounded-xl overflow-hidden border border-lazdin-outline-variant/20 shadow-sm">
        <div className="p-6 border-b border-lazdin-outline-variant/20 flex items-center justify-between">
          <h3 className="font-bold text-lg">Próximos Vencimientos</h3>
          <span className="text-lazdin-on-surface-variant text-sm">{vencimientos.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-lazdin-surface-low text-xs font-bold uppercase text-lazdin-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Vehículo</th>
                <th className="px-6 py-4">Fecha Límite</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lazdin-outline-variant/10 text-sm">
              {vencimientos.slice(0, 8).map((v, i) => {
                const estado = estadoVencimiento(v.fecha_vencimiento)
                return (
                  <tr key={i} className="table-row-hover">
                    <td className="px-6 py-4 font-medium">{v.entidad_tipo}</td>
                    <td className="px-6 py-4">{v.descripcion}</td>
                    <td className="px-6 py-4 font-mono text-sm">{v.vehiculo_patente || v.chofer_nombre || '—'}</td>
                    <td className="px-6 py-4">{formatFechaCorta(v.fecha_vencimiento)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge-${estado.urgencia === 'critico' || estado.urgencia === 'urgente' ? 'urgente' : estado.urgencia === 'proximo' ? 'pendiente' : 'vigente'}`}>
                        {estado.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {vencimientos.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-lazdin-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">check_circle</span>
                    No hay vencimientos próximos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mantenimientos Table */}
      {mantenimientosPendientes.length > 0 && (
        <div className="bg-lazdin-surface rounded-xl overflow-hidden border border-lazdin-outline-variant/20 shadow-sm mt-8">
          <div className="p-6 border-b border-lazdin-outline-variant/20 flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">build</span>
              Alertas de Mantenimiento
            </h3>
            <span className="text-lazdin-on-surface-variant text-sm">{mantenimientosPendientes.length} vehículos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-lazdin-surface-low text-xs font-bold uppercase text-lazdin-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">Vehículo</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Km Actual</th>
                  <th className="px-6 py-4">Programado</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazdin-outline-variant/10 text-sm">
                {mantenimientosPendientes.map((m, i) => {
                  const vencido = m.vehiculo.kilometraje_actual >= m.proximo_km
                  const restantes = m.proximo_km - m.vehiculo.kilometraje_actual
                  return (
                    <tr key={i} className="table-row-hover">
                      <td className="px-6 py-4 font-medium">{m.vehiculo.marca} {m.vehiculo.modelo} ({m.vehiculo.patente})</td>
                      <td className="px-6 py-4">{m.descripcion}</td>
                      <td className="px-6 py-4 font-mono text-sm">{formatKm(m.vehiculo.kilometraje_actual)}</td>
                      <td className="px-6 py-4 font-mono text-sm">{formatKm(m.proximo_km)}</td>
                      <td className="px-6 py-4">
                        <span className={`badge-${vencido ? 'urgente' : 'pendiente'}`}>
                          {vencido ? 'VENCIDO' : `Faltan ${restantes} km`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
