import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getOrdenesTrabajo,
  updateOrdenTrabajo,
  updateContenedor,
  createPesadaBalanza
} from '@/services/comexService'

export default function OperadorFieldApp() {
  const { user, empresaData, logout } = useAuth()
  const empresaId = empresaData?.id

  const [ots, setOts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ots') // 'ots' | 'gate_in' | 'tally'

  // Modal Ejecutar OT
  const [selectedOT, setSelectedOT] = useState(null)
  const [novedadesTexto, setNovedadesTexto] = useState('')
  const [fotoDano, setFotoDano] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [precintoVerificado, setPrecintoVerificado] = useState('')
  const [ejecutando, setEjecutando] = useState(false)

  // Gate IN Rápido de Campo
  const [gateInForm, setGateInForm] = useState({
    numero_contenedor: '',
    precinto_pema: '',
    tractor_patente: '',
    chofer_nombre: '',
    tipo_unidad: '40HC',
    tiene_danos: false,
    descripcion_danos: ''
  })
  const [guardandoGateIn, setGuardandoGateIn] = useState(false)

  useEffect(() => {
    if (empresaId) cargarOTs()
  }, [empresaId])

  async function cargarOTs() {
    setLoading(true)
    try {
      const data = await getOrdenesTrabajo(empresaId)
      setOts(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFotoDano(file)
      const reader = new FileReader()
      reader.onload = () => setFotoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleFinalizarOT = async (e) => {
    e.preventDefault()
    if (!selectedOT) return
    setEjecutando(true)
    try {
      let geoloc = {}
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoloc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          },
          () => {}
        )
      }

      await updateOrdenTrabajo(selectedOT.id, {
        estado: 'completada',
        fecha_fin: new Date().toISOString(),
        observaciones: novedadesTexto || selectedOT.observaciones,
        geolocalizacion: geoloc
      })

      if (precintoVerificado && selectedOT.contenedor_id) {
        await updateContenedor(selectedOT.contenedor_id, {
          precinto_pema: precintoVerificado
        })
      }

      setSelectedOT(null)
      setNovedadesTexto('')
      setFotoPreview(null)
      cargarOTs()
      alert('¡Orden de Trabajo ejecutada y registrada con éxito!')
    } catch (err) {
      console.error(err)
      alert('Error: ' + err.message)
    } finally {
      setEjecutando(false)
    }
  }

  const handleGuardarGateIn = async (e) => {
    e.preventDefault()
    setGuardandoGateIn(true)
    try {
      // Registrar pesada rápida / ticket de Gate IN
      await createPesadaBalanza({
        empresa_id: empresaId,
        nro_ticket: `GIN-${Date.now().toString().slice(-6)}`,
        tractor_patente: gateInForm.tractor_patente.toUpperCase(),
        chofer_nombre: gateInForm.chofer_nombre,
        tipo_movimiento: 'ingreso_impo',
        peso_bruto_kg: 32000,
        tara_kg: 14000,
        precintos_controlados: gateInForm.precinto_pema,
        observaciones: gateInForm.tiene_danos ? `Daños reportados: ${gateInForm.descripcion_danos}` : 'Sin daños reportados en Gate IN'
      })

      alert('✅ Gate IN registrado en sistema. Ticket emitido.')
      setGateInForm({
        numero_contenedor: '',
        precinto_pema: '',
        tractor_patente: '',
        chofer_nombre: '',
        tipo_unidad: '40HC',
        tiene_danos: false,
        descripcion_danos: ''
      })
    } catch (err) {
      console.error(err)
      alert('Error registrando Gate IN: ' + err.message)
    } finally {
      setGuardandoGateIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Header Móvil de Campo */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
            <span className="material-symbols-outlined text-lg">forklift</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-100 uppercase tracking-wide">
              Terminal Móvil (Handheld)
            </h1>
            <p className="text-[10px] text-slate-400">Operador: {user?.email?.split('@')[0] || 'Campo'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 text-xs"
        >
          <span className="material-symbols-outlined text-base">logout</span>
        </button>
      </header>

      {/* Selector de Pestañas Operativas */}
      <div className="grid grid-cols-2 p-2 bg-slate-900/60 border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('ots')}
          className={`py-2 text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ots'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-sm">assignment</span>
          Mis OTs ({ots.filter(o => o.estado !== 'completada').length})
        </button>
        <button
          onClick={() => setActiveTab('gate_in')}
          className={`py-2 text-xs font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'gate_in'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
          Gate IN / Precinto
        </button>
      </div>

      {/* Contenido Pestaña 1: Mis OTs */}
      {activeTab === 'ots' && (
        <div className="p-4 space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Cargando órdenes de trabajo...</div>
          ) : ots.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-700">task_alt</span>
              <p>No tienes órdenes de trabajo asignadas.</p>
            </div>
          ) : (
            ots.map(ot => (
              <div
                key={ot.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-amber-400">{ot.nro_ot}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    ot.prioridad === 'urgente'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {ot.prioridad}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-100 capitalize">
                    {ot.tipo_ot?.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Contenedor: <strong className="text-cyan-300 font-mono">{ot.contenedor?.numero_contenedor || 'General'}</strong>
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl text-xs space-y-1 text-slate-300 border border-slate-800">
                  <p>Origen: <strong className="text-slate-200">{ot.origen_ubicacion || 'Plazoleta'}</strong></p>
                  <p>Destino: <strong className="text-slate-200">{ot.destino_ubicacion || 'En muelle'}</strong></p>
                  {ot.observaciones && <p className="text-slate-400 italic mt-1">"{ot.observaciones}"</p>}
                </div>

                {ot.estado !== 'completada' ? (
                  <button
                    onClick={() => {
                      setSelectedOT(ot)
                      setPrecintoVerificado(ot.contenedor?.precinto_pema || '')
                      setNovedadesTexto('')
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    Ejecutar & Reportar Novedad
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/20 rounded-xl border border-emerald-500/30">
                    Completada con éxito ✅
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Contenido Pestaña 2: Gate IN de Campo */}
      {activeTab === 'gate_in' && (
        <div className="p-4 flex-1">
          <form onSubmit={handleGuardarGateIn} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <span className="material-symbols-outlined text-base">login</span>
              Registro Gate IN en Terreno
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nro de Contenedor *</label>
              <input
                type="text"
                required
                placeholder="MSCU1234567"
                value={gateInForm.numero_contenedor}
                onChange={e => setGateInForm({ ...gateInForm, numero_contenedor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Precinto PEMA Oficial *</label>
              <input
                type="text"
                required
                placeholder="PEMA-98214"
                value={gateInForm.precinto_pema}
                onChange={e => setGateInForm({ ...gateInForm, precinto_pema: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-mono uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Patente Tractor *</label>
                <input
                  type="text"
                  required
                  placeholder="AA123BB"
                  value={gateInForm.tractor_patente}
                  onChange={e => setGateInForm({ ...gateInForm, tractor_patente: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Chofer</label>
                <input
                  type="text"
                  placeholder="Nombre chofer"
                  value={gateInForm.chofer_nombre}
                  onChange={e => setGateInForm({ ...gateInForm, chofer_nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="chkDan"
                  checked={gateInForm.tiene_danos}
                  onChange={e => setGateInForm({ ...gateInForm, tiene_danos: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700"
                />
                <label htmlFor="chkDan" className="text-xs font-bold text-rose-300">
                  ¿Reportar daños en contenedor / precinto?
                </label>
              </div>

              {gateInForm.tiene_danos && (
                <textarea
                  rows={2}
                  placeholder="Detallar abolladuras, precinto roto, etc."
                  value={gateInForm.descripcion_danos}
                  onChange={e => setGateInForm({ ...gateInForm, descripcion_danos: e.target.value })}
                  className="w-full bg-slate-950 border border-rose-500/40 rounded-xl p-2.5 text-xs text-slate-200"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={guardandoGateIn}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
            >
              {guardandoGateIn ? 'Registrando...' : 'Confirmar Gate IN & PEMA'}
            </button>
          </form>
        </div>
      )}

      {/* Modal Ejecución OT con Foto & Geoloc */}
      {selectedOT && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-amber-300">
                Ejecutar {selectedOT.nro_ot}
              </h3>
              <button onClick={() => setSelectedOT(null)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleFinalizarOT} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Verificación de Precinto PEMA</label>
                <input
                  type="text"
                  value={precintoVerificado}
                  onChange={e => setPrecintoVerificado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Novedad Operativa / Observación</label>
                <textarea
                  rows={2}
                  value={novedadesTexto}
                  onChange={e => setNovedadesTexto(e.target.value)}
                  placeholder="Ej: Contenedor posicionado en Bloque A nivel 2..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100"
                />
              </div>

              {/* Captura de Foto de Campo */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Captura Fotográfica de Evidencia</label>
                <label className="cursor-pointer flex items-center justify-center gap-2 p-3 bg-slate-950 border border-dashed border-slate-700 rounded-xl text-xs text-slate-400 hover:border-slate-500 transition-all">
                  <span className="material-symbols-outlined text-lg">photo_camera</span>
                  Tomar Foto / Subir
                  <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" />
                </label>
                {fotoPreview && (
                  <img src={fotoPreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-700" />
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOT(null)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={ejecutando}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl shadow-lg transition-all"
                >
                  {ejecutando ? 'Guardando...' : 'Completar OT ✅'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
