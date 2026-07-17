import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { formatFechaHora } from '@/lib/utils'

export default function AdminNovedades() {
  const { tema } = useTheme()
  const [novedades, setNovedades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas') // todas, abiertas, cerradas

  useEffect(() => {
    cargarNovedades()
  }, [filter])

  async function cargarNovedades() {
    setLoading(true)
    try {
      let query = supabase
        .from('novedades')
        .select(`
          *,
          choferes (nombre),
          vehiculos (patente, marca, modelo)
        `)
        .order('fecha_hora', { ascending: false })

      if (filter === 'abiertas') {
        query = query.eq('estado', 'abierta')
      } else if (filter === 'cerradas') {
        query = query.eq('estado', 'cerrada')
      }

      const { data, error } = await query

      if (error) throw error
      setNovedades(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleEstado(id, estadoActual) {
    const nuevoEstado = estadoActual === 'abierta' ? 'cerrada' : 'abierta'
    try {
      const { error } = await supabase
        .from('novedades')
        .update({ estado: nuevoEstado, leida: nuevoEstado === 'cerrada' })
        .eq('id', id)

      if (error) throw error
      
      setNovedades(novedades.map(n => n.id === id ? { ...n, estado: nuevoEstado, leida: nuevoEstado === 'cerrada' } : n))
    } catch (err) {
      alert('Error al actualizar: ' + err.message)
    }
  }

  async function eliminarNovedad(id) {
    if (!confirm('¿Estás seguro de eliminar permanentemente esta novedad? Esta acción no se puede deshacer.')) return
    try {
      const { error } = await supabase
        .from('novedades')
        .delete()
        .eq('id', id)

      if (error) throw error
      setNovedades(novedades.filter(n => n.id !== id))
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Novedades y Reportes</h2>
          <p className="text-lazdin-on-surface-variant text-sm mt-1">
            Gestiona los reportes de choferes, accidentes y demoras.
          </p>
        </div>

        <div className="flex bg-lazdin-surface-high p-1 rounded-xl border border-slate-800 self-start">
          {['todas', 'abiertas', 'cerradas'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                filter === f 
                ? 'bg-lazdin-surface-highest text-white shadow-lg border border-slate-700' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 italic">Cargando reportes...</div>
        ) : novedades.length === 0 ? (
          <div className="bg-lazdin-surface border border-dashed border-slate-800 rounded-2xl p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-700 mb-4">notifications_off</span>
            <p className="text-slate-400 font-medium">No se encontraron reportes con estos criterios.</p>
          </div>
        ) : (
          novedades.map((nov) => (
            <div 
              key={nov.id} 
              className={`bg-lazdin-surface border ${nov.estado === 'abierta' ? 'border-l-4 border-l-amber-500 border-slate-800' : 'border-slate-800'} rounded-2xl p-5 md:p-6 transition-all hover:bg-slate-800/40 shadow-sm relative group overflow-hidden`}
            >
              {/* Background accent for unread */}
              {nov.estado === 'abierta' && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-10 -mt-10" />
              )}

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg tracking-wider ${
                      nov.gravedad === 'alta' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                      nov.gravedad === 'media' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}>
                      Prioridad {nov.gravedad || 'Baja'}
                    </span>
                    <span className="text-sm font-bold text-white capitalize">{nov.tipo?.replace('_', ' ')}</span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {formatFechaHora(nov.fecha_hora)}
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{nov.descripcion}</p>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-widest pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-lazdin-emerald">person</span>
                      <span className="text-slate-400">Chofer:</span>
                      <span className="text-slate-200">{nov.choferes?.nombre || 'Desconocido'}</span>
                    </div>
                    {nov.vehiculos && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-blue-400">local_shipping</span>
                        <span className="text-slate-400">Vehículo:</span>
                        <span className="text-slate-200">{nov.vehiculos.marca} {nov.vehiculos.modelo} ({nov.vehiculos.patente})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex lg:flex-col justify-end lg:justify-center items-center gap-3 shrink-0 pt-4 lg:pt-0 lg:pl-6 lg:border-l lg:border-slate-800">
                  {nov.foto_url && (
                    <a 
                      href={nov.foto_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-full lg:w-32 py-2 px-4 rounded-xl text-xs font-black bg-lazdin-surface-highest border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">image</span>
                      Evidencia
                    </a>
                  )}
                   <button
                    onClick={() => toggleEstado(nov.id, nov.estado)}
                    className={`w-full lg:w-32 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      nov.estado === 'abierta'
                      ? 'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {nov.estado === 'abierta' ? 'radio_button_unchecked' : 'check_circle'}
                    </span>
                    {nov.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                  </button>

                  <button
                    onClick={() => eliminarNovedad(nov.id)}
                    className="w-full lg:w-32 py-2 px-4 rounded-xl text-xs font-black bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
