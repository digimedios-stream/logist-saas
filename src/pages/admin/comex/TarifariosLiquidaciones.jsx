import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAcuerdosTarifarios,
  saveAcuerdoTarifario
} from '@/services/comexService'

export default function TarifariosLiquidaciones() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal Nueva Tarifa
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nombre_tarifa: '',
    tipo_operacion: 'impo',
    zona_origen: 'Puerto Buenos Aires (Terminal 1/2/3)',
    zona_destino: 'Depósito Fiscal Central',
    tipo_contenedor: 'TODOS',
    estado_contenedor: 'cargado',
    tarifa_base: 350,
    tarifa_por_km: 1.8,
    costo_pesada: 45,
    costo_bajada_piso: 80,
    costo_reefer_dia: 150,
    moneda: 'USD',
    vigencia_desde: new Date().toISOString().split('T')[0],
    activo: true
  })

  useEffect(() => {
    if (empresaId) cargarTarifas()
  }, [empresaId])

  async function cargarTarifas() {
    setLoading(true)
    try {
      const data = await getAcuerdosTarifarios(empresaId)
      setTarifas(data || [])
    } catch (err) {
      console.error('Error cargando tarifas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarTarifa = async (e) => {
    e.preventDefault()
    try {
      await saveAcuerdoTarifario({
        ...form,
        empresa_id: empresaId,
        tarifa_base: Number(form.tarifa_base || 0),
        tarifa_por_km: Number(form.tarifa_por_km || 0),
        costo_pesada: Number(form.costo_pesada || 0),
        costo_bajada_piso: Number(form.costo_bajada_piso || 0),
        costo_reefer_dia: Number(form.costo_reefer_dia || 0)
      })
      setShowModal(false)
      cargarTarifas()
    } catch (err) {
      console.error(err)
      alert('Error guardando tarifa: ' + err.message)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
            <span className="material-symbols-outlined text-3xl">request_quote</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Acuerdos Tarifarios & Liquidación de Viajes Comex
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                Matriz Dinámica
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Cálculo automático de costos por tipo de contenedor (20'/40'/Reefer), zonas, pesada y manipuleo.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setForm({
              nombre_tarifa: '',
              tipo_operacion: 'impo',
              zona_origen: 'Puerto Buenos Aires (Terminal 1/2/3)',
              zona_destino: 'Depósito Fiscal Central',
              tipo_contenedor: 'TODOS',
              estado_contenedor: 'cargado',
              tarifa_base: 350,
              tarifa_por_km: 1.8,
              costo_pesada: 45,
              costo_bajada_piso: 80,
              costo_reefer_dia: 150,
              moneda: 'USD',
              vigencia_desde: new Date().toISOString().split('T')[0],
              activo: true
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          + Nuevo Acuerdo Tarifario
        </button>
      </div>

      {/* Grid de Tarifas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tarifas.map(t => (
          <div key={t.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {t.tipo_operacion}
              </span>
              <span className="font-mono font-black text-xl text-emerald-400">
                {t.moneda} {t.tarifa_base}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-100 text-base">{t.nombre_tarifa}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Origen: <strong className="text-slate-200">{t.zona_origen}</strong>
              </p>
              <p className="text-xs text-slate-400">
                Destino: <strong className="text-slate-200">{t.zona_destino}</strong>
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tipo Contenedor:</span>
                <span className="text-cyan-300 font-bold">{t.tipo_contenedor}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estado:</span>
                <span className="capitalize text-slate-200">{t.estado_contenedor}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bajada a Piso:</span>
                <span className="text-slate-200 font-mono">+{t.moneda} {t.costo_bajada_piso}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pesada Balanza:</span>
                <span className="text-slate-200 font-mono">+{t.moneda} {t.costo_pesada}</span>
              </div>
              {t.costo_reefer_dia > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Enchufe Reefer / Día:</span>
                  <span className="text-sky-300 font-mono">+{t.moneda} {t.costo_reefer_dia}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span>Vigente desde: {t.vigencia_desde || 'S/D'}</span>
              <span className="text-emerald-400 font-bold">Activo 🟢</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Tarifa */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Nuevo Esquema de Acuerdo Tarifario</h3>
              <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-slate-400">
                close
              </button>
            </div>

            <form onSubmit={handleGuardarTarifa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Acuerdo / Tarifa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Flete Puerto Buenos Aires - Depósito Fiscal Central"
                  value={form.nombre_tarifa}
                  onChange={e => setForm({ ...form, nombre_tarifa: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Zona Origen</label>
                  <input
                    type="text"
                    value={form.zona_origen}
                    onChange={e => setForm({ ...form, zona_origen: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Zona Destino</label>
                  <input
                    type="text"
                    value={form.zona_destino}
                    onChange={e => setForm({ ...form, zona_destino: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo Contenedor</label>
                  <select
                    value={form.tipo_contenedor}
                    onChange={e => setForm({ ...form, tipo_contenedor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="40HC">40' High Cube</option>
                    <option value="20DC">20' Dry Cargo</option>
                    <option value="40REEFER">40' Reefer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tarifa Base (USD)</label>
                  <input
                    type="number"
                    value={form.tarifa_base}
                    onChange={e => setForm({ ...form, tarifa_base: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Pesada Báscula (USD)</label>
                  <input
                    type="number"
                    value={form.costo_pesada}
                    onChange={e => setForm({ ...form, costo_pesada: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Bajada a Piso (USD)</label>
                  <input
                    type="number"
                    value={form.costo_bajada_piso}
                    onChange={e => setForm({ ...form, costo_bajada_piso: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Enchufe Reefer / Día (USD)</label>
                  <input
                    type="number"
                    value={form.costo_reefer_dia}
                    onChange={e => setForm({ ...form, costo_reefer_dia: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 font-mono"
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
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shadow transition-all"
                >
                  Guardar Acuerdo Tarifario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
