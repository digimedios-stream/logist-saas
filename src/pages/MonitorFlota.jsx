import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { format } from 'date-fns'
import 'leaflet/dist/leaflet.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/7504/7504060.png',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
})

// Auto-fit a todos los marcadores
function FitAllBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
    }
  }, [positions.length])
  return null
}

export default function MonitorFlota() {
  const { token } = useParams()
  const [estado, setEstado] = useState('loading')
  const [empresaId, setEmpresaId] = useState(null)
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [viajes, setViajes] = useState([])
  const [ubicaciones, setUbicaciones] = useState({})
  const [reloj, setReloj] = useState(new Date())

  // Reloj en vivo
  useEffect(() => {
    const interval = setInterval(() => setReloj(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (token) verificarToken()
  }, [token])

  async function verificarToken() {
    try {
      const { data: monitorData, error: monitorErr } = await supabasePublic
        .from('monitor_tokens')
        .select('empresa_id, nombre, activo')
        .eq('token', token)
        .maybeSingle()

      if (monitorErr || !monitorData || !monitorData.activo) {
        setEstado('error')
        return
      }

      setEmpresaId(monitorData.empresa_id)
      setEmpresaNombre(monitorData.nombre)

      // Cargar empresa nombre
      const { data: empData } = await supabasePublic
        .from('empresas')
        .select('nombre')
        .eq('id', monitorData.empresa_id)
        .single()

      if (empData) setEmpresaNombre(empData.nombre)

      await cargarDatos(monitorData.empresa_id)
      setEstado('active')

      // Polling cada 10 segundos
      const interval = setInterval(() => cargarDatos(monitorData.empresa_id), 10000)

      // Realtime
      const channel = supabasePublic.channel('monitor_ubicaciones')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ubicaciones_viaje'
        }, (payload) => {
          const nueva = payload.new
          setUbicaciones(prev => {
            const existing = prev[nueva.viaje_id] || []
            return { ...prev, [nueva.viaje_id]: [...existing, nueva] }
          })
        })
        .subscribe()

      return () => {
        clearInterval(interval)
        supabasePublic.removeChannel(channel)
      }

    } catch (err) {
      console.error('Error en monitor:', err)
      setEstado('error')
    }
  }

  async function cargarDatos(empId) {
    try {
      const { data: viajesData } = await supabasePublic
        .from('viajes')
        .select('*, chofer:chofer_id(nombre), vehiculo:vehiculo_id(patente, marca, modelo)')
        .eq('empresa_id', empId)
        .neq('estado', 'finalizado')

      setViajes(viajesData || [])

      if (viajesData && viajesData.length > 0) {
        const viajeIds = viajesData.map(v => v.id)
        const { data: ubsData } = await supabasePublic
          .from('ubicaciones_viaje')
          .select('viaje_id, latitud, longitud, timestamp, velocidad')
          .in('viaje_id', viajeIds)
          .order('timestamp', { ascending: true })

        const ubsPorViaje = {}
        if (ubsData) {
          ubsData.forEach(u => {
            if (!ubsPorViaje[u.viaje_id]) ubsPorViaje[u.viaje_id] = []
            ubsPorViaje[u.viaje_id].push(u)
          })
        }
        setUbicaciones(ubsPorViaje)
      }
    } catch (err) {
      console.error('Error cargando datos monitor:', err)
    }
  }

  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const estadoColors = {
    en_ruta: '#10b981',
    descanso: '#f59e0b',
    entregando: '#a855f7',
    regreso_planta: '#3b82f6',
    atrasado: '#ef4444',
    en_riesgo: '#f59e0b',
    pendiente: '#64748b',
  }

  const estadoLabels = {
    en_ruta: 'En Ruta',
    descanso: 'Descanso',
    entregando: 'Entregando',
    regreso_planta: 'Regresando',
    atrasado: 'Atrasado',
    en_riesgo: 'En Riesgo',
    pendiente: 'Pendiente',
  }

  if (estado === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Cargando monitor de flota...</p>
        </div>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <span className="text-6xl mb-4 block">🔗</span>
          <h1 className="text-2xl font-bold text-white mb-2">Monitor no disponible</h1>
          <p className="text-slate-400">Este enlace de monitor no es válido o fue desactivado.</p>
        </div>
      </div>
    )
  }

  // Obtener todas las posiciones de todos los viajes para FitAllBounds
  const allPositions = []
  viajes.forEach(v => {
    const ubs = ubicaciones[v.id]
    if (ubs && ubs.length > 0) {
      const last = ubs[ubs.length - 1]
      allPositions.push([last.latitud, last.longitud])
    }
  })

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden">
      {/* Mapa fullscreen */}
      <div className="flex-1 relative">
        <MapContainer
          center={[-34.6037, -58.3816]}
          zoom={5}
          style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
          zoomControl={false}
        >
          <TileLayer
            url={TILE_URL}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            className="leaflet-layer-dark"
          />

          {viajes.map(viaje => {
            const ubs = ubicaciones[viaje.id]
            if (!ubs || ubs.length === 0) return null

            const ultima = ubs[ubs.length - 1]
            const ruta = ubs.map(u => [u.latitud, u.longitud])
            const color = estadoColors[viaje.estado] || '#10b981'

            return (
              <div key={viaje.id}>
                <Polyline
                  positions={ruta}
                  pathOptions={{ color, weight: 3, opacity: 0.6 }}
                />
                <Marker
                  position={[ultima.latitud, ultima.longitud]}
                  icon={truckIcon}
                >
                  <Popup className="text-slate-900 font-sans">
                    <div className="p-1 min-w-[200px]">
                      <p className="font-black text-base border-b pb-1 mb-2">{viaje.vehiculo?.patente}</p>
                      <p className="text-xs"><strong>Chofer:</strong> {viaje.chofer?.nombre}</p>
                      <p className="text-xs"><strong>Cliente:</strong> {viaje.cliente || '—'}</p>
                      <p className="text-xs"><strong>Origen:</strong> {viaje.origen}</p>
                      <p className="text-xs"><strong>Destino:</strong> {viaje.destino}</p>
                      <p className="text-xs mt-1" style={{ color }}>
                        <strong>Estado:</strong> {estadoLabels[viaje.estado]}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </div>
            )
          })}

          {allPositions.length > 0 && <FitAllBounds positions={allPositions} />}
        </MapContainer>

        {/* Overlay superior — info del monitor */}
        <div className="absolute top-4 left-4 right-4 z-[999] flex items-center justify-between pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <p className="text-white font-black text-sm">{empresaNombre}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest">Monitor de Flota en Vivo</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-5 py-3 rounded-2xl shadow-2xl pointer-events-auto">
            <p className="text-white font-mono text-lg font-bold">
              {reloj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Contadores inferiores */}
        <div className="absolute bottom-4 left-4 z-[999] flex gap-2 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl shadow-xl">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">En Ruta</p>
            <p className="text-white text-2xl font-black">{viajes.filter(v => v.estado === 'en_ruta').length}</p>
          </div>
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl shadow-xl">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">Descanso</p>
            <p className="text-white text-2xl font-black">{viajes.filter(v => v.estado === 'descanso').length}</p>
          </div>
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl shadow-xl">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">Regresando</p>
            <p className="text-white text-2xl font-black">{viajes.filter(v => v.estado === 'regreso_planta').length}</p>
          </div>
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-xl shadow-xl">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total</p>
            <p className="text-white text-2xl font-black">{viajes.length}</p>
          </div>
        </div>
      </div>

      {/* Panel lateral de viajes */}
      <div className="w-72 bg-slate-900/95 border-l border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-black text-white text-sm uppercase tracking-widest">Vehículos Activos</h2>
          <p className="text-slate-500 text-[10px] mt-1">{viajes.length} en operación</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {viajes.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">Sin vehículos activos</p>
          )}

          {viajes.map(v => {
            const ubs = ubicaciones[v.id]
            const ultimaUb = ubs && ubs.length > 0 ? ubs[ubs.length - 1] : null
            const color = estadoColors[v.estado] || '#64748b'

            return (
              <div
                key={v.id}
                className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-black text-sm">{v.vehiculo?.patente || 'S/P'}</span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {estadoLabels[v.estado] || v.estado}
                  </span>
                </div>
                <p className="text-slate-400 text-xs truncate">
                  {v.chofer?.nombre || 'Sin chofer'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                  <span>{v.origen}</span>
                  <span>→</span>
                  <span>{v.destino}</span>
                </div>
                {ultimaUb && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    GPS: {new Date(ultimaUb.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
