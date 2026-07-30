import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import L from 'leaflet'
import { format } from 'date-fns'

// Custom marker icon for trucks
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/7504/7504060.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

export default function MapaVisibilidad() {
  const { user } = useAuth()
  const [viajes, setViajes] = useState([])
  const [ubicaciones, setUbicaciones] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()

    // Subscripción a Realtime para nuevas ubicaciones
    const ubicacionesSub = supabase.channel('realtime_ubicaciones')
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
      supabase.removeChannel(ubicacionesSub)
    }
  }, [])

  async function cargarDatos() {
    setLoading(true)
    try {
      // 1. Obtener viajes activos
      const { data: viajesData } = await supabase
        .from('viajes')
        .select(`
          *,
          chofer:chofer_id(nombre),
          vehiculo:vehiculo_id(patente)
        `)
        .neq('estado', 'finalizado')

      setViajes(viajesData || [])

      // 2. Obtener ubicaciones históricas de esos viajes
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
        }
        setUbicaciones(ubsPorViaje)
      }
    } catch (err) {
      console.error('Error cargando mapa:', err)
    } finally {
      setLoading(false)
    }
  }

  // Estilo base oscuro de Leaflet (para el contenedor)
  const mapStyle = {
    height: '100%',
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: '0.75rem'
  }

  // Capa de mapa estilo oscuro (CartoDB Dark Matter)
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2 -mx-2 bg-lazdin-bg text-white">
      {/* HEADER / FILTROS (Simplificado por ahora) */}
      <div className="flex items-center justify-between px-6 py-4 bg-lazdin-surface/50 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-lazdin-emerald">map</span>
          Portal de Visibilidad
        </h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider">
            {viajes.filter(v => v.estado === 'en_riesgo').length} En Riesgo
          </span>
          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold uppercase tracking-wider">
            {viajes.filter(v => v.estado === 'atrasado').length} Atrasados
          </span>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
            {viajes.filter(v => v.estado === 'en_ruta').length} En Ruta
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* CONTENEDOR DEL MAPA */}
        <div className="flex-1 relative p-4">
          <div className="absolute inset-0 bg-lazdin-surface rounded-xl overflow-hidden m-4 shadow-2xl border border-slate-800/50">
            <MapContainer center={[-34.6037, -58.3816]} zoom={5} style={mapStyle}>
              <TileLayer
                url={TILE_URL}
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                className="brightness-[1.7] contrast-[1.1] hue-rotate-[10deg]"
              />
              
              {viajes.map(viaje => {
                const viajeUbs = ubicaciones[viaje.id]
                if (!viajeUbs || viajeUbs.length === 0) return null

                // Última ubicación para el marcador
                const ultimaUb = viajeUbs[viajeUbs.length - 1]
                
                // Puntos para la ruta
                const ruta = viajeUbs.map(ub => [ub.latitud, ub.longitud])

                // Color según estado
                let colorRuta = '#4edea3' // verde (en ruta)
                if (viaje.estado === 'atrasado') colorRuta = '#f87171' // rojo
                if (viaje.estado === 'en_riesgo') colorRuta = '#fbbf24' // amarillo

                return (
                  <div key={viaje.id}>
                    <Polyline 
                      positions={ruta} 
                      pathOptions={{ color: colorRuta, weight: 3, opacity: 0.8 }} 
                    />
                    <Marker 
                      position={[ultimaUb.latitud, ultimaUb.longitud]}
                      icon={truckIcon}
                    >
                      <Popup className="text-slate-900 font-sans">
                        <div className="p-1">
                          <p className="font-bold border-b pb-1 mb-1">{viaje.cliente || 'Sin cliente'}</p>
                          <p className="text-xs">Chofer: {viaje.chofer?.nombre}</p>
                          <p className="text-xs">Patente: {viaje.vehiculo?.patente || 'N/A'}</p>
                          <p className="text-xs">Origen: {viaje.origen}</p>
                          <p className="text-xs">Destino: {viaje.destino}</p>
                          <p className="text-[10px] text-slate-500 mt-2 text-right">
                            Actualizado: {format(new Date(ultimaUb.timestamp), 'HH:mm')}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                )
              })}
            </MapContainer>
          </div>
        </div>

        {/* PANEL LATERAL (Sidebar) */}
        <div className="w-80 bg-lazdin-surface/50 border-l border-slate-800 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-800 sticky top-0 bg-lazdin-surface/90 backdrop-blur-sm z-10">
            <h2 className="font-bold text-white uppercase text-sm tracking-widest mb-1">En Ruta</h2>
            <p className="text-xs text-lazdin-on-surface-variant">{viajes.length} viajes activos</p>
          </div>
          
          <div className="p-4 flex flex-col gap-3">
            {viajes.length === 0 && !loading && (
              <p className="text-sm text-slate-500 text-center py-8">No hay viajes activos en el mapa.</p>
            )}

            {viajes.map(viaje => (
              <div key={viaje.id} className="bg-lazdin-surface-highest/40 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-sm">{viaje.cliente || 'Sin cliente'}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    viaje.estado === 'atrasado' ? 'bg-red-500/20 text-red-400' :
                    viaje.estado === 'en_riesgo' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {viaje.estado.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-lazdin-on-surface-variant mb-1">
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">person</span>
                  {viaje.chofer?.nombre || 'Sin asignar'}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
                  <span>{viaje.origen}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  <span>{viaje.destino}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
