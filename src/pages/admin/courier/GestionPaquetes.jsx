import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getCourierPaquetes,
  createCourierPaquete,
  updateCourierPaquete,
  deleteCourierPaquete,
  getDepositosFiscales,
  getPosicionesDeposito,
  generarTrackingCode,
  calcularEstadia
} from '@/services/courierService'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'
import { supabase } from '@/lib/supabase'

const ESTADOS_PAQUETE = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'recibido_deposito', label: 'Recibido en Depósito', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { value: 'almacenado', label: 'Almacenado en Rack', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  { value: 'en_aforo', label: 'En Inspección / Aforo', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'liberado_aduana', label: 'Liberado / Nacionalizado', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'listo_despacho', label: 'Listo para Despacho', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { value: 'en_reparto', label: 'En Reparto', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-500/15 text-green-300 border-green-500/30' },
  { value: 'retenido_aduana', label: 'Retenido Aduana', color: 'bg-red-500/15 text-red-300 border-red-500/30' }
]

export default function GestionPaquetes() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [paquetes, setPaquetes] = useState([])
  const [clientes, setClientes] = useState([])
  const [posiciones, setPosiciones] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Modales
  const [showModalCrear, setShowModalCrear] = useState(false)
  const [showModalEtiqueta, setShowModalEtiqueta] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Formulario nuevo paquete
  const [formData, setFormData] = useState({
    tracking_code: '',
    descripcion_contenido: '',
    categoria: 'general',
    peso_kg: 1.5,
    volumen_m3: 0.02,
    alto_cm: 20,
    ancho_cm: 30,
    largo_cm: 40,
    valor_declarado_usd: 150,
    cliente_id: '',
    posicion_id: '',
    destinatario_nombre: '',
    destinatario_documento: '',
    destinatario_telefono: '',
    destinatario_email: '',
    destinatario_direccion: '',
    destinatario_localidad: '',
    destinatario_provincia: 'Buenos Aires',
    destinatario_lat: -34.6037,
    destinatario_lon: -58.3816,
    estado: 'recibido_deposito',
    notas: ''
  })

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [paqs, { data: cls }, deps] = await Promise.all([
        getCourierPaquetes(empresaId),
        supabase.from('clientes').select('id, nombre_empresa, nombre_responsable').eq('empresa_id', empresaId),
        getDepositosFiscales(empresaId)
      ])
      setPaquetes(paqs)
      setClientes(cls || [])

      if (deps.length > 0) {
        const pos = await getPosicionesDeposito(deps[0].id)
        setPosiciones(pos)
      }
    } catch (err) {
      console.error('Error cargando paquetes:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNuevo() {
    setFormData({
      tracking_code: generarTrackingCode(),
      descripcion_contenido: '',
      categoria: 'general',
      peso_kg: 1.5,
      volumen_m3: 0.02,
      alto_cm: 20,
      ancho_cm: 30,
      largo_cm: 40,
      valor_declarado_usd: 150,
      cliente_id: clientes[0]?.id || '',
      posicion_id: posiciones[0]?.id || '',
      destinatario_nombre: '',
      destinatario_documento: '',
      destinatario_telefono: '',
      destinatario_email: '',
      destinatario_direccion: '',
      destinatario_localidad: '',
      destinatario_provincia: 'Buenos Aires',
      destinatario_lat: -34.6037,
      destinatario_lon: -58.3816,
      estado: 'recibido_deposito',
      notas: ''
    })
    setShowModalCrear(true)
  }

  async function handleCrearPaquete(e) {
    e.preventDefault()
    if (!formData.destinatario_nombre || !formData.destinatario_direccion) return
    setGuardando(true)
    try {
      const payload = {
        ...formData,
        empresa_id: empresaId,
        posicion_id: formData.posicion_id || null,
        cliente_id: formData.cliente_id || null
      }
      const nuevo = await createCourierPaquete(payload)
      setPaquetes(prev => [nuevo, ...prev])
      setShowModalCrear(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error registrando paquete')
    } finally {
      setGuardando(false)
    }
  }

  async function handleCambiarEstado(paqueteId, nuevoEstado) {
    try {
      await updateCourierPaquete(paqueteId, {
        estado: nuevoEstado,
        fecha_liberacion: nuevoEstado === 'liberado_aduana' ? new Date().toISOString() : undefined
      })
      setPaquetes(prev => prev.map(p => (p.id === paqueteId ? { ...p, estado: nuevoEstado } : p)))
    } catch (err) {
      console.error(err)
      alert('Error actualizando estado')
    }
  }

  async function handleEliminar(paqueteId) {
    if (!window.confirm('¿Seguro que deseas eliminar este bulto del sistema?')) return
    try {
      await deleteCourierPaquete(paqueteId)
      setPaquetes(prev => prev.filter(p => p.id !== paqueteId))
    } catch (err) {
      console.error(err)
      alert('Error eliminando paquete')
    }
  }

  // Filtrar paquetes
  const paquetesFiltrados = paquetes.filter(p => {
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    const query = busqueda.toLowerCase()
    const matchBusqueda =
      !busqueda ||
      p.tracking_code?.toLowerCase().includes(query) ||
      p.destinatario_nombre?.toLowerCase().includes(query) ||
      p.destinatario_direccion?.toLowerCase().includes(query) ||
      p.descripcion_contenido?.toLowerCase().includes(query)
    return matchEstado && matchBusqueda
  })

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">package_2</span>
            Paquetería & Envíos Courier
          </h1>
          <p className="text-sm text-slate-400">
            Control de bultos importados, guías de seguimiento, etiquetas térmicas y despacho de última milla.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={abrirModalNuevo}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-emerald-950/40"
          >
            <span className="material-symbols-outlined text-lg">add_box</span>
            Nuevo Bulto / Paquete
          </button>
        </div>
      </div>

      {/* Barra de Filtros & Búsqueda */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por tracking, destinatario o contenido..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-emerald-500"
          >
            {ESTADOS_PAQUETE.map(est => (
              <option key={est.value} value={est.value}>
                {est.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Paquetes */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Tracking / Código</th>
                <th className="px-4 py-3.5">Destinatario & Destino</th>
                <th className="px-4 py-3.5">Detalle Carga</th>
                <th className="px-4 py-3.5">Ubicación Rack</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : paquetesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No se encontraron paquetes registrados con esos filtros.
                  </td>
                </tr>
              ) : (
                paquetesFiltrados.map(paq => {
                  const estObj = ESTADOS_PAQUETE.find(e => e.value === paq.estado) || ESTADOS_PAQUETE[1]
                  const estadia = calcularEstadia(paq.fecha_ingreso, 5, 15)

                  return (
                    <tr key={paq.id} className="hover:bg-slate-800/40 transition">
                      {/* Tracking */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <span className="text-emerald-400">📦</span>
                          {paq.tracking_code}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Ingreso: {paq.fecha_ingreso ? new Date(paq.fecha_ingreso).toLocaleDateString() : 'N/D'}
                        </div>
                        {estadia.enSobrestadia && paq.estado !== 'entregado' && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Sobrestadía +{estadia.excedenteDias}d
                          </span>
                        )}
                      </td>

                      {/* Destinatario */}
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">{paq.destinatario_nombre}</div>
                        <div className="text-xs text-slate-400 truncate max-w-xs">{paq.destinatario_direccion}</div>
                        {paq.destinatario_telefono && (
                          <div className="text-[11px] text-slate-500">{paq.destinatario_telefono}</div>
                        )}
                      </td>

                      {/* Detalle */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-200 truncate max-w-xs">{paq.descripcion_contenido}</div>
                        <div className="text-xs text-slate-400">
                          {paq.peso_kg} kg | ${paq.valor_declarado_usd} USD
                        </div>
                      </td>

                      {/* Rack */}
                      <td className="px-4 py-3.5">
                        {paq.posicion ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300">
                            <span className="material-symbols-outlined text-xs">shelves</span>
                            {paq.posicion.codigo}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sin asignar</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3.5">
                        <select
                          value={paq.estado}
                          onChange={e => handleCambiarEstado(paq.id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer ${estObj.color} bg-slate-950`}
                        >
                          {ESTADOS_PAQUETE.filter(e => e.value !== 'todos').map(est => (
                            <option key={est.value} value={est.value} className="bg-slate-900 text-white">
                              {est.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Imprimir Etiqueta QR"
                            onClick={() => {
                              setPaqueteSeleccionado(paq)
                              setShowModalEtiqueta(true)
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition"
                          >
                            <span className="material-symbols-outlined text-base">qr_code_2</span>
                          </button>
                          <button
                            title="Eliminar Bulto"
                            onClick={() => handleEliminar(paq.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Paquete */}
      {showModalCrear && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">add_box</span>
                Nuevo Bulto / Paquete Courier
              </h3>
              <button onClick={() => setShowModalCrear(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearPaquete} className="p-5 space-y-4 text-sm">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-300 font-semibold uppercase">Tracking Autogenerado:</span>
                  <div className="font-mono font-black text-white text-base">{formData.tracking_code}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tracking_code: generarTrackingCode() })}
                  className="px-2.5 py-1 text-xs bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg transition"
                >
                  Regenerar
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción del Contenido</label>
                <input
                  type="text"
                  required
                  value={formData.descripcion_contenido}
                  onChange={e => setFormData({ ...formData, descripcion_contenido: e.target.value })}
                  placeholder="Ej: Insumos Electrónicos / Repuestos Motores"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Peso (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.peso_kg}
                    onChange={e => setFormData({ ...formData, peso_kg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Valor FOB/CIF ($ USD)</label>
                  <input
                    type="number"
                    value={formData.valor_declarado_usd}
                    onChange={e => setFormData({ ...formData, valor_declarado_usd: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Posición Rack</label>
                  <select
                    value={formData.posicion_id}
                    onChange={e => setFormData({ ...formData, posicion_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Sin Rack</option>
                    {posiciones.map(pos => (
                      <option key={pos.id} value={pos.id}>
                        {pos.codigo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Datos del Destinatario</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre / Razón Social</label>
                    <input
                      type="text"
                      required
                      value={formData.destinatario_nombre}
                      onChange={e => setFormData({ ...formData, destinatario_nombre: e.target.value })}
                      placeholder="Juan Pérez o Empresa S.A."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.destinatario_telefono}
                      onChange={e => setFormData({ ...formData, destinatario_telefono: e.target.value })}
                      placeholder="+54 9 11 ..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Dirección de Entrega</label>
                  <input
                    type="text"
                    required
                    value={formData.destinatario_direccion}
                    onChange={e => setFormData({ ...formData, destinatario_direccion: e.target.value })}
                    placeholder="Av. Corrientes 1234, CABA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950"
                >
                  {guardando ? 'Guardando...' : 'Crear Bulto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Imprimir Etiqueta */}
      {showModalEtiqueta && paqueteSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">print</span>
                Etiqueta Térmica de Envío
              </h3>
              <button onClick={() => setShowModalEtiqueta(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Simulación Etiqueta Física */}
            <div className="p-5">
              <div className="bg-white text-slate-950 p-4 rounded-xl shadow-lg border border-slate-200 space-y-3 font-sans">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="font-black text-sm tracking-wider uppercase">LOGIST COURIER</div>
                  <div className="text-[11px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">EXPRESS</div>
                </div>

                <div className="text-center py-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                  <div className="font-mono font-black text-base">{paqueteSeleccionado.tracking_code}</div>
                  <div className="text-[10px] text-slate-500">ESCANEÁ PARA TRACKING EN VIVO</div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-bold text-[10px] text-slate-500 block uppercase">Destinatario:</span>
                    <span className="font-semibold text-sm">{paqueteSeleccionado.destinatario_nombre}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[10px] text-slate-500 block uppercase">Dirección:</span>
                    <span>{paqueteSeleccionado.destinatario_direccion}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t text-[11px]">
                    <span>Peso: <strong>{paqueteSeleccionado.peso_kg} kg</strong></span>
                    <span>Rack: <strong>{paqueteSeleccionado.posicion?.codigo || 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalEtiqueta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copiloto de IA */}
      <LogistAiCopilot contexto={{ paquetes }} />
    </div>
  )
}
