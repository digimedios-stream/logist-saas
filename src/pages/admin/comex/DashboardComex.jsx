import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getComexOperaciones,
  getContenedores,
  getPesadasBalanza,
  getOrdenesTrabajo,
  getDevolucionVacios,
  consultarCopilotoComexIA
} from '@/services/comexService'

export default function DashboardComex() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [loading, setLoading] = useState(true)
  const [operaciones, setOperaciones] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [pesadas, setPesadas] = useState([])
  const [ots, setOts] = useState([])
  const [vacios, setVacios] = useState([])

  // Copilot IA
  const [preguntaCopilot, setPreguntaCopilot] = useState('')
  const [respuestaCopilot, setRespuestaCopilot] = useState(null)
  const [consultandoCopilot, setConsultandoCopilot] = useState(false)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [ops, conts, pes, ordenes, devVacios] = await Promise.all([
        getComexOperaciones(empresaId),
        getContenedores(empresaId),
        getPesadasBalanza(empresaId),
        getOrdenesTrabajo(empresaId),
        getDevolucionVacios(empresaId)
      ])
      setOperaciones(ops || [])
      setContenedores(conts || [])
      setPesadas(pes || [])
      setOts(ordenes || [])
      setVacios(devVacios || [])
    } catch (err) {
      console.error('Error cargando métricas Comex:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cálculos de métricas
  const totalContenedores = contenedores.length
  const contenedoresCargados = contenedores.filter(c => c.estado_carga === 'cargado').length
  const contenedoresVacios = contenedores.filter(c => c.estado_carga === 'vacio').length
  const contenedoresReefer = contenedores.filter(c => c.tipo?.includes('REEFER')).length
  const otsPendientes = ots.filter(o => o.estado === 'pendiente' || o.estado === 'asignada').length
  const vaciosPorVencer = vacios.filter(v => v.estado === 'alerta_por_vencer' || v.estado === 'vencido_detention').length
  const pesadasHoy = pesadas.length

  const handleConsultarCopilot = async (e) => {
    e?.preventDefault()
    if (!preguntaCopilot.trim()) return
    setConsultandoCopilot(true)
    try {
      const res = await consultarCopilotoComexIA(preguntaCopilot, {
        total_contenedores: totalContenedores,
        cargados: contenedoresCargados,
        vacios: contenedoresVacios,
        reefer: contenedoresReefer,
        ots_pendientes: otsPendientes,
        vacios_alerta: vaciosPorVencer
      })
      setRespuestaCopilot(res.respuesta)
    } catch (err) {
      console.error(err)
      setRespuestaCopilot('Error al procesar la consulta con el asistente.')
    } finally {
      setConsultandoCopilot(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <span className="material-symbols-outlined text-3xl">anchor</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                Terminal Portuaria & Comercio Exterior
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold tracking-wide uppercase">
                  Depósito Fiscal
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Control de operaciones Impo/Expo, Plazoleta de Contenedores, Balanza, OTs de campo y Tally.
              </p>
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/comex/importaciones"
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">flight_land</span>
            + Impo
          </Link>
          <Link
            to="/admin/comex/exportaciones"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">flight_takeoff</span>
            + Expo
          </Link>
          <Link
            to="/admin/comex/plazoleta"
            className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">grid_view</span>
            Plazoleta
          </Link>
          <Link
            to="/admin/comex/balanza"
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">scale</span>
            Balanza
          </Link>
        </div>
      </div>

      {/* Tarjetas KPI de Primer Nivel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contenedores en Plazoleta */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stock Plazoleta</p>
              <h3 className="text-3xl font-black text-slate-100 mt-1">{totalContenedores}</h3>
              <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                {contenedoresCargados} Cargados • {contenedoresVacios} Vacíos
              </p>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <span className="material-symbols-outlined text-2xl">grid_view</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Reefers Activos:</span>
            <span className="text-cyan-300 font-bold">{contenedoresReefer}</span>
          </div>
        </div>

        {/* Órdenes de Trabajo Activas */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">OTs en Campo</p>
              <h3 className="text-3xl font-black text-amber-400 mt-1">{otsPendientes}</h3>
              <p className="text-xs text-slate-400 mt-1">Pendientes de grúa / operario</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <span className="material-symbols-outlined text-2xl">forklift</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Total OTs Registradas:</span>
            <span className="text-slate-200 font-bold">{ots.length}</span>
          </div>
        </div>

        {/* Balanza / Báscula */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pesadas Balanza</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1">{pesadasHoy}</h3>
              <p className="text-xs text-emerald-400/90 mt-1">Ingresos / Egresos pesados</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <span className="material-symbols-outlined text-2xl">scale</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Balanza Principal:</span>
            <span className="text-emerald-300 font-bold">Operativa 🟢</span>
          </div>
        </div>

        {/* Alerta Días Libres / Detention */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vencimiento Vacíos</p>
              <h3 className="text-3xl font-black text-rose-400 mt-1">{vaciosPorVencer}</h3>
              <p className="text-xs text-rose-300/80 mt-1">En riesgo de detention</p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <span className="material-symbols-outlined text-2xl">event_busy</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Navieras Monitoreadas:</span>
            <span className="text-slate-200 font-bold">{vacios.length}</span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Operaciones Recientes + Asistente Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Operaciones Comex Recientes (2 columnas) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">sync_alt</span>
                <h2 className="text-lg font-bold text-slate-100">Operaciones en Curso (Impo / Expo)</h2>
              </div>
              <Link to="/admin/comex/importaciones" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                Ver todas →
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">Cargando operaciones...</div>
            ) : operaciones.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/50">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">inventory_2</span>
                <p>No hay operaciones activas registradas aún.</p>
                <div className="mt-3 flex justify-center gap-2">
                  <Link
                    to="/admin/comex/importaciones"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Crear Importación
                  </Link>
                  <Link
                    to="/admin/comex/exportaciones"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Crear Exportación
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                      <th className="pb-3">Tipo / Nro</th>
                      <th className="pb-3">BL / Booking</th>
                      <th className="pb-3">Vapor / Buque</th>
                      <th className="pb-3">Canal</th>
                      <th className="pb-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {operaciones.slice(0, 5).map(op => (
                      <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-semibold text-slate-200">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs uppercase font-bold mr-2 ${
                            op.tipo_operacion === 'impo'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {op.tipo_operacion}
                          </span>
                          {op.nro_operacion}
                        </td>
                        <td className="py-3 text-cyan-300 font-mono text-xs">{op.bl_booking || 'S/D'}</td>
                        <td className="py-3 text-slate-300">{op.vapor || 'Sin asignar'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            op.canal_aduanero === 'rojo'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : op.canal_aduanero === 'naranja'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {op.canal_aduanero || 'verde'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-medium">
                            {op.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* OTs en Curso */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">assignment</span>
                <h2 className="text-lg font-bold text-slate-100">Órdenes de Trabajo Activas en Campo</h2>
              </div>
              <Link to="/admin/comex/ordenes-trabajo" className="text-xs text-amber-400 hover:text-amber-300 font-medium">
                Ir al Tablero OT →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ots.slice(0, 4).map(ot => (
                <div key={ot.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300">{ot.nro_ot}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      ot.prioridad === 'urgente'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : ot.prioridad === 'alta'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {ot.prioridad}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100 mt-1 capitalize">
                    {ot.tipo_ot?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Contenedor: <strong className="text-cyan-300">{ot.contenedor?.numero_contenedor || 'General'}</strong>
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Estado: <strong className="text-amber-300">{ot.estado}</strong></span>
                    <span>Operador: {ot.operador?.nombre || 'Sin asignar'}</span>
                  </div>
                </div>
              ))}
              {ots.length === 0 && (
                <p className="text-sm text-slate-500 italic col-span-2 text-center py-4">
                  No hay órdenes de trabajo pendientes en este momento.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Copilot Comex IA + Alertas de Días Libres */}
        <div className="space-y-6">
          {/* Asistente Copilot Comex */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-300">
                <span className="material-symbols-outlined text-2xl animate-pulse">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Copilot Portuario & Comex</h3>
                <p className="text-xs text-cyan-300/80">IA Inteligente para Terminales</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Pregúntame sobre optimización de apilado en plazoleta, vencimiento de días libres, destare de balanza o canales aduaneros.
            </p>

            <form onSubmit={handleConsultarCopilot} className="space-y-3">
              <textarea
                value={preguntaCopilot}
                onChange={(e) => setPreguntaCopilot(e.target.value)}
                placeholder="Ej: ¿Qué contenedores vacíos tienen riesgo de detention esta semana?"
                rows={3}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all resize-none"
              />
              <button
                type="submit"
                disabled={consultandoCopilot || !preguntaCopilot.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {consultandoCopilot ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Analizando con Gemini...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    Consultar Copilot
                  </>
                )}
              </button>
            </form>

            {respuestaCopilot && (
              <div className="mt-4 p-3.5 bg-slate-950/90 border border-cyan-500/30 rounded-xl text-xs text-slate-200 leading-relaxed animate-in fade-in">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1.5">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Recomendación del Asistente:
                </div>
                <div className="whitespace-pre-line">{respuestaCopilot}</div>
              </div>
            )}
          </div>

          {/* Semáforo de Días Libres Navieras (Detention Tracker) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">timer</span>
                <h3 className="font-bold text-slate-100 text-base">Días Libres / Detention</h3>
              </div>
              <Link to="/admin/comex/vacios" className="text-xs text-rose-400 hover:text-rose-300 font-medium">
                Gestionar →
              </Link>
            </div>

            <div className="space-y-3">
              {vacios.slice(0, 3).map(v => (
                <div key={v.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{v.contenedor?.numero_contenedor || 'Contenedor'}</p>
                    <p className="text-[11px] text-slate-400">{v.naviera} • Límite: {v.fecha_limite_devolucion || 'S/D'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                    v.estado === 'vencido_detention'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : v.estado === 'alerta_por_vencer'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {v.estado?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              {vacios.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-2">
                  No hay alertas de sobreestadía en este momento.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
