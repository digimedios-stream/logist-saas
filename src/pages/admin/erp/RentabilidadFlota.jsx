import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAnalisisRentabilidadFlota } from '@/services/erpService'
import { formatMoneda } from '@/lib/utils'

export default function RentabilidadFlota() {
  const { empresaData } = useAuth()
  const empresaId = empresaData?.id

  const [loading, setLoading] = useState(true)
  const [rentabilidad, setRentabilidad] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroMargen, setFiltroMargen] = useState('todos')

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const data = await getAnalisisRentabilidadFlota(empresaId)
      setRentabilidad(data || [])
    } catch (err) {
      console.error('Error cargando análisis de rentabilidad:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado
  const flotaFiltrada = rentabilidad.filter(v => {
    if (filtroMargen === 'ganancia' && v.margenNeto <= 0) return false
    if (filtroMargen === 'perdida' && v.margenNeto > 0) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        v.patente?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.modelo?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Totales de la flota
  const totalIngresos = rentabilidad.reduce((acc, v) => acc + Number(v.ingresosFletes || 0), 0)
  const totalCostos = rentabilidad.reduce((acc, v) => acc + Number(v.costosTotales || 0), 0)
  const totalMargenNeto = totalIngresos - totalCostos
  const totalKm = rentabilidad.reduce((acc, v) => acc + Number(v.kmTotales || 0), 0)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Contabilidad Analítica & Centros de Costo
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-3xl">query_stats</span>
            Rentabilidad & Costos por Vehículo
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Análisis P&L por patente: Fletes vs Combustible, Mantenimientos y $/Km recorrido.
          </p>
        </div>

        <button
          onClick={cargarDatos}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Recalcular Métricas
        </button>
      </div>

      {/* KPIs Globales de Flota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Ingresos Totales por Flete</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{formatMoneda(totalIngresos)}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Costos Operativos Directos</div>
          <div className="text-2xl font-black text-red-400 mt-1">{formatMoneda(totalCostos)}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Margen Operativo Neto</div>
          <div className={`text-2xl font-black mt-1 ${totalMargenNeto >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
            {formatMoneda(totalMargenNeto)}
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="text-xs text-slate-400 font-semibold uppercase">Kilómetros Totales en Viajes</div>
          <div className="text-2xl font-black text-white mt-1">{totalKm.toLocaleString()} km</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-72 relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar por patente, marca..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={filtroMargen}
          onChange={(e) => setFiltroMargen(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="todos">Todos los Vehículos</option>
          <option value="ganancia">Solo con Margen Positivo (+)</option>
          <option value="perdida">En Pérdida / Alerta (-)</option>
        </select>
      </div>

      {/* Tabla Detallada de Rentabilidad */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Calculando rentabilidad de flota...</div>
        ) : flotaFiltrada.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron vehículos registrados con los criterios seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Vehículo</th>
                  <th className="py-3 px-4">Viajes / Km</th>
                  <th className="py-3 px-4">Ingresos ($)</th>
                  <th className="py-3 px-4">Combustible ($)</th>
                  <th className="py-3 px-4">Taller / Repuestos ($)</th>
                  <th className="py-3 px-4">Costos Totales</th>
                  <th className="py-3 px-4">Margen Neto ($)</th>
                  <th className="py-3 px-4 text-right">% Rentabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {flotaFiltrada.map(v => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-indigo-300 font-mono">
                          {v.patente}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-normal mt-0.5">{v.marca} {v.modelo}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      <div><strong className="text-white">{v.cantidadViajes}</strong> viajes</div>
                      <div className="text-slate-500">{v.kmTotales.toLocaleString()} km</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-400">{formatMoneda(v.ingresosFletes)}</td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">{formatMoneda(v.gastoCombustible)}</td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">{formatMoneda(v.gastoMantenimiento + v.gastoComprasDirectas)}</td>
                    <td className="py-3.5 px-4 font-bold text-red-400">{formatMoneda(v.costosTotales)}</td>
                    <td className="py-3.5 px-4 font-black">
                      <span className={v.margenNeto >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {formatMoneda(v.margenNeto)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        v.margenPorcentaje >= 30 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        v.margenPorcentaje > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {v.margenPorcentaje}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
