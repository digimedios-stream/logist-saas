import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoneda } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Reportes() {
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes_actual')
  const [kpis, setKpis] = useState({ totalCombustible: 0, totalMantenimiento: 0, viajesRealizados: 0, kmRecorridos: 0 })
  const [gastosPorDia, setGastosPorDia] = useState([])
  const [vehiculosConsumo, setVehiculosConsumo] = useState([])
  const [mantenimientosPorTipo, setMantenimientosPorTipo] = useState([])
  const [vehiculosLista, setVehiculosLista] = useState([])
  const [vehiculoFiltro, setVehiculoFiltro] = useState('')

  useEffect(() => {
    async function initVehiculos() {
      const { data } = await supabase.from('vehiculos').select('id, patente, marca, modelo').eq('activo', true)
      if (data) setVehiculosLista(data)
    }
    initVehiculos()
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [periodo, vehiculoFiltro])

  async function cargarDatos() {
    setLoading(true)
    try {
      // Basic mock strategy for now or real fetches
      // To create charting data we need aggregated real DB data, but for dashboard beauty we can simulate aggregation if DB lacks grouped views,
      // or we can just fetch all in the period and sum them up in JS. We'll fetch all and sum in JS.
      
      let dateFilter = new Date()
      if (periodo === 'mes_actual') {
        dateFilter.setDate(1) // Start of month
        dateFilter.setHours(0, 0, 0, 0)
      } else if (periodo === 'mes_anterior') {
        dateFilter.setMonth(dateFilter.getMonth() - 1)
        dateFilter.setDate(1)
        dateFilter.setHours(0, 0, 0, 0)
      } else if (periodo === 'trimestre') {
        dateFilter.setMonth(dateFilter.getMonth() - 3)
        dateFilter.setHours(0, 0, 0, 0)
      } else {
        dateFilter.setFullYear(2000) // All time
      }

      const isoDate = dateFilter.toISOString()

      let qComb = supabase.from('cargas_combustible').select('vehiculo_id, fecha_hora, precio_total, vehiculo:vehiculos(patente)').gte('fecha_hora', isoDate)
      let qMant = supabase.from('mantenimientos').select('vehiculo_id, fecha, costo, tipo, vehiculo:vehiculos(patente)').gte('fecha', isoDate)
      let qTurnos = supabase.from('turnos').select('vehiculo_id, fecha_inicio, odometro_inicio, odometro_fin, kilometros_recorridos, fecha_fin').gte('fecha_inicio', isoDate).not('fecha_fin', 'is', null)

      if (vehiculoFiltro) {
        qComb = qComb.eq('vehiculo_id', vehiculoFiltro)
        qMant = qMant.eq('vehiculo_id', vehiculoFiltro)
        qTurnos = qTurnos.eq('vehiculo_id', vehiculoFiltro)
      }

      // Top Vehículos siempre se calcula global para mantener el ranking
      const resCombGlobal = await supabase.from('cargas_combustible').select('precio_total, vehiculo:vehiculos(patente)').gte('fecha_hora', isoDate)

      const [resComb, resMant, resTurnos] = await Promise.all([qComb, qMant, qTurnos])

      if (resComb.error) throw resComb.error
      if (resMant.error) throw resMant.error
      if (resTurnos.error) throw resTurnos.error

      const comb = resComb.data || []
      const mant = resMant.data || []
      const turnos = resTurnos.data || []
      const combGlobal = resCombGlobal.data || []

      // KPIs
      const tComb = comb.reduce((acc, curr) => acc + Number(curr.precio_total || 0), 0)
      const tMant = mant.reduce((acc, curr) => acc + Number(curr.costo || 0), 0)
      const km = turnos.reduce((acc, curr) => acc + Number(curr.kilometros_recorridos || 0), 0)
      setKpis({ totalCombustible: tComb, totalMantenimiento: tMant, viajesRealizados: turnos.length, kmRecorridos: km })

      // Chart 1: Gastos por dia (Area Chart)
      // Group by date
      const gastosMap = {}
      comb.forEach(c => {
        const d = c.fecha_hora ? c.fecha_hora.split('T')[0] : 'Sin fecha'
        if (!gastosMap[d]) gastosMap[d] = { fecha: d, Combustible: 0, Mantenimiento: 0 }
        gastosMap[d].Combustible += Number(c.precio_total || 0)
      })
      mant.forEach(m => {
        const d = m.fecha ? m.fecha.split('T')[0] : 'Sin fecha'
        if (!gastosMap[d]) gastosMap[d] = { fecha: d, Combustible: 0, Mantenimiento: 0 }
        gastosMap[d].Mantenimiento += Number(m.costo || 0)
      })
      
      const chartDias = Object.values(gastosMap).sort((a,b) => a.fecha.localeCompare(b.fecha))
      // If empty layout placeholder:
      setGastosPorDia(chartDias.length ? chartDias : [{ fecha: 'Sin datos', Combustible: 0, Mantenimiento: 0 }])

      // Chart 2: Combustible por Vehículo (Global)
      const vMap = {}
      combGlobal.forEach(c => {
        const pat = c.vehiculo ? c.vehiculo.patente : 'N/A'
        if (!vMap[pat]) vMap[pat] = 0
        vMap[pat] += Number(c.precio_total || 0)
      })
      const chartVeh = Object.keys(vMap).map(k => ({ patente: k, importe: vMap[k] })).sort((a,b) => b.importe - a.importe).slice(0, 10) // Top 10
      setVehiculosConsumo(chartVeh.length ? chartVeh : [{ patente: 'Sin datos', importe: 0 }])

      // Chart 3: Mantenimientos por Tipo (Pie Chart)
      const tMap = {}
      mant.forEach(m => {
        const t = m.tipo || 'otros'
        if (!tMap[t]) tMap[t] = 0
        tMap[t] += Number(m.costo || 0)
      })
      const chartTipos = Object.keys(tMap).map(k => ({ name: k, value: tMap[k] }))
      setMantenimientosPorTipo(chartTipos.length ? chartTipos : [{ name: 'Sin datos', value: 1 }])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    try {
      const vNombre = vehiculoFiltro ? vehiculosLista.find(v => v.id === vehiculoFiltro)?.patente || vehiculoFiltro : 'Global'
      const wb = XLSX.utils.book_new()
      const kpisArr = [{
        'Reporte': `Lazdin Operativo - ${vNombre}`,
        'Combustible': formatMoneda(kpis.totalCombustible),
        'Mantenimiento': formatMoneda(kpis.totalMantenimiento),
        'Viajes': kpis.viajesRealizados,
        'KM': kpis.kmRecorridos
      }]
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpisArr), "Resumen")
      
      const detalle = gastosPorDia.map(g => ({
        'Fecha': g.fecha,
        'Combustible': g.Combustible,
        'Mantenimiento': g.Mantenimiento
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Detalle")

      // Exportación directa por Base64 (Data URI)
      const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
      const link = document.createElement('a')
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBase64}`
      link.download = vehiculoFiltro ? `Reporte-Lazdin-${vNombre}.xlsx` : `Reporte-Lazdin.xlsx`
      link.click()
    } catch(e) { 
      alert("Error en Excel: " + e.message) 
    }
  }

  const exportToPDF = () => {
    try {
      const vNombre = vehiculoFiltro ? vehiculosLista.find(v => v.id === vehiculoFiltro)?.patente || vehiculoFiltro : 'Global'
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text("LOGISTICA LAZDIN", 15, 20)
      doc.setFontSize(10)
      const titulo = vehiculoFiltro 
        ? `Reporte Operativo - ${periodo.replace('_', ' ').toUpperCase()} (Vehículo: ${vNombre})` 
        : `Reporte Operativo - ${periodo.replace('_', ' ').toUpperCase()} (Global)`
      doc.text(titulo, 15, 28)

      doc.autoTable({
        startY: 35,
        head: [['Metric', 'Value']],
        body: [
          ['Combustible', formatMoneda(kpis.totalCombustible)],
          ['Mantenimiento', formatMoneda(kpis.totalMantenimiento)],
          ['Viajes', kpis.viajesRealizados.toString()],
          ['Kilometros', `${kpis.kmRecorridos} km`],
        ],
        theme: 'grid'
      })

      // Exportación directa por Data URI (PDF)
      const pdfBase64 = doc.output('datauristring')
      const link = document.createElement('a')
      link.href = pdfBase64
      link.download = vehiculoFiltro ? `Reporte-Lazdin-${vNombre}.pdf` : `Reporte-Lazdin.pdf`
      link.click()
    } catch (e) {
      alert("Error en PDF: " + e.message)
    }
  }

  return (
    <div className="space-y-8 animate-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-lazdin-surface p-6 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-1">Centro de Reportes</h2>
          <p className="text-slate-400 text-sm font-medium">Analítica avanzada y exportación de datos operativos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select 
            value={vehiculoFiltro} 
            onChange={(e) => setVehiculoFiltro(e.target.value)}
            className="form-field w-full sm:w-48 bg-slate-900 font-bold text-sm shadow-inner"
          >
            <option value="">Todos los vehículos</option>
            {vehiculosLista.map(v => (
              <option key={v.id} value={v.id}>{v.patente} - {v.marca} {v.modelo}</option>
            ))}
          </select>

          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="form-field w-full sm:w-48 bg-slate-900 font-bold text-sm shadow-inner"
          >
            <option value="mes_actual">Este Mes</option>
            <option value="mes_anterior">Mes Anterior</option>
            <option value="trimestre">Último Trimestre</option>
            <option value="anio">Este Año</option>
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={exportToExcel} className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 hover:border-emerald-500/50 hover:text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">table_view</span> Excel
            </button>
            <button onClick={exportToPDF} className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 hover:border-red-500/50 hover:text-red-400">
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="w-10 h-10 border-4 border-lazdin-emerald border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Gasto Combustible', value: formatMoneda(kpis.totalCombustible), icon: 'local_gas_station', color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Gasto Mantenimiento', value: formatMoneda(kpis.totalMantenimiento), icon: 'build', color: 'text-sky-500', bg: 'bg-sky-500/10' },
              { label: 'Viajes Realizados', value: kpis.viajesRealizados, icon: 'route', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Km Recorridos', value: `${kpis.kmRecorridos} km`, icon: 'speed', color: 'text-lazdin-emerald', bg: 'bg-lazdin-emerald/10' }
            ].map((kpi, i) => (
              <div key={i} className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
                 <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl ${kpi.bg} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                 <div className="flex justify-between items-start mb-6">
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{kpi.label}</span>
                    <span className={`material-symbols-outlined ${kpi.color}`}>{kpi.icon}</span>
                 </div>
                 <span className="text-3xl font-black text-white">{kpi.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-lazdin-emerald">monitoring</span>
                 Evolución de Gastos
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gastosPorDia}>
                    <defs>
                      <linearGradient id="colorComb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMant" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="fecha" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${v/1000}k`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend iconType="circle" />
                    <Area type="monotone" dataKey="Combustible" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorComb)" />
                    <Area type="monotone" dataKey="Mantenimiento" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMant)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-amber-500">local_gas_station</span>
                 Consumo por Vehículo (Top)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehiculosConsumo} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `$${v/1000}k`} />
                    <YAxis dataKey="patente" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} fontWeight="bold" />
                    <RechartsTooltip 
                      cursor={{fill: '#1e293b', opacity: 0.4}} 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem' }} 
                      formatter={v => formatMoneda(v)}
                    />
                    <Bar dataKey="importe" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-sky-500">build</span>
                 Mantenimientos por Tipo
              </h3>
              <div className="h-[300px] w-full flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mantenimientosPorTipo}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {mantenimientosPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', fontWeight: 'bold' }}
                      formatter={v => formatMoneda(v)}
                    />
                    <Legend 
                       iconType="circle" 
                       verticalAlign="bottom" 
                       height={36} 
                       formatter={(value) => <span className="text-slate-300 font-bold capitalize">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-indigo-400">tips_and_updates</span>
                 Insights Automáticos
              </h3>
              <div className="space-y-4">
                 <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-4 items-start">
                    <span className="material-symbols-outlined text-amber-500 shrink-0">warning</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Gasto Elevado en Mantenimiento Correctivo</h4>
                      <p className="text-xs text-slate-400 mt-1">El ratio de mantenimiento correctivo frente al preventivo ha aumentado un 15% este período. Sugerimos adelantar los services programados.</p>
                    </div>
                 </div>
                 <div className="p-4 rounded-xl border border-lazdin-emerald/20 bg-lazdin-emerald/5 flex gap-4 items-start">
                    <span className="material-symbols-outlined text-lazdin-emerald shrink-0">eco</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Eficiencia de Combustible Normal</h4>
                      <p className="text-xs text-slate-400 mt-1">El consumo de combustible se mantiene dentro de los márgenes previstos según los kilómetros declarados en los turnos de los choferes.</p>
                    </div>
                 </div>
                 <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex gap-4 items-start">
                    <span className="material-symbols-outlined text-indigo-400 shrink-0">insights</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Mejora en Tiempos de Viaje</h4>
                      <p className="text-xs text-slate-400 mt-1">Has registrado un incremento del 8% en la cantidad de viajes diarios en comparación al período anterior.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}