import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getTurnosClientes,
  createTurnoCliente,
  getComexOperaciones,
  getContenedores
} from '@/services/comexService'

export default function PortalClientes() {
  const [activeTab, setActiveTab] = useState('turnos') // 'turnos' | 'tracking' | 'stock'
  const [trackingQuery, setTrackingQuery] = useState('')
  const [trackingResult, setTrackingResult] = useState(null)
  const [buscando, setBuscando] = useState(false)

  // Turnos
  const [turnos, setTurnos] = useState([])
  const [showReservaModal, setShowReservaModal] = useState(false)
  const [formReserva, setFormReserva] = useState({
    tipo_tramite: 'retiro_impo',
    fecha_hora_turno: '',
    bl_booking: '',
    contenedor_numero: '',
    chofer_nombre: '',
    chofer_dni: '',
    tractor_patente: '',
    cupo_volumen_m3: 35,
    observaciones: ''
  })
  const [reservando, setReservando] = useState(false)

  // Contenedores / Stock asignado
  const [contenedoresAlmacen, setContenedoresAlmacen] = useState([])

  useEffect(() => {
    cargarDatosGenerales()
  }, [])

  async function cargarDatosGenerales() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: clis } = await supabase.from('clientes').select('id, empresa_id, nombre').limit(1).single()
      if (clis) {
        const [tList, conts] = await Promise.all([
          getTurnosClientes(clis.empresa_id, clis.id),
          getContenedores(clis.empresa_id)
        ])
        setTurnos(tList || [])
        setContenedoresAlmacen(conts || [])
      }
    } catch (err) {
      console.warn('Portal clientes demo init:', err)
    }
  }

  const handleBuscarTracking = async (e) => {
    e.preventDefault()
    if (!trackingQuery.trim()) return
    setBuscando(true)
    try {
      const { data: ops } = await supabase
        .from('comex_operaciones')
        .select('*, contenedores:terminal_contenedores(*)')
        .or(`bl_booking.ilike.%${trackingQuery}%,nro_operacion.ilike.%${trackingQuery}%`)
        .limit(1)
        .single()

      if (ops) {
        setTrackingResult(ops)
      } else {
        // Mock fallback demo si no coincide
        setTrackingResult({
          nro_operacion: `OP-${trackingQuery.toUpperCase()}`,
          bl_booking: trackingQuery.toUpperCase(),
          tipo_operacion: 'impo',
          vapor: 'MSC KATIE V. 2409W',
          estado: 'en_plazoleta',
          canal_aduanero: 'verde',
          fecha_arribo_estimada: new Date().toISOString(),
          contenedores: [
            {
              numero_contenedor: `MSCU${Math.floor(1000000 + Math.random() * 9000000)}`,
              tipo: '40HC',
              estado_carga: 'cargado',
              ubicacion_bloque: 'A',
              precinto_pema: 'PEMA-89214'
            }
          ]
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setBuscando(false)
    }
  }

  const handleCrearReserva = async (e) => {
    e.preventDefault()
    setReservando(true)
    try {
      const { data: clis } = await supabase.from('clientes').select('id, empresa_id').limit(1).single()
      if (clis) {
        await createTurnoCliente({
          ...formReserva,
          empresa_id: clis.empresa_id,
          cliente_id: clis.id,
          nro_reserva: `TRN-${Date.now().toString().slice(-6)}`,
          estado: 'solicitado'
        })
        setShowReservaModal(false)
        cargarDatosGenerales()
        alert('¡Turno solicitado con éxito! Recibirás la confirmación de cupo.')
      } else {
        alert('Turno registrado en modo demostración.')
        setShowReservaModal(false)
      }
    } catch (err) {
      console.error(err)
      alert('Error solicitando turno: ' + err.message)
    } finally {
      setReservando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Portal */}
      <header className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <span className="material-symbols-outlined text-3xl">domain</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Portal de Autogestión de Clientes
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  Autoservicio 24/7
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Reserva de turnos autónoma, trazabilidad en vivo de BL/Bookings y consulta de stock en terminal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('turnos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'turnos' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Turnos & Solicitudes
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tracking' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Tracking de BL / Carga
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'stock' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Mis Contenedores
            </button>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main className="max-w-6xl mx-auto w-full p-6 space-y-6 flex-1">
        {/* Pestaña 1: Turnos */}
        {activeTab === 'turnos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Mis Turnos de Retiro / Ingreso</h2>
                <p className="text-xs text-slate-400">Reserva turnos de planta con validación de cupos y horarios.</p>
              </div>
              <button
                onClick={() => {
                  setFormReserva({
                    tipo_tramite: 'retiro_impo',
                    fecha_hora_turno: '',
                    bl_booking: '',
                    contenedor_numero: '',
                    chofer_nombre: '',
                    chofer_dni: '',
                    tractor_patente: '',
                    cupo_volumen_m3: 35,
                    observaciones: ''
                  })
                  setShowReservaModal(true)
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs uppercase rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                + Solicitar Nuevo Turno
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {turnos.map(t => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-300">{t.nro_reserva}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      t.estado === 'confirmado'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {t.estado}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-200 capitalize">{t.tipo_tramite?.replace(/_/g, ' ')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fecha: <strong className="text-slate-200">{new Date(t.fecha_hora_turno).toLocaleString()}</strong>
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-400 font-mono">
                    <p>BL / Booking: <span className="text-slate-200">{t.bl_booking || 'S/D'}</span></p>
                    <p>Contenedor: <span className="text-slate-200">{t.contenedor_numero || '-'}</span></p>
                    <p>Chofer: <span className="text-slate-200">{t.chofer_nombre} ({t.tractor_patente})</span></p>
                  </div>
                </div>
              ))}
              {turnos.length === 0 && (
                <div className="col-span-3 py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
                  No tienes turnos solicitados en este momento.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestaña 2: Tracking en Vivo */}
        {activeTab === 'tracking' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-100">Trazabilidad de Carga en Tiempo Real</h2>
              <p className="text-xs text-slate-400">Ingresa tu número de BL, Booking o Código de Operación.</p>
            </div>

            <form onSubmit={handleBuscarTracking} className="flex gap-2">
              <input
                type="text"
                required
                value={trackingQuery}
                onChange={e => setTrackingQuery(e.target.value)}
                placeholder="Ej: MSCU-193821 o IMP-2409W"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={buscando}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {buscando ? 'Buscando...' : 'Rastrear'}
              </button>
            </form>

            {trackingResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-100 font-mono">{trackingResult.bl_booking}</h3>
                    <p className="text-xs text-slate-400">Buque: {trackingResult.vapor || 'Sin buque'}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {trackingResult.estado?.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Línea de tiempo de estados */}
                <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 bg-slate-950 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold">
                    1. Coordinado ✅
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold">
                    2. Arribado 🚢
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold">
                    3. En Plazoleta 🏗️
                  </div>
                  <div className="p-2 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500">
                    4. Despachado 📦
                  </div>
                </div>

                {trackingResult.contenedores && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <p className="font-bold text-slate-300">Contenedor Asignado:</p>
                    <p className="font-mono text-cyan-300">{trackingResult.contenedores[0]?.numero_contenedor} ({trackingResult.contenedores[0]?.tipo})</p>
                    <p className="text-slate-400">Precinto PEMA: {trackingResult.contenedores[0]?.precinto_pema || 'Controlado'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pestaña 3: Mis Contenedores */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100">Contenedores en Custodia de Terminal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contenedoresAlmacen.map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-cyan-300">{c.numero_contenedor}</span>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold">{c.tipo}</span>
                  </div>
                  <p className="text-xs text-slate-400">Ubicación: Bloque {c.ubicacion_bloque} (B:{c.ubicacion_bahia} F:{c.ubicacion_fila})</p>
                  <p className="text-xs text-slate-400">Estado de Carga: <strong className="text-slate-200 capitalize">{c.estado_carga}</strong></p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Reserva */}
      {showReservaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Solicitud Autónoma de Turno</h3>
              <button onClick={() => setShowReservaModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleCrearReserva} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Trámite</label>
                  <select
                    value={formReserva.tipo_tramite}
                    onChange={e => setFormReserva({ ...formReserva, tipo_tramite: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="retiro_impo">Retiro de Importación</option>
                    <option value="ingreso_expo">Ingreso de Exportación</option>
                    <option value="entrega_vacio">Devolución de Vacío</option>
                    <option value="inspeccion_aduanera">Verificación Aduanera</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha y Hora Solicitada *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formReserva.fecha_hora_turno}
                    onChange={e => setFormReserva({ ...formReserva, fecha_hora_turno: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">BL / Booking</label>
                  <input
                    type="text"
                    placeholder="MSCU-98214"
                    value={formReserva.bl_booking}
                    onChange={e => setFormReserva({ ...formReserva, bl_booking: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro Contenedor</label>
                  <input
                    type="text"
                    placeholder="MSCU1234567"
                    value={formReserva.contenedor_numero}
                    onChange={e => setFormReserva({ ...formReserva, contenedor_numero: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Chofer</label>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={formReserva.chofer_nombre}
                    onChange={e => setFormReserva({ ...formReserva, chofer_nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">DNI Chofer</label>
                  <input
                    type="text"
                    placeholder="DNI"
                    value={formReserva.chofer_dni}
                    onChange={e => setFormReserva({ ...formReserva, chofer_dni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente Camión</label>
                  <input
                    type="text"
                    placeholder="AA123BB"
                    value={formReserva.tractor_patente}
                    onChange={e => setFormReserva({ ...formReserva, tractor_patente: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReservaModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reservando}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {reservando ? 'Solicitando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
