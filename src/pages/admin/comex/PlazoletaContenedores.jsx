import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getContenedores,
  createContenedor,
  updateContenedor,
  createOrdenTrabajo
} from '@/services/comexService'

export default function PlazoletaContenedores() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [contenedores, setContenedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [bloqueActivo, setBloqueActivo] = useState('A')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroCarga, setFiltroCarga] = useState('todos')
  const [search, setSearch] = useState('')

  // Modal Detalle / Reubicación de Contenedor
  const [selectedContenedor, setSelectedContenedor] = useState(null)
  const [showReubicarModal, setShowReubicarModal] = useState(false)
  const [nuevaUbicacion, setNuevaUbicacion] = useState({
    bloque: 'A',
    bahia: '01',
    fila: '01',
    nivel: '1'
  })
  const [guardandoReubicacion, setGuardandoReubicacion] = useState(false)

  // Modal Nuevo Contenedor en Plazoleta
  const [showAltaModal, setShowAltaModal] = useState(false)
  const [formAlta, setFormAlta] = useState({
    numero_contenedor: '',
    tipo: '40HC',
    estado_carga: 'cargado',
    ocupacion_porcentaje: 100,
    es_contenedor_almacen: false,
    ubicacion_bloque: 'A',
    ubicacion_bahia: '01',
    ubicacion_fila: '01',
    ubicacion_nivel: '1',
    naviera: 'MSC',
    precinto_pema: '',
    temperatura_setpoint: '',
    estado_operativo: 'en_plazoleta'
  })

  useEffect(() => {
    if (empresaId) cargarContenedores()
  }, [empresaId])

  async function cargarContenedores() {
    setLoading(true)
    try {
      const data = await getContenedores(empresaId)
      setContenedores(data || [])
    } catch (err) {
      console.error('Error cargando contenedores:', err)
    } finally {
      setLoading(false)
    }
  }

  // Dimensiones de la malla de apilado (Grid Stacking)
  const BAHIAS = ['01', '02', '03', '04', '05', '06']
  const FILAS = ['01', '02', '03', '04']
  const NIVELES = ['4', '3', '2', '1'] // De arriba a abajo

  // Mapa de contenedores por clave Bloque-Bahia-Fila-Nivel
  const gridMap = {}
  contenedores.forEach(c => {
    const key = `${c.ubicacion_bloque || 'A'}-${c.ubicacion_bahia || '01'}-${c.ubicacion_fila || '01'}-${c.ubicacion_nivel || '1'}`
    gridMap[key] = c
  })

  // Ejecutar Reubicación y generar OT automática
  const handleConfirmarReubicacion = async (e) => {
    e.preventDefault()
    if (!selectedContenedor) return
    setGuardandoReubicacion(true)
    try {
      const origen = `Bloque ${selectedContenedor.ubicacion_bloque || 'A'} (B:${selectedContenedor.ubicacion_bahia || '01'} F:${selectedContenedor.ubicacion_fila || '01'} N:${selectedContenedor.ubicacion_nivel || '1'})`
      const destino = `Bloque ${nuevaUbicacion.bloque} (B:${nuevaUbicacion.bahia} F:${nuevaUbicacion.fila} N:${nuevaUbicacion.nivel})`

      // 1. Actualizar contenedor
      await updateContenedor(selectedContenedor.id, {
        ubicacion_bloque: nuevaUbicacion.bloque,
        ubicacion_bahia: nuevaUbicacion.bahia,
        ubicacion_fila: nuevaUbicacion.fila,
        ubicacion_nivel: nuevaUbicacion.nivel,
      })

      // 2. Generar OT para grúa Reach Stacker
      await createOrdenTrabajo({
        empresa_id: empresaId,
        nro_ot: `OT-STK-${Date.now().toString().slice(-5)}`,
        tipo_ot: 'reubicacion_plazoleta',
        contenedor_id: selectedContenedor.id,
        origen_ubicacion: origen,
        destino_ubicacion: destino,
        prioridad: 'alta',
        estado: 'pendiente',
        observaciones: `Movimiento de apilado y reubicación por optimización de plazoleta.`
      })

      setShowReubicarModal(false)
      setSelectedContenedor(null)
      cargarContenedores()
    } catch (err) {
      console.error(err)
      alert('Error al reubicar: ' + err.message)
    } finally {
      setGuardandoReubicacion(false)
    }
  }

  // Alta de nuevo contenedor
  const handleAltaContenedor = async (e) => {
    e.preventDefault()
    try {
      await createContenedor({
        ...formAlta,
        empresa_id: empresaId,
        temperatura_setpoint: formAlta.temperatura_setpoint ? Number(formAlta.temperatura_setpoint) : null
      })
      setShowAltaModal(false)
      cargarContenedores()
    } catch (err) {
      console.error(err)
      alert('Error creando contenedor: ' + err.message)
    }
  }

  // Filtros
  const contsFiltrados = contenedores.filter(c => {
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    const matchCarga = filtroCarga === 'todos' || c.estado_carga === filtroCarga
    const matchSearch =
      c.numero_contenedor?.toLowerCase().includes(search.toLowerCase()) ||
      c.naviera?.toLowerCase().includes(search.toLowerCase()) ||
      c.precinto_pema?.toLowerCase().includes(search.toLowerCase())
    return matchTipo && matchCarga && matchSearch
  })

  // Estilos visuales por tipo de contenedor
  const getContainerBadgeColor = (tipo, carga) => {
    if (tipo?.includes('REEFER')) return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
    if (tipo?.includes('PELIGROSA')) return 'bg-red-500/20 text-red-300 border-red-500/40'
    if (carga === 'vacio') return 'bg-slate-700/40 text-slate-300 border-slate-600'
    if (tipo === '20DC') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' // 40HC / default
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <span className="material-symbols-outlined text-3xl">grid_view</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Plazoleta de Contenedores & Stacking WMS
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                Control de Apilado
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Mapeo de bahías, filas y niveles. Control de 20'/40' DC/HC, Reefer, Granel y Contenedores Almacén.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormAlta({
              numero_contenedor: `MSCU${Math.floor(1000000 + Math.random() * 9000000)}`,
              tipo: '40HC',
              estado_carga: 'cargado',
              ocupacion_porcentaje: 100,
              es_contenedor_almacen: false,
              ubicacion_bloque: bloqueActivo,
              ubicacion_bahia: '01',
              ubicacion_fila: '01',
              ubicacion_nivel: '1',
              naviera: 'MSC',
              precinto_pema: `PEMA-${Math.floor(100000 + Math.random() * 900000)}`,
              temperatura_setpoint: '',
              estado_operativo: 'en_plazoleta'
            })
            setShowAltaModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_box</span>
          + Ingresar Contenedor
        </button>
      </div>

      {/* Selector de Bloques y Filtros */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        {/* Pestañas de Bloques */}
        <div className="flex items-center gap-2">
          {['A', 'B', 'C', 'REEFER-01', 'VACIOS'].map(bloque => (
            <button
              key={bloque}
              onClick={() => setBloqueActivo(bloque)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                bloqueActivo === bloque
                  ? 'bg-cyan-500 text-slate-950 shadow-lg font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {bloque.includes('REEFER') ? 'ac_unit' : 'view_column'}
              </span>
              Bloque {bloque}
            </button>
          ))}
        </div>

        {/* Búsqueda y Tipos */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contenedor..."
            className="w-full sm:w-48 pl-3 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200"
          />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="40HC">40' High Cube</option>
            <option value="20DC">20' Dry Cargo</option>
            <option value="40REEFER">40' Reefer</option>
            <option value="20REEFER">20' Reefer</option>
            <option value="PELIGROSA_IMO">Peligrosa IMO</option>
          </select>
        </div>
      </div>

      {/* Malla Gráfica Visual de Apilado (Stacking Grid) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400">layers</span>
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider">
              Vista de Elevación y Apilado — Bloque {bloqueActivo}
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded bg-cyan-500/40 border border-cyan-500"></span> 40' HC / DC
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500"></span> 20' DC
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-3 h-3 rounded bg-sky-500/40 border border-sky-500"></span> Reefer
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-3 rounded bg-slate-700/40 border border-slate-600"></span> Vacío
            </span>
          </div>
        </div>

        {/* Visualizador de Bahías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {BAHIAS.map(bahia => (
            <div key={bahia} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-1.5">
                <span className="text-cyan-400 font-mono">BAHÍA {bahia}</span>
                <span className="text-[10px] text-slate-500 font-normal">Capacidad: 16 TEUs</span>
              </div>

              {/* Grid Niveles x Filas */}
              <div className="space-y-1.5">
                {NIVELES.map(nivel => (
                  <div key={nivel} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500 w-5 text-right">N{nivel}</span>
                    <div className="grid grid-cols-4 gap-1.5 flex-1">
                      {FILAS.map(fila => {
                        const key = `${bloqueActivo}-${bahia}-${fila}-${nivel}`
                        const item = gridMap[key]

                        return (
                          <div
                            key={fila}
                            onClick={() => {
                              if (item) {
                                setSelectedContenedor(item)
                                setNuevaUbicacion({
                                  bloque: item.ubicacion_bloque || bloqueActivo,
                                  bahia: item.ubicacion_bahia || bahia,
                                  fila: item.ubicacion_fila || fila,
                                  nivel: item.ubicacion_nivel || nivel
                                })
                                setShowReubicarModal(true)
                              }
                            }}
                            className={`h-12 rounded-lg border flex flex-col items-center justify-center p-1 cursor-pointer transition-all duration-200 ${
                              item
                                ? `${getContainerBadgeColor(item.tipo, item.estado_carga)} hover:scale-105 shadow-md`
                                : 'bg-slate-900/40 border-dashed border-slate-800/80 text-slate-700 hover:border-slate-600'
                            }`}
                          >
                            {item ? (
                              <>
                                <span className="text-[10px] font-mono font-black truncate w-full text-center">
                                  {item.numero_contenedor?.slice(-4) || 'CONT'}
                                </span>
                                <span className="text-[8px] font-semibold opacity-90 truncate">
                                  {item.tipo} {item.estado_carga === 'vacio' ? '(V)' : ''}
                                </span>
                              </>
                            ) : (
                              <span className="text-[8px] text-slate-600 font-mono">F{fila}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 px-7 pt-1 font-mono">
                <span>F01</span>
                <span>F02</span>
                <span>F03</span>
                <span>F04</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla Resumen de Contenedores */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm">Inventario de Contenedores en Terminal</h3>
          <span className="text-xs text-slate-400">Total: {contsFiltrados.length} unidades</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Contenedor / Naviera</th>
                <th className="py-3 px-4">Tipo & Capacidad</th>
                <th className="py-3 px-4">Estado Carga</th>
                <th className="py-3 px-4">Ubicación Plazoleta</th>
                <th className="py-3 px-4">Precinto PEMA</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {contsFiltrados.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-cyan-300">{c.numero_contenedor}</div>
                    <div className="text-xs text-slate-400">{c.naviera || 'Sin naviera'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-200">
                      {c.tipo}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      c.estado_carga === 'vacio'
                        ? 'bg-slate-700/50 text-slate-300 border border-slate-600'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {c.estado_carga}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-200">
                    Bloque <strong className="text-cyan-400">{c.ubicacion_bloque || 'A'}</strong> • B{c.ubicacion_bahia || '01'} F{c.ubicacion_fila || '01'} N{c.ubicacion_nivel || '1'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                    {c.precinto_pema || 'S/D'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedContenedor(c)
                        setNuevaUbicacion({
                          bloque: c.ubicacion_bloque || 'A',
                          bahia: c.ubicacion_bahia || '01',
                          fila: c.ubicacion_fila || '01',
                          nivel: c.ubicacion_nivel || '1'
                        })
                        setShowReubicarModal(true)
                      }}
                      className="px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-500/30 transition-all"
                    >
                      Reubicar / OT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reubicar Contenedor & Disparar OT */}
      {showReubicarModal && selectedContenedor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">forklift</span>
                Reubicar Contenedor en Plazoleta
              </h3>
              <button onClick={() => setShowReubicarModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-300">Contenedor: <strong className="text-cyan-300 font-mono">{selectedContenedor.numero_contenedor}</strong> ({selectedContenedor.tipo})</p>
              <p className="text-slate-400">Ubicación Actual: Bloque {selectedContenedor.ubicacion_bloque} (B:{selectedContenedor.ubicacion_bahia} F:{selectedContenedor.ubicacion_fila} N:{selectedContenedor.ubicacion_nivel})</p>
            </div>

            <form onSubmit={handleConfirmarReubicacion} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bloque Destino</label>
                  <select
                    value={nuevaUbicacion.bloque}
                    onChange={e => setNuevaUbicacion({ ...nuevaUbicacion, bloque: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="A">Bloque A</option>
                    <option value="B">Bloque B</option>
                    <option value="C">Bloque C</option>
                    <option value="REEFER-01">Bloque Reefer 01</option>
                    <option value="VACIOS">Sector Vacíos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bahía Destino</label>
                  <select
                    value={nuevaUbicacion.bahia}
                    onChange={e => setNuevaUbicacion({ ...nuevaUbicacion, bahia: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  >
                    {BAHIAS.map(b => <option key={b} value={b}>Bahía {b}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fila Destino</label>
                  <select
                    value={nuevaUbicacion.fila}
                    onChange={e => setNuevaUbicacion({ ...nuevaUbicacion, fila: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  >
                    {FILAS.map(f => <option key={f} value={f}>Fila {f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nivel Destino (Piso=1)</label>
                  <select
                    value={nuevaUbicacion.nivel}
                    onChange={e => setNuevaUbicacion({ ...nuevaUbicacion, nivel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  >
                    <option value="1">Nivel 1 (Piso)</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="4">Nivel 4 (Tope)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReubicarModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoReubicacion}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {guardandoReubicacion ? 'Procesando...' : 'Confirmar & Despachar OT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alta Contenedor */}
      {showAltaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Ingresar Contenedor a Plazoleta</h3>
              <button onClick={() => setShowAltaModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleAltaContenedor} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro Contenedor *</label>
                  <input
                    type="text"
                    required
                    placeholder="MSCU1234567"
                    value={formAlta.numero_contenedor}
                    onChange={e => setFormAlta({ ...formAlta, numero_contenedor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Unidad</label>
                  <select
                    value={formAlta.tipo}
                    onChange={e => setFormAlta({ ...formAlta, tipo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="40HC">40' High Cube (HC)</option>
                    <option value="20DC">20' Dry Cargo (DC)</option>
                    <option value="40DC">40' Dry Cargo (DC)</option>
                    <option value="40REEFER">40' Reefer Refrigerado</option>
                    <option value="20REEFER">20' Reefer Refrigerado</option>
                    <option value="PELIGROSA_IMO">Peligrosa IMO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado de Carga</label>
                  <select
                    value={formAlta.estado_carga}
                    onChange={e => setFormAlta({ ...formAlta, estado_carga: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="cargado">Cargado</option>
                    <option value="vacio">Vacío</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Naviera</label>
                  <input
                    type="text"
                    value={formAlta.naviera}
                    onChange={e => setFormAlta({ ...formAlta, naviera: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAltaModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                >
                  Guardar en Plazoleta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
