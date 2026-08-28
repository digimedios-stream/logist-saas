import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { descargarHistorialClientePDF } from '@/services/pdfService'
import { abrirWhatsApp, generarMensajeEntrega } from '@/services/whatsappService'

export default function GestionEntregas() {
  const { empresaData } = useAuth()
  const [searchParams] = useSearchParams()
  const clienteUrlParam = searchParams.get('cliente')

  const [clientes, setClientes] = useState([])
  const [viajesConEntrega, setViajesConEntrega] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState(clienteUrlParam || 'todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Modal de Detalle
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [logsEstados, setLogsEstados] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (clienteUrlParam) {
      setFiltroCliente(clienteUrlParam)
    }
  }, [clienteUrlParam])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [resClientes, resViajes] = await Promise.all([
        supabase.from('clientes').select('id, nombre_empresa, nombre_responsable, celular, cuit, direccion_fiscal').order('nombre_empresa'),
        supabase
          .from('viajes')
          .select(`
            *,
            chofer:chofer_id(nombre, celular),
            vehiculo:vehiculo_id(patente, marca, modelo),
            cliente_rel:cliente_id(id, nombre_empresa, nombre_responsable, celular),
            entregas(*)
          `)
          .order('created_at', { ascending: false })
      ])

      if (resClientes.error) throw resClientes.error
      if (resViajes.error) throw resViajes.error

      setClientes(resClientes.data || [])
      setViajesConEntrega(resViajes.data || [])
    } catch (err) {
      console.error('Error cargando gestión de entregas:', err)
    } finally {
      setLoading(false)
    }
  }

  async function verDetalle(viaje) {
    setDetalleViaje(viaje)
    setLoadingLogs(true)
    setLogsEstados([])
    try {
      const { data, error } = await supabase
        .from('viaje_estados_log')
        .select('*')
        .eq('viaje_id', viaje.id)
        .order('timestamp', { ascending: true })

      if (!error && data) {
        setLogsEstados(data)
      }
    } catch (err) {
      console.error('Error cargando logs de viaje:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  function handleExportarPDF() {
    const clienteSeleccionado = clientes.find(c => c.id === filtroCliente)
    const viajesDelCliente = viajesConEntrega.filter(v => 
      filtroCliente === 'todos' || v.cliente_id === filtroCliente || v.cliente_rel?.id === filtroCliente
    )
    descargarHistorialClientePDF(clienteSeleccionado || { nombre_empresa: 'Todos los Clientes' }, viajesDelCliente, empresaData)
  }

  function handleCompartirWhatsApp(viaje) {
    const cel = viaje.cliente_rel?.celular
    const nombre = viaje.cliente_rel?.nombre_empresa || viaje.cliente || 'Cliente'
    const entrega = viaje.entregas?.[0]
    const fecha = entrega?.fecha_completada ? format(new Date(entrega.fecha_completada), 'dd/MM/yyyy HH:mm') : format(new Date(viaje.created_at), 'dd/MM/yyyy')

    if (!cel) {
      alert('El cliente no tiene celular registrado.')
      return
    }
    const msg = generarMensajeEntrega(nombre, viaje.destino, fecha)
    abrirWhatsApp(cel, msg)
  }

  // Filtrado
  const viajesFiltrados = viajesConEntrega.filter(v => {
    if (filtroCliente !== 'todos' && v.cliente_id !== filtroCliente && v.cliente_rel?.id !== filtroCliente) return false
    if (filtroEstado === 'entregados' && (!v.entregas || v.entregas.length === 0 || !v.entregas[0]?.completada)) return false
    if (filtroEstado === 'pendientes' && (v.entregas && v.entregas.length > 0 && v.entregas[0]?.completada)) return false

    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        v.origen?.toLowerCase().includes(q) ||
        v.destino?.toLowerCase().includes(q) ||
        v.cliente_rel?.nombre_empresa?.toLowerCase().includes(q) ||
        v.chofer?.nombre?.toLowerCase().includes(q) ||
        v.vehiculo?.patente?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestión de Retiros y Entregas</h2>
          <p className="text-slate-400 text-sm">Auditoría con firmas digitales, fotos de remitos y trazabilidad por cliente.</p>
        </div>

        <button
          onClick={handleExportarPDF}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-950/40 text-sm w-fit active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
          Exportar Informe PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Buscar</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
            <input
              type="text"
              className="form-field pl-10"
              placeholder="Origen, destino, chofer, patente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="min-w-[220px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Filtrar por Cliente</label>
          <select
            className="form-field"
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
          >
            <option value="todos">Todos los Clientes ({clientes.length})</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre_empresa}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[170px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estado Entrega</label>
          <select
            className="form-field"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todas las Cargas</option>
            <option value="entregados">Con Firma / Entregados</option>
            <option value="pendientes">Pendientes de Entrega</option>
          </select>
        </div>
      </div>

      {/* Tabla de Entregas */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lazdin-surface-high border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Trayecto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Chofer / Vehículo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Firma / Remito</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan="6" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : viajesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">inventory_2</span>
                    No se registraron viajes o entregas con estos filtros.
                  </td>
                </tr>
              ) : (
                viajesFiltrados.map(v => {
                  const entrega = v.entregas?.[0]
                  const tieneFirma = Boolean(entrega?.firma_url)
                  const cantFotos = [entrega?.foto_remito_1_url, entrega?.foto_remito_2_url, entrega?.foto_remito_3_url].filter(Boolean).length

                  return (
                    <tr key={v.id} className="table-row-hover">
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {v.created_at ? format(new Date(v.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm">{v.cliente_rel?.nombre_empresa || v.cliente || 'Sin cliente'}</p>
                        {v.cliente_rel?.nombre_responsable && (
                          <p className="text-xs text-slate-400">{v.cliente_rel.nombre_responsable}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <span>{v.origen}</span>
                          <span className="material-symbols-outlined text-xs text-slate-500">arrow_forward</span>
                          <span>{v.destino}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="text-slate-200 font-medium">{v.chofer?.nombre || '—'}</p>
                        <p className="text-xs font-mono text-slate-400">{v.vehiculo?.patente || 'S/P'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entrega?.completada ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">draw</span>
                              Firma OK
                            </span>
                            {cantFotos > 0 && (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {cantFotos} {cantFotos === 1 ? 'foto remito' : 'fotos remito'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => verDetalle(v)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Ver Comprobantes
                        </button>

                        <button
                          onClick={() => handleCompartirWhatsApp(v)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors align-middle"
                          title="Notificar por WhatsApp"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
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

      {/* MODAL DETALLE DE ENTREGA & COMPROBANTES */}
      {detalleViaje && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-lazdin-surface border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-lazdin-surface-high border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">Comprobante de Entrega & Despacho</h3>
                <p className="text-xs text-slate-400">
                  {detalleViaje.origen} → {detalleViaje.destino} | Cliente: {detalleViaje.cliente_rel?.nombre_empresa || detalleViaje.cliente || '—'}
                </p>
              </div>
              <button
                onClick={() => setDetalleViaje(null)}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {/* Sección Datos de Entrega */}
              {detalleViaje.entregas && detalleViaje.entregas.length > 0 ? (
                (() => {
                  const ent = detalleViaje.entregas[0]
                  const fotos = [ent.foto_remito_1_url, ent.foto_remito_2_url, ent.foto_remito_3_url].filter(Boolean)

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[10px]">Recibido Por</span>
                          <span className="font-bold text-white text-sm">{ent.contacto_nombre || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[10px]">Teléfono Receptor</span>
                          <span className="text-slate-300">{ent.contacto_telefono || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[10px]">Fecha de Entrega</span>
                          <span className="text-slate-300 font-mono">
                            {ent.fecha_completada ? format(new Date(ent.fecha_completada), 'dd/MM/yyyy HH:mm:ss') : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Firma Digital */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-purple-400 text-base">draw</span>
                          Firma de Conformidad
                        </h4>
                        {ent.firma_url ? (
                          <div className="bg-white p-3 rounded-xl border border-slate-700 max-w-sm">
                            <img src={ent.firma_url} alt="Firma Digital" className="h-28 mx-auto object-contain" />
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No registra firma digital.</p>
                        )}
                      </div>

                      {/* Fotos de Remito */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-400 text-base">photo_library</span>
                          Fotos de Remito / Comprobante ({fotos.length})
                        </h4>
                        {fotos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-3">
                            {fotos.map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setFotoAmpliada(url)}
                                className="aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:border-lazdin-emerald transition-all relative group"
                              >
                                <img src={url} alt={`Remito ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="material-symbols-outlined text-white text-2xl">zoom_in</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No se adjuntaron fotos de remito.</p>
                        )}
                      </div>

                      {ent.notas && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notas de Entrega</h4>
                          <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                            {ent.notas}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                  <span className="material-symbols-outlined text-3xl mb-1 block opacity-30">pending_actions</span>
                  Este viaje aún no tiene registrada su entrega o firma en destino.
                </div>
              )}

              {/* Timeline de Estados */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-400 text-base">history</span>
                  Trazabilidad & Eventos de Jornada
                </h4>

                {loadingLogs ? (
                  <p className="text-xs text-slate-500">Cargando eventos...</p>
                ) : logsEstados.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sin registros de eventos.</p>
                ) : (
                  <div className="space-y-2 border-l-2 border-slate-800 pl-4 ml-2">
                    {logsEstados.map((log, idx) => (
                      <div key={idx} className="relative text-xs">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-lazdin-emerald" />
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-mono">{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</span>
                          <span className="font-bold text-white uppercase">{log.estado_nuevo}</span>
                        </div>
                        {log.motivo && <p className="text-slate-300 mt-0.5">{log.motivo}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-lazdin-surface-high border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setDetalleViaje(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom Foto */}
      {fotoAmpliada && (
        <div 
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 bg-slate-950/95 z-[1000] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <img src={fotoAmpliada} alt="Remito Ampliado" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
