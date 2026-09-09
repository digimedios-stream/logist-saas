import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getDepositosFiscales, createDepositoFiscal, getPosicionesDeposito, createPosicion, getCourierPaquetes, calcularEstadia } from '@/services/courierService'
import LogistAiCopilot from '@/components/ai/LogistAiCopilot'

export default function DepositoFiscal() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [depositos, setDepositos] = useState([])
  const [depositoSeleccionado, setDepositoSeleccionado] = useState(null)
  const [posiciones, setPosiciones] = useState([])
  const [paquetes, setPaquetes] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [showModalDeposito, setShowModalDeposito] = useState(false)
  const [showModalPosicion, setShowModalPosicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Forms
  const [formDeposito, setFormDeposito] = useState({
    nombre: '',
    codigo_aduanero: '',
    direccion: '',
    localidad: '',
    provincia: '',
    dias_libres_almacenaje: 5,
    costo_diario_excedente: 15,
    capacidad_bultos: 5000
  })

  const [formPosicion, setFormPosicion] = useState({
    sector: 'S1',
    pasillo: 'P01',
    rack: 'R01',
    nivel: 'N1'
  })

  useEffect(() => {
    if (empresaId) {
      cargarDatos()
    }
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [deps, paqs] = await Promise.all([
        getDepositosFiscales(empresaId),
        getCourierPaquetes(empresaId)
      ])
      setDepositos(deps)
      setPaquetes(paqs)

      if (deps.length > 0) {
        const primero = deps[0]
        setDepositoSeleccionado(primero)
        const pos = await getPosicionesDeposito(primero.id)
        setPosiciones(pos)
      }
    } catch (err) {
      console.error('Error cargando depósito fiscal:', err)
    } finally {
      setLoading(false)
    }
  }

  async function cambiarDeposito(dep) {
    setDepositoSeleccionado(dep)
    try {
      const pos = await getPosicionesDeposito(dep.id)
      setPosiciones(pos)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCrearDeposito(e) {
    e.preventDefault()
    if (!formDeposito.nombre.trim()) return
    setGuardando(true)
    try {
      const nuevo = await createDepositoFiscal({
        ...formDeposito,
        empresa_id: empresaId
      })
      setDepositos(prev => [nuevo, ...prev])
      setDepositoSeleccionado(nuevo)
      setShowModalDeposito(false)
      setFormDeposito({
        nombre: '',
        codigo_aduanero: '',
        direccion: '',
        localidad: '',
        provincia: '',
        dias_libres_almacenaje: 5,
        costo_diario_excedente: 15,
        capacidad_bultos: 5000
      })
    } catch (err) {
      console.error(err)
      alert('Error creando depósito fiscal')
    } finally {
      setGuardando(false)
    }
  }

  async function handleCrearPosicion(e) {
    e.preventDefault()
    if (!depositoSeleccionado) return
    setGuardando(true)
    try {
      const codigo = `${formPosicion.sector}-${formPosicion.pasillo}-${formPosicion.rack}-${formPosicion.nivel}`
      const nueva = await createPosicion({
        deposito_id: depositoSeleccionado.id,
        empresa_id: empresaId,
        codigo,
        ...formPosicion
      })
      setPosiciones(prev => [...prev, nueva])
      setShowModalPosicion(false)
    } catch (err) {
      console.error(err)
      alert('Error creando posición')
    } finally {
      setGuardando(false)
    }
  }

  // Cálculos de métricas
  const paquetesEnDeposito = paquetes.filter(p => p.estado === 'recibido_deposito' || p.estado === 'almacenado' || p.estado === 'en_aforo')
  const paquetesConSobrestadia = paquetesEnDeposito.filter(p => {
    const calc = calcularEstadia(p.fecha_ingreso, depositoSeleccionado?.dias_libres_almacenaje || 5, depositoSeleccionado?.costo_diario_excedente || 0)
    return calc.enSobrestadia
  })

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">warehouse</span>
            Depósitos Fiscales & WMS
          </h1>
          <p className="text-sm text-slate-400">
            Control de inventario aduanero, posiciones de rack y seguimiento de días de almacenaje libre.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowModalDeposito(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium text-sm transition shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">add_location</span>
            Nuevo Depósito
          </button>
          <button
            onClick={() => setShowModalPosicion(true)}
            disabled={!depositoSeleccionado}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition shadow-lg shadow-emerald-950/40"
          >
            <span className="material-symbols-outlined text-lg">grid_view</span>
            Crear Posición Rack
          </button>
        </div>
      </div>

      {/* Selector de Depósitos */}
      {depositos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {depositos.map(dep => (
            <button
              key={dep.id}
              onClick={() => cambiarDeposito(dep)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
                depositoSeleccionado?.id === dep.id
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <span className="material-symbols-outlined text-base">domain</span>
              {dep.nombre}
              {dep.codigo_aduanero && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {dep.codigo_aduanero}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bultos en Depósito</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{paquetesEnDeposito.length}</span>
            <span className="text-xs text-slate-500">bultos almacenados</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Posiciones Rack</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">shelves</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{posiciones.length}</span>
            <span className="text-xs text-slate-500">ubicaciones definidas</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Días Libres</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">timelapse</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{depositoSeleccionado?.dias_libres_almacenaje || 5}</span>
            <span className="text-xs text-slate-500">días sin canon</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">En Sobrestadía</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${paquetesConSobrestadia.length > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
              <span className="material-symbols-outlined text-lg">warning</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${paquetesConSobrestadia.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {paquetesConSobrestadia.length}
            </span>
            <span className="text-xs text-slate-500">generan recargo</span>
          </div>
        </div>
      </div>

      {/* Grid de Racks / Posiciones */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">grid_4x4</span>
              Mapa Visual de Posiciones y Racks
            </h2>
            <p className="text-xs text-slate-400">Distribución física de almacenamiento para {depositoSeleccionado?.nombre || 'el depósito'}.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        ) : posiciones.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">shelves</span>
            <p className="text-slate-400 text-sm font-medium">Aún no hay posiciones o racks configurados en este depósito.</p>
            <p className="text-xs text-slate-500 mt-1">Haz clic en "Crear Posición Rack" para comenzar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {posiciones.map(pos => (
              <div
                key={pos.id}
                className={`p-3 rounded-xl border text-center transition ${
                  pos.ocupado
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-emerald-500/40'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-500 uppercase">{pos.sector}</div>
                <div className="text-sm font-bold tracking-tight my-0.5">{pos.codigo}</div>
                <div className="flex items-center justify-center gap-1 text-[11px]">
                  <span className={`w-2 h-2 rounded-full ${pos.ocupado ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  <span className="text-slate-400">{pos.ocupado ? 'Ocupado' : 'Libre'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Depósito */}
      {showModalDeposito && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">domain_add</span>
                Nuevo Depósito Fiscal
              </h3>
              <button onClick={() => setShowModalDeposito(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearDeposito} className="p-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Depósito</label>
                <input
                  type="text"
                  required
                  value={formDeposito.nombre}
                  onChange={e => setFormDeposito({ ...formDeposito, nombre: e.target.value })}
                  placeholder="Ej: Terminal Fiscal 1 - Zona Franca"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Código Aduanero</label>
                  <input
                    type="text"
                    value={formDeposito.codigo_aduanero}
                    onChange={e => setFormDeposito({ ...formDeposito, codigo_aduanero: e.target.value })}
                    placeholder="Ej: AD-EZE-04"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Días Libres Almacenaje</label>
                  <input
                    type="number"
                    min="1"
                    value={formDeposito.dias_libres_almacenaje}
                    onChange={e => setFormDeposito({ ...formDeposito, dias_libres_almacenaje: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Diario Excedente (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formDeposito.costo_diario_excedente}
                    onChange={e => setFormDeposito({ ...formDeposito, costo_diario_excedente: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Capacidad Máx. Bultos</label>
                  <input
                    type="number"
                    value={formDeposito.capacidad_bultos}
                    onChange={e => setFormDeposito({ ...formDeposito, capacidad_bultos: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalDeposito(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950"
                >
                  {guardando ? 'Guardando...' : 'Crear Depósito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Posición */}
      {showModalPosicion && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">grid_view</span>
                Nueva Posición de Rack
              </h3>
              <button onClick={() => setShowModalPosicion(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearPosicion} className="p-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Sector</label>
                  <input
                    type="text"
                    required
                    value={formPosicion.sector}
                    onChange={e => setFormPosicion({ ...formPosicion, sector: e.target.value.toUpperCase() })}
                    placeholder="S1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Pasillo</label>
                  <input
                    type="text"
                    required
                    value={formPosicion.pasillo}
                    onChange={e => setFormPosicion({ ...formPosicion, pasillo: e.target.value.toUpperCase() })}
                    placeholder="P01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rack</label>
                  <input
                    type="text"
                    required
                    value={formPosicion.rack}
                    onChange={e => setFormPosicion({ ...formPosicion, rack: e.target.value.toUpperCase() })}
                    placeholder="R01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nivel</label>
                  <input
                    type="text"
                    required
                    value={formPosicion.nivel}
                    onChange={e => setFormPosicion({ ...formPosicion, nivel: e.target.value.toUpperCase() })}
                    placeholder="N1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center text-xs">
                <span className="text-slate-400">Código Generado: </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formPosicion.sector}-{formPosicion.pasillo}-{formPosicion.rack}-{formPosicion.nivel}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalPosicion(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950"
                >
                  {guardando ? 'Guardando...' : 'Crear Posición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copiloto de IA */}
      <LogistAiCopilot contexto={{ paquetes, depositos }} />
    </div>
  )
}
