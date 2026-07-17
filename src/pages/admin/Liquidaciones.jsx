import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaCorta, formatMoneda } from '@/lib/utils'

export default function Liquidaciones() {
  const [choferes, setChoferes] = useState([])
  const [selectedChofer, setSelectedChofer] = useState('')
  const [periodo, setPeriodo] = useState({ 
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fin: new Date().toISOString().split('T')[0]
  })
  
  const [resumen, setResumen] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    cargarChoferes()
  }, [])

  async function cargarChoferes() {
    const { data } = await supabase.from('choferes').select('id, nombre').eq('activo', true)
    setChoferes(data || [])
  }

  async function generarPreliquidacion() {
    if (!selectedChofer) return alert('Por favor, selecciona un chofer')
    setLoading(true)
    try {
      // 1. Obtener viajes de línea (turnos)
      const { data: turnos } = await supabase
        .from('turnos')
        .select('*, linea:lineas(nombre, remuneracion_base)')
        .eq('chofer_id', selectedChofer)
        .gte('fecha_inicio', periodo.inicio)
        .lte('fecha_inicio', periodo.fin + 'T23:59:59')

      // 2. Obtener viajes adicionales
      const { data: adicionales } = await supabase
        .from('adicionales')
        .select('*')
        .eq('chofer_id', selectedChofer)
        .eq('estado', 'realizado')
        .gte('fecha_inicio', periodo.inicio)
        .lte('fecha_inicio', periodo.fin + 'T23:59:59')

      // Calcular parciales
      const subTotalLineas = turnos?.reduce((acc, t) => acc + (t.linea?.remuneracion_base || 0), 0) || 0
      const subTotalAdic = adicionales?.reduce((acc, a) => acc + (parseFloat(a.remuneracion) || 0), 0) || 0

      setResumen({
        turnos: turnos || [],
        adicionales: adicionales || [],
        subTotalLineas,
        subTotalAdic,
        bonificaciones: 0,
        deducciones: 0,
        totalNeto: subTotalLineas + subTotalAdic
      })

    } catch (err) {
      console.error(err)
      alert('Error al calcular liquidación')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMonto = (field, val) => {
    const newVal = parseFloat(val) || 0
    const updatedResumen = { ...resumen, [field]: newVal }
    updatedResumen.totalNeto = updatedResumen.subTotalLineas + updatedResumen.subTotalAdic + updatedResumen.bonificaciones - updatedResumen.deducciones
    setResumen(updatedResumen)
  }

  const guardarLiquidacion = async () => {
    setSaving(true)
    try {
      const payload = {
        chofer_id: selectedChofer,
        periodo_inicio: periodo.inicio,
        periodo_fin: periodo.fin,
        remuneracion_base: resumen.subTotalLineas,
        adicionales_monto: resumen.subTotalAdic,
        adicionales_cantidad: resumen.adicionales.length,
        bonificaciones: resumen.bonificaciones,
        deducciones: resumen.deducciones,
        total_neto: resumen.totalNeto,
        estado: 'pendiente'
      }

      const { error } = await supabase.from('liquidaciones').insert(payload)
      if (error) throw error
      alert('Liquidación guardada correctamente!')
      setResumen(null)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Liquidaciones de Choferes</h2>
        <p className="text-lazdin-on-primary-container text-sm">Cálculo de haberes por viajes rutinarios y adicionales.</p>
      </div>

      <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Chofer</label>
            <select value={selectedChofer} onChange={(e) => setSelectedChofer(e.target.value)} className="form-field mt-1">
              <option value="">Seleccionar chofer...</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Desde</label>
            <input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({...periodo, inicio: e.target.value})} className="form-field mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Hasta</label>
            <input type="date" value={periodo.fin} onChange={(e) => setPeriodo({...periodo, fin: e.target.value})} className="form-field mt-1" />
          </div>
        </div>
        <div className="mt-6">
          <button onClick={generarPreliquidacion} disabled={loading} className="btn-primary w-full md:w-auto">
            {loading ? 'Calculando...' : 'Generar Pre-Liquidación'}
          </button>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in">
          <div className="xl:col-span-2 space-y-6">
            
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between">
                <h3 className="text-sm font-bold uppercase text-slate-400">Detalle de Viajes Fijos</h3>
                <span className="text-xs text-lazdin-emerald font-bold">{formatMoneda(resumen.subTotalLineas)}</span>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/30 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Línea / Ruta</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {resumen.turnos.map(t => (
                      <tr key={t.id} className="hover:bg-slate-800/20">
                        <td className="px-4 py-2 font-mono text-slate-400">{formatFechaCorta(t.fecha_inicio)}</td>
                        <td className="px-4 py-2 font-bold text-white">{t.linea?.nombre}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{formatMoneda(t.linea?.remuneracion_base)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between">
                <h3 className="text-sm font-bold uppercase text-slate-400">Detalle de Adicionales</h3>
                <span className="text-xs text-lazdin-emerald font-bold">{formatMoneda(resumen.subTotalAdic)}</span>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/30 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {resumen.adicionales.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/20">
                        <td className="px-4 py-2 font-mono text-slate-400">{formatFechaCorta(a.fecha_inicio)}</td>
                        <td className="px-4 py-2 font-bold text-white">{a.descripcion}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{formatMoneda(a.remuneracion)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-1">
            <div className="bg-lazdin-surface border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-lazdin-emerald">payments</span>
                Resumen de Pago
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal Rutas:</span>
                  <span className="text-white font-mono">{formatMoneda(resumen.subTotalLineas)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal Adicionales:</span>
                  <span className="text-white font-mono">{formatMoneda(resumen.subTotalAdic)}</span>
                </div>
                
                <hr className="border-slate-800" />
                
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Bonificaciones / Premios</label>
                  <input type="number" value={resumen.bonificaciones} onChange={(e) => handleUpdateMonto('bonificaciones', e.target.value)} className="form-field mt-1 text-lazdin-emerald" placeholder="0.00" />
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500">Deducciones / Gastos</label>
                  <input type="number" value={resumen.deducciones} onChange={(e) => handleUpdateMonto('deducciones', e.target.value)} className="form-field mt-1 text-red-400" placeholder="0.00" />
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl mt-6">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total a Liquidar</p>
                  <p className="text-3xl font-bold font-mono text-white">{formatMoneda(resumen.totalNeto)}</p>
                </div>

                <div className="pt-4">
                  <button onClick={guardarLiquidacion} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">save</span>
                    {saving ? 'Procesando...' : 'Guardar y Cerrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}