import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { format } from 'date-fns'
import { crearTruckMarkerIcon } from '@/lib/markerIcons'
import 'leaflet/dist/leaflet.css'

// Cliente Supabase con anon key (público, sin auth)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)

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
  const [paquete, setPaquete] = useState(null)
  const [ubicaciones, setUbicaciones] = useState([])
  const [ultimaUbicacion, setUltimaUbicacion] = useState(null)

  useEffect(() => {
    if (token) verificarToken()
  }, [token])

  async function verificarToken() {
    try {
      // 0. Si es un tracking code de Courier (ej: LOG-...)
      const { data: paqData } = await supabasePublic
        .from('courier_paquetes')
        .select(`
          *,
          empresa:empresas(nombre, logo_url, color_marca),
          manifiesto:manifiestos_aduaneros(numero_documento, tipo_documento, canal_aduanero, estado_fiscal)
        `)
        .ilike('tracking_code', token.trim())
        .maybeSingle()

      if (paqData) {
        setPaquete(paqData)
        setEstado('courier')

        // Si tiene viaje_id, cargar ubicaciones del chofer
        if (paqData.viaje_id) {
          const { data: ubs } = await supabasePublic
            .from('ubicaciones_viaje')
            .select('latitud, longitud, timestamp')
            .eq('viaje_id', paqData.viaje_id)
            .order('timestamp', { ascending: true })

          if (ubs && ubs.length > 0) {
            setUbicaciones(ubs)
            setUltimaUbicacion(ubs[ubs.length - 1])
          }
        }
        return
      }

      // 1. Buscar el token estándar de viaje
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
        .select('id, origen, destino, estado, cliente, fecha_inicio, vehiculo:vehiculo_id(patente, marca, modelo)')
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

  // ── ESTADO COURIER / ADUANA ────────────────────────────────
  if (estado === 'courier' && paquete) {
    const etapas = [
      { id: 'recibido_deposito', label: 'Arribo a Depósito Fiscal', desc: 'Ingreso al país y recepción de bulto', icon: 'warehouse' },
      { id: 'en_aforo', label: 'Inspección Aduanera', desc: 'Aforo y verificación documental', icon: 'verified' },
      { id: 'liberado_aduana', label: 'Liberado / Nacionalizado', desc: 'Despacho a plaza otorgado por Aduana', icon: 'task_alt' },
      { id: 'en_reparto', label: 'En Reparto a Destino', desc: 'Asignado a vehículo de última milla', icon: 'local_shipping' },
      { id: 'entregado', label: 'Entregado', desc: 'Recepción confirmada por destinatario', icon: 'check_circle' },
    ]

    const pasoIndex = {
      recibido_deposito: 0,
      almacenado: 0,
      en_aforo: 1,
      liberado_aduana: 2,
      listo_despacho: 2,
      asignado_viaje: 3,
      en_reparto: 3,
      entregado: 4,
      retenido_aduana: 1
    }[paquete.estado] ?? 0

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header Empresa */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-2xl">
            <div className="flex items-center gap-3">
              {paquete.empresa?.logo_url ? (
                <img src={paquete.empresa.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <span className="material-symbols-outlined text-2xl">package_2</span>
                </div>
              )}
              <div>
                <h2 className="font-bold text-base text-white">{paquete.empresa?.nombre || 'Logist Courier'}</h2>
                <span className="text-xs text-slate-400">Seguimiento Oficial de Carga & Aduana</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              {paquete.tracking_code}
            </span>
          </div>

          {/* Tarjeta de Estado Principal */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Contenido del Bulto</span>
                <h1 className="text-xl font-bold text-white mt-0.5">{paquete.descripcion_contenido}</h1>
                <div className="text-xs text-slate-400 mt-1">
                  Destinatario: <strong className="text-slate-200">{paquete.destinatario_nombre}</strong> | {paquete.destinatario_direccion}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase font-semibold">Peso / Bulto</span>
                <div className="text-lg font-black text-emerald-400">{paquete.peso_kg} kg</div>
              </div>
            </div>

            {/* Línea de Tiempo de Aduana & Reparto */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Estado del Envío</h3>
              <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {etapas.map((etapa, idx) => {
                  const completado = idx <= pasoIndex
                  const actual = idx === pasoIndex

                  return (
                    <div key={etapa.id} className="relative flex items-start gap-4 pl-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 transition ${
                          actual
                            ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                            : completado
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                            : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{etapa.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${actual ? 'text-emerald-400' : completado ? 'text-white' : 'text-slate-500'}`}>
                          {etapa.label}
                        </div>
                        <div className="text-xs text-slate-400">{etapa.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Info Manifiesto / Aduana si existe */}
            {paquete.manifiesto && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Doc. Aduanero Asociado</span>
                  <span className="font-mono text-slate-200 font-bold">{paquete.manifiesto.tipo_documento}: {paquete.manifiesto.numero_documento}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  paquete.manifiesto.canal_aduanero === 'verde'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  Canal {paquete.manifiesto.canal_aduanero}
                </span>
              </div>
            )}
          </div>
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
              icon={crearTruckMarkerIcon({
                patente: viaje?.vehiculo?.patente || 'Vehículo',
                color: '#10b981'
              })}
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
