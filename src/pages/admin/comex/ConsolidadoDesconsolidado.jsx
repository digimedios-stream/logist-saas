import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getTallyOperaciones,
  createTallyOperacion,
  updateTallyOperacion,
  addTallyItem,
  getComexOperaciones,
  getContenedores
} from '@/services/comexService'

export default function ConsolidadoDesconsolidado() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [tallys, setTallys] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [contenedores, setContenedores] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal Nuevo Tally
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    tipo: 'desconsolidado',
    operacion_id: '',
    contenedor_id: '',
    apuntador_nombre: 'Apuntador Fiscal',
    precinto_encontrado: '',
    precinto_conforme: true,
    jaula_fiscal_destino: 'Jaula Fiscal 01',
    total_bultos_declarados: 24,
    total_bultos_recibidos: 24,
    peso_total_declarado_kg: 12500,
    peso_total_recibido_kg: 12500,
    observaciones_aduana: 'Conforme según manifiesto aduanero.'
  })

  // Modal Detalle / Items de Tally
  const [selectedTally, setSelectedTally] = useState(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [formItem, setFormItem] = useState({
    descripcion_mercaderia: '',
    marca_bulto: '',
    tipo_envase: 'pallet',
    cantidad_declarada: 1,
    cantidad_recibida: 1,
    peso_kg: 500,
    volumen_m3: 1.5,
    jaula_ubicacion: 'J-01',
    estado_bulto: 'conforme'
  })

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const [tList, ops, conts] = await Promise.all([
        getTallyOperaciones(empresaId),
        getComexOperaciones(empresaId),
        getContenedores(empresaId)
      ])
      setTallys(tList || [])
      setOperaciones(ops || [])
      setContenedores(conts || [])
    } catch (err) {
      console.error('Error cargando tallys:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCrearTally = async (e) => {
    e.preventDefault()
    if (!form.operacion_id) {
      alert('Selecciona una operación Comex')
      return
    }
    try {
      const nuevo = await createTallyOperacion({
        ...form,
        empresa_id: empresaId,
        estado: 'iniciado'
      })
      setShowModal(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error creando tally: ' + err.message)
    }
  }

  const handleAgregarItem = async (e) => {
    e.preventDefault()
    if (!selectedTally) return
    try {
      await addTallyItem({
        ...formItem,
        tally_id: selectedTally.id
      })
      setShowItemModal(false)
      cargarDatos()
    } catch (err) {
      console.error(err)
      alert('Error agregando item: ' + err.message)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <span className="material-symbols-outlined text-3xl">inventory_2</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Consolidado & Desconsolidado (Tally Portuario)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                Control de Apuntadores
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Pretally, Tally de descarga, verificación de precintos PEMA, jaulas aduaneras y registro de bultos.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              tipo: 'desconsolidado',
              operacion_id: operaciones[0]?.id || '',
              contenedor_id: contenedores[0]?.id || '',
              apuntador_nombre: 'Apuntador Fiscal',
              precinto_encontrado: 'PEMA-89123',
              precinto_conforme: true,
              jaula_fiscal_destino: 'Jaula Fiscal 01',
              total_bultos_declarados: 24,
              total_bultos_recibidos: 24,
              peso_total_declarado_kg: 12500,
              peso_total_recibido_kg: 12500,
              observaciones_aduana: 'Conforme según manifiesto aduanero.'
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          + Iniciar Tally / Desconsolidado
        </button>
      </div>

      {/* Grid de Tallys */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tallys.map(t => (
          <div key={t.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                t.tipo === 'desconsolidado'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {t.tipo}
              </span>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold">
                {t.estado}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-100 text-base">
                Op: {t.operacion?.nro_operacion || 'Operación'}
              </h3>
              <p className="text-xs text-slate-400">
                BL / Booking: <strong className="text-cyan-300 font-mono">{t.operacion?.bl_booking || 'S/D'}</strong>
              </p>
              <p className="text-xs text-slate-400">
                Contenedor: <strong className="text-slate-200 font-mono">{t.contenedor?.numero_contenedor || 'General'}</strong>
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Apuntador:</span>
                <strong className="text-slate-100">{t.apuntador_nombre || 'S/D'}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Precinto Verificado:</span>
                <span className="font-mono text-cyan-300">{t.precinto_encontrado || 'S/D'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Jaula Fiscal:</span>
                <strong className="text-amber-300">{t.jaula_fiscal_destino || 'General'}</strong>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Bultos Recibidos:</span>
                <strong className="text-purple-300">{t.total_bultos_recibidos || 0} / {t.total_bultos_declarados || 0}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => {
                  setSelectedTally(t)
                  setFormItem({
                    descripcion_mercaderia: '',
                    marca_bulto: '',
                    tipo_envase: 'pallet',
                    cantidad_declarada: 1,
                    cantidad_recibida: 1,
                    peso_kg: 500,
                    volumen_m3: 1.5,
                    jaula_ubicacion: t.jaula_fiscal_destino || 'J-01',
                    estado_bulto: 'conforme'
                  })
                  setShowItemModal(true)
                }}
                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg font-semibold border border-purple-500/30 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Agregar Bulto / Item
              </button>

              <button
                onClick={async () => {
                  await updateTallyOperacion(t.id, { estado: 'finalizado', fecha_cierre: new Date().toISOString() })
                  cargarDatos()
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold border border-slate-700 transition-all"
              >
                Cerrar Tally
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Crear Tally */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Iniciar Operación de Tally Aduanero</h3>
              <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleCrearTally} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Tally</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm({ ...form, tipo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="desconsolidado">Desconsolidado (Descarga)</option>
                    <option value="consolidado">Consolidado (Carga)</option>
                    <option value="pretally">Pretally (Inspección previa)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Operación Comex *</label>
                  <select
                    required
                    value={form.operacion_id}
                    onChange={e => setForm({ ...form, operacion_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="">Seleccionar Operación</option>
                    {operaciones.map(o => (
                      <option key={o.id} value={o.id}>{o.nro_operacion} - {o.bl_booking}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Apuntador</label>
                  <input
                    type="text"
                    value={form.apuntador_nombre}
                    onChange={e => setForm({ ...form, apuntador_nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Precinto PEMA Encontrado</label>
                  <input
                    type="text"
                    value={form.precinto_encontrado}
                    onChange={e => setForm({ ...form, precinto_encontrado: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Jaula Fiscal Destino</label>
                  <input
                    type="text"
                    value={form.jaula_fiscal_destino}
                    onChange={e => setForm({ ...form, jaula_fiscal_destino: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Bultos Declarados</label>
                  <input
                    type="number"
                    value={form.total_bultos_declarados}
                    onChange={e => setForm({ ...form, total_bultos_declarados: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
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
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                >
                  Iniciar Tally
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Item / Bulto a Tally */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Registrar Bulto / Partida en Tally</h3>
              <button onClick={() => setShowItemModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleAgregarItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción de la Mercadería *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pallet con transformadores de potencia"
                  value={formItem.descripcion_mercaderia}
                  onChange={e => setFormItem({ ...formItem, descripcion_mercaderia: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Envase</label>
                  <select
                    value={formItem.tipo_envase}
                    onChange={e => setFormItem({ ...formItem, tipo_envase: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="pallet">Pallet</option>
                    <option value="caja">Caja</option>
                    <option value="tambor">Tambor</option>
                    <option value="bolsa">Bolsa / Big Bag</option>
                    <option value="jaula">Jaula Fiscal</option>
                    <option value="granel">Granel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado del Bulto</label>
                  <select
                    value={formItem.estado_bulto}
                    onChange={e => setFormItem({ ...formItem, estado_bulto: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="conforme">Conforme</option>
                    <option value="averiado">Averiado / Roto</option>
                    <option value="mojado">Mojado</option>
                    <option value="violado">Precinto Violado</option>
                    <option value="faltante">Faltante</option>
                    <option value="sobrante">Sobrante</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad Recibida</label>
                  <input
                    type="number"
                    value={formItem.cantidad_recibida}
                    onChange={e => setFormItem({ ...formItem, cantidad_recibida: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Peso (Kg)</label>
                  <input
                    type="number"
                    value={formItem.peso_kg}
                    onChange={e => setFormItem({ ...formItem, peso_kg: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                >
                  Guardar Bulto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
