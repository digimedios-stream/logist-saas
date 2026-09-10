import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getOrdenesTrabajo,
  createOrdenTrabajo,
  updateOrdenTrabajo,
  getContenedores,
  getComexOperaciones
} from '@/services/comexService'
import { supabase } from '@/lib/supabase'

export default function OrdenesTrabajo() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [ots, setOts] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [operadores, setOperadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  // Modal Nueva OT
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nro_ot: '',
    tipo_ot: 'bajada_piso',
    operacion_id: '',
    contenedor_id: '',
    operador_id: '',
    prioridad: 'normal',
    origen_ubicacion: 'Plazoleta Bloque A',
    destino_ubicacion: 'Sector Consolidado',
    observaciones: ''
  })

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [oList, conts, ops, users] = await Promise.all([
        getOrdenesTrabajo(empresaId),
        getContenedores(empresaId),
        getComexOperaciones(empresaId),
        supabase.from('user_roles').select('id, nombre, rol').eq('empresa_id', empresaId)
      ])
      setOts(oList || [])
      setContenedores(conts || [])
      setOperaciones(ops || [])
      setOperadores(users.data || [])
    } catch (err) {
      console.error('Error cargando OTs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCrearOT = async (e) => {
    e.preventDefault()
    try {
      await createOrdenTrabajo({
        ...form,
        empresa_id: empresaId,
        nro_ot: form.nro_ot || `OT-${Date.now().toString().slice(-6)}`,
        estado: 'pendiente'
      })
      setShowModal(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error creando OT: ' + err.message)
    }
  }

  const handleCambiarEstadoOT = async (otId, nuevoEstado) => {
    try {
      await updateOrdenTrabajo(otId, {
        estado: nuevoEstado,
        ...(nuevoEstado === 'en_proceso' ? { fecha_inicio: new Date().toISOString() } : {}),
        ...(nuevoEstado === 'completada' ? { fecha_fin: new Date().toISOString() } : {})
      })
      cargarDatos()
    } catch (err) {
      console.error(err)
    }
  }

  const COLUMNAS_KANBAN = [
    { key: 'pendiente', label: 'Pendientes', color: 'border-slate-700 bg-slate-900/50' },
    { key: 'asignada', label: 'Asignadas en Campo', color: 'border-blue-500/40 bg-blue-950/20' },
    { key: 'en_proceso', label: 'En Ejecución 🚜', color: 'border-amber-500/40 bg-amber-950/20' },
    { key: 'completada', label: 'Completadas ✅', color: 'border-emerald-500/40 bg-emerald-950/20' },
  ]

  const otsFiltradas = ots.filter(o => filtroTipo === 'todos' || o.tipo_ot === filtroTipo)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <span className="material-symbols-outlined text-3xl">assignment</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Gestor de Órdenes de Trabajo (OT)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Despacho en Tiempo Real
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Asignación a operadores de grúa reach stacker, autoelevadores, apontadores y confirmación móvil.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              nro_ot: `OT-${Date.now().toString().slice(-6)}`,
              tipo_ot: 'bajada_piso',
              operacion_id: operaciones[0]?.id || '',
              contenedor_id: contenedores[0]?.id || '',
              operador_id: operadores[0]?.id || '',
              prioridad: 'normal',
              origen_ubicacion: 'Plazoleta Bloque A',
              destino_ubicacion: 'Sector Consolidado',
              observaciones: ''
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_task</span>
          + Nueva Orden de Trabajo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        {['todos', 'gate_in_inspeccion', 'bajada_piso', 'izaje_camion', 'reubicacion_plazoleta', 'tally_desconsolidado', 'consolidado_carga', 'devolucion_vacio'].map(t => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              filtroTipo === t
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNAS_KANBAN.map(col => {
          const otsCol = otsFiltradas.filter(o => o.estado === col.key)

          return (
            <div key={col.key} className={`border rounded-2xl p-4 flex flex-col space-y-3 min-h-[500px] ${col.color}`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">{col.label}</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-800 text-slate-300">
                  {otsCol.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {otsCol.map(ot => (
                  <div
                    key={ot.id}
                    className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-md hover:border-amber-500/50 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-300">{ot.nro_ot}</span>
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

                    <h4 className="text-sm font-bold text-slate-100 capitalize">
                      {ot.tipo_ot?.replace(/_/g, ' ')}
                    </h4>

                    <div className="text-xs text-slate-400 space-y-0.5">
                      <p>Contenedor: <strong className="text-cyan-300 font-mono">{ot.contenedor?.numero_contenedor || 'General'}</strong></p>
                      <p>Operador: <strong className="text-slate-200">{ot.operador?.nombre || 'Sin Asignar'}</strong></p>
                      {ot.destino_ubicacion && (
                        <p className="text-[11px] text-slate-400">Destino: {ot.destino_ubicacion}</p>
                      )}
                    </div>

                    {/* Acciones de cambio de estado rápido */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                      {col.key !== 'pendiente' && (
                        <button
                          onClick={() => handleCambiarEstadoOT(ot.id, 'pendiente')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-semibold rounded"
                        >
                          ←
                        </button>
                      )}
                      {col.key === 'pendiente' && (
                        <button
                          onClick={() => handleCambiarEstadoOT(ot.id, 'en_proceso')}
                          className="w-full py-1 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 text-xs font-bold rounded border border-amber-500/40"
                        >
                          Iniciar Ejecución →
                        </button>
                      )}
                      {col.key === 'en_proceso' && (
                        <button
                          onClick={() => handleCambiarEstadoOT(ot.id, 'completada')}
                          className="w-full py-1 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold rounded border border-emerald-500/40"
                        >
                          Finalizar OT ✅
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {otsCol.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-600 italic">
                    Sin órdenes en esta columna
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Nueva OT */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Crear y Despachar Orden de Trabajo (OT)</h3>
              <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleCrearOT} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro de OT *</label>
                  <input
                    type="text"
                    required
                    value={form.nro_ot}
                    onChange={e => setForm({ ...form, nro_ot: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de OT</label>
                  <select
                    value={form.tipo_ot}
                    onChange={e => setForm({ ...form, tipo_ot: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-semibold"
                  >
                    <option value="bajada_piso">Bajada a Piso (Grúa)</option>
                    <option value="izaje_camion">Izaje / Carga a Camión</option>
                    <option value="reubicacion_plazoleta">Reubicación en Plazoleta</option>
                    <option value="gate_in_inspeccion">Gate IN & Inspección</option>
                    <option value="tally_desconsolidado">Tally Desconsolidado</option>
                    <option value="consolidado_carga">Consolidado de Carga</option>
                    <option value="devolucion_vacio">Devolución de Vacío</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contenedor</label>
                  <select
                    value={form.contenedor_id}
                    onChange={e => setForm({ ...form, contenedor_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  >
                    <option value="">Seleccionar Contenedor</option>
                    {contenedores.map(c => (
                      <option key={c.id} value={c.id}>{c.numero_contenedor} ({c.tipo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Operador / Grúa Asignada</label>
                  <select
                    value={form.operador_id}
                    onChange={e => setForm({ ...form, operador_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="">Seleccionar Operador</option>
                    {operadores.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Origen Ubicación</label>
                  <input
                    type="text"
                    value={form.origen_ubicacion}
                    onChange={e => setForm({ ...form, origen_ubicacion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Destino Ubicación</label>
                  <input
                    type="text"
                    value={form.destino_ubicacion}
                    onChange={e => setForm({ ...form, destino_ubicacion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Instrucciones Operativas</label>
                <textarea
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Detalles para el operador en su smartphone/handheld..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow transition-all"
                >
                  Despachar OT a Campo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
