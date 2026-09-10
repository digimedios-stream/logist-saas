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

export default function Importaciones() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [operaciones, setOperaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [search, setSearch] = useState('')

  // Modal Crear/Editar Operación
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nro_operacion: '',
    bl_booking: '',
    vapor: '',
    viaje_buque: '',
    aduana_codigo: '001 - PTO BUENOS AIRES',
    cliente_id: '',
    consignatario: '',
    exportador: '',
    canal_aduanero: 'verde',
    estado: 'coordinado',
    fecha_arribo_estimada: '',
    observaciones: '',
    // Datos de Contenedor inicial
    numero_contenedor: '',
    tipo_contenedor: '40HC',
    precinto_pema: '',
    precinto_naviera: '',
    naviera: 'MSC'
  })
  const [clientes, setClientes] = useState([])
  const [transportistas, setTransportistas] = useState([])
  const [choferes, setChoferes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [guardando, setGuardando] = useState(false)

  // Extracción IA con Gemini
  const [procesandoIA, setProcesandoIA] = useState(false)
  const [archivoDoc, setArchivoDoc] = useState(null)

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
      cargarCatalogos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const data = await getComexOperaciones(empresaId, { tipo_operacion: 'impo' })
      setOperaciones(data || [])
    } catch (err) {
      console.error('Error cargando importaciones:', err)
    } finally {
      setLoading(false)
    }
  }

  async function cargarCatalogos() {
    try {
      const [{ data: clis }, { data: trans }, { data: chofs }, { data: vehs }] = await Promise.all([
        supabase.from('clientes').select('id, nombre').eq('empresa_id', empresaId).eq('activo', true),
        supabase.from('empresas_transportistas').select('id, razon_social').eq('empresa_id', empresaId).eq('activo', true),
        supabase.from('choferes').select('id, nombre').eq('empresa_id', empresaId).eq('activo', true),
        supabase.from('vehiculos').select('id, patente, modelo, tipo').eq('empresa_id', empresaId).eq('activo', true)
      ])
      setClientes(clis || [])
      setTransportistas(trans || [])
      setChoferes(chofs || [])
      setVehiculos(vehs || [])
    } catch (err) {
      console.error('Error cargando catálogos:', err)
    }
  }

  // Extracción automática con IA de Documento BL / Manifiesto Malvina
  const handleAnalizarBLConIA = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivoDoc(file)
    setProcesandoIA(true)
    try {
      const extracted = await analizarDocumentoComexIA(file, 'Bill of Lading (BL) / Manifiesto')
      if (extracted) {
        setForm(prev => ({
          ...prev,
          bl_booking: extracted.bl_booking || prev.bl_booking,
          nro_operacion: extracted.nro_operacion || `IMP-${Date.now().toString().slice(-6)}`,
          vapor: extracted.vapor || prev.vapor,
          viaje_buque: extracted.viaje_buque || prev.viaje_buque,
          consignatario: extracted.consignatario || prev.consignatario,
          exportador: extracted.exportador || prev.exportador,
          canal_aduanero: extracted.canal_sugerido || prev.canal_aduanero,
          fecha_arribo_estimada: extracted.fecha_arribo_estimada ? extracted.fecha_arribo_estimada.split('T')[0] : prev.fecha_arribo_estimada,
          observaciones: extracted.resumen_mercaderia || prev.observaciones,
          numero_contenedor: extracted.contenedores?.[0]?.numero_contenedor || prev.numero_contenedor,
          tipo_contenedor: extracted.contenedores?.[0]?.tipo || prev.tipo_contenedor,
          precinto_pema: extracted.contenedores?.[0]?.precinto_pema || prev.precinto_pema,
          precinto_naviera: extracted.contenedores?.[0]?.precinto_naviera || prev.precinto_naviera,
          naviera: extracted.contenedores?.[0]?.naviera || prev.naviera,
        }))
      }
    } catch (err) {
      console.error('Error al analizar BL con IA:', err)
    } finally {
      setProcesandoIA(false)
    }
  }

  const handleGuardarOperacion = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const opData = {
        empresa_id: empresaId,
        tipo_operacion: 'impo',
        nro_operacion: form.nro_operacion || `IMP-${Date.now().toString().slice(-6)}`,
        bl_booking: form.bl_booking,
        vapor: form.vapor,
        viaje_buque: form.viaje_buque,
        aduana_codigo: form.aduana_codigo,
        cliente_id: form.cliente_id || null,
        consignatario: form.consignatario,
        exportador: form.exportador,
        canal_aduanero: form.canal_aduanero,
        estado: form.estado,
        fecha_arribo_estimada: form.fecha_arribo_estimada ? new Date(form.fecha_arribo_estimada).toISOString() : null,
        observaciones: form.observaciones,
      }

      const createdOp = await createComexOperacion(opData)

      // Si se ingresó contenedor, registrarlo en la terminal
      if (form.numero_contenedor) {
        const contenedor = await createContenedor({
          empresa_id: empresaId,
          numero_contenedor: form.numero_contenedor,
          tipo: form.tipo_contenedor,
          estado_carga: 'cargado',
          precinto_pema: form.precinto_pema,
          precinto_naviera: form.precinto_naviera,
          naviera: form.naviera,
          operacion_id: createdOp.id,
          estado_operativo: 'anunciado',
          ubicacion_bloque: 'A',
          ubicacion_bahia: '01',
          ubicacion_fila: '01',
          ubicacion_nivel: '1'
        })

        // Generar automáticamente la OT de Gate IN & Inspección
        await createOrdenTrabajo({
          empresa_id: empresaId,
          nro_ot: `OT-GIN-${Date.now().toString().slice(-5)}`,
          tipo_ot: 'gate_in_inspeccion',
          operacion_id: createdOp.id,
          contenedor_id: contenedor.id,
          prioridad: 'alta',
          estado: 'pendiente',
          observaciones: `Gate IN e inspección de precinto PEMA ${form.precinto_pema || 's/d'}`
        })
      }

      setShowModal(false)
      cargarDatos()
    } catch (err) {
      console.error('Error guardando importación:', err)
      alert('Error al guardar la importación: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Filtrado
  const opsFiltradas = operaciones.filter(op => {
    const matchEstado = filtroEstado === 'todos' || op.estado === filtroEstado
    const matchSearch =
      op.nro_operacion?.toLowerCase().includes(search.toLowerCase()) ||
      op.bl_booking?.toLowerCase().includes(search.toLowerCase()) ||
      op.consignatario?.toLowerCase().includes(search.toLowerCase()) ||
      op.vapor?.toLowerCase().includes(search.toLowerCase())
    return matchEstado && matchSearch
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <span className="material-symbols-outlined text-3xl">flight_land</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Módulo de Importaciones (Impo)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                Comex / Malvina
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Coordinación de retiros, Gate IN, escaneo inteligente de BL con Gemini y control aduanero.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              nro_operacion: `IMP-${Date.now().toString().slice(-6)}`,
              bl_booking: '',
              vapor: '',
              viaje_buque: '',
              aduana_codigo: '001 - PTO BUENOS AIRES',
              cliente_id: '',
              consignatario: '',
              exportador: '',
              canal_aduanero: 'verde',
              estado: 'coordinado',
              fecha_arribo_estimada: '',
              observaciones: '',
              numero_contenedor: '',
              tipo_contenedor: '40HC',
              precinto_pema: '',
              precinto_naviera: '',
              naviera: 'MSC'
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          Nueva Importación
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por BL, Nro Operación, Buque..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['todos', 'coordinado', 'en_transito', 'gate_in', 'en_plazoleta', 'en_tally', 'despachado'].map(st => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filtroEstado === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Importaciones */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Cargando importaciones...</div>
        ) : opsFiltradas.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">flight_land</span>
            <p className="text-base font-medium">No se encontraron operaciones de importación.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Operación / BL</th>
                  <th className="py-3.5 px-4">Buque / Viaje</th>
                  <th className="py-3.5 px-4">Consignatario</th>
                  <th className="py-3.5 px-4">Canal Malvina</th>
                  <th className="py-3.5 px-4">Arribo Estimado</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {opsFiltradas.map(op => (
                  <tr key={op.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100">{op.nro_operacion}</div>
                      <div className="text-xs font-mono text-cyan-300">BL: {op.bl_booking || 'Sin BL'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{op.vapor || 'Sin asignar'}</div>
                      <div className="text-xs text-slate-400">Viaje: {op.viaje_buque || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {op.consignatario || op.cliente?.nombre || 'S/D'}
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
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      {op.fecha_arribo_estimada ? new Date(op.fecha_arribo_estimada).toLocaleDateString() : 'Pendiente'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs bg-slate-800 text-blue-300 font-semibold px-2.5 py-1 rounded-md capitalize">
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

      {/* Modal Nueva Importación con Extractor Gemini */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">flight_land</span>
                <h2 className="text-lg font-bold text-slate-100">Nueva Operación de Importación</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 material-symbols-outlined"
              >
                close
              </button>
            </div>

            {/* Banner Extractor Inteligente con Gemini */}
            <div className="p-4 bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base animate-pulse">auto_awesome</span>
                  Carga Inteligente con IA (Cero Re-tipeo)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sube el documento BL (PDF o Foto) para autocompletar buque, contenedores, precintos y pesos.
                </p>
              </div>
              <label className="cursor-pointer px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 whitespace-nowrap transition-all">
                {procesandoIA ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Extrayendo datos...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Escanear Documento BL
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleAnalizarBLConIA}
                  disabled={procesandoIA}
                  className="hidden"
                />
              </label>
            </div>

            <form onSubmit={handleGuardarOperacion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro de Operación *</label>
                  <input
                    type="text"
                    required
                    value={form.nro_operacion}
                    onChange={e => setForm({ ...form, nro_operacion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro de BL / Bill of Lading *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: MSCU-193821"
                    value={form.bl_booking}
                    onChange={e => setForm({ ...form, bl_booking: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Canal Aduanero (Malvina)</label>
                  <select
                    value={form.canal_aduanero}
                    onChange={e => setForm({ ...form, canal_aduanero: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="verde">Canal Verde (Sin Inspección)</option>
                    <option value="naranja">Canal Naranja (Documental)</option>
                    <option value="rojo">Canal Rojo (Física y Documental)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vapor / Buque</label>
                  <input
                    type="text"
                    placeholder="Ej: MSC KATIE V. 2409W"
                    value={form.vapor}
                    onChange={e => setForm({ ...form, vapor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Arribo Estimada</label>
                  <input
                    type="date"
                    value={form.fecha_arribo_estimada}
                    onChange={e => setForm({ ...form, fecha_arribo_estimada: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Consignatario / Importador</label>
                  <input
                    type="text"
                    placeholder="Razón Social del Importador"
                    value={form.consignatario}
                    onChange={e => setForm({ ...form, consignatario: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Exportador (Shipper Origen)</label>
                  <input
                    type="text"
                    placeholder="Proveedor en Origen"
                    value={form.exportador}
                    onChange={e => setForm({ ...form, exportador: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sección Contenedor Inicial */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">grid_view</span>
                  Contenedor & Precintos Iniciales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nro Contenedor</label>
                    <input
                      type="text"
                      placeholder="Ej: MSCU7849382"
                      value={form.numero_contenedor}
                      onChange={e => setForm({ ...form, numero_contenedor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Unidad</label>
                    <select
                      value={form.tipo_contenedor}
                      onChange={e => setForm({ ...form, tipo_contenedor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="40HC">40' High Cube (HC)</option>
                      <option value="20DC">20' Dry Cargo (DC)</option>
                      <option value="40DC">40' Dry Cargo (DC)</option>
                      <option value="40REEFER">40' Reefer Refrigerado</option>
                      <option value="20REEFER">20' Reefer Refrigerado</option>
                      <option value="OPEN_TOP">Open Top</option>
                      <option value="FLAT_RACK">Flat Rack</option>
                      <option value="GRANEL">Granel</option>
                      <option value="PELIGROSA_IMO">Peligrosa IMO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Precinto PEMA</label>
                    <input
                      type="text"
                      placeholder="Precinto Aduanero"
                      value={form.precinto_pema}
                      onChange={e => setForm({ ...form, precinto_pema: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Naviera</label>
                    <input
                      type="text"
                      placeholder="MSC, Maersk, etc."
                      value={form.naviera}
                      onChange={e => setForm({ ...form, naviera: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Resumen de Carga / Observaciones</label>
                <textarea
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Detalle arancelario, packing o instrucciones especiales..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear Importación & OT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
