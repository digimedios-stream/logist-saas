import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getCourierPaquetes, updateCourierPaquete, getZonasEmpresa, ZONAS_DISTRIBUCION } from '@/services/courierService'
import { optimizarSecuenciaEntregas } from '@/services/aiLogisticsService'
import { choferesService } from '@/services/choferesService'
import { vehiculosService } from '@/services/vehiculosService'
import { supabase } from '@/lib/supabase'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'

export default function OptimizadorRutas() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [paquetes, setPaquetes] = useState([])
  const [zonas, setZonas] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [rutaOptimizada, setRutaOptimizada] = useState([])
  const [choferes, setChoferes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroZona, setFiltroZona] = useState('todas')

  // Estado de despacho
  const [choferId, setChoferId] = useState('')
  const [vehiculoId, setVehiculoId] = useState('')
  const [tipoTransporte, setTipoTransporte] = useState('utilitario')
  const [despachando, setDespachando] = useState(false)
  const [exitoDespacho, setExitoDespacho] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const zonList = getZonasEmpresa(empresaId)
      setZonas(zonList)

      const [paqs, chofs, vehs] = await Promise.all([
        getCourierPaquetes(empresaId).catch(() => []),
        choferesService.getChoferes().catch(() => []),
        vehiculosService.getVehiculos().catch(() => [])
      ])

      const listaChoferes = chofs || []

      // Filtramos paquetes listos para despacho o recibidos en nave
      const candidatos = (paqs || []).filter(
        p => p.estado === 'listo_despacho' || p.estado === 'recibido_hub' || p.estado === 'en_clasificacion'
      )
      setPaquetes(candidatos)
      setChoferes(listaChoferes)
      setVehiculos(vehs || [])

      if (listaChoferes.length > 0) {
        setChoferId(prev => prev || listaChoferes[0].id)
      }
      if (vehs?.length > 0) {
        setVehiculoId(prev => prev || vehs[0].id)
      }
    } catch (err) {
      console.error('Error cargando optimizador:', err)
    } finally {
      setLoading(false)
    }
  }

  const paquetesFiltrados = paquetes.filter(p => {
    if (filtroZona === 'todas') return true
    return (p.zona_clasificacion || 'zona-caba-centro') === filtroZona
  })

  const toggleSeleccion = (paq) => {
    setSeleccionados(prev => {
      const existe = prev.some(p => p.id === paq.id)
      if (existe) {
        return prev.filter(p => p.id !== paq.id)
      } else {
        return [...prev, paq]
      }
    })
  }

  const seleccionarTodos = () => {
    if (seleccionados.length === paquetesFiltrados.length) {
      setSeleccionados([])
    } else {
      setSeleccionados([...paquetesFiltrados])
    }
  }

  const ejecutarOptimizador = () => {
    if (seleccionados.length === 0) return
    const optimizados = optimizarSecuenciaEntregas(seleccionados)
    setRutaOptimizada(optimizados)
  }

  async function handleDespacharViaje() {
    if (rutaOptimizada.length === 0 || !choferId) return
    setDespachando(true)
    setExitoDespacho(false)

    try {
      // 1. Crear el viaje en el TMS existente
      const { data: viajeCreado, error: errViaje } = await supabase
        .from('viajes')
        .insert([
          {
            empresa_id: empresaId,
            chofer_id: choferId,
            vehiculo_id: vehiculoId || null,
            origen: 'Hub Central de Paquetería',
            destino: `Reparto Courier (${rutaOptimizada.length} paradas)`,
            estado: 'en_curso',
            fecha_inicio: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (errViaje) throw errViaje

      // 2. Crear las paradas (entregas) en orden secuenciado
      const entregasPayload = rutaOptimizada.map(paq => ({
        viaje_id: viajeCreado.id,
        empresa_id: empresaId,
        tipo: 'entrega',
        direccion: paq.destinatario_direccion,
        contacto_nombre: paq.destinatario_nombre,
        contacto_telefono: paq.destinatario_telefono,
        notas: `AWB ${paq.tracking_code} - ${paq.descripcion_contenido || 'Paquete'} ${paq.es_cod ? `[COD: $${paq.monto_cod}]` : ''}`
      }))

      const { error: errEntregas } = await supabase.from('entregas').insert(entregasPayload)
      if (errEntregas) throw errEntregas

      // 3. Actualizar estado de los paquetes
      for (const paq of rutaOptimizada) {
        await updateCourierPaquete(paq.id, {
          estado: 'en_reparto',
          viaje_id: viajeCreado.id
        })
      }

      setExitoDespacho(true)
      setSeleccionados([])
      setRutaOptimizada([])
      cargarDatos()
    } catch (err) {
      console.error('Error despachando viaje:', err)
      alert('Error creando el viaje de reparto: ' + err.message)
    } finally {
      setDespachando(false)
    }
  }

  // Resumen de carga seleccionada
  const pesoTotalSeleccionado = seleccionados.reduce((acc, p) => acc + (Number(p.peso_kg) || 1), 0)
  const codTotalSeleccionado = seleccionados.reduce((acc, p) => acc + (Number(p.monto_cod) || 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-in">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">route</span>
            Smart Routing & Despacho por Capacidad
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Optimizador de Rutas de Paquetería
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Agrupamiento por zona, ordenamiento secuencial óptimo y despacho directo a la aplicación del repartidor.
          </p>
        </div>

        {seleccionados.length > 0 && (
          <button
            onClick={ejecutarOptimizador}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:scale-[1.02] active:scale-95 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-base">alt_route</span>
            Optimizar Ruta ({seleccionados.length} Paquetes)
          </button>
        )}
      </div>

      {exitoDespacho && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between text-emerald-300 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-emerald-400">check_circle</span>
            <div>
              <strong className="block font-bold">¡Viaje de reparto despachado con éxito!</strong>
              <span>El chofer ya tiene la secuencia de paradas en su app móvil.</span>
            </div>
          </div>
          <button onClick={() => setExitoDespacho(false)} className="text-slate-400 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* SELECTOR DE TRANSPORTE & FILTROS */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modo Reparto:</span>
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'moto', label: 'Moto / Bici', icon: 'two_wheeler' },
              { id: 'utilitario', label: 'Utilitario', icon: 'directions_car' },
              { id: 'furgon', label: 'Furgón', icon: 'local_shipping' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTipoTransporte(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tipoTransporte === t.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="todas">Todas las Zonas</option>
            {zonas.map(z => (
              <option key={z.id} value={z.id}>{z.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID DE TRABAJO: 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMNA 1: PAQUETES LISTOS */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">package_2</span>
                Paquetes en Nave Listos ({paquetesFiltrados.length})
              </h2>
              <span className="text-[10px] text-slate-400">
                Seleccionados: {seleccionados.length} ({pesoTotalSeleccionado.toFixed(1)} kg)
              </span>
            </div>
            <button
              onClick={seleccionarTodos}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
            >
              {seleccionados.length === paquetesFiltrados.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined animate-spin text-2xl text-cyan-400 mb-2 block">progress_activity</span>
              Cargando paquetes listos...
            </div>
          ) : paquetesFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
              No hay paquetes listos para armar ruta en esta zona.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
              {paquetesFiltrados.map(paq => {
                const isSelected = seleccionados.some(p => p.id === paq.id)

                return (
                  <div
                    key={paq.id}
                    onClick={() => toggleSeleccion(paq)}
                    className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                          isSelected ? 'bg-cyan-500 border-cyan-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <span className="material-symbols-outlined text-xs font-bold">check</span>}
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-cyan-400">{paq.tracking_code}</div>
                        <div className="text-xs font-bold text-white">{paq.destinatario_nombre}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[260px]">
                          {paq.destinatario_direccion}, {paq.destinatario_localidad}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-200">{paq.peso_kg || 1} kg</span>
                      {paq.es_cod && (
                        <div className="text-[10px] text-emerald-400 font-mono font-bold">
                          COD: ${Number(paq.monto_cod).toLocaleString('es-AR')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* COLUMNA 2: SECUENCIA ÓPTIMA Y ASIGNACIÓN */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between backdrop-blur-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">alt_route</span>
                Secuencia Óptima de Paradas ({rutaOptimizada.length})
              </h2>
              {rutaOptimizada.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ruta Calculada
                </span>
              )}
            </div>

            {rutaOptimizada.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-2">
                <span className="material-symbols-outlined text-3xl text-slate-600">route</span>
                <p className="text-slate-400 text-xs font-medium">Seleccioná paquetes y hacé clic en "Optimizar Ruta".</p>
                <p className="text-[11px] text-slate-500">El algoritmo ordenará las paradas minimizando el tiempo y kilómetros.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {rutaOptimizada.map((paq, idx) => (
                  <div
                    key={paq.id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{paq.destinatario_nombre}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                          {paq.destinatario_direccion}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                      {paq.tracking_code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ASIGNACIÓN DE CHOFER Y VEHÍCULO */}
          {rutaOptimizada.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Asignación al Chofer</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Repartidor Responsable</label>
                  <select
                    value={choferId}
                    onChange={e => setChoferId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                    required
                  >
                    <option value="">-- Seleccionar Chofer ({choferes.length}) --</option>
                    {choferes.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.nombre} {ch.celular ? `(${ch.celular})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Vehículo de Flota</label>
                  <select
                    value={vehiculoId}
                    onChange={e => setVehiculoId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Sin Vehículo Fijo --</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.patente} ({v.marca} {v.modelo})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-400">Total Paradas: <strong>{rutaOptimizada.length}</strong></span>
                {codTotalSeleccionado > 0 && (
                  <span className="text-emerald-400 font-bold">Recaudación COD: ${codTotalSeleccionado.toLocaleString('es-AR')}</span>
                )}
              </div>

              <button
                onClick={handleDespacharViaje}
                disabled={despachando}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">local_shipping</span>
                {despachando ? 'Despachando a la app...' : 'Despachar Viaje al Repartidor'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* AI COPILOT */}
      <LogistAiCopilot
        contexto="courier"
        datos={{
          modulo: 'OptimizadorRutas',
          paquetesDisponibles: paquetes.length,
          seleccionadosCount: seleccionados.length,
          rutaOptimizadaCount: rutaOptimizada.length
        }}
      />

    </div>
  )
}
