import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { choferesService } from '@/services/choferesService'
import { formatFechaCorta, estadoVencimiento } from '@/lib/utils'

export default function Choferes() {
  const [choferes, setChoferes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroNombre, setFiltroNombre] = useState('')

  useEffect(() => { cargarChoferes() }, [])

  async function cargarChoferes() {
    try {
      setLoading(true)
      const data = await choferesService.getChoferes()
      
      setChoferes(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function eliminarChofer(id, nombre) {
    if (!confirm(`¿Estás SEGURO de eliminar permanentemente al chofer ${nombre}? Esta acción lo quitará de la lista activa.`)) return
    
    try {
      setLoading(true)
      await choferesService.softDeleteChofer(id)

      await cargarChoferes()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtrados = choferes.filter(c => {
    if (filtroNombre && !c.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) && !c.dni.includes(filtroNombre)) return false
    return true
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Personal Conductor</h2>
          <p className="text-lazdin-on-primary-container text-sm">Administre los choferes y vencimientos de licencias.</p>
        </div>
        <Link to="/admin/choferes/nuevo" className="btn-primary">
          <span className="material-symbols-outlined">person_add</span>
          <span>Nuevo Chofer</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-lazdin-surface-low border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
          <input className="form-field pl-10" placeholder="Buscar por nombre o DNI..." value={filtroNombre} onChange={e=>setFiltroNombre(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-lazdin-surface border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-lazdin-surface-high border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Chofer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Vehículo Asignado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Licencia Nacional</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
               {loading ? (
                Array.from({length:3}).map((_,i) => (
                  <tr key={i}><td colSpan="5" className="px-6 py-4"><div className="h-10 bg-lazdin-surface-high rounded animate-pulse" /></td></tr>
                ))
              ) : filtrados.map(c => {
                const asigActiva = c.asignaciones_vehiculo_chofer?.find(a => a.activo)
                const licEstado = c.licencia_vencimiento ? estadoVencimiento(c.licencia_vencimiento) : null
                
                return (
                  <tr key={c.id} className="table-row-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-700 shadow-inner">
                          {c.foto_url ? (
                            <img src={c.foto_url} alt={c.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-500 text-xl">person</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{c.nombre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">DNI {c.dni}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {c.telefono_contacto && <p className="text-slate-300 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-slate-500">call</span> {c.telefono_contacto}</p>}
                      {c.email && <p className="text-slate-400 text-xs mt-1">{c.email}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {asigActiva?.vehiculo ? (
                        <div className="flex flex-col">
                           <span className="font-medium text-sky-400">{asigActiva.vehiculo.marca} {asigActiva.vehiculo.modelo}</span>
                           <span className="text-xs text-slate-500 font-mono mt-0.5">{asigActiva.vehiculo.patente}</span>
                        </div>
                      ) : <span className="text-slate-500 italic text-xs">Sin vehículo</span>}
                    </td>
                    <td className="px-6 py-4">
                      {licEstado ? (
                        <div>
                          <p className={`text-xs font-bold text-${licEstado.color}-500 mb-1`}>{licEstado.label}</p>
                          <p className="text-xs text-slate-400 font-mono">Nº {c.licencia_numero}</p>
                          <p className="text-xs text-slate-500">Vence: {formatFechaCorta(c.licencia_vencimiento)}</p>
                        </div>
                      ) : <span className="text-xs text-slate-500">Sin datos</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/choferes/${c.id}/editar`} className="p-2 text-slate-500 hover:text-lazdin-emerald transition-colors inline-block" title="Editar Chofer">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </Link>
                      <button 
                        onClick={() => eliminarChofer(c.id, c.nombre)}
                        className="p-2 text-slate-600 hover:text-red-400 transition-colors inline-block"
                        title="Eliminar Chofer"
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
          <span className="text-xs text-slate-500">Mostrando {filtrados.length} de {choferes.length} conductores</span>
        </div>
      </div>
    </div>
  )
}