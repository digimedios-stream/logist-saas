import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getSaludo, formatKm, formatMoneda, formatFechaHora, estadoAdicionalLabel } from '@/lib/utils'

export default function ChoferDashboard() {
  const { choferData, vehiculoAsignado, loading: authLoading } = useAuth()
  const { tema, esTercero, nombreMostrar } = useTheme()
  const [dashData, setDashData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (choferData?.id) {
        cargarDashboard()
      } else {
        setLoading(false)
      }
    }
  }, [choferData, authLoading])

  async function cargarDashboard() {
    try {
      const { data } = await supabase.rpc('fn_chofer_dashboard', { p_chofer_id: choferData.id })
      setDashData(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-lazdin-surface-high rounded w-64" />
        <div className="h-48 bg-lazdin-surface rounded-xl" />
      </div>
    )
  }

  const linea = dashData?.linea || vehiculoAsignado?.linea
  const seguro = dashData?.seguro
  const mecanico = dashData?.mecanico
  const adicionales = dashData?.adicionales_pendientes || []
  const turnoActivo = dashData?.turno_activo

  return (
    <div className="space-y-8 animate-in">
      {/* Greeting or Error */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        {!choferData ? (
          <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl mb-6">
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <span className="material-symbols-outlined font-bold">warning</span>
              <h2 className="text-xl font-bold">Perfil Incompleto</h2>
            </div>
            <p className="text-slate-400">Tu usuario no tiene un registro de chofer asociado. Contacta al administrador para vincular tu cuenta.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              {getSaludo()}, {choferData?.nombre?.split(' ')[0] || 'Chofer'}
            </h1>
            {esTercero ? (
              <p className="text-slate-400">
                Estás operando el vehículo de <span className="text-slate-200 font-semibold">{nombreMostrar}</span>.
              </p>
            ) : (
              <p className="text-slate-400">Panel de control de tu jornada</p>
            )}
          </>
        )}
      </div>

      {/* Route Card */}
      {linea && (
        <div className={`${tema.buttonBg} rounded-2xl p-6 relative overflow-hidden shadow-2xl group`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[120px]">map</span>
          </div>
          <div className="relative z-10">
            <div className={`flex items-center gap-2 ${esTercero ? 'text-orange-100' : 'text-emerald-100'} mb-4`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              <span className="font-bold tracking-wide uppercase text-sm">Tu ruta diaria</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">{linea.nombre}</h2>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
              {linea.descripcion && (
                <div className="flex items-center gap-2 text-white/90">
                  <span className="material-symbols-outlined text-lg">conversion_path</span>
                  <span className="text-lg font-medium">{linea.descripcion}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span className="text-sm font-bold">
                  {linea.horario_salida?.slice(0,5) || '—'} - {linea.horario_regreso?.slice(0,5) || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vehicle Card */}
        <div className="lg:col-span-8">
          <div className="bg-lazdin-surface rounded-xl overflow-hidden shadow-xl border border-slate-800/50 h-full flex flex-col">
            <div className="relative h-48 md:h-56 bg-slate-800">
              {vehiculoAsignado?.foto_url ? (
                <img src={vehiculoAsignado.foto_url} alt={vehiculoAsignado.marca} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-8xl text-slate-700">local_shipping</span>
                </div>
              )}
              {turnoActivo && (
                <div className="absolute top-4 right-4 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  En Turno
                </div>
              )}
            </div>
            <div className="p-6 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                      {vehiculoAsignado?.marca} {vehiculoAsignado?.modelo}
                    </h2>
                    <p className="text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">license</span>
                      Patente: {vehiculoAsignado?.patente || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Kilometraje</p>
                    <p className="text-xl font-mono text-lazdin-emerald">{formatKm(vehiculoAsignado?.kilometraje_actual)}</p>
                  </div>
                </div>

                {seguro && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                        <span className="material-symbols-outlined text-blue-400">shield</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Seguro Vigente</p>
                        <p className="text-sm font-bold text-white">{seguro.compania} — Póliza: {seguro.poliza_numero}</p>
                      </div>
                    </div>
                    <a 
                      href={`tel:${seguro.telefono_urgencia}`} 
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">support_agent</span>
                      Llamar Urgencia
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          <Link to="/chofer/turno" className={`flex-1 w-full flex items-center gap-4 ${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-bold p-5 rounded-xl shadow-lg active:scale-[0.98] transition-all`}>
            <div className="bg-white/20 p-3 rounded-lg">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {turnoActivo ? 'stop_circle' : 'play_circle'}
              </span>
            </div>
            <div className="text-left">
              <span className="block text-lg">{turnoActivo ? 'Finalizar Turno' : 'Iniciar Turno'}</span>
              <span className="text-sm font-normal opacity-80">Registrar jornada</span>
            </div>
          </Link>

          <Link to="/chofer/combustible" className={`flex-1 w-full flex items-center gap-4 ${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-bold p-5 rounded-xl shadow-lg active:scale-[0.98] transition-all`}>
            <div className="bg-white/20 p-3 rounded-lg">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_gas_station</span>
            </div>
            <div className="text-left">
              <span className="block text-lg">Cargar Combustible</span>
              <span className="text-sm font-normal opacity-80">Registrar suministro</span>
            </div>
          </Link>

          {seguro && (
            <a href={`tel:${seguro.telefono_urgencia}`} className={`flex-1 w-full flex items-center gap-4 ${tema.buttonBg} ${tema.buttonHover} ${tema.buttonText} font-bold p-5 rounded-xl shadow-lg active:scale-[0.98] transition-all`}>
              <div className="bg-white/20 p-3 rounded-lg">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>support_agent</span>
              </div>
              <div className="text-left">
                <span className="block text-lg">Llamar Seguro</span>
                <span className="text-sm font-normal opacity-80">{seguro.compania}</span>
              </div>
            </a>
          )}

          {mecanico && (
            <a href={`tel:${mecanico.telefono}`} className="flex-1 w-full flex items-center gap-4 bg-lazdin-surface-highest hover:bg-lazdin-surface-high text-lazdin-on-surface font-bold p-5 rounded-xl shadow-lg active:scale-[0.98] transition-all border border-slate-700">
              <div className="bg-lazdin-surface p-3 rounded-lg">
                <span className="material-symbols-outlined text-2xl text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>engineering</span>
              </div>
              <div className="text-left">
                <span className="block text-lg">Llamar Mecánico</span>
                <span className="text-sm font-normal text-slate-400">{mecanico.nombre}</span>
              </div>
            </a>
          )}
        </div>
      </div>

      {/* Adicionales Pendientes */}
      {adicionales.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-lazdin-surface-highest rounded-lg">
              <span className={`material-symbols-outlined ${tema.accentText}`}>calendar_month</span>
            </div>
            <h3 className="text-xl font-bold">Próximos Adicionales</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {adicionales.map(a => (
              <div key={a.id} className={`bg-lazdin-surface rounded-2xl border ${a.estado === 'en_curso' ? `border-2 ${tema.accentBorder}/50` : 'border-lazdin-outline-variant/30'} p-6 flex flex-col gap-4 hover:border-${esTercero ? 'orange' : 'emerald'}-500/50 transition-colors relative overflow-hidden`}>
                {a.estado === 'en_curso' && (
                  <div className={`absolute -top-1 -right-1 ${tema.buttonBg} text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase`}>En Curso</div>
                )}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`${a.estado === 'en_curso' ? tema.buttonBg + ' text-white' : tema.accentBg + ' ' + tema.accentText} p-2 rounded-xl`}>
                      <span className="material-symbols-outlined">{a.estado === 'en_curso' ? 'timer' : 'pending_actions'}</span>
                    </div>
                    <div>
                      <p className="text-white font-bold">{a.fecha_inicio ? formatFechaHora(a.fecha_inicio) : 'Sin fecha'}</p>
                      <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">{estadoAdicionalLabel(a.estado)}</p>
                    </div>
                  </div>
                  {a.remuneracion && (
                    <div className="text-right">
                      <p className={`${tema.accentText} text-xl font-black`}>{formatMoneda(a.remuneracion)}</p>
                      <p className="text-slate-500 text-[10px] font-medium">Remuneración</p>
                    </div>
                  )}
                </div>
                <h4 className="text-lg font-semibold">{a.descripcion}</h4>
                {(a.origen || a.destino) && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="flex flex-col items-center w-6">
                      <span className={`material-symbols-outlined ${tema.accentText}`}>radio_button_checked</span>
                      <div className="w-0.5 h-6 bg-slate-800" />
                      <span className="material-symbols-outlined text-slate-500">location_on</span>
                    </div>
                    <div className="flex flex-col justify-between h-14">
                      <p className="text-sm"><span className="text-slate-500 font-medium mr-2">Origen:</span>{a.origen || '—'}</p>
                      <p className="text-sm"><span className="text-slate-500 font-medium mr-2">Destino:</span>{a.destino || '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
