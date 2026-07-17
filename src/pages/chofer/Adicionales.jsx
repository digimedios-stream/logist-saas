import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatFechaHora, formatMoneda, estadoAdicionalLabel } from '@/lib/utils'

export default function ChoferAdicionales() {
  const { choferData, loading: authLoading } = useAuth()
  const { tema, esTercero } = useTheme()
  const navigate = useNavigate()

  const [adicionales, setAdicionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (!authLoading) {
      if (choferData?.id) {
        cargarAdicionales()
      } else {
        setLoading(false)
      }
    }
  }, [choferData, authLoading])

  async function cargarAdicionales() {
    try {
      const { data } = await supabase
        .from('adicionales')
        .select('*')
        .eq('chofer_id', choferData.id)
        .in('estado', ['pendiente', 'en_curso'])
        .order('fecha_inicio', { ascending: true })
      
      setAdicionales(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id, newStatus) => {
    setSavingId(id)
    try {
      const { error } = await supabase
        .from('adicionales')
        .update({ estado: newStatus })
        .eq('id', id)
      
      if (error) throw error
      
      if (newStatus === 'realizado') {
        setAdicionales(adicionales.filter(a => a.id !== id))
      } else {
        setAdicionales(adicionales.map(a => a.id === id ? { ...a, estado: newStatus } : a))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-10 animate-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/chofer')} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold">Viajes Adicionales</h2>
          <p className="text-slate-400 text-sm">Gestiona tus viajes extra y charters.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando adicionales...</div>
        ) : adicionales.length === 0 ? (
          <div className="bg-lazdin-surface border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center">
             <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">event_available</span>
             <h3 className="font-bold text-white mb-2">No hay adicionales pendientes</h3>
             <p className="text-slate-400 text-sm max-w-sm">No tienes viajes extra asignados en este momento. Cualquier nuevo servicio aparecerá aquí.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {adicionales.map(a => (
              <div key={a.id} className={`bg-lazdin-surface rounded-2xl border ${a.estado === 'en_curso' ? `border-2 ${tema.accentBorder}/50` : 'border-slate-800'} overflow-hidden shadow-xl`}>
                <div className={`p-6 md:p-8 relative ${a.estado === 'en_curso' ? `bg-gradient-to-r from-${tema.accentColor.replace('#','')}/10 to-transparent` : ''}`}>
                  
                  {a.estado === 'en_curso' && (
                    <div className={`absolute top-0 right-0 ${tema.buttonBg} text-white text-xs font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest flex items-center gap-2`}>
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse z-10" />
                      En Curso
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-white">{a.descripcion}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`material-symbols-outlined text-sm ${tema.accentText}`}>schedule</span>
                        <span className="text-slate-300 font-bold">{a.fecha_inicio ? formatFechaHora(a.fecha_inicio) : 'Sin fecha'}</span>
                      </div>
                    </div>
                    {a.remuneracion > 0 && (
                      <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center md:text-right shadow-inner">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">A cobrar</p>
                        <p className={`text-xl font-black ${tema.accentText}`}>{formatMoneda(a.remuneracion)}</p>
                      </div>
                    )}
                  </div>

                  {(a.origen || a.destino) && (
                    <div className="bg-slate-800/30 rounded-xl p-4 mb-6 border border-slate-700/50">
                      <div className="flex items-start gap-4 text-slate-300">
                        <div className="flex flex-col items-center w-6 shrink-0 mt-1">
                          <span className={`material-symbols-outlined ${tema.accentText}`}>radio_button_checked</span>
                          <div className="w-0.5 h-6 bg-slate-700" />
                          <span className="material-symbols-outlined text-slate-500">location_on</span>
                        </div>
                        <div className="flex flex-col justify-between h-16 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/50 pb-2">
                             <p className="text-sm font-medium text-white">{a.origen || 'Por definir'}</p>
                             <span className="text-[10px] uppercase text-slate-500 font-bold">Origen</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2">
                             <p className="text-sm font-medium text-white">{a.destino || 'Por definir'}</p>
                             <span className="text-[10px] uppercase text-slate-500 font-bold">Destino</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-800">
                    {a.estado === 'pendiente' && (
                      <button 
                        disabled={savingId === a.id}
                        onClick={() => handleUpdateStatus(a.id, 'en_curso')}
                        className={`flex-1 ${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-bold py-3 px-6 rounded-xl shadow active:scale-[0.98] transition-all flex justify-center items-center gap-2`}
                      >
                        {savingId === a.id ? (
                           <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                        ) : (
                           <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        )}
                        Iniciar Recorrido
                      </button>
                    )}

                    {a.estado === 'en_curso' && (
                      <button 
                        disabled={savingId === a.id}
                        onClick={() => handleUpdateStatus(a.id, 'realizado')}
                        className={`flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow active:scale-[0.98] transition-all flex justify-center items-center gap-2`}
                      >
                        {savingId === a.id ? (
                           <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                        ) : (
                           <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        )}
                        Finalizar Servicio
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}