import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import L from 'leaflet'
import { format } from 'date-fns'
import { filtrarTrayectoriaReal } from '@/lib/geoUtils'
import { crearTruckMarkerIcon } from '@/lib/markerIcons'
import { abrirWhatsApp, generarLinkWhatsApp, generarMensajeTracking } from '@/services/whatsappService'

function MapFlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lon], 14, { duration: 1.2 })
    }
  }, [target, map])
  return null
}

const ESTADOS_MAP = {
  en_ruta: { label: 'En Ruta', color: '#10b981', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
  descanso: { label: 'En Descanso', color: '#f59e0b', badgeClass: 'bg-amber-500/20 text-amber-400' },
  entregando: { label: 'Entregando', color: '#a855f7', badgeClass: 'bg-purple-500/20 text-purple-400' },
  regreso_planta: { label: 'Regreso a Planta', color: '#3b82f6', badgeClass: 'bg-blue-500/20 text-blue-400' },
  atrasado: { label: 'Atrasado', color: '#ef4444', badgeClass: 'bg-red-500/20 text-red-400' },
  en_riesgo: { label: 'En Riesgo', color: '#fbbf24', badgeClass: 'bg-yellow-500/20 text-yellow-400' },
  paralizado: { label: 'Paralizado', color: '#64748b', badgeClass: 'bg-slate-500/20 text-slate-400' }
}

export default function MapaVisibilidad() {
  const { user, empresaData } = useAuth()
  const [viajes, setViajes] = useState([])
  const [ubicaciones, setUbicaciones] = useState({})
  const [loading, setLoading] = useState(true)
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [mapTarget, setMapTarget] = useState(null)

  // Modal Monitor
  const [modalMonitor, setModalMonitor] = useState(false)
  const [monitorToken, setMonitorToken] = useState('')
  const [generandoToken, setGenerandoToken] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    cargarDatos()

    const intervalId = setInterval(() => {
      cargarDatos(true) // silent refresh
    }, 10000)

    const ubicacionesSub = supabase.channel('realtime_ubicaciones_admin')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ubicaciones_viaje'
      }, (payload) => {
        const nuevaUbicacion = payload.new
        setUbicaciones(prev => {
          const viajeUbicaciones = prev[nuevaUbicacion.viaje_id] || []
          return {
            ...prev,
            [nuevaUbicacion.viaje_id]: [...viajeUbicaciones, nuevaUbicacion]
          }
        })
      })
      .subscribe()

    return () => {
      clearInterval(intervalId)
      supabase.removeChannel(ubicacionesSub)
    }
  }, [])

  async function cargarDatos(silent = false) {
    if (!silent) setLoading(true)
    try {
      const { data: viajesData, error: errViajes } = await supabase
        .from('viajes')
        .select(`
          *,
          chofer:chofer_id(nombre, dni, telefono_contacto),
          vehiculo:vehiculo_id(patente, marca, modelo),
          cliente_rel:cliente_id(nombre_empresa, nombre_responsable, celular)
        `)
        .neq('estado', 'finalizado')
        .order('created_at', { ascending: false })

      if (errViajes) throw errViajes
      setViajes(viajesData || [])

      if (viajesData && viajesData.length > 0) {
        const viajeIds = viajesData.map(v => v.id)
        const { data: ubicacionesData } = await supabase
          .from('ubicaciones_viaje')
          .select('*')
          .in('viaje_id', viajeIds)
          .order('timestamp', { ascending: true })

        const ubsPorViaje = {}
        if (ubicacionesData) {
          ubicacionesData.forEach(ub => {
            if (!ubsPorViaje[ub.viaje_id]) ubsPorViaje[ub.viaje_id] = []
            ubsPorViaje[ub.viaje_id].push(ub)
          })
          Object.keys(ubsPorViaje).forEach(vid => {
            ubsPorViaje[vid] = filtrarTrayectoriaReal(ubsPorViaje[vid])
          })
        }
        setUbicaciones(ubsPorViaje)
      }
    } catch (err) {
      console.error('Error cargando mapa:', err)
    } finally {
      setLoading(false)
    }
  }

  function seleccionarViaje(viaje) {
    setViajeSeleccionado(viaje)
    const ubs = ubicaciones[viaje.id]
    if (ubs && ubs.length > 0) {
      const last = ubs[ubs.length - 1]
      setMapTarget({ lat: last.latitud, lon: last.longitud })
    }
  }

  const [errorMonitor, setErrorMonitor] = useState('')

  async function abrirModalMonitor() {
    setModalMonitor(true)
    setGenerandoToken(true)
    setErrorMonitor('')
    try {
      // 1. Obtener empresa_id de forma robusta
      let targetEmpresaId = empresaData?.id
      let targetEmpresaNombre = empresaData?.nombre || 'Flota'

      if (!targetEmpresaId && user?.id) {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('empresa_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (roleRow?.empresa_id) {
          targetEmpresaId = roleRow.empresa_id
        }
      }

      if (!targetEmpresaId) {
        // Fallback: primera empresa disponible
        const { data: primeraEmpresa } = await supabase
          .from('empresas')
          .select('id, nombre')
          .limit(1)
          .maybeSingle()
        if (primeraEmpresa) {
          targetEmpresaId = primeraEmpresa.id
          targetEmpresaNombre = primeraEmpresa.nombre
        }
      }

      if (!targetEmpresaId) {
        throw new Error('No se encontró una empresa asociada para generar el monitor.')
      }

      // 2. Buscar si ya existe un token activo para esta empresa
      const { data: existing, error: errExist } = await supabase
        .from('monitor_tokens')
        .select('token')
        .eq('empresa_id', targetEmpresaId)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing?.token) {
        setMonitorToken(existing.token)
        return
      }

      // 3. Crear nuevo token garantizado
      const generatedHex = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().replace(/-/g, '')
        : (Math.random().toString(36).substring(2) + Date.now().toString(36))

      const { data: created, error: insErr } = await supabase
        .from('monitor_tokens')
        .insert({
          empresa_id: targetEmpresaId,
          token: generatedHex,
          nombre: `Monitor ${targetEmpresaNombre}`
        })
        .select('token')
        .single()

      if (insErr) throw insErr
      setMonitorToken(created?.token || generatedHex)

    } catch (err) {
      console.error('Error generando token de monitor:', err)
      setErrorMonitor(err.message || 'Error al generar enlace de monitor')
    } finally {
      setGenerandoToken(false)
    }
  }

  async function enviarTrackingWhatsApp(viaje) {
    const cel = viaje.cliente_rel?.celular
    const nombre = viaje.cliente_rel?.nombre_empresa || viaje.cliente_rel?.nombre_responsable || viaje.cliente || 'Cliente'
    if (!cel) {
      alert('Este viaje no tiene un cliente con número de celular vinculado.')
      return
    }

    try {
      let token = null
      const { data: existingToken } = await supabase
        .from('tracking_tokens')
        .select('token')
        .eq('viaje_id', viaje.id)
        .eq('activo', true)
        .maybeSingle()

      if (existingToken?.token) {
        token = existingToken.token
      } else {
        const { data: newToken, error: tokenErr } = await supabase
          .from('tracking_tokens')
          .insert({ viaje_id: viaje.id })
          .select('token')
          .single()
        if (tokenErr) throw tokenErr
        token = newToken.token
      }

      const mensaje = generarMensajeTracking(nombre, token)
      abrirWhatsApp(cel, mensaje)
    } catch (err) {
      alert('Error al generar enlace de seguimiento: ' + err.message)
    }
  }

  const viajesFiltrados = viajes.filter(v => {
    if (filtroEstado === 'todos') return true
    return v.estado === filtroEstado
  })

  const monitorUrl = monitorToken ? `${window.location.origin}/monitor/${monitorToken}` : ''

  const mapStyle = {
    height: '100%',
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: '0.75rem'
  }

  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2 -mx-2 bg-lazdin-bg text-white">
      {/* HEADER / FILTROS */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-lazdin-surface/80 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lazdin-emerald/10 text-lazdin-emerald rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">map</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Portal de Visibilidad</h1>
            <p className="text-xs text-slate-400">Monitoreo y trazabilidad satelital en tiempo real</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de filtro */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-lazdin-emerald"
          >
            <option value="todos">Todos los Estados ({viajes.length})</option>
            <option value="en_ruta">En Ruta ({viajes.filter(v => v.estado === 'en_ruta').length})</option>
            <option value="descanso">En Descanso ({viajes.filter(v => v.estado === 'descanso').length})</option>
            <option value="regreso_planta">Regreso a Planta ({viajes.filter(v => v.estado === 'regreso_planta').length})</option>
            <option value="entregando">Entregando ({viajes.filter(v => v.estado === 'entregando').length})</option>
            <option value="atrasado">Atrasados ({viajes.filter(v => v.estado === 'atrasado').length})</option>
          </select>

          {/* Botón Abrir en Monitor */}
          <button
            onClick={abrirModalMonitor}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            title="Abrir en pantalla grande / monitor de guardia"
          >
            <span className="material-symbols-outlined text-base">tv</span>
            Modo Monitor TV
          </button>
        </div>
      </div>

      {/* CONTENIDO: MAPA + SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* CONTENEDOR DEL MAPA */}
        <div className="flex-1 relative p-3">
          <div className="w-full h-full bg-lazdin-surface rounded-xl overflow-hidden shadow-2xl border border-slate-800/60 relative">
            <MapContainer center={[-34.6037, -58.3816]} zoom={5} style={mapStyle}>
              <TileLayer
                url={TILE_URL}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                className="leaflet-layer-dark"
              />

              {mapTarget && <MapFlyTo target={mapTarget} />}

              {viajesFiltrados.map(viaje => {
                const viajeUbs = ubicaciones[viaje.id]
                if (!viajeUbs || viajeUbs.length === 0) return null

                const ultimaUb = viajeUbs[viajeUbs.length - 1]
                const ruta = viajeUbs.map(ub => [ub.latitud, ub.longitud])
                const estadoConfig = ESTADOS_MAP[viaje.estado] || ESTADOS_MAP.en_ruta
                const isSelected = viajeSeleccionado?.id === viaje.id

                return (
                  <div key={viaje.id}>
                    <Polyline 
                      positions={ruta} 
                      pathOptions={{ 
                        color: estadoConfig.color, 
                        weight: isSelected ? 5 : 3, 
                        opacity: isSelected ? 0.95 : 0.65 
                      }} 
                    />
                    <Marker 
                      position={[ultimaUb.latitud, ultimaUb.longitud]}
                      icon={crearTruckMarkerIcon({
                        patente: viaje.vehiculo?.patente || 'Vehículo',
                        color: estadoConfig.color,
                        isSelected
                      })}
                      eventHandlers={{
                        click: () => seleccionarViaje(viaje)
                      }}
                    >
                      <Popup className="text-slate-900 font-sans">
                        <div className="p-1 min-w-[210px]">
                          <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                            <span className="font-black text-sm text-slate-900">{viaje.vehiculo?.patente || 'Vehículo'}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: estadoConfig.color, backgroundColor: `${estadoConfig.color}20` }}>
                              {estadoConfig.label}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">
                            {viaje.cliente_rel?.nombre_empresa || viaje.cliente || 'Sin cliente'}
                          </p>
                          <p className="text-xs text-slate-600">Chofer: {viaje.chofer?.nombre || '—'}</p>
                          <p className="text-xs text-slate-600">{viaje.origen} → {viaje.destino}</p>
                          {ultimaUb.velocidad != null && (
                            <p className="text-[11px] font-mono text-emerald-700 mt-1 font-bold">
                              Velocidad: {(ultimaUb.velocidad * 3.6).toFixed(0)} km/h
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            GPS: {format(new Date(ultimaUb.timestamp), 'HH:mm:ss')}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                )
              })}
            </MapContainer>

            {/* PANEL DETALLE INDIVIDUAL FLOTANTE (si hay viaje seleccionado) */}
            {viajeSeleccionado && (
              <div className="absolute bottom-4 left-4 z-[999] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl max-w-sm w-full animate-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white text-base">
                        {viajeSeleccionado.vehiculo?.patente || 'S/P'}
                      </h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ESTADOS_MAP[viajeSeleccionado.estado]?.badgeClass || 'bg-slate-700 text-slate-300'}`}>
                        {ESTADOS_MAP[viajeSeleccionado.estado]?.label || viajeSeleccionado.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {viajeSeleccionado.vehiculo?.marca} {viajeSeleccionado.vehiculo?.modelo}
                    </p>
                  </div>
                  <button
                    onClick={() => setViajeSeleccionado(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cliente:</span>
                    <span className="font-semibold text-white truncate max-w-[180px]">
                      {viajeSeleccionado.cliente_rel?.nombre_empresa || viajeSeleccionado.cliente || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chofer:</span>
                    <span className="font-semibold text-slate-200">{viajeSeleccionado.chofer?.nombre || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tramo:</span>
                    <span className="text-slate-300">{viajeSeleccionado.origen} → {viajeSeleccionado.destino}</span>
                  </div>
                  {ubicaciones[viajeSeleccionado.id] && ubicaciones[viajeSeleccionado.id].length > 0 && (
                    <div className="flex justify-between font-mono text-[11px] text-emerald-400 pt-1">
                      <span>Último reporte:</span>
                      <span>
                        {format(new Date(ubicaciones[viajeSeleccionado.id][ubicaciones[viajeSeleccionado.id].length - 1].timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => enviarTrackingWhatsApp(viajeSeleccionado)}
                    className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">share</span>
                    Enviar Tracking al Cliente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANEL LATERAL: LISTA DE VEHÍCULOS / VIAJES */}
        <div className="w-80 bg-lazdin-surface/60 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-800 bg-lazdin-surface/90 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-xs uppercase tracking-widest">Vehículos en Operación</h2>
              <p className="text-[11px] text-slate-400">{viajesFiltrados.length} activos</p>
            </div>
            {viajeSeleccionado && (
              <button
                onClick={() => setViajeSeleccionado(null)}
                className="text-[11px] text-lazdin-emerald hover:underline font-bold"
              >
                Ver todos
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {viajesFiltrados.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 block opacity-30">local_shipping</span>
                No hay viajes activos con este filtro.
              </div>
            )}

            {viajesFiltrados.map(viaje => {
              const ubs = ubicaciones[viaje.id] || []
              const ultima = ubs.length > 0 ? ubs[ubs.length - 1] : null
              const isSelected = viajeSeleccionado?.id === viaje.id
              const estadoConfig = ESTADOS_MAP[viaje.estado] || ESTADOS_MAP.en_ruta

              return (
                <div
                  key={viaje.id}
                  onClick={() => seleccionarViaje(viaje)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-800/90 border-lazdin-emerald shadow-lg shadow-emerald-950/40' 
                      : 'bg-lazdin-surface-highest/30 border-slate-800 hover:border-slate-700 hover:bg-lazdin-surface-highest/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-black text-sm text-white">
                      {viaje.vehiculo?.patente || 'Sin patente'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${estadoConfig.badgeClass}`}>
                      {estadoConfig.label}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-300 truncate">
                    {viaje.cliente_rel?.nombre_empresa || viaje.cliente || 'Sin cliente'}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">person</span>
                    {viaje.chofer?.nombre || 'Sin chofer'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/70">
                    <span className="truncate max-w-[90px]">{viaje.origen}</span>
                    <span className="material-symbols-outlined text-xs text-slate-600">arrow_forward</span>
                    <span className="truncate max-w-[90px] text-right">{viaje.destino}</span>
                  </div>

                  {ultima && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span className="text-emerald-400 font-mono">
                        {ultima.velocidad ? `${(ultima.velocidad * 3.6).toFixed(0)} km/h` : 'Detenido'}
                      </span>
                      <span>{format(new Date(ultima.timestamp), 'HH:mm:ss')}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL MODO MONITOR */}
      {modalMonitor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-lazdin-surface border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">tv</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Modo Monitor de Flota</h3>
                  <p className="text-xs text-slate-400">Visualización en pantalla gigante / Smart TV</p>
                </div>
              </div>
              <button
                onClick={() => { setModalMonitor(false); setCopiado(false) }}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Este enlace permite abrir la vista de mapa en pantalla completa en cualquier monitor o Smart TV del centro de operaciones sin necesidad de ingresar usuario ni contraseña.
            </p>

            {generandoToken ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Generando link seguro...
              </div>
            ) : errorMonitor ? (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-sm">error</span>
                  No se pudo generar el enlace
                </div>
                <p>{errorMonitor}</p>
                <button
                  type="button"
                  onClick={abrirModalMonitor}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Enlace del Monitor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={monitorUrl}
                      className="form-field text-xs font-mono bg-slate-900 select-all"
                    />
                    <button
                      onClick={() => {
                        if (!monitorUrl) return
                        navigator.clipboard.writeText(monitorUrl)
                        setCopiado(true)
                        setTimeout(() => setCopiado(false), 2500)
                      }}
                      disabled={!monitorToken}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiado ? 'check' : 'content_copy'}
                      </span>
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (monitorUrl && monitorToken) {
                        window.open(monitorUrl, '_blank')
                      }
                    }}
                    disabled={!monitorToken}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-950/40 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                    Abrir Monitor en Nueva Pestaña
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
