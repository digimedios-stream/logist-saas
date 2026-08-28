import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { format } from 'date-fns'
import { filtrarTrayectoriaReal } from '@/lib/geoUtils'

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
  const [clientes, setClientes] = useState([])
  const [filtroChofer, setFiltroChofer] = useState('')
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')

  // Modal de Mapa
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null)
  const [rutaViaje, setRutaViaje] = useState([])
  const [loadingRuta, setLoadingRuta] = useState(false)

  // Modal de Entrega / Comprobante
  const [entregaSeleccionada, setEntregaSeleccionada] = useState(null)
  const [fotoModal, setFotoModal] = useState(null)

  useEffect(() => {
    cargarFiltros()
    cargarViajes()
  }, [])

  async function cargarFiltros() {
    try {
      const [chRes, vehRes, cliRes] = await Promise.all([
        supabase.from('choferes').select('id, nombre').order('nombre'),
        supabase.from('vehiculos').select('id, patente').order('patente'),
        supabase.from('clientes').select('id, nombre_empresa').order('nombre_empresa')
      ])
      if (chRes.data) setChoferes(chRes.data)
      if (vehRes.data) setVehiculos(vehRes.data)
      if (cliRes.data) setClientes(cliRes.data)
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
          vehiculo:vehiculo_id(patente),
          cliente_rel:cliente_id(id, nombre_empresa),
          entregas(*)
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
      const rutaLimpia = filtrarTrayectoriaReal(data || [])
      setRutaViaje(rutaLimpia)
    } catch (e) {
      console.error('Error al cargar coordenadas del recorrido:', e)
    } finally {
      setLoadingRuta(false)
    }
  }

  // Eliminar un viaje y su historial en cascada
  async function eliminarViaje(id) {
    if (!confirm('¿Estás seguro de eliminar permanentemente este viaje y todo su historial de recorrido GPS? Esta acción no se puede deshacer.')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('viajes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setViajes(prev => prev.filter(v => v.id !== id))
    } catch (err) {
      alert('Error al eliminar el viaje: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado en el cliente
  const viajesFiltrados = viajes.filter(v => {
    if (filtroChofer && v.chofer_id !== filtroChofer) return false
    if (filtroVehiculo && v.vehiculo_id !== filtroVehiculo) return false
    if (filtroCliente && v.cliente_id !== filtroCliente && v.cliente_rel?.id !== filtroCliente) return false
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
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Historial de Viajes & Despachos</h2>
          <p className="text-slate-400 text-sm">Audite los recorridos satelitales, trayectorias GPS y entregas con firma.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-auto flex-1 min-w-[180px]">
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

        <div className="w-full sm:w-auto flex-1 min-w-[180px]">
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

        <div className="w-full sm:w-auto flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Cliente</label>
          <select 
            className="form-field" 
            value={filtroCliente} 
            onChange={e => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}
          </select>
        </div>

        <div className="w-full sm:w-auto flex-1 min-w-[160px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Fecha</label>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Entrega</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan="8" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : viajesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                    No se encontraron viajes finalizados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                viajesFiltrados.map(v => {
                  const ent = v.entregas?.[0]
                  const tieneEntrega = Boolean(ent?.completada)

                  return (
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
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {v.cliente_rel?.nombre_empresa || v.cliente || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {tieneEntrega ? (
                          <button
                            onClick={() => setEntregaSeleccionada(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/30 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">verified</span>
                            Firma OK
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Sin remito
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => verRecorrido(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lazdin-emerald/10 text-lazdin-emerald hover:bg-lazdin-emerald/20 transition-all rounded-lg text-xs font-bold align-middle"
                        >
                          <span className="material-symbols-outlined text-sm">map</span>
                          Ver Mapa
                        </button>
                        <button 
                          onClick={() => eliminarViaje(v.id)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all rounded-lg align-middle"
                          title="Eliminar Viaje"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal del Mapa de Recorrido */}
      {viajeSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-lazdin-surface border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-lazdin-surface-high border-b border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-white">
                  Trayecto: {viajeSeleccionado.origen} → {viajeSeleccionado.destino}
                </h3>
                <p className="text-xs text-slate-400">
                  Chofer: {viajeSeleccionado.chofer?.nombre} | Vehículo: {viajeSeleccionado.vehiculo?.patente} | Cliente: {viajeSeleccionado.cliente_rel?.nombre_empresa || viajeSeleccionado.cliente || '—'}
                </p>
              </div>
              <button 
                onClick={() => setViajeSeleccionado(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

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
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      className="leaflet-layer-dark"
                    />

                    <Polyline 
                      positions={rutaViaje.map(u => [u.latitud, u.longitud])} 
                      pathOptions={{ color: '#10b981', weight: 4, opacity: 0.8 }} 
                    />

                    <Marker position={[rutaViaje[0].latitud, rutaViaje[0].longitud]} icon={startIcon}>
                      <Popup>
                        <div className="text-slate-950 font-sans">
                          <p className="font-bold">Punto de Partida</p>
                          <p className="text-xs">{format(new Date(rutaViaje[0].timestamp), 'HH:mm:ss')}</p>
                        </div>
                      </Popup>
                    </Marker>

                    <Marker position={[rutaViaje[rutaViaje.length - 1].latitud, rutaViaje[rutaViaje.length - 1].longitud]} icon={endIcon}>
                      <Popup>
                        <div className="text-slate-950 font-sans">
                          <p className="font-bold">Último Punto Reportado</p>
                          <p className="text-xs">{format(new Date(rutaViaje[rutaViaje.length - 1].timestamp), 'HH:mm:ss')}</p>
                        </div>
                      </Popup>
                    </Marker>

                    <FitBounds positions={rutaViaje.map(u => [u.latitud, u.longitud])} />
                  </MapContainer>
                  
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

      {/* Modal Comprobante de Entrega */}
      {entregaSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-lazdin-surface border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Firma & Remito de Entrega</h3>
              <button
                onClick={() => setEntregaSeleccionada(null)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {(() => {
              const ent = entregaSeleccionada.entregas?.[0]
              const fotos = [ent?.foto_remito_1_url, ent?.foto_remito_2_url, ent?.foto_remito_3_url].filter(Boolean)

              return (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                    <p><strong className="text-white">Cliente:</strong> {entregaSeleccionada.cliente_rel?.nombre_empresa || entregaSeleccionada.cliente || '—'}</p>
                    <p><strong className="text-white">Recibió:</strong> {ent?.contacto_nombre || '—'}</p>
                    <p><strong className="text-white">Fecha:</strong> {ent?.fecha_completada ? format(new Date(ent.fecha_completada), 'dd/MM/yyyy HH:mm') : '—'}</p>
                  </div>

                  {ent?.firma_url && (
                    <div>
                      <p className="text-slate-400 uppercase font-bold text-[10px] mb-1.5">Firma de Quien Recibe</p>
                      <div className="bg-white p-3 rounded-xl max-w-xs border border-slate-700">
                        <img src={ent.firma_url} alt="Firma" className="h-20 mx-auto object-contain" />
                      </div>
                    </div>
                  )}

                  {fotos.length > 0 && (
                    <div>
                      <p className="text-slate-400 uppercase font-bold text-[10px] mb-1.5">Fotos de Remito ({fotos.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {fotos.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Remito ${i + 1}`}
                            onClick={() => setFotoModal(url)}
                            className="aspect-square object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-80"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setEntregaSeleccionada(null)}
                      className="px-4 py-2 bg-slate-800 text-slate-200 font-bold rounded-xl"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Modal Zoom Foto */}
      {fotoModal && (
        <div 
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 bg-slate-950/95 z-[1000] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={fotoModal} alt="Remito Ampliado" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  )
}
