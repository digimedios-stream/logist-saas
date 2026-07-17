import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatFechaHora } from '@/lib/utils'

export default function ChoferTurno() {
  const { choferData, vehiculoAsignado, loading: authLoading } = useAuth()
  const { tema } = useTheme()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [odometro, setOdometro] = useState('')
  const [error, setError] = useState(null)
  const [duracion, setDuracion] = useState('00:00:00')
  const [proximoMantenimiento, setProximoMantenimiento] = useState(null)

  useEffect(() => {
    if (!authLoading) {
      if (choferData?.id) {
        cargarTurno()
      } else {
        setLoading(false)
      }
    }
    if (vehiculoAsignado?.id) {
      cargarProximoMantenimiento()
    }
  }, [choferData, authLoading, vehiculoAsignado])

  async function cargarProximoMantenimiento() {
    try {
      const { data } = await supabase
        .from('mantenimientos')
        .select('proximo_km, descripcion')
        .eq('vehiculo_id', vehiculoAsignado.id)
        .eq('estado', 'programado')
        .order('proximo_km', { ascending: true })
        .limit(1)
      if (data && data.length > 0) setProximoMantenimiento(data[0])
    } catch (err) {}
  }

  useEffect(() => {
    let interval = null
    if (turnoActivo) {
      interval = setInterval(() => {
        const inicio = new Date(turnoActivo.fecha_inicio).getTime()
        const ahora = new Date().getTime()
        const diff = ahora - inicio
        
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        
        setDuracion(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [turnoActivo])

  async function cargarTurno() {
    try {
      const { data, error } = await supabase
        .from('turnos')
        .select('*')
        .eq('chofer_id', choferData.id)
        .eq('activo', true)
        .order('fecha_inicio', { ascending: false })
      
      if (error) throw error

      if (data && data.length > 0) {
        setTurnoActivo(data[0])
      } else {
        // Pre-fill odómetro con el kilometraje del vehículo si no hay turno
        if (vehiculoAsignado?.kilometraje_actual) {
          setOdometro(vehiculoAsignado.kilometraje_actual.toString())
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTurno = async (e) => {
    e.preventDefault()
    if (!odometro) {
      setError('Debes ingresar el odómetro')
      return
    }

    setSaving(true)
    setError(null)
    
    try {
      if (turnoActivo) {
        // Finalizar turno
        const kmRecorridos = parseFloat(odometro) - parseFloat(turnoActivo.odometro_inicio)
        if (kmRecorridos < 0) {
          throw new Error('El odómetro final no puede ser menor al inicial.')
        }

        const { error: updError } = await supabase
          .from('turnos')
          .update({
            fecha_fin: new Date().toISOString(),
            odometro_fin: odometro,
            kilometros_recorridos: kmRecorridos,
            activo: false
          })
          .eq('chofer_id', choferData.id)
          .eq('activo', true)
        
        if (updError) throw updError

        // También actualizamos el km del vehículo
        await supabase
          .from('vehiculos')
          .update({ kilometraje_actual: odometro })
          .eq('id', vehiculoAsignado?.id)

        // CHEQUEO DE MANTENIMIENTO AL CERRAR TURNO
        if (proximoMantenimiento) {
          const kmsFaltantes = proximoMantenimiento.proximo_km - Number(odometro)
          if (kmsFaltantes <= 0) {
            const { data: novExistente } = await supabase
              .from('novedades')
              .select('id')
              .eq('vehiculo_id', vehiculoAsignado.id)
              .eq('tipo', 'mantenimiento_vencido')
              .eq('estado', 'abierta')
              .limit(1)

            if (!novExistente || novExistente.length === 0) {
              await supabase.from('novedades').insert({
                chofer_id: choferData.id,
                vehiculo_id: vehiculoAsignado.id,
                turno_id: turnoActivo.id,
                tipo: 'mantenimiento_vencido',
                gravedad: 'alta',
                descripcion: `El vehículo ha finalizado la jornada superando el kilometraje para su mantenimiento programado: "${proximoMantenimiento.descripcion}". Kilometraje final: ${odometro} km (Programado a los ${proximoMantenimiento.proximo_km} km).`,
                estado: 'abierta'
              })
            }
          }
        }

        setTurnoActivo(null)
        setOdometro('')
        navigate('/chofer')

      } else {
        // Iniciar turno
        if (!vehiculoAsignado) {
          throw new Error('No tienes un vehículo asignado activo.')
        }

        const { data, error: insError } = await supabase
          .from('turnos')
          .insert({
            chofer_id: choferData.id,
            vehiculo_id: vehiculoAsignado.id,
            linea_id: vehiculoAsignado.linea_principal_id,
            odometro_inicio: odometro,
            activo: true
          })
          .select()
          .single()

        if (insError) throw insError
        setTurnoActivo(data)
        setOdometro('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando estado del turno...</div>

  return (
    <div className="max-w-lg mx-auto pb-10 animate-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/chofer')} className="p-2 bg-lazdin-surface hover:bg-lazdin-surface-high rounded-lg text-slate-400">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold">Gestión de Turno</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {turnoActivo ? (
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className={`h-2 w-full ${tema.accentBg}`}></div>
          <div className="p-8 flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full ${tema.accentBg} flex items-center justify-center relative mb-6`}>
              <div className={`absolute inset-0 rounded-full border-4 border border-t-${tema.accentColor.replace('#','')} border-transparent animate-spin`} style={{ borderTopColor: tema.accentColor }}></div>
              <span className={`material-symbols-outlined text-4xl ${tema.accentText}`}>schedule</span>
            </div>
            
            <h3 className="text-lg text-slate-400 uppercase tracking-widest font-bold mb-2">Turno en Curso</h3>
            <div className={`text-6xl font-mono font-black ${tema.accentText} tracking-tighter mb-8`}>
              {duracion}
            </div>

            <div className="w-full bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-8 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Inicio:</span>
                <span className="font-bold text-slate-200">{formatFechaHora(turnoActivo.fecha_inicio)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Odómetro Inicial:</span>
                <span className="font-mono font-bold text-slate-200">{turnoActivo.odometro_inicio} km</span>
              </div>
            </div>

            <form onSubmit={handleToggleTurno} className="w-full space-y-6">
              <div>
                <label className="block text-center text-sm font-bold text-red-400 uppercase mb-3">Odómetro de Cierre</label>
                <div className="relative max-w-[200px] mx-auto">
                  <input 
                    type="number" 
                    required 
                    value={odometro} 
                    onChange={e => setOdometro(e.target.value)} 
                    className="w-full bg-slate-800 border-2 border-red-500/50 rounded-xl p-4 text-center text-2xl font-mono font-bold text-white focus:outline-none focus:border-red-500" 
                    placeholder="123456" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">km</span>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">Ingresa el kilometraje actual del tablero</p>
              </div>

              {/* ALERTA DE MANTENIMIENTO */}
              {proximoMantenimiento && odometro && (
                (() => {
                  const kmsFaltantes = proximoMantenimiento.proximo_km - Number(odometro)
                  if (kmsFaltantes <= 800) {
                    const isVencido = kmsFaltantes <= 0
                    return (
                      <div className={`p-4 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center gap-3 border ${isVencido ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-amber-500/10 border-amber-500/40 text-amber-500'}`}>
                         <span className="material-symbols-outlined text-2xl">{isVencido ? 'error' : 'warning'}</span>
                         <div>
                           <p className="uppercase tracking-widest text-[10px] opacity-80 mb-0.5">Aviso de Mantenimiento</p>
                           <p className="leading-tight">{isVencido ? `Al cerrar este turno, el vehículo superará el kilometraje para su service programado a los ${proximoMantenimiento.proximo_km} km.` : `El vehículo está próximo a su service programado a los ${proximoMantenimiento.proximo_km} km. Faltan ${kmsFaltantes} km.`}</p>
                         </div>
                      </div>
                    )
                  }
                  return null
                })()
              )}

              <button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg">
                <span className="material-symbols-outlined">{saving ? 'hourglass_empty' : 'stop_circle'}</span>
                {saving ? 'Cerrando...' : 'Finalizar Turno'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-lazdin-surface border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="p-8 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-500">play_circle</span>
            </div>
            
            <h3 className="text-xl text-white font-bold mb-2">Iniciar Nueva Jornada</h3>
            <p className="text-slate-400 text-center text-sm mb-8">
              Al iniciar tu turno, asumes la responsabilidad del vehículo <span className="font-bold text-slate-200">{vehiculoAsignado?.marca} {vehiculoAsignado?.modelo} - {vehiculoAsignado?.patente}</span>
            </p>

            <form onSubmit={handleToggleTurno} className="w-full space-y-6">
              <div>
                <label className="block text-center text-sm font-bold text-emerald-400 uppercase mb-3">Odómetro de Inicio</label>
                <div className="relative max-w-[200px] mx-auto">
                  <input 
                    type="number" 
                    required 
                    value={odometro} 
                    onChange={e => setOdometro(e.target.value)} 
                    className="w-full bg-slate-800 border-2 border-emerald-500/50 rounded-xl p-4 text-center text-2xl font-mono font-bold text-white focus:outline-none focus:border-emerald-500" 
                    placeholder="123456" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">km</span>
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">Corrobora que el kilometraje coincida con el tablero</p>
              </div>

              <button type="submit" disabled={saving || !vehiculoAsignado} className={`w-full ${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg`}>
                <span className="material-symbols-outlined">{saving ? 'hourglass_empty' : 'play_arrow'}</span>
                {saving ? 'Iniciando...' : 'Comenzar Turno'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}