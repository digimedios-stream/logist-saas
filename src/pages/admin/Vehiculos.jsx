import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { vehiculosService } from '@/services/vehiculosService'
import { formatKm, formatPatente, tipoPropietarioLabel, estadoVencimiento, formatFechaCorta } from '@/lib/utils'

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroPatente, setFiltroPatente] = useState('')
  const [filtroPropietario, setFiltroPropietario] = useState('todos')

  useEffect(() => { cargarVehiculos() }, [])

  async function cargarVehiculos() {
    try {
      setLoading(true)
      const data = await vehiculosService.getVehiculos()
      setVehiculos(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const [eliminandoId, setEliminandoId] = useState(null)

  async function fact_eliminarVehiculo(id, patente) {
    if (!confirm(`¿Estás SEGURO de eliminar permanentemente el vehículo con patente ${patente}?`)) return
    
    try {
      setLoading(true)
      await vehiculosService.softDeleteVehiculo(id)
      await cargarVehiculos()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtrados = vehiculos.filter(v => {
    if (filtroPatente && !v.patente.toLowerCase().includes(filtroPatente.toLowerCase())) return false
    if (filtroPropietario !== 'todos' && v.tipo_propietario !== filtroPropietario) return false
    return true
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Flota</h2>
          <p className="text-lazdin-on-primary-container text-sm">Administre los vehículos, estados de VTV y kilometrajes.</p>
        </div>
        <Link to="/admin/vehiculos/nuevo" className="btn-primary">
          <span className="material-symbols-outlined">add_circle</span>
          <span>Registrar Vehículo</span>
        </Link>
      </div>

      {/* Stats mini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-lazdin-surface border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Unidades</p>
          <span className="text-2xl font-bold">{vehiculos.length}</span>
        </div>
        <div className="bg-lazdin-surface border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Propios</p>
          <span className="text-2xl font-bold text-emerald-400">{vehiculos.filter(v=>v.tipo_propietario==='propio').length}</span>
        </div>
        <div className="bg-lazdin-surface border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Terceros</p>
          <span className="text-2xl font-bold text-orange-400">{vehiculos.filter(v=>v.tipo_propietario==='tercero').length}</span>
        </div>
        <div className="bg-lazdin-surface border border-slate-800 p-5 rounded-xl">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">VTV Vencidas</p>
          <span className="text-2xl font-bold text-red-400">{vehiculos.filter(v=> v.vtv?.[0] && estadoVencimiento(v.vtv[0].fecha_vencimiento).urgencia === 'critico').length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
          <input className="form-field pl-10" placeholder="Filtrar por patente..." value={filtroPatente} onChange={e=>setFiltroPatente(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Propietario:</label>
          <select className="form-field py-2 w-auto" value={filtroPropietario} onChange={e=>setFiltroPropietario(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="propio">Propios</option>
            <option value="tercero">Terceros</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lazdin-surface-high border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Vehículo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Patente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Modelo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Kilometraje</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Personal Asignado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Titularidad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Estado VTV</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                Array.from({length:3}).map((_,i) => (
                  <tr key={i}><td colSpan="8" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : filtrados.map(v => {
                const vtv = v.vtv?.[0]
                const vtvEstado = vtv ? estadoVencimiento(vtv.fecha_vencimiento) : null
                const choferesAsignados = v.asignaciones?.filter(a => a.activo).map(a => a.chofer?.nombre) || []
                
                return (
                  <tr key={v.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {v.foto_url ? <img src={v.foto_url} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-600">local_shipping</span>}
                        </div>
                        <span className="text-sm font-medium">{v.marca} {v.modelo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">{formatPatente(v.patente)}</span></td>
                    <td className="px-6 py-4 text-sm text-slate-400">{v.tipo} {v.anio}</td>
                    <td className="px-6 py-4 text-sm">{formatKm(v.kilometraje_actual)}</td>
                    <td className="px-6 py-4">
                      {choferesAsignados.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {choferesAsignados.map((nombre, idx) => (
                            <span key={idx} className="text-xs text-lazdin-emerald font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">person</span>
                              {nombre}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={v.tipo_propietario === 'propio' ? 'badge-propio' : 'badge-tercero'}>
                        {tipoPropietarioLabel(v.tipo_propietario)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {vtvEstado ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-${vtvEstado.color}-500`} />
                          <span className={`text-xs font-medium text-${vtvEstado.color}-500`}>
                            {vtvEstado.label} {vtv && `(${formatFechaCorta(vtv.fecha_vencimiento)})`}
                          </span>
                        </div>
                      ) : <span className="text-xs text-slate-500">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/vehiculos/${v.id}`} className="p-2 text-slate-500 hover:text-lazdin-emerald transition-colors inline-block" title="Ver Detalles">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </Link>
                      <Link to={`/admin/vehiculos/${v.id}/editar`} className="p-2 text-slate-500 hover:text-lazdin-emerald transition-colors inline-block" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </Link>
                      <button 
                        onClick={() => fact_eliminarVehiculo(v.id, v.patente)}
                        className="p-2 text-slate-600 hover:text-red-400 transition-colors inline-block"
                        title="Eliminar Vehículo"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-lazdin-surface-high px-6 py-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">Mostrando {filtrados.length} de {vehiculos.length} unidades</span>
        </div>
      </div>
    </div>
  )
}
