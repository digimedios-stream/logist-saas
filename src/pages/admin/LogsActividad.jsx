import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatFechaHora } from '@/lib/utils'

export default function LogsActividad() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    cargarLogs()
  }, [limit])

  async function cargarLogs() {
    setLoading(true)
    setError(null)
    try {
      // Intentamos con la vista de usuarios, si falla usamos solo los logs
      const { data, error: logError } = await supabase
        .from('logs_actividad')
        .select('*, usuario:user_roles(nombre, rol)')
        .order('fecha_hora', { ascending: false })
        .limit(limit)
      
      if (logError) throw logError
      setLogs(data || [])
    } catch (err) {
      console.error('Error cargando logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getLogIcon = (accion) => {
    if (accion.includes('INSERT') || accion.includes('CREAR')) return { icon: 'add_circle', color: 'text-lazdin-emerald', bg: 'bg-lazdin-emerald/10' }
    if (accion.includes('UPDATE') || accion.includes('EDITAR') || accion.includes('MODIFICAR')) return { icon: 'edit', color: 'text-sky-400', bg: 'bg-sky-500/10' }
    if (accion.includes('DELETE') || accion.includes('ELIMINAR')) return { icon: 'delete', color: 'text-red-500', bg: 'bg-red-500/10' }
    if (accion.includes('LOGIN')) return { icon: 'login', color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
    return { icon: 'info', color: 'text-slate-400', bg: 'bg-slate-800' }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Logs de Actividad</h2>
          <p className="text-lazdin-on-primary-container text-sm">Auditoría y registro de acciones del sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="form-field py-1">
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={500}>Últimos 500</option>
          </select>
          <button onClick={cargarLogs} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-300 transition border border-slate-700">
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-500 text-sm flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>Error cargando logs: {error}</span>
        </div>
      )}

      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 font-bold">Fecha / Hora</th>
                <th className="p-4 font-bold">Usuario</th>
                <th className="p-4 font-bold">Acción</th>
                <th className="p-4 font-bold">Entidad</th>
                <th className="p-4 font-bold hidden md:table-cell">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 italic flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Cargando registros...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">No hay registros de actividad.</td>
                </tr>
              ) : (
                logs.map(log => {
                  const ui = getLogIcon(log.accion)
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20 text-sm transition-colors">
                      <td className="p-4 text-slate-300 whitespace-nowrap font-mono text-xs">{formatFechaHora(log.fecha_hora)}</td>
                      <td className="p-4">
                        <div className="font-medium text-white">{log.usuario?.nombre || 'SISTEMA'}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.usuario?.rol || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center ${ui.bg} ${ui.color}`}>
                            <span className="material-symbols-outlined text-[14px]">{ui.icon}</span>
                          </span>
                          <span className="font-bold text-slate-200 text-xs">{log.accion}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {log.entidad_afectada && (
                          <div className="flex items-center gap-1.5 focus:outline-none focus:ring">
                             <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{log.entidad_afectada}</span>
                             {log.entidad_id && <span className="text-xs font-mono text-slate-500">#{log.entidad_id}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell text-slate-400 text-xs max-w-sm truncate" title={JSON.stringify(log.detalles)}>
                        {log.detalles ? JSON.stringify(log.detalles) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}