import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Cliente Supabase con anon key (público, sin auth)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/7504/7504060.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
})

// Componente para centrar el mapa en el marcador
function AutoCenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), 14))
    }
  }, [position, map])
  return null
}

export default function TrackingPublico() {
  const { token } = useParams()

  const [estado, setEstado] = useState('loading') // loading | active | finished | expired | error
  const [viaje, setViaje] = useState(null)
  const [ubicaciones, setUbicaciones] = useState([])
  const [ultimaUbicacion, setUltimaUbicacion] = useState(null)

  useEffect(() => {
    if (token) verificarToken()
  }, [token])

  async function verificarToken() {
    try {
      // 1. Buscar el token
      const { data: tokenData, error: tokenErr } = await supabasePublic
        .from('tracking_tokens')
        .select('viaje_id, activo, expires_at')
        .eq('token', token)
        .maybeSingle()

      if (tokenErr || !tokenData) {
        setEstado('error')
        return
      }

      // 2. Verificar si expiró
      if (!tokenData.activo || new Date(tokenData.expires_at) < new Date()) {
        setEstado('expired')
        return
      }

      // 3. Cargar datos del viaje
      const { data: viajeData } = await supabasePublic
        .from('viajes')
        .select('id, origen, destino, estado, cliente, fecha_inicio')
        .eq('id', tokenData.viaje_id)
        .single()

      if (!viajeData) {
        setEstado('error')
        return
      }

      setViaje(viajeData)

      if (viajeData.estado === 'finalizado') {
        setEstado('finished')
      } else {
        setEstado('active')
      }

      // 4. Cargar ubicaciones existentes
      const { data: ubsData } = await supabasePublic
        .from('ubicaciones_viaje')
        .select('latitud, longitud, timestamp')
        .eq('viaje_id', viajeData.id)
        .order('timestamp', { ascending: true })

      if (ubsData && ubsData.length > 0) {
        setUbicaciones(ubsData)
        setUltimaUbicacion(ubsData[ubsData.length - 1])
      }

      // 5. Suscribirse a Realtime para nuevas ubicaciones
      const channel = supabasePublic.channel(`tracking_${token}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ubicaciones_viaje',
          filter: `viaje_id=eq.${viajeData.id}`
        }, (payload) => {
          const nueva = payload.new
          setUbicaciones(prev => [...prev, nueva])
          setUltimaUbicacion(nueva)
        })
        .subscribe()

      // 6. Suscribirse a cambios de estado del viaje
      const viajeChannel = supabasePublic.channel(`viaje_estado_${token}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'viajes',
          filter: `id=eq.${viajeData.id}`
        }, (payload) => {
          const updated = payload.new
          setViaje(prev => ({ ...prev, ...updated }))
          if (updated.estado === 'finalizado') {
            setEstado('finished')
          }
        })
        .subscribe()

      return () => {
        supabasePublic.removeChannel(channel)
        supabasePublic.removeChannel(viajeChannel)
      }
    } catch (err) {
      console.error('Error en tracking público:', err)
      setEstado('error')
    }
  }

  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const ruta = ubicaciones.map(u => [u.latitud, u.longitud])

  const estadoLabels = {
    en_ruta: { text: 'En camino', color: 'bg-emerald-500', icon: '🚛' },
    descanso: { text: 'En descanso', color: 'bg-amber-500', icon: '☕' },
    entregando: { text: 'Entregando', color: 'bg-purple-500', icon: '📦' },
    regreso_planta: { text: 'Regresando', color: 'bg-blue-500', icon: '🏭' },
    atrasado: { text: 'Demorado', color: 'bg-red-500', icon: '⚠️' },
    en_riesgo: { text: 'En riesgo', color: 'bg-amber-500', icon: '⚠️' },
    finalizado: { text: 'Finalizado', color: 'bg-slate-500', icon: '✅' },
  }

  // ── ESTADOS DE PANTALLA ────────────────────────────────────

  if (estado === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Cargando seguimiento...</p>
        </div>
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <span className="text-6xl mb-4 block">🔗</span>
          <h1 className="text-2xl font-bold text-white mb-2">Link no válido</h1>
          <p className="text-slate-400">Este enlace de seguimiento no existe o no es válido.</p>
        </div>
      </div>
    )
  }

  if (estado === 'expired') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <span className="text-6xl mb-4 block">⏰</span>
          <h1 className="text-2xl font-bold text-white mb-2">Link expirado</h1>
          <p className="text-slate-400">Este enlace de seguimiento ha expirado. Solicite uno nuevo al transportista.</p>
        </div>
      </div>
    )
  }

  if (estado === 'finished') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <span className="text-6xl mb-4 block">✅</span>
          <h1 className="text-2xl font-bold text-white mb-2">Viaje Finalizado</h1>
          <p className="text-slate-400 mb-4">
            El transporte ha llegado a destino.
          </p>
          {viaje && (
            <div className="bg-slate-900 rounded-xl p-4 text-left text-sm space-y-2 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Origen:</span>
                <span className="text-slate-200 font-medium">{viaje.origen}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destino:</span>
                <span className="text-slate-200 font-medium">{viaje.destino}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── TRACKING ACTIVO CON MAPA ───────────────────────────────

  const estadoInfo = estadoLabels[viaje?.estado] || estadoLabels.en_ruta

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Barra superior */}
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 z-10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{estadoInfo.icon}</span>
            <div>
              <p className="text-white font-bold text-sm">{viaje?.origen} → {viaje?.destino}</p>
              <p className="text-slate-400 text-xs">Seguimiento en tiempo real</p>
            </div>
          </div>
          <div className={`${estadoInfo.color} text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
            {viaje?.estado !== 'descanso' && (
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
            {estadoInfo.text}
          </div>
        </div>
      </div>

      {/* Mapa fullscreen */}
      <div className="flex-1 relative">
        {ultimaUbicacion ? (
          <MapContainer
            center={[ultimaUbicacion.latitud, ultimaUbicacion.longitud]}
            zoom={14}
            style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
            zoomControl={false}
          >
            <TileLayer
              url={TILE_URL}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              className="leaflet-layer-dark"
            />

            {/* Recorrido */}
            {ruta.length > 1 && (
              <Polyline
                positions={ruta}
                pathOptions={{ color: '#10b981', weight: 3, opacity: 0.7 }}
              />
            )}

            {/* Posición actual */}
            <Marker
              position={[ultimaUbicacion.latitud, ultimaUbicacion.longitud]}
              icon={truckIcon}
            />

            <AutoCenter position={[ultimaUbicacion.latitud, ultimaUbicacion.longitud]} />
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm">Esperando señal GPS del vehículo...</p>
            </div>
          </div>
        )}

        {/* Info overlay inferior */}
        {ultimaUbicacion && (
          <div className="absolute bottom-4 left-4 right-4 z-[999]">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl max-w-sm mx-auto">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-xs uppercase tracking-wider">En vivo</span>
                </div>
                <span className="text-slate-500 text-xs">
                  Últ. actualización: {new Date(ultimaUbicacion.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
