import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { format } from 'date-fns'

// Iconos personalizados para Leaflet
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Componente para centrar el mapa dinámicamente según los límites de la ruta
function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [positions, map])
  return null
}

export default function HistorialViajes() {
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [choferes, setChoferes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [filtroChofer, setFiltroChofer] = useState('')
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')

  // Modal de Mapa
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null)
  const [rutaViaje, setRutaViaje] = useState([])
  const [loadingRuta, setLoadingRuta] = useState(false)

  useEffect(() => {
    cargarFiltros()
    cargarViajes()
  }, [])

  async function cargarFiltros() {
    try {
      const [chRes, vehRes] = await Promise.all([
        supabase.from('choferes').select('id, nombre').order('nombre'),
        supabase.from('vehiculos').select('id, patente').order('patente')
      ])
      if (chRes.data) setChoferes(chRes.data)
      if (vehRes.data) setVehiculos(vehRes.data)
    } catch (e) {
      console.error('Error al cargar filtros:', e)
    }
  }

  async function cargarViajes() {
    setLoading(true)
    try {
      let query = supabase
        .from('viajes')
        .select(`
          *,
          chofer:chofer_id(nombre),
          vehiculo:vehiculo_id(patente)
        `)
        .eq('estado', 'finalizado')
        .order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      setViajes(data || [])
    } catch (err) {
      console.error('Error cargando historial de viajes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar las coordenadas del viaje seleccionado
  async function verRecorrido(viaje) {
    setViajeSeleccionado(viaje)
    setLoadingRuta(true)
    setRutaViaje([])
    try {
      const { data, error } = await supabase
        .from('ubicaciones_viaje')
        .select('*')
        .eq('viaje_id', viaje.id)
        .order('timestamp', { ascending: true })

      if (error) throw error
      setRutaViaje(data || [])
    } catch (e) {
      console.error('Error al cargar coordenadas del recorrido:', e)
    } finally {
      setLoadingRuta(false)
    }
  }

  // Filtrado en el cliente
  const viajesFiltrados = viajes.filter(v => {
    if (filtroChofer && v.chofer_id !== filtroChofer) return false
    if (filtroVehiculo && v.vehiculo_id !== filtroVehiculo) return false
    if (filtroFecha) {
      const fechaViaje = format(new Date(v.created_at), 'yyyy-MM-dd')
      if (fechaViaje !== filtroFecha) return false
    }
    return true
  })

  // Estilo Leaflet oscuro
  const mapStyle = {
    height: '100%',
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: '0.5rem'
  }
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Historial de Viajes</h2>
          <p className="text-slate-400 text-sm">Audite los recorridos y trayectorias GPS de viajes finalizados.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Chofer</label>
          <select 
            className="form-field" 
            value={filtroChofer} 
            onChange={e => setFiltroChofer(e.target.value)}
          >
            <option value="">Todos los choferes</option>
            {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Vehículo</label>
          <select 
            className="form-field" 
            value={filtroVehiculo} 
            onChange={e => setFiltroVehiculo(e.target.value)}
          >
            <option value="">Todos los vehículos</option>
            {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente}</option>)}
          </select>
        </div>

        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Fecha de Inicio</label>
          <input 
            type="date" 
            className="form-field" 
            value={filtroFecha} 
            onChange={e => setFiltroFecha(e.target.value)} 
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lazdin-surface-high border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Chofer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Vehículo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Origen</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Destino</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Recorrido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : viajesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No se encontraron viajes finalizados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                viajesFiltrados.map(v => (
                  <tr key={v.id} className="table-row-hover">
                    <td className="px-6 py-4 text-sm text-slate-200">
                      {format(new Date(v.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">
                      {v.chofer?.nombre || 'Desconocido'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {v.vehiculo?.patente || 'S/V'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {v.origen}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {v.destino}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {v.cliente}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => verRecorrido(v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lazdin-emerald/10 text-lazdin-emerald hover:bg-lazdin-emerald/20 transition-all rounded-lg text-xs font-bold"
                      >
                        <span className="material-symbols-outlined text-sm">map</span>
                        Ver Mapa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal del Mapa de Recorrido */}
      {viajeSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-lazdin-surface border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-lazdin-surface-high border-b border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-white">
                  Trayecto: {viajeSeleccionado.origen} → {viajeSeleccionado.destino}
                </h3>
                <p className="text-xs text-slate-400">
                  Chofer: {viajeSeleccionado.chofer?.nombre} | Vehículo: {viajeSeleccionado.vehiculo?.patente}
                </p>
              </div>
              <button 
                onClick={() => setViajeSeleccionado(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Content / Map */}
            <div className="flex-1 p-6 relative">
              {loadingRuta ? (
                <div className="absolute inset-0 flex items-center justify-center bg-lazdin-surface/80">
                  <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-lazdin-emerald border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 text-sm">Cargando coordenadas GPS...</p>
                  </div>
                </div>
              ) : rutaViaje.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-slate-800 rounded-lg bg-slate-900/50">
                  <div className="text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">gps_off</span>
                    <p>Este viaje no registra ubicaciones GPS almacenadas.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full relative">
                  <MapContainer 
                    center={[rutaViaje[0].latitud, rutaViaje[0].longitud]} 
                    zoom={13} 
                    style={mapStyle}
                  >
                    <TileLayer
                      url={TILE_URL}
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      className="brightness-[1.7] contrast-[1.1] hue-rotate-[10deg]"
                    />

                    {/* Polyline del Recorrido */}
                    <Polyline 
                      positions={rutaViaje.map(u => [u.latitud, u.longitud])} 
                      pathOptions={{ color: '#10b981', weight: 4, opacity: 0.8 }} 
                    />

                    {/* Marcador Inicial */}
                    <Marker position={[rutaViaje[0].latitud, rutaViaje[0].longitud]} icon={startIcon}>
                      <Popup>
                        <div className="text-slate-950 font-sans">
                          <p className="font-bold">Punto de Partida</p>
                          <p className="text-xs">{format(new Date(rutaViaje[0].timestamp), 'HH:mm:ss')}</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Marcador Final */}
                    <Marker position={[rutaViaje[rutaViaje.length - 1].latitud, rutaViaje[rutaViaje.length - 1].longitud]} icon={endIcon}>
                      <Popup>
                        <div className="text-slate-950 font-sans">
                          <p className="font-bold">Último Punto Reportado</p>
                          <p className="text-xs">{format(new Date(rutaViaje[rutaViaje.length - 1].timestamp), 'HH:mm:ss')}</p>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Centrado automático */}
                    <FitBounds positions={rutaViaje.map(u => [u.latitud, u.longitud])} />
                  </MapContainer>
                  
                  {/* Detalles rápidos */}
                  <div className="absolute bottom-4 left-4 z-[999] bg-lazdin-surface/95 border border-slate-800 p-3 rounded-lg shadow-xl text-xs space-y-1 text-slate-300">
                    <p><strong className="text-white">Puntos de GPS:</strong> {rutaViaje.length}</p>
                    <p><strong className="text-white">Inicio:</strong> {format(new Date(rutaViaje[0].timestamp), 'dd/MM/yyyy HH:mm')}</p>
                    <p><strong className="text-white">Fin:</strong> {format(new Date(rutaViaje[rutaViaje.length - 1].timestamp), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
