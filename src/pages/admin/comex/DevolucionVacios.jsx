import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDevolucionVacios,
  createDevolucionVacio,
  updateDevolucionVacio,
  getContenedores,
  createOrdenTrabajo
} from '@/services/comexService'

export default function DevolucionVacios() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [vacios, setVacios] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal Nuevo Registro
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    contenedor_id: '',
    naviera: 'MSC',
    fecha_arribo_puerto: new Date().toISOString().split('T')[0],
    dias_libres: 7,
    fecha_limite_devolucion: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    deposito_devolucion: 'Terminal 4 - Depósito de Vacíos',
    costo_detention_diario: 120
  })

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [vList, conts] = await Promise.all([
        getDevolucionVacios(empresaId),
        getContenedores(empresaId)
      ])
      setVacios(vList || [])
      setContenedores(conts || [])
    } catch (err) {
      console.error('Error cargando vacíos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCrearRegistro = async (e) => {
    e.preventDefault()
    if (!form.contenedor_id) {
      alert('Selecciona un contenedor')
      return
    }
    try {
      await createDevolucionVacio({
        ...form,
        empresa_id: empresaId,
        estado: 'en_tiempo'
      })
      setShowModal(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error: ' + err.message)
    }
  }

  // Despachar OT de Devolución
  const handleDespacharOTDevolucion = async (vacio) => {
    try {
      await createOrdenTrabajo({
        empresa_id: empresaId,
        nro_ot: `OT-VAC-${Date.now().toString().slice(-5)}`,
        tipo_ot: 'devolucion_vacio',
        contenedor_id: vacio.contenedor_id,
        prioridad: 'urgente',
        estado: 'pendiente',
        observaciones: `Devolución de vacío a ${vacio.deposito_devolucion} (Naviera ${vacio.naviera}). Vencimiento: ${vacio.fecha_limite_devolucion}`
      })
      alert('¡Orden de Trabajo (OT) de devolución generada con éxito!')
    } catch (err) {
      console.error(err)
      alert('Error generando OT: ' + err.message)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <span className="material-symbols-outlined text-3xl">event_repeat</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Gestión de Devolución de Vacíos & Detention
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                Control Free Days
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Monitoreo de sobreestadía, vencimientos de días libres de navieras y generación de OTs de retiro.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              contenedor_id: contenedores[0]?.id || '',
              naviera: 'MSC',
              fecha_arribo_puerto: new Date().toISOString().split('T')[0],
              dias_libres: 7,
              fecha_limite_devolucion: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              deposito_devolucion: 'Terminal 4 - Depósito de Vacíos',
              costo_detention_diario: 120
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          + Registrar Contenedor para Devolución
        </button>
      </div>

      {/* Tabla de Vencimientos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm">Monitoreo de Días Libres y Plazo de Devolución</h3>
          <span className="text-xs text-slate-400">{vacios.length} unidades en control</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Cargando monitoreo de vacíos...</div>
        ) : vacios.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">event_available</span>
            <p className="text-base font-medium">No hay contenedores registrados en control de vacíos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Contenedor / Tipo</th>
                  <th className="py-3 px-4">Naviera</th>
                  <th className="py-3 px-4">Días Libres</th>
                  <th className="py-3 px-4">Fecha Límite</th>
                  <th className="py-3 px-4">Depósito de Entrega</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vacios.map(v => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-cyan-300">{v.contenedor?.numero_contenedor || 'Contenedor'}</div>
                      <div className="text-xs text-slate-400">{v.contenedor?.tipo || '40HC'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-semibold">{v.naviera}</td>
                    <td className="py-3.5 px-4 text-slate-300">{v.dias_libres} días</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-rose-300 font-bold">
                      {v.fecha_limite_devolucion || 'S/D'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">{v.deposito_devolucion}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        v.estado === 'vencido_detention'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                          : v.estado === 'alerta_por_vencer'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {v.estado?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDespacharOTDevolucion(v)}
                        className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-semibold border border-rose-500/30 transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <span className="material-symbols-outlined text-sm">local_shipping</span>
                        Generar OT Devolución
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Alta */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Registrar Control de Devolución de Vacío</h3>
              <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleCrearRegistro} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contenedor *</label>
                <select
                  required
                  value={form.contenedor_id}
                  onChange={e => setForm({ ...form, contenedor_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                >
                  <option value="">Seleccionar Contenedor</option>
                  {contenedores.map(c => (
                    <option key={c.id} value={c.id}>{c.numero_contenedor} ({c.tipo}) - {c.naviera}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Naviera</label>
                  <input
                    type="text"
                    value={form.naviera}
                    onChange={e => setForm({ ...form, naviera: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Días Libres Pactados</label>
                  <input
                    type="number"
                    value={form.dias_libres}
                    onChange={e => setForm({ ...form, dias_libres: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Límite Devolución</label>
                  <input
                    type="date"
                    value={form.fecha_limite_devolucion}
                    onChange={e => setForm({ ...form, fecha_limite_devolucion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Detention Diario (USD)</label>
                  <input
                    type="number"
                    value={form.costo_detention_diario}
                    onChange={e => setForm({ ...form, costo_detention_diario: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Depósito / Terminal de Entrega</label>
                <input
                  type="text"
                  value={form.deposito_devolucion}
                  onChange={e => setForm({ ...form, deposito_devolucion: e.target.value })}
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
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                >
                  Guardar Control
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
