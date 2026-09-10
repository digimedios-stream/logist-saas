import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getComexOperaciones,
  createComexOperacion,
  updateComexOperacion,
  createContenedor,
  createOrdenTrabajo,
  analizarDocumentoComexIA
} from '@/services/comexService'
import { supabase } from '@/lib/supabase'

export default function Exportaciones() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [operaciones, setOperaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [search, setSearch] = useState('')

  // Modal Crear/Editar Expo
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nro_operacion: '',
    bl_booking: '',
    vapor: '',
    viaje_buque: '',
    aduana_codigo: '001 - PTO BUENOS AIRES',
    permiso_embarque: '',
    cliente_id: '',
    exportador: '',
    consignatario: '',
    canal_aduanero: 'verde',
    estado: 'coordinado',
    fecha_arribo_estimada: '',
    observaciones: '',
    numero_contenedor: '',
    tipo_contenedor: '40HC',
    precinto_pema: '',
    precinto_naviera: '',
    naviera: 'Hapag-Lloyd'
  })
  const [guardando, setGuardando] = useState(false)
  const [procesandoIA, setProcesandoIA] = useState(false)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const data = await getComexOperaciones(empresaId, { tipo_operacion: 'expo' })
      setOperaciones(data || [])
    } catch (err) {
      console.error('Error cargando exportaciones:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalizarBookingConIA = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProcesandoIA(true)
    try {
      const extracted = await analizarDocumentoComexIA(file, 'Booking Note / Permiso de Embarque')
      if (extracted) {
        setForm(prev => ({
          ...prev,
          bl_booking: extracted.bl_booking || prev.bl_booking,
          nro_operacion: extracted.nro_operacion || `EXP-${Date.now().toString().slice(-6)}`,
          vapor: extracted.vapor || prev.vapor,
          viaje_buque: extracted.viaje_buque || prev.viaje_buque,
          exportador: extracted.exportador || prev.exportador,
          consignatario: extracted.consignatario || prev.consignatario,
          permiso_embarque: extracted.permiso_embarque || prev.permiso_embarque,
          canal_aduanero: extracted.canal_sugerido || prev.canal_aduanero,
          observaciones: extracted.resumen_mercaderia || prev.observaciones,
          numero_contenedor: extracted.contenedores?.[0]?.numero_contenedor || prev.numero_contenedor,
          tipo_contenedor: extracted.contenedores?.[0]?.tipo || prev.tipo_contenedor,
          precinto_pema: extracted.contenedores?.[0]?.precinto_pema || prev.precinto_pema,
          precinto_naviera: extracted.contenedores?.[0]?.precinto_naviera || prev.precinto_naviera,
          naviera: extracted.contenedores?.[0]?.naviera || prev.naviera,
        }))
      }
    } catch (err) {
      console.error('Error al analizar booking:', err)
    } finally {
      setProcesandoIA(false)
    }
  }

  const handleGuardarExportacion = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const opData = {
        empresa_id: empresaId,
        tipo_operacion: 'expo',
        nro_operacion: form.nro_operacion || `EXP-${Date.now().toString().slice(-6)}`,
        bl_booking: form.bl_booking,
        vapor: form.vapor,
        viaje_buque: form.viaje_buque,
        aduana_codigo: form.aduana_codigo,
        permiso_embarque: form.permiso_embarque,
        exportador: form.exportador,
        consignatario: form.consignatario,
        canal_aduanero: form.canal_aduanero,
        estado: form.estado,
        fecha_arribo_estimada: form.fecha_arribo_estimada ? new Date(form.fecha_arribo_estimada).toISOString() : null,
        observaciones: form.observaciones,
      }

      const createdOp = await createComexOperacion(opData)

      if (form.numero_contenedor) {
        const contenedor = await createContenedor({
          empresa_id: empresaId,
          numero_contenedor: form.numero_contenedor,
          tipo: form.tipo_contenedor,
          estado_carga: 'vacio',
          precinto_pema: form.precinto_pema,
          precinto_naviera: form.precinto_naviera,
          naviera: form.naviera,
          operacion_id: createdOp.id,
          estado_operativo: 'anunciado',
          ubicacion_bloque: 'B',
          ubicacion_bahia: '01',
          ubicacion_fila: '01',
          ubicacion_nivel: '1'
        })

        // Generar OT de consolidado / bajada a piso
        await createOrdenTrabajo({
          empresa_id: empresaId,
          nro_ot: `OT-EXP-${Date.now().toString().slice(-5)}`,
          tipo_ot: 'consolidado_carga',
          operacion_id: createdOp.id,
          contenedor_id: contenedor.id,
          prioridad: 'alta',
          estado: 'pendiente',
          observaciones: `Consolidación de carga de exportación y pesaje en balanza con permiso ${form.permiso_embarque || 's/d'}`
        })
      }

      setShowModal(false)
      cargarDatos()
    } catch (err) {
      console.error('Error guardando expo:', err)
      alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const opsFiltradas = operaciones.filter(op => {
    const matchEstado = filtroEstado === 'todos' || op.estado === filtroEstado
    const matchSearch =
      op.nro_operacion?.toLowerCase().includes(search.toLowerCase()) ||
      op.bl_booking?.toLowerCase().includes(search.toLowerCase()) ||
      op.exportador?.toLowerCase().includes(search.toLowerCase()) ||
      op.permiso_embarque?.toLowerCase().includes(search.toLowerCase())
    return matchEstado && matchSearch
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <span className="material-symbols-outlined text-3xl">flight_takeoff</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Módulo de Exportaciones (Expo)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Bookings & Consolidado
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Preingreso de mercadería, Permisos de embarque, pesaje de balanza y OTs de consolidado.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              nro_operacion: `EXP-${Date.now().toString().slice(-6)}`,
              bl_booking: '',
              vapor: '',
              viaje_buque: '',
              aduana_codigo: '001 - PTO BUENOS AIRES',
              permiso_embarque: '',
              cliente_id: '',
              exportador: '',
              consignatario: '',
              canal_aduanero: 'verde',
              estado: 'coordinado',
              fecha_arribo_estimada: '',
              observaciones: '',
              numero_contenedor: '',
              tipo_contenedor: '40HC',
              precinto_pema: '',
              precinto_naviera: '',
              naviera: 'Hapag-Lloyd'
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          Nueva Exportación
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Booking, Permiso, Exportador..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['todos', 'coordinado', 'en_transito', 'gate_in', 'en_plazoleta', 'en_tally', 'despachado'].map(st => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filtroEstado === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Exportaciones */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Cargando exportaciones...</div>
        ) : opsFiltradas.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">flight_takeoff</span>
            <p className="text-base font-medium">No se encontraron operaciones de exportación.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Operación / Booking</th>
                  <th className="py-3.5 px-4">Permiso Embarque</th>
                  <th className="py-3.5 px-4">Exportador (Shipper)</th>
                  <th className="py-3.5 px-4">Buque / Destino</th>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {opsFiltradas.map(op => (
                  <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100">{op.nro_operacion}</div>
                      <div className="text-xs font-mono text-emerald-300">BKG: {op.bl_booking || 'Sin Booking'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {op.permiso_embarque || 'Pendiente'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">
                      {op.exportador || 'S/D'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{op.vapor || 'Sin buque'}</div>
                      <div className="text-xs text-slate-400">{op.consignatario || 'Destino exterior'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        op.canal_aduanero === 'rojo'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : op.canal_aduanero === 'naranja'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        Canal {op.canal_aduanero || 'verde'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs bg-slate-800 text-emerald-300 font-semibold px-2.5 py-1 rounded-md capitalize">
                        {op.estado?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={async () => {
                          const nuevoEstado = prompt('Cambiar estado a: coordinado, en_transito, gate_in, en_plazoleta, en_tally, despachado', op.estado)
                          if (nuevoEstado) {
                            await updateComexOperacion(op.id, { estado: nuevoEstado })
                            cargarDatos()
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Expo */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">flight_takeoff</span>
                <h2 className="text-lg font-bold text-slate-100">Nueva Operación de Exportación</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200 material-symbols-outlined">
                close
              </button>
            </div>

            {/* Banner Extractor Gemini */}
            <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base animate-pulse">auto_awesome</span>
                  Escanear Booking Note o Permiso con IA
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extrae automáticamente los datos del Booking, buque asignado, exportador y precintos.
                </p>
              </div>
              <label className="cursor-pointer px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 whitespace-nowrap transition-all">
                {procesandoIA ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Extrayendo datos...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Escanear Documento Expo
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleAnalizarBookingConIA}
                  disabled={procesandoIA}
                  className="hidden"
                />
              </label>
            </div>

            <form onSubmit={handleGuardarExportacion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro de Operación *</label>
                  <input
                    type="text"
                    required
                    value={form.nro_operacion}
                    onChange={e => setForm({ ...form, nro_operacion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Booking Number (BKG) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: BKG-HLC-98214"
                    value={form.bl_booking}
                    onChange={e => setForm({ ...form, bl_booking: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Permiso de Embarque</label>
                  <input
                    type="text"
                    placeholder="Ej: 24-001-PE01-98214A"
                    value={form.permiso_embarque}
                    onChange={e => setForm({ ...form, permiso_embarque: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Exportador (Shipper Remitente)</label>
                  <input
                    type="text"
                    placeholder="Razón Social del Exportador"
                    value={form.exportador}
                    onChange={e => setForm({ ...form, exportador: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Consignatario / Destinatario Exterior</label>
                  <input
                    type="text"
                    placeholder="Empresa receptora en destino"
                    value={form.consignatario}
                    onChange={e => setForm({ ...form, consignatario: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vapor / Buque Designado</label>
                  <input
                    type="text"
                    placeholder="Ej: HAPAG RIO DE JANEIRO"
                    value={form.vapor}
                    onChange={e => setForm({ ...form, vapor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Canal Aduanero</label>
                  <select
                    value={form.canal_aduanero}
                    onChange={e => setForm({ ...form, canal_aduanero: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-semibold"
                  >
                    <option value="verde">Canal Verde</option>
                    <option value="naranja">Canal Naranja</option>
                    <option value="rojo">Canal Rojo</option>
                  </select>
                </div>
              </div>

              {/* Contenedor asignado */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">grid_view</span>
                  Contenedor para Carga / Consolidación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nro Contenedor</label>
                    <input
                      type="text"
                      placeholder="Ej: HLXU8912345"
                      value={form.numero_contenedor}
                      onChange={e => setForm({ ...form, numero_contenedor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
                    <select
                      value={form.tipo_contenedor}
                      onChange={e => setForm({ ...form, tipo_contenedor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    >
                      <option value="40HC">40' High Cube (HC)</option>
                      <option value="20DC">20' Dry Cargo (DC)</option>
                      <option value="40DC">40' Dry Cargo (DC)</option>
                      <option value="40REEFER">40' Reefer Refrigerado</option>
                      <option value="20REEFER">20' Reefer Refrigerado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Precinto PEMA</label>
                    <input
                      type="text"
                      placeholder="Precinto Oficial"
                      value={form.precinto_pema}
                      onChange={e => setForm({ ...form, precinto_pema: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Naviera</label>
                    <input
                      type="text"
                      placeholder="Hapag-Lloyd, etc."
                      value={form.naviera}
                      onChange={e => setForm({ ...form, naviera: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Observaciones Operativas</label>
                <textarea
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Detalles de embalaje, pesada de báscula obligatoria..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear Exportación & OT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
