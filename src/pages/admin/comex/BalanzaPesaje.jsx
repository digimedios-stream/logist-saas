import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPesadasBalanza,
  createPesadaBalanza,
  updatePesadaBalanza,
  getContenedores,
  getComexOperaciones
} from '@/services/comexService'

export default function BalanzaPesaje() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [pesadas, setPesadas] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal Nueva Pesada / Destare
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nro_ticket: '',
    tractor_patente: '',
    semi_patente: '',
    chofer_nombre: '',
    chofer_dni: '',
    peso_bruto_kg: 0,
    tara_kg: 0,
    tipo_movimiento: 'ingreso_impo',
    balanza_identificador: 'Balanza 01 - Principal',
    operador_balanza: 'Operador Principal',
    autoriza_salida: false,
    precintos_controlados: '',
    observaciones: '',
    operacion_id: '',
    contenedor_id: ''
  })
  const [guardando, setGuardando] = useState(false)

  // Ticket Imprimible
  const [ticketImprimir, setTicketImprimir] = useState(null)

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [pes, conts, ops] = await Promise.all([
        getPesadasBalanza(empresaId),
        getContenedores(empresaId),
        getComexOperaciones(empresaId)
      ])
      setPesadas(pes || [])
      setContenedores(conts || [])
      setOperaciones(ops || [])
    } catch (err) {
      console.error('Error cargando pesadas:', err)
    } finally {
      setLoading(false)
    }
  }

  const pesoNetoCalculado = Number(form.peso_bruto_kg || 0) - Number(form.tara_kg || 0)

  const handleGuardarPesada = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const nuevaPesada = {
        empresa_id: empresaId,
        nro_ticket: form.nro_ticket || `TKT-${Date.now().toString().slice(-6)}`,
        tractor_patente: form.tractor_patente.toUpperCase(),
        semi_patente: form.semi_patente?.toUpperCase() || null,
        chofer_nombre: form.chofer_nombre,
        chofer_dni: form.chofer_dni,
        peso_bruto_kg: Number(form.peso_bruto_kg || 0),
        tara_kg: Number(form.tara_kg || 0),
        tipo_movimiento: form.tipo_movimiento,
        balanza_identificador: form.balanza_identificador,
        operador_balanza: form.operador_balanza,
        autoriza_salida: form.autoriza_salida,
        precintos_controlados: form.precintos_controlados,
        observaciones: form.observaciones,
        operacion_id: form.operacion_id || null,
        contenedor_id: form.contenedor_id || null,
        fecha_pesada_bruto: new Date().toISOString()
      }

      const creada = await createPesadaBalanza(nuevaPesada)
      setShowModal(false)
      cargarDatos()
      setTicketImprimir(creada)
    } catch (err) {
      console.error(err)
      alert('Error al registrar pesada: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleImprimirTicket = (pesada) => {
    setTicketImprimir(pesada)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <span className="material-symbols-outlined text-3xl">scale</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Control de Balanza & Báscula Portuaria
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Báscula Certificada
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Pesada bruta, destare, cálculo automático de peso neto, ticket de balanza y autorización de Gate OUT.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              nro_ticket: `TKT-${Date.now().toString().slice(-6)}`,
              tractor_patente: '',
              semi_patente: '',
              chofer_nombre: '',
              chofer_dni: '',
              peso_bruto_kg: 38500,
              tara_kg: 14200,
              tipo_movimiento: 'ingreso_impo',
              balanza_identificador: 'Balanza 01 - Principal',
              operador_balanza: 'Operador Báscula',
              autoriza_salida: true,
              precintos_controlados: 'PEMA Conforme',
              observaciones: '',
              operacion_id: '',
              contenedor_id: ''
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          + Nueva Pesada
        </button>
      </div>

      {/* Tarjetas KPI Báscula */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pesadas Hoy</p>
          <h3 className="text-3xl font-black text-slate-100 mt-1">{pesadas.length}</h3>
          <p className="text-xs text-emerald-400 mt-1">Ingresos y Egresos controlados</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peso Neto Total Movilizado</p>
          <h3 className="text-3xl font-black text-amber-400 mt-1">
            {(pesadas.reduce((acc, p) => acc + (Number(p.peso_bruto_kg || 0) - Number(p.tara_kg || 0)), 0) / 1000).toFixed(1)} Tn
          </h3>
          <p className="text-xs text-slate-400 mt-1">Toneladas métricas netas</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gate OUT Autorizados</p>
          <h3 className="text-3xl font-black text-emerald-400 mt-1">
            {pesadas.filter(p => p.autoriza_salida).length}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Salidas habilitadas con ticket</p>
        </div>
      </div>

      {/* Tabla de Pesadas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm">Registro de Tickets de Báscula</h3>
          <span className="text-xs text-slate-400">{pesadas.length} registros</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Cargando registros de balanza...</div>
        ) : pesadas.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl text-slate-600 mb-2">scale</span>
            <p className="text-base font-medium">No hay pesadas registradas aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Ticket / Fecha</th>
                  <th className="py-3 px-4">Tractor / Semi</th>
                  <th className="py-3 px-4">Chofer / DNI</th>
                  <th className="py-3 px-4 text-right">Bruto (Kg)</th>
                  <th className="py-3 px-4 text-right">Tara (Kg)</th>
                  <th className="py-3 px-4 text-right">Neto (Kg)</th>
                  <th className="py-3 px-4">Gate OUT</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pesadas.map(p => {
                  const neto = Number(p.peso_bruto_kg || 0) - Number(p.tara_kg || 0)
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-amber-300">{p.nro_ticket}</div>
                        <div className="text-xs text-slate-400">
                          {p.fecha_pesada_bruto ? new Date(p.fecha_pesada_bruto).toLocaleString() : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-200">{p.tractor_patente}</div>
                        <div className="text-xs text-slate-400">{p.semi_patente ? `Semi: ${p.semi_patente}` : 'Sin semi'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{p.chofer_nombre || 'S/D'}</div>
                        <div className="text-xs text-slate-400">{p.chofer_dni || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        {Number(p.peso_bruto_kg || 0).toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {Number(p.tara_kg || 0).toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                        {neto.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.autoriza_salida
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {p.autoriza_salida ? 'Habilitado' : 'Retenido'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleImprimirTicket(p)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <span className="material-symbols-outlined text-sm">print</span>
                          Ticket
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Pesada */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">scale</span>
                Nueva Pesada en Báscula
              </h3>
              <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleGuardarPesada} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro de Ticket *</label>
                  <input
                    type="text"
                    required
                    value={form.nro_ticket}
                    onChange={e => setForm({ ...form, nro_ticket: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente Tractor *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AA123BB"
                    value={form.tractor_patente}
                    onChange={e => setForm({ ...form, tractor_patente: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente Semi / Acoplado</label>
                  <input
                    type="text"
                    placeholder="Ej: AB456CD"
                    value={form.semi_patente}
                    onChange={e => setForm({ ...form, semi_patente: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Chofer</label>
                  <input
                    type="text"
                    placeholder="Nombre y Apellido"
                    value={form.chofer_nombre}
                    onChange={e => setForm({ ...form, chofer_nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">DNI Chofer</label>
                  <input
                    type="text"
                    placeholder="Documento de Identidad"
                    value={form.chofer_dni}
                    onChange={e => setForm({ ...form, chofer_dni: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              {/* Registro de Pesos (Bruto / Tara / Neto) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Valores de Pesaje (Balanza Principal)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Peso Bruto (Kg) *</label>
                    <input
                      type="number"
                      required
                      value={form.peso_bruto_kg}
                      onChange={e => setForm({ ...form, peso_bruto_kg: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tara Camión (Kg) *</label>
                    <input
                      type="number"
                      required
                      value={form.tara_kg}
                      onChange={e => setForm({ ...form, tara_kg: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Peso Neto Calculado</label>
                    <div className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-sm font-mono font-black text-amber-400">
                      {pesoNetoCalculado.toLocaleString()} Kg
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Precintos Controlados</label>
                  <input
                    type="text"
                    placeholder="Precinto PEMA / Naviera"
                    value={form.precintos_controlados}
                    onChange={e => setForm({ ...form, precintos_controlados: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chkSalida"
                    checked={form.autoriza_salida}
                    onChange={e => setForm({ ...form, autoriza_salida: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 bg-slate-950 border-slate-700"
                  />
                  <label htmlFor="chkSalida" className="text-xs font-semibold text-slate-200 cursor-pointer">
                    Autorizar Pase de Salida (Gate OUT)
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow transition-all disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Pesada & Emitir Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
